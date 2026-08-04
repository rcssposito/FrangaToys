import { google } from 'googleapis';

export interface DriveFileItem {
    id: string;
    name: string;
    mimeType: string;
    size?: number;
    formattedSize?: string;
    downloadUrl?: string;
}

/**
 * Extrai o ID da pasta a partir de qualquer URL do Google Drive ou ID puro.
 */
export function extractFolderId(urlOrId: string): string {
    if (!urlOrId) return '';
    if (!urlOrId.includes('http') && !urlOrId.includes('/')) return urlOrId.trim();

    const folderMatch = urlOrId.match(/\/folders\/([a-zA-Z0-9_-]+)/);
    if (folderMatch && folderMatch[1]) {
        return folderMatch[1];
    }

    const idMatch = urlOrId.match(/id=([a-zA-Z0-9_-]+)/);
    if (idMatch && idMatch[1]) {
        return idMatch[1];
    }

    return urlOrId.trim();
}

/**
 * Converte bytes para formato legível (ex: 45 MB, 1.2 GB).
 */
export function formatBytes(bytes?: number): string {
    if (!bytes || bytes === 0) return 'Tamanho desconhecido';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/**
 * Raspagem em tempo real de pasta pública do Google Drive sem precisar de API Key.
 */
export async function parsePublicDriveFolder(folderId: string): Promise<DriveFileItem[]> {
    try {
        const url = `https://drive.google.com/embeddedfolderview?id=${folderId}`;
        const res = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            },
            cache: 'no-store'
        });

        if (res.ok) {
            const html = await res.text();
            const fileMatches: DriveFileItem[] = [];

            // Padrão 1: procura por nomes de arquivos e IDs no HTML do embeddedfolderview
            const regex = /\["([a-zA-Z0-9_-]{25,})",\["([^"]+\.[a-zA-Z0-9]{2,5})"/g;
            let match;
            while ((match = regex.exec(html)) !== null) {
                fileMatches.push({
                    id: match[1],
                    name: match[2],
                    mimeType: 'application/octet-stream',
                    formattedSize: 'Arquivo do Google Drive'
                });
            }

            // Padrão 2: fallback para extrair qualquer tupla de (ID de 28+ chars, "nome_do_arquivo.ext")
            if (fileMatches.length === 0) {
                const altRegex = /"([a-zA-Z0-9_-]{28,})",\s*"([^"]+\.[a-zA-Z0-9]{2,5})"/g;
                let altMatch: RegExpExecArray | null;
                while ((altMatch = altRegex.exec(html)) !== null) {
                    const currentMatch = altMatch;
                    if (!fileMatches.some(f => f.id === currentMatch[1])) {
                        fileMatches.push({
                            id: currentMatch[1],
                            name: currentMatch[2],
                            mimeType: 'application/octet-stream',
                            formattedSize: 'Arquivo do Google Drive'
                        });
                    }
                }
            }

            // Padrão 3: busca elementos com classe entry-title
            if (fileMatches.length === 0) {
                const titleRegex = /class="[^"]*entry-title[^"]*"[^>]*>([^<]+)</g;
                let titleMatch;
                let idx = 0;
                while ((titleMatch = titleRegex.exec(html)) !== null) {
                    const filename = titleMatch[1].trim();
                    if (filename && filename.includes('.')) {
                        fileMatches.push({
                            id: `${folderId}_item_${idx++}`,
                            name: filename,
                            mimeType: 'application/octet-stream',
                            formattedSize: 'Arquivo da Pasta'
                        });
                    }
                }
            }

            if (fileMatches.length > 0) {
                return fileMatches;
            }
        }
    } catch (e) {
        console.error('Erro ao ler pasta pública do Google Drive:', e);
    }
    return [];
}

/**
 * Lista dinamicamente os arquivos reais contidos em uma pasta do Google Drive via API v3 ou Scraper.
 */
export async function listGoogleDriveFolderFiles(folderUrlOrId: string): Promise<DriveFileItem[]> {
    const folderId = extractFolderId(folderUrlOrId);
    if (!folderId) return [];

    const apiKey = process.env.GOOGLE_DRIVE_API_KEY;

    // 1. Se tiver a chave oficial no .env, usa a API oficial do Google Drive v3
    if (apiKey) {
        try {
            const drive = google.drive({ version: 'v3', auth: apiKey });
            const res = await drive.files.list({
                q: `'${folderId}' in parents and trashed = false`,
                fields: 'files(id, name, mimeType, size, webContentLink)',
                pageSize: 100,
                orderBy: 'name'
            });

            const files = res.data.files || [];
            if (files.length > 0) {
                return files.map(f => ({
                    id: f.id || '',
                    name: f.name || 'Arquivo sem nome',
                    mimeType: f.mimeType || 'application/octet-stream',
                    size: f.size ? Number(f.size) : undefined,
                    formattedSize: formatBytes(f.size ? Number(f.size) : undefined)
                }));
            }
        } catch (err: any) {
            console.error('Erro na API oficial do Google Drive:', err.message);
        }
    }

    // 2. Tenta fazer a leitura direta da pasta pública (embeddedfolderview) sem mock
    const realPublicFiles = await parsePublicDriveFolder(folderId);
    if (realPublicFiles.length > 0) {
        return realPublicFiles;
    }

    // 3. Se ainda não achou a API Key ou o HTML não retornou, retorna a indicação para a pasta real do ID fornecido
    return [
        {
            id: folderId,
            name: `Download da Pasta (Google Drive ID: ${folderId})`,
            mimeType: 'application/octet-stream',
            formattedSize: 'Pasta do Google Drive'
        }
    ];
}
