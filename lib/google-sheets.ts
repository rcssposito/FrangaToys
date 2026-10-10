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
    nome: string;
    codigo?: string | null;
    categoria?: string | null;
}

export interface DeleteSheetRowResult {
    deleted: boolean;
    sheet?: string;
    row?: number;
    error?: string;
}

/**
 * Remove a linha correspondente a uma figura da planilha Google Sheets.
 * Procura pela coluna 'Figure' / 'Nome' ou 'Código' na aba da categoria (ou em todas as abas se necessário).
 */
export async function deleteFigureRowFromSheets({
    nome,
    codigo,
    categoria
}: DeleteSheetRowParams): Promise<DeleteSheetRowResult> {
    try {
        const cleanName = (nome || '').trim().toLowerCase();
        const cleanCode = (codigo || '').trim().toLowerCase();

        if (!cleanName && !cleanCode) {
            return { deleted: false, error: 'Nome ou código da figura não informados' };
        }

        const sheets = getGoogleSheetsClient();

        // 1. Obter metadados da planilha para saber o sheetId (ID numérico de cada aba)
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

        // 2. Determinar ordem de busca nas abas (prioriza a categoria informada)
        let tabsToSearch: string[] = [];
        if (categoria) {
            const matchedTab = VALID_TABS.find(t => t.toLowerCase() === categoria.toLowerCase().trim());
            if (matchedTab && tabMap.has(matchedTab)) {
                tabsToSearch.push(matchedTab);
            }
        }
        // Adiciona as outras abas como fallback
        VALID_TABS.forEach(t => {
            if (!tabsToSearch.includes(t) && tabMap.has(t)) {
                tabsToSearch.push(t);
            }
        });

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

            const headers = (rows[0] || []).map((h: any) => String(h || '').trim().toLowerCase());
            
            // Identifica coluna de nome ('figure', 'nome', 'figura' ou padrão índice 1 / B)
            let nameColIdx = headers.findIndex((h: string) => h === 'figure' || h === 'nome' || h === 'figura');
            if (nameColIdx === -1 && rows[0].length > 1) nameColIdx = 1;

            // Identifica coluna de código ('código', 'codigo', 'código da figura' ou padrão índice 0 / A)
            let codeColIdx = headers.findIndex((h: string) => h.includes('código') || h.includes('codigo') || h === 'id');
            if (codeColIdx === -1) codeColIdx = 0;

            // Percorre as linhas para achar a correspondência exata
            for (let i = 1; i < rows.length; i++) {
                const row = rows[i] || [];
                const rowName = String(row[nameColIdx] || '').trim().toLowerCase();
                const rowCode = String(row[codeColIdx] || '').trim().toLowerCase();

                const isNameMatch = cleanName && rowName === cleanName;
                const isCodeMatch = cleanCode && rowCode === cleanCode;

                if (isNameMatch || isCodeMatch) {
                    const rowNumber = i + 1; // 1-indexed

                    // 4. Executa a exclusão da linha no Sheets via batchUpdate
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

                    console.log(`[GoogleSheets] Linha ${rowNumber} excluída com sucesso na aba "${tab}" para a figura "${nome}"`);
                    return {
                        deleted: true,
                        sheet: tab,
                        row: rowNumber,
                    };
                }
            }
        }

        console.warn(`[GoogleSheets] Figura "${nome}" (${codigo || ''}) não encontrada nas abas pesquisadas`);
        return {
            deleted: false,
            error: 'Figura não encontrada no Google Sheets',
        };
    } catch (err: any) {
        console.error('[GoogleSheets] Falha ao tentar excluir linha:', err);
        return {
            deleted: false,
            error: err.message || 'Erro de comunicação com o Google Sheets',
        };
    }
}
