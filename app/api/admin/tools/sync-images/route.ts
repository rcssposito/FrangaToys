import { NextRequest, NextResponse } from 'next/server';
import { requireRoles } from '@/lib/server-auth';
import { supabaseAdmin as supabase } from '@/lib/supabase';
import { google } from 'googleapis';
import { renameFileInStorage, extractStorageKey, getActiveStorageProvider } from '@/lib/storage';

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

function toCleanFileName(name: string) {
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

// GET: Analisa descasamentos de imagens no Google Sheets
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

        const activeProvider = getActiveStorageProvider();
        const r2PublicBase = (
            process.env.CLOUDFLARE_R2_PUBLIC_URL ||
            process.env.NEXT_PUBLIC_CLOUDFLARE_R2_PUBLIC_URL ||
            'https://pub-ab391b8f43ea4791b533669f933ac2b5.r2.dev'
        ).replace(/\/+$/, '');
        const ikBase = (process.env.IMAGEKIT_URL_ENDPOINT || 'https://ik.imagekit.io/lojinha3d').replace(/\/+$/, '');

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

                if (!figureName || !currentUrl) continue;

                const isImageKit = currentUrl.includes('imagekit.io');
                const isR2 = currentUrl.includes('r2.dev') || currentUrl.includes('cloudflarestorage') || currentUrl.includes('cdn.frangatoys');

                if (!isImageKit && !isR2) continue;

                const storageKey = extractStorageKey(currentUrl);
                const rawFileName = storageKey.split('/').pop() || '';
                let currentFileNameWithExt = rawFileName;
                try {
                    currentFileNameWithExt = decodeURIComponent(rawFileName);
                } catch {}

                const extMatch = currentFileNameWithExt.match(/\.(webp|png|jpg|jpeg)$/i);
                const ext = extMatch ? extMatch[0] : '.webp';
                const currentFileNameWithoutExt = extMatch ? currentFileNameWithExt.slice(0, -ext.length) : currentFileNameWithExt;
                const expectedFileNameWithoutExt = toCleanFileName(figureName);

                const vName = figureName.match(/v(\d+)\b/i)?.[1] || null;
                const vFile = currentFileNameWithoutExt.match(/v(\d+)\b/i)?.[1] || null;
                const isVersionMismatch = Boolean(vName && vFile && vName.toLowerCase() !== vFile.toLowerCase());

                const baseName = cleanBase(figureName);
                const baseFile = cleanBase(currentFileNameWithoutExt);
                const isBaseMismatch = baseName !== '' && baseFile !== '' && baseName !== baseFile;

                // Detecta também se a URL ainda é do ImageKit e o provedor ativo é o R2
                const isProviderMismatch = (activeProvider === 'cloudflare' && isImageKit);

                if (isVersionMismatch || isBaseMismatch || isProviderMismatch) {
                    const proposedFileName = `${expectedFileNameWithoutExt}${ext}`;
                    const targetFolder = tab.toLowerCase();

                    const proposedUrl = activeProvider === 'cloudflare'
                        ? `${r2PublicBase}/${targetFolder}/${proposedFileName}`
                        : `${ikBase}/${targetFolder}/${proposedFileName}?tr=w-500,q-80,f-auto`;

                    mismatches.push({
                        sheet: tab,
                        row: i + 1,
                        figureName,
                        currentUrl,
                        currentFilePath: storageKey,
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
            activeProvider,
            mismatches
        });
    } catch (err: any) {
        console.error('[SyncImages GET Error]:', err);
        return NextResponse.json({ error: err.message || 'Erro ao analisar imagens' }, { status: 500 });
    }
}

// POST: Executa a renomeação no storage ativo (Cloudflare R2 ou ImageKit), no Google Sheets e no Supabase
export async function POST(req: NextRequest) {
    try {
        const sessionOrResponse = await requireRoles(['admin']);
        if (sessionOrResponse instanceof NextResponse) return sessionOrResponse;

        const body = await req.json();
        const { items } = body as { items: MismatchItem[] };

        if (!items || !Array.isArray(items) || items.length === 0) {
            return NextResponse.json({ error: 'Nenhum item informado para sincronização' }, { status: 400 });
        }

        const sheets = getGoogleSheetsClient();
        const activeProvider = getActiveStorageProvider();
        const results = [];

        for (const item of items) {
            let storageSuccess = false;
            let sheetSuccess = false;
            let dbSuccess = false;
            let finalUrl = item.proposedUrl;
            let errorMessage = '';

            // 1. Renomear no Storage (Cloudflare R2 ou ImageKit)
            try {
                const renameResult = await renameFileInStorage({
                    oldFilePathOrUrl: item.currentUrl,
                    newFileName: item.proposedFileName,
                    folder: item.sheet.toLowerCase()
                });

                if (renameResult.success) {
                    storageSuccess = true;
                    if (renameResult.url) {
                        finalUrl = renameResult.url;
                    }
                } else {
                    errorMessage = `Storage (${renameResult.provider}): ${renameResult.error}`;
                }
            } catch (err: any) {
                errorMessage = `Storage Exception: ${err.message}`;
            }

            // 2. Atualizar no Google Sheets (se o storage concluiu com sucesso)
            if (storageSuccess) {
                try {
                    await sheets.spreadsheets.values.update({
                        spreadsheetId: SPREADSHEET_ID,
                        range: `${item.sheet}!C${item.row}`,
                        valueInputOption: 'USER_ENTERED',
                        requestBody: {
                            values: [[finalUrl]]
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
                        .update({ imagem_url: finalUrl })
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
                proposedUrl: finalUrl,
                success: storageSuccess && sheetSuccess && dbSuccess,
                storageSuccess,
                sheetSuccess,
                dbSuccess,
                provider: activeProvider,
                error: errorMessage || undefined
            });

            // Pequeno delay para proteger cotas do Google Sheets
            await new Promise(r => setTimeout(r, 120));
        }

        const successCount = results.filter(r => r.success).length;
        return NextResponse.json({
            message: `${successCount} de ${items.length} imagens sincronizadas com sucesso no ${activeProvider === 'cloudflare' ? 'Cloudflare R2' : 'ImageKit'}.`,
            provider: activeProvider,
            results
        });
    } catch (err: any) {
        console.error('[SyncImages POST Error]:', err);
        return NextResponse.json({ error: err.message || 'Erro ao sincronizar imagens' }, { status: 500 });
    }
}
