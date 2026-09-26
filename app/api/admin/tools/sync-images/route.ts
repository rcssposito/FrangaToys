import { NextRequest, NextResponse } from 'next/server';
import { requireRoles } from '@/lib/server-auth';
import { supabaseAdmin as supabase } from '@/lib/supabase';
import { google } from 'googleapis';

const SPREADSHEET_ID = '10HlBpX_9yz85V0zxnItQ61G2kdEAYECP65GwbnEwwew';
const VALID_TABS = ['Anime', 'Games', 'Marvel', 'DC', 'Random'];

function getGoogleSheetsClient() {
    const serviceEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (!serviceEmail || !privateKey) {
        throw new Error('Credenciais da Service Account do Google não configuradas');
    }

    const auth = new google.auth.JWT({
        email: serviceEmail,
        key: privateKey,
        scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });

    return google.sheets({ version: 'v4', auth });
}

function toImageKitFileName(name: string) {
    return name
        .trim()
        .replace(/[^\w-]/g, '_')
        .replace(/_+/g, '_');
}

function cleanBase(str: string) {
    return str
        .replace(/\s*v\d+\b.*$/i, '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '');
}

export interface MismatchItem {
    id?: number;
    sheet: string;
    row: number;
    figureName: string;
    currentUrl: string;
    currentFilePath: string;
    currentFileName: string;
    proposedFileName: string;
    proposedUrl: string;
    isVersionMismatch: boolean;
    nameVersion?: string | null;
    fileVersion?: string | null;
}

// GET: Analisa descasamentos de imagens
export async function GET(req: NextRequest) {
    try {
        const sessionOrResponse = await requireRoles(['admin']);
        if (sessionOrResponse instanceof NextResponse) return sessionOrResponse;

        const { searchParams } = new URL(req.url);
        const requestedTab = searchParams.get('tab') || 'ALL';

        const sheets = getGoogleSheetsClient();
        const tabsToScan = requestedTab === 'ALL' 
            ? VALID_TABS 
            : VALID_TABS.filter(t => t.toLowerCase() === requestedTab.toLowerCase());

        if (tabsToScan.length === 0) {
            return NextResponse.json({ error: 'Aba inválida' }, { status: 400 });
        }

        const mismatches: MismatchItem[] = [];
        let totalRowsScanned = 0;

        for (const tab of tabsToScan) {
            const res = await sheets.spreadsheets.values.get({
                spreadsheetId: SPREADSHEET_ID,
                range: `${tab}!A1:C`
            });

            const rows = res.data.values || [];
            totalRowsScanned += Math.max(0, rows.length - 1);

            for (let i = 1; i < rows.length; i++) {
                const figureName = rows[i][1];
                const currentUrl = rows[i][2];

                if (!figureName || !currentUrl || !currentUrl.includes('imagekit.io')) continue;

                const urlWithoutQuery = currentUrl.split('?')[0];
                const rawFileName = urlWithoutQuery.split('/').pop() || '';
                let currentFileNameWithExt = rawFileName;
                try {
                    currentFileNameWithExt = decodeURIComponent(rawFileName);
                } catch {}

                const extMatch = currentFileNameWithExt.match(/\.(webp|png|jpg|jpeg)$/i);
                const ext = extMatch ? extMatch[0] : '';
                const currentFileNameWithoutExt = ext ? currentFileNameWithExt.slice(0, -ext.length) : currentFileNameWithExt;
                const expectedFileNameWithoutExt = toImageKitFileName(figureName);

                const vName = figureName.match(/v(\d+)\b/i)?.[1] || null;
                const vFile = currentFileNameWithoutExt.match(/v(\d+)\b/i)?.[1] || null;
                const isVersionMismatch = Boolean(vName && vFile && vName.toLowerCase() !== vFile.toLowerCase());

                const baseName = cleanBase(figureName);
                const baseFile = cleanBase(currentFileNameWithoutExt);
                const isBaseMismatch = baseName !== '' && baseFile !== '' && baseName !== baseFile;

                if (isVersionMismatch || isBaseMismatch) {
                    let currentFilePath = '';
                    try {
                        const parsed = new URL(urlWithoutQuery);
                        currentFilePath = parsed.pathname.replace(/^\/lojinha3d/, '');
                    } catch {
                        currentFilePath = `/${tab.toLowerCase()}/${currentFileNameWithExt}`;
                    }

                    const proposedFileName = `${expectedFileNameWithoutExt}${ext}`;
                    const lastSlashIdx = urlWithoutQuery.lastIndexOf('/');
                    const proposedUrl = urlWithoutQuery.substring(0, lastSlashIdx + 1) + proposedFileName + (currentUrl.includes('?') ? '?' + currentUrl.split('?')[1] : '');

                    mismatches.push({
                        sheet: tab,
                        row: i + 1,
                        figureName,
                        currentUrl,
                        currentFilePath,
                        currentFileName: currentFileNameWithExt,
                        proposedFileName,
                        proposedUrl,
                        isVersionMismatch,
                        nameVersion: vName,
                        fileVersion: vFile
                    });
                }
            }
        }

        return NextResponse.json({
            tabsScanned: tabsToScan,
            totalRowsScanned,
            totalMismatches: mismatches.length,
            mismatches
        });
    } catch (err: any) {
        console.error('[SyncImages GET Error]:', err);
        return NextResponse.json({ error: err.message || 'Erro ao analisar imagens' }, { status: 500 });
    }
}

// POST: Executa a renomeação no ImageKit, no Google Sheets e no Supabase
export async function POST(req: NextRequest) {
    try {
        const sessionOrResponse = await requireRoles(['admin']);
        if (sessionOrResponse instanceof NextResponse) return sessionOrResponse;

        const body = await req.json();
        const { items } = body as { items: MismatchItem[] };

        if (!items || !Array.isArray(items) || items.length === 0) {
            return NextResponse.json({ error: 'Nenhum item informado para sincronização' }, { status: 400 });
        }

        const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;
        if (!privateKey) {
            return NextResponse.json({ error: 'IMAGEKIT_PRIVATE_KEY não configurada no servidor' }, { status: 500 });
        }

        const sheets = getGoogleSheetsClient();
        const authHeader = `Basic ${Buffer.from(`${privateKey}:`).toString('base64')}`;

        const results = [];

        for (const item of items) {
            let ikSuccess = false;
            let sheetSuccess = false;
            let dbSuccess = false;
            let errorMessage = '';

            // 1. Renomear no ImageKit
            try {
                const ikRes = await fetch('https://api.imagekit.io/v1/files/rename', {
                    method: 'PUT',
                    headers: {
                        'Authorization': authHeader,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        filePath: item.currentFilePath,
                        newFileName: item.proposedFileName,
                        purgeCache: true
                    })
                });

                if (ikRes.ok) {
                    ikSuccess = true;
                } else {
                    const ikErr = await ikRes.json().catch(() => ({}));
                    // Se o arquivo de destino já existir com esse nome, consideramos aceitável seguir para atualizar o link
                    if (ikRes.status === 409 || ikErr.message?.toLowerCase().includes('already exists')) {
                        ikSuccess = true;
                    } else {
                        errorMessage = `ImageKit: ${ikErr.message || ikRes.statusText}`;
                    }
                }
            } catch (err: any) {
                errorMessage = `ImageKit Error: ${err.message}`;
            }

            // 2. Atualizar no Google Sheets (se ImageKit deu certo ou foi 409)
            if (ikSuccess) {
                try {
                    await sheets.spreadsheets.values.update({
                        spreadsheetId: SPREADSHEET_ID,
                        range: `${item.sheet}!C${item.row}`,
                        valueInputOption: 'USER_ENTERED',
                        requestBody: {
                            values: [[item.proposedUrl]]
                        }
                    });
                    sheetSuccess = true;
                } catch (err: any) {
                    errorMessage = (errorMessage ? errorMessage + ' | ' : '') + `Sheets Error: ${err.message}`;
                }

                // 3. Atualizar no Supabase
                try {
                    const { error: dbErr } = await supabase
                        .from('figuras')
                        .update({ imagem_url: item.proposedUrl })
                        .ilike('nome', item.figureName);

                    if (dbErr) {
                        errorMessage = (errorMessage ? errorMessage + ' | ' : '') + `DB Error: ${dbErr.message}`;
                    } else {
                        dbSuccess = true;
                    }
                } catch (err: any) {
                    errorMessage = (errorMessage ? errorMessage + ' | ' : '') + `DB Error: ${err.message}`;
                }
            }

            results.push({
                figureName: item.figureName,
                sheet: item.sheet,
                row: item.row,
                proposedUrl: item.proposedUrl,
                success: ikSuccess && sheetSuccess && dbSuccess,
                ikSuccess,
                sheetSuccess,
                dbSuccess,
                error: errorMessage || undefined
            });

            // Delay de 150ms para respeitar limites de requisição
            await new Promise(r => setTimeout(r, 150));
        }

        const successCount = results.filter(r => r.success).length;
        return NextResponse.json({
            message: `${successCount} de ${items.length} imagens sincronizadas com sucesso.`,
            results
        });
    } catch (err: any) {
        console.error('[SyncImages POST Error]:', err);
        return NextResponse.json({ error: err.message || 'Erro ao sincronizar imagens' }, { status: 500 });
    }
}
