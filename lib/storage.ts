import { S3Client, PutObjectCommand, DeleteObjectCommand, HeadObjectCommand, CopyObjectCommand } from '@aws-sdk/client-s3';

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

/**
 * Extrai a chave limpa relativa dentro do bucket/storage a partir de uma URL ou path
 */
export function extractStorageKey(urlOrPath: string): string {
    let clean = urlOrPath.split('?')[0].trim();
    if (clean.startsWith('http://') || clean.startsWith('https://')) {
        try {
            const parsed = new URL(clean);
            clean = parsed.pathname;
        } catch {}
    }
    // Remove prefixo /lojinha3d se vier de URLs legadas do ImageKit
    clean = clean.replace(/^\/lojinha3d\//, '/');
    return clean.replace(/^\/+/, '');
}

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
    const envProvider = (process.env.STORAGE_PROVIDER || 'cloudflare').toLowerCase().trim();
    return envProvider === 'imagekit' ? 'imagekit' : 'cloudflare';
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
 * Exclui um objeto do Cloudflare R2
 */
export async function deleteFromR2(keyOrUrl: string): Promise<boolean> {
    try {
        if (!keyOrUrl) return false;

        let key = keyOrUrl.split('?')[0];
        if (key.startsWith('http')) {
            const urlObj = new URL(key);
            key = urlObj.pathname;
            // Remove prefixos conhecidos se vierem da URL
            key = key.replace(/^\/lojinha3d\//, '/').replace(/^\/+/, '');
        } else {
            key = key.replace(/^\/+/, '');
        }

        if (!key) return false;

        const bucket = process.env.CLOUDFLARE_R2_BUCKET_NAME || 'frangatoys-images';
        const command = new DeleteObjectCommand({
            Bucket: bucket,
            Key: key,
        });

        await r2Client.send(command);
        console.log(`[R2] ✅ Arquivo deletado com sucesso: [${bucket}/${key}]`);
        return true;
    } catch (err: any) {
        console.error(`[R2] ❌ Erro ao deletar objeto "${keyOrUrl}":`, err.message);
        return false;
    }
}

/**
 * Exclui uma imagem de todos os provedores ativos (Cloudflare R2 e ImageKit)
 */
export async function deleteImageFromStorage(urlOrKey: string): Promise<{ r2: boolean }> {
    if (!urlOrKey) return { r2: false };
    const r2Deleted = await deleteFromR2(urlOrKey);
    return { r2: r2Deleted };
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

/**
 * Encontra a chave real existente no R2 testando chave exata e possíveis extensões
 */
export async function findExistingR2Key(key: string): Promise<string | null> {
    const bucket = process.env.CLOUDFLARE_R2_BUCKET_NAME || 'frangatoys-images';
    const cleanKey = key.trim().replace(/^\/+/, '');
    
    // Tenta a chave exata
    try {
        await r2Client.send(new HeadObjectCommand({ Bucket: bucket, Key: cleanKey }));
        return cleanKey;
    } catch {}

    // Se não tiver extensão, testa com extensões comuns de imagem (.webp, .png, .jpg, .jpeg)
    if (!/\.(webp|png|jpg|jpeg)$/i.test(cleanKey)) {
        for (const ext of ['.webp', '.png', '.jpg', '.jpeg']) {
            try {
                await r2Client.send(new HeadObjectCommand({ Bucket: bucket, Key: `${cleanKey}${ext}` }));
                return `${cleanKey}${ext}`;
            } catch {}
        }
    } else {
        // Se já tiver extensão, tenta também sem ela caso o arquivo tenha sido subido sem extensão
        const withoutExt = cleanKey.replace(/\.(webp|png|jpg|jpeg)$/i, '');
        try {
            await r2Client.send(new HeadObjectCommand({ Bucket: bucket, Key: withoutExt }));
            return withoutExt;
        } catch {}
    }

    return null;
}

/**
 * Renomeia um arquivo diretamente no Cloudflare R2 usando Copy + Delete
 */
export async function renameInR2(
    oldKeyOrUrl: string,
    newFileNameOrKey: string,
    folder?: string
): Promise<{ success: boolean; url: string; key: string; error?: string }> {
    try {
        const bucket = process.env.CLOUDFLARE_R2_BUCKET_NAME || 'frangatoys-images';
        const rawOldKey = extractStorageKey(oldKeyOrUrl);
        const resolvedOldKey = await findExistingR2Key(rawOldKey);

        if (!resolvedOldKey) {
            return {
                success: false,
                url: '',
                key: '',
                error: `Arquivo original não encontrado no Cloudflare R2: ${rawOldKey}`,
            };
        }

        // Determina extensão original
        let ext = '';
        const extMatch = resolvedOldKey.match(/\.(webp|png|jpg|jpeg)$/i);
        if (extMatch) ext = extMatch[0];

        let newKey = newFileNameOrKey.trim().replace(/^\/+/, '');
        // Se a nova chave não tem extensão mas o original tem, preserva a extensão
        if (ext && !/\.(webp|png|jpg|jpeg)$/i.test(newKey)) {
            newKey = `${newKey}${ext}`;
        }

        // Se newKey não tiver pasta e tivermos folder ou pasta extraída do oldKey, compor caminho
        if (!newKey.includes('/') && folder) {
            newKey = `${folder.replace(/^\/+|\/+$/g, '')}/${newKey}`;
        } else if (!newKey.includes('/') && resolvedOldKey.includes('/')) {
            const folderFromOld = resolvedOldKey.substring(0, resolvedOldKey.lastIndexOf('/'));
            newKey = `${folderFromOld}/${newKey}`;
        }

        // 1. Copiar com o novo nome no bucket
        await r2Client.send(new CopyObjectCommand({
            Bucket: bucket,
            CopySource: `${bucket}/${resolvedOldKey}`,
            Key: newKey,
            CacheControl: 'public, max-age=31536000, immutable',
        }));

        // 2. Se a chave for diferente, excluir a chave antiga
        if (resolvedOldKey !== newKey) {
            await r2Client.send(new DeleteObjectCommand({
                Bucket: bucket,
                Key: resolvedOldKey,
            }));
        }

        const publicUrlBase = (
            process.env.CLOUDFLARE_R2_PUBLIC_URL ||
            process.env.NEXT_PUBLIC_CLOUDFLARE_R2_PUBLIC_URL ||
            'https://pub-ab391b8f43ea4791b533669f933ac2b5.r2.dev'
        ).replace(/\/+$/, '');

        const finalUrl = `${publicUrlBase}/${newKey}`;
        return { success: true, url: finalUrl, key: newKey };
    } catch (err: any) {
        console.error('[R2 Rename Error]:', err);
        return { success: false, url: '', key: '', error: err.message };
    }
}

/**
 * Renomeação universal que respeita o provedor ativo (Cloudflare R2 ou ImageKit)
 */
export async function renameFileInStorage(options: {
    oldFilePathOrUrl: string;
    newFileName: string;
    folder?: string;
}): Promise<{ success: boolean; url: string; provider: 'cloudflare' | 'imagekit'; error?: string }> {
    const provider = getActiveStorageProvider();

    if (provider === 'cloudflare') {
        const res = await renameInR2(options.oldFilePathOrUrl, options.newFileName, options.folder);
        return {
            success: res.success,
            url: res.url,
            provider: 'cloudflare',
            error: res.error,
        };
    }

    // Fallback ImageKit
    const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;
    if (!privateKey) {
        return { success: false, url: '', provider: 'imagekit', error: 'IMAGEKIT_PRIVATE_KEY não configurada' };
    }

    try {
        const authHeader = `Basic ${Buffer.from(`${privateKey}:`).toString('base64')}`;
        const ikFilePath = options.oldFilePathOrUrl.startsWith('/') 
            ? options.oldFilePathOrUrl 
            : `/${extractStorageKey(options.oldFilePathOrUrl)}`;

        const ikRes = await fetch('https://api.imagekit.io/v1/files/rename', {
            method: 'PUT',
            headers: {
                Authorization: authHeader,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                filePath: ikFilePath,
                newFileName: options.newFileName,
                purgeCache: true,
            }),
        });

        if (ikRes.ok) {
            const ikEndpoint = (process.env.IMAGEKIT_URL_ENDPOINT || 'https://ik.imagekit.io/lojinha3d').replace(/\/+$/, '');
            const folderPart = options.folder ? `/${options.folder.replace(/^\/+|\/+$/g, '')}` : '';
            return {
                success: true,
                url: `${ikEndpoint}${folderPart}/${options.newFileName}?tr=w-500,q-80,f-auto`,
                provider: 'imagekit',
            };
        } else {
            const ikErr = await ikRes.json().catch(() => ({}));
            if (ikRes.status === 409 || ikErr.message?.toLowerCase().includes('already exists')) {
                const ikEndpoint = (process.env.IMAGEKIT_URL_ENDPOINT || 'https://ik.imagekit.io/lojinha3d').replace(/\/+$/, '');
                const folderPart = options.folder ? `/${options.folder.replace(/^\/+|\/+$/g, '')}` : '';
                return {
                    success: true,
                    url: `${ikEndpoint}${folderPart}/${options.newFileName}?tr=w-500,q-80,f-auto`,
                    provider: 'imagekit',
                };
            }
            return { success: false, url: '', provider: 'imagekit', error: ikErr.message || ikRes.statusText };
        }
    } catch (err: any) {
        return { success: false, url: '', provider: 'imagekit', error: err.message };
    }
}

