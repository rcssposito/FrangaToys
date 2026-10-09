import { S3Client, PutObjectCommand, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';

/**
 * Cliente S3 configurado para o Cloudflare R2
 */
export const r2Client = new S3Client({
    region: 'auto',
    endpoint: process.env.CLOUDFLARE_R2_ENDPOINT,
    credentials: {
        accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || '',
    },
});

export interface UploadOptions {
    buffer: Buffer | Uint8Array;
    fileName: string;
    folder: string; // Ex: "anime", "games", "wip"
    contentType?: string;
    providerOverride?: 'cloudflare' | 'imagekit';
}

export interface UploadResult {
    provider: 'cloudflare' | 'imagekit';
    url: string;
    path: string;
    fileId?: string;
}

/**
 * Provedor de armazenamento ativo ('cloudflare' ou 'imagekit')
 */
export function getActiveStorageProvider(): 'cloudflare' | 'imagekit' {
    const envProvider = (process.env.STORAGE_PROVIDER || 'imagekit').toLowerCase().trim();
    return envProvider === 'cloudflare' ? 'cloudflare' : 'imagekit';
}

/**
 * Envia arquivo para o Cloudflare R2
 */
export async function uploadToR2(
    buffer: Buffer | Uint8Array,
    folder: string,
    fileName: string,
    contentType = 'image/webp'
): Promise<UploadResult> {
    const bucket = process.env.CLOUDFLARE_R2_BUCKET_NAME || 'frangatoys-images';
    const cleanFolder = folder.replace(/^\/+|\/+$/g, '');
    const cleanFileName = fileName.replace(/^\/+/, '');
    const key = cleanFolder ? `${cleanFolder}/${cleanFileName}` : cleanFileName;

    const command = new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
        // Cache longo de 1 ano para CDN estática
        CacheControl: 'public, max-age=31536000, immutable',
    });

    await r2Client.send(command);

    const publicUrlBase = (process.env.CLOUDFLARE_R2_PUBLIC_URL || '').replace(/\/+$/, '');
    const finalUrl = `${publicUrlBase}/${key}`;

    return {
        provider: 'cloudflare',
        url: finalUrl,
        path: key,
        fileId: key,
    };
}

/**
 * Envia arquivo para o ImageKit
 */
export async function uploadToImageKit(
    buffer: Buffer | Uint8Array,
    folder: string,
    fileName: string
): Promise<UploadResult> {
    const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;
    if (!privateKey) throw new Error('IMAGEKIT_PRIVATE_KEY não configurada');

    const cleanFolder = folder.startsWith('/') ? folder : `/${folder}`;
    const base64Data = Buffer.from(buffer).toString('base64');

    const ikPayload = new URLSearchParams();
    ikPayload.append('file', base64Data);
    ikPayload.append('fileName', fileName);
    ikPayload.append('folder', cleanFolder);
    ikPayload.append('useUniqueFileName', 'false');

    const authHeader = `Basic ${Buffer.from(`${privateKey}:`).toString('base64')}`;

    const res = await fetch('https://upload.imagekit.io/api/v1/files/upload', {
        method: 'POST',
        headers: {
            Authorization: authHeader,
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: ikPayload.toString(),
    });

    if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Erro ImageKit (${res.status}): ${errText}`);
    }

    const data = await res.json();
    const rawUrl = (data.url || '').split('?')[0];

    return {
        provider: 'imagekit',
        url: `${rawUrl}?tr=w-500,q-80,f-auto`,
        path: data.filePath || fileName,
        fileId: data.fileId || data.filePath || fileName,
    };
}

/**
 * Upload universal com suporte ao switch STORAGE_PROVIDER
 */
export async function uploadFile(options: UploadOptions): Promise<UploadResult> {
    const provider = options.providerOverride || getActiveStorageProvider();

    if (provider === 'cloudflare') {
        return uploadToR2(
            options.buffer,
            options.folder,
            options.fileName,
            options.contentType || 'image/webp'
        );
    } else {
        return uploadToImageKit(
            options.buffer,
            options.folder,
            options.fileName
        );
    }
}

/**
 * Teste de conectividade com o Cloudflare R2
 */
export async function testR2Connection(): Promise<{ success: boolean; url?: string; error?: string }> {
    try {
        const testContent = Buffer.from(`Conexão OK - Franga Toys R2 - ${new Date().toISOString()}`);
        const result = await uploadToR2(testContent, '_system', 'test_connection.txt', 'text/plain');
        return { success: true, url: result.url };
    } catch (err: any) {
        return { success: false, error: err.message || 'Erro desconhecido ao testar R2' };
    }
}
