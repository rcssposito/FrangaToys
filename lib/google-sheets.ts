import { google } from 'googleapis';

const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID || '10HlBpX_9yz85V0zxnItQ61G2kdEAYECP65GwbnEwwew';
const VALID_TABS = ['Anime', 'Games', 'Marvel', 'DC', 'Random'];

/**
 * Cria o cliente autenticado do Google Sheets usando a Service Account
 */
export function getGoogleSheetsClient() {
    const serviceEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (!serviceEmail || !privateKey) {
        throw new Error('Credenciais da Service Account do Google não configuradas (GOOGLE_SERVICE_ACCOUNT_EMAIL / GOOGLE_PRIVATE_KEY)');
    }

    const auth = new google.auth.JWT({
        email: serviceEmail,
        key: privateKey,
        scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });

    return google.sheets({ version: 'v4', auth });
}

export interface DeleteSheetRowParams {
    id?: number | string | null;
    nome?: string | null;
    codigo?: string | null;
    categoria?: string | null;
}

export interface DeleteSheetRowResult {
    deleted: boolean;
    sheet?: string;
    row?: number;
    error?: string;
}

function normalizeStr(str: string | null | undefined): string {
    return (str || '')
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '');
}

/**
 * Remove a linha correspondente a uma figura da planilha Google Sheets.
 * Prioriza a busca infalível pelo 'id' da figura (Coluna D da planilha),
 * com fallback inteligente para 'Figure' / 'Nome' e 'Código'.
 */
export async function deleteFigureRowFromSheets({
    id,
    nome,
    codigo,
    categoria
}: DeleteSheetRowParams): Promise<DeleteSheetRowResult> {
    try {
        const targetId = id !== undefined && id !== null ? String(id).replace(/['"`\s]/g, '') : '';
        const cleanName = normalizeStr(nome);
        const cleanCode = normalizeStr(codigo);

        if (!targetId && !cleanName && !cleanCode) {
            return { deleted: false, error: 'ID, Nome ou Código da figura não informados' };
        }

        const sheets = getGoogleSheetsClient();

        // 1. Obter metadados da planilha para mapear o sheetId numérico de cada aba
        const metaRes = await sheets.spreadsheets.get({
            spreadsheetId: SPREADSHEET_ID,
        });

        const sheetTabs = metaRes.data.sheets || [];
        const tabMap = new Map<string, number>();
        sheetTabs.forEach(s => {
            if (s.properties?.title && typeof s.properties?.sheetId === 'number') {
                tabMap.set(s.properties.title, s.properties.sheetId);
            }
        });

        // 2. Determinar abas para busca (prioriza a categoria da figura)
        let tabsToSearch: string[] = [];
        if (categoria) {
            const matchedTab = VALID_TABS.find(t => t.toLowerCase() === categoria.toLowerCase().trim());
            if (matchedTab && tabMap.has(matchedTab)) {
                tabsToSearch.push(matchedTab);
            }
        }
        // Fallback: busca nas demais abas
        VALID_TABS.forEach(t => {
            if (!tabsToSearch.includes(t) && tabMap.has(t)) {
                tabsToSearch.push(t);
            }
        });

        console.log(`[GoogleSheets] Buscando linha para exclusão. ID: "${targetId}", Nome: "${nome}", Categoria: "${categoria || 'N/A'}" nas abas:`, tabsToSearch);

        // 3. Buscar linha da figura nas abas
        for (const tab of tabsToSearch) {
            const sheetNumericId = tabMap.get(tab);
            if (sheetNumericId === undefined) continue;

            const res = await sheets.spreadsheets.values.get({
                spreadsheetId: SPREADSHEET_ID,
                range: `${tab}!A1:Z`,
            });

            const rows = res.data.values || [];
            if (rows.length <= 1) continue;

            const rawHeaders = (rows[0] || []).map((h: any) => String(h || '').trim());
            const headersLower = rawHeaders.map(h => h.toLowerCase());

            // 3.1 Identificar coluna de ID (prioridade máxima)
            let idColIdx = headersLower.findIndex(h => h === 'id' || h === 'id figura' || h.endsWith(' id'));
            // Na planilha padrão da Franga Toys / Lojinha3D, o ID fica na coluna D (índice 3)
            if (idColIdx === -1 && rawHeaders.length > 3 && headersLower[3] === 'id') {
                idColIdx = 3;
            }

            // 3.2 Identificar coluna de Nome ('Figure' ou 'Nome', padrão coluna B / índice 1)
            let nameColIdx = headersLower.findIndex(h => h === 'figure' || h === 'nome' || h === 'figura');
            if (nameColIdx === -1 && rawHeaders.length > 1) nameColIdx = 1;

            // 3.3 Identificar coluna de Código
            let codeColIdx = headersLower.findIndex(h => h.includes('código') || h.includes('codigo'));

            // 3.4 Percorrer as linhas procurando match
            for (let i = 1; i < rows.length; i++) {
                const row = rows[i] || [];
                const rowIdRaw = idColIdx !== -1 ? String(row[idColIdx] ?? '').replace(/['"`\s]/g, '') : '';
                const rowNameRaw = nameColIdx !== -1 ? normalizeStr(String(row[nameColIdx] ?? '')) : '';
                const rowCodeRaw = codeColIdx !== -1 ? normalizeStr(String(row[codeColIdx] ?? '')) : '';

                // Match 1: Por ID (prioridade absoluta, exato e numérico)
                const isIdMatch = Boolean(targetId && rowIdRaw && rowIdRaw === targetId);

                // Match 2: Por Nome normalizado
                const isNameMatch = Boolean(cleanName && rowNameRaw && rowNameRaw === cleanName);

                // Match 3: Por Código
                const isCodeMatch = Boolean(cleanCode && rowCodeRaw && rowCodeRaw === cleanCode);

                if (isIdMatch || isNameMatch || isCodeMatch) {
                    const rowNumber = i + 1; // 1-indexed para humanos
                    const matchReason = isIdMatch ? `ID (${targetId})` : isNameMatch ? `Nome (${nome})` : `Código (${codigo})`;

                    console.log(`[GoogleSheets] Linha encontrada pelo ${matchReason} na aba "${tab}", Linha ${rowNumber}. Executando exclusão...`);

                    // 4. Executa a exclusão da linha via batchUpdate (deleteDimension)
                    await sheets.spreadsheets.batchUpdate({
                        spreadsheetId: SPREADSHEET_ID,
                        requestBody: {
                            requests: [
                                {
                                    deleteDimension: {
                                        range: {
                                            sheetId: sheetNumericId,
                                            dimension: 'ROWS',
                                            startIndex: i,     // 0-indexed inclusivo
                                            endIndex: i + 1,   // 0-indexed exclusivo
                                        }
                                    }
                                }
                            ]
                        }
                    });

                    console.log(`[GoogleSheets] ✅ Linha ${rowNumber} excluída com sucesso na aba "${tab}"!`);
                    return {
                        deleted: true,
                        sheet: tab,
                        row: rowNumber,
                    };
                }
            }
        }

        console.warn(`[GoogleSheets] ⚠️ Nenhuma linha encontrada para ID: "${targetId}", Nome: "${nome}" em nenhuma aba.`);
        return {
            deleted: false,
            error: 'Figura não encontrada no Google Sheets',
        };
    } catch (err: any) {
        console.error('[GoogleSheets] Falha na exclusão da linha:', err);
        return {
            deleted: false,
            error: err.message || 'Erro de comunicação com o Google Sheets',
        };
    }
}
