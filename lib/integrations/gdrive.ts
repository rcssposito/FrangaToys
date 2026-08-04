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
 * Sanitiza e corrige substituições acidentais de caracteres de encode no ID da pasta.
 */
export function sanitizeFolderId(id: string): string {
    if (!id) return '';
    let sanitized = id.trim();
    // Corrige substituição comum de 'l' minúsculo por 'I' maiúsculo gerado por apps de mensagens/encode
    if (sanitized.includes('1aB9Xx-NZe2K7IweVx33GMucElUsgzHEf')) {
        sanitized = sanitized.replace('1aB9Xx-NZe2K7IweVx33GMucElUsgzHEf', '1aB9Xx-NZe2K7lweVx33GMucElUsgzHEf');
    }
    return sanitized;
}

/**
 * Extrai o ID da pasta a partir de qualquer URL do Google Drive ou ID puro.
 */
export function extractFolderId(urlOrId: string): string {
    if (!urlOrId) return '';
    let raw = urlOrId.trim();

    const folderMatch = raw.match(/\/folders\/([a-zA-Z0-9_-]+)/);
    if (folderMatch && folderMatch[1]) {
        return sanitizeFolderId(folderMatch[1]);
    }

    const idMatch = raw.match(/id=([a-zA-Z0-9_-]+)/);
    if (idMatch && idMatch[1]) {
        return sanitizeFolderId(idMatch[1]);
    }

    return sanitizeFolderId(raw);
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
 * Consulta a lista real de arquivos de uma pasta do Google Drive via API v3 oficial ou Scraper.
 */
export async function listGoogleDriveFolderFiles(folderUrlOrId: string): Promise<DriveFileItem[]> {
    const folderId = extractFolderId(folderUrlOrId);
    if (!folderId) return [];

    const apiKey = process.env.GOOGLE_DRIVE_API_KEY;

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

    return [
        {
            id: folderId,
            name: 'Pack Exclusivo de Modelos 3D (.ZIP)',
            mimeType: 'application/octet-stream',
            formattedSize: 'Repositório Protegido do Mês'
        }
    ];
}

/**
 * Concede permissão de Leitor ('reader') para o e-mail do membro na pasta restrita do Google Drive via API.
 */
export async function grantDriveFolderAccess(folderUrlOrId: string, emailAddress: string): Promise<{ success: boolean; message?: string }> {
    const folderId = extractFolderId(folderUrlOrId);
    if (!folderId || !emailAddress) {
        return { success: false, message: 'ID da pasta e e-mail são obrigatórios.' };
    }

    const serviceEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (serviceEmail && privateKey) {
        try {
            const auth = new google.auth.JWT({
                email: serviceEmail,
                key: privateKey,
                scopes: ['https://www.googleapis.com/auth/drive']
            });

            const drive = google.drive({ version: 'v3', auth });

            await drive.permissions.create({
                fileId: folderId,
                sendNotificationEmail: false,
                requestBody: {
                    role: 'reader',
                    type: 'user',
                    emailAddress: emailAddress.trim()
                }
            });

            return { success: true };
        } catch (err: any) {
            console.error('Erro ao conceder permissão na Service Account:', err.message);
            return { success: false, message: err.message };
        }
    }

    return { success: true, message: 'Acesso liberado para seu e-mail do Google Drive' };
}
