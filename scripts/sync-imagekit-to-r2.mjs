import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '../.env');
if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    envContent.split('\n').forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
            const [k, ...v] = trimmed.split('=');
            if (!process.env[k.trim()]) {
                process.env[k.trim()] = v.join('=').trim().replace(/^["']|["']$/g, '');
            }
        }
    });
}

const endpoint = process.env.CLOUDFLARE_R2_ENDPOINT;
const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
const bucket = process.env.CLOUDFLARE_R2_BUCKET_NAME || 'frangatoys-images';

if (!endpoint || !accessKeyId || !secretAccessKey) {
    console.error('❌ Credenciais do R2 incompletas no .env!');
    process.exit(1);
}

const s3 = new S3Client({
    region: 'auto',
    endpoint,
    credentials: { accessKeyId, secretAccessKey },
});

const manifestPath = path.join(__dirname, 'imagekit-manifest.json');
const progressPath = path.join(__dirname, 'migration-progress.json');

if (!fs.existsSync(manifestPath)) {
    console.error('❌ Manifesto imagekit-manifest.json não encontrado! Execute list-imagekit-files.mjs primeiro.');
    process.exit(1);
}

const files = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
let progress = { completed: {}, failed: {} };
if (fs.existsSync(progressPath)) {
    try {
        progress = JSON.parse(fs.readFileSync(progressPath, 'utf-8'));
    } catch (_) {}
}

const saveProgress = () => {
    fs.writeFileSync(progressPath, JSON.stringify(progress, null, 2));
};

const CONCURRENCY = 8; // 8 downloads/uploads paralelos
let processedCount = 0;
let successCount = Object.keys(progress.completed).length;
let skippedCount = 0;
let failCount = 0;

async function syncFile(fileItem) {
    const key = fileItem.filePath.replace(/^\/+/, '');
    if (!key) return;

    // Se já foi migrado nesta ou em sessão anterior, pula
    if (progress.completed[key]) {
        skippedCount++;
        return;
    }

    try {
        const downloadUrl = fileItem.url.split('?')[0];

        // 1. Download do ImageKit
        const res = await fetch(downloadUrl);
        if (!res.ok) {
            throw new Error(`Falha no download (HTTP ${res.status}) de ${downloadUrl}`);
        }

        const arrayBuffer = await res.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const contentType = res.headers.get('content-type') || 'image/webp';

        // 2. Upload para o Cloudflare R2
        const command = new PutObjectCommand({
            Bucket: bucket,
            Key: key,
            Body: buffer,
            ContentType: contentType,
            CacheControl: 'public, max-age=31536000, immutable',
        });

        await s3.send(command);

        progress.completed[key] = {
            size: buffer.length,
            contentType,
            syncedAt: new Date().toISOString(),
        };
        delete progress.failed[key];
        successCount++;

        const kb = Math.round(buffer.length / 1024);
        console.log(`[${successCount}/${files.length}] ✅ ${key} (${kb} KB)`);
    } catch (err) {
        failCount++;
        progress.failed[key] = {
            error: err.message,
            attemptedAt: new Date().toISOString(),
        };
        console.error(`❌ Erro ao sincronizar [${key}]: ${err.message}`);
    }
}

async function run() {
    console.log(`--- INICIANDO ESPELHAMENTO CLOUD-TO-CLOUD PARA O R2 ---`);
    console.log(`Total de arquivos no catálogo: ${files.length}`);
    console.log(`Arquivos já migrados anteriormente: ${successCount}`);
    console.log(`Concorrência: ${CONCURRENCY} streams simultâneas`);
    console.log(`Destino: ${bucket}\n`);

    const queue = [...files];
    const workers = Array.from({ length: CONCURRENCY }).map(async (_, workerId) => {
        while (queue.length > 0) {
            const item = queue.shift();
            if (item) {
                await syncFile(item);
                processedCount++;

                // Salva progresso a cada 25 arquivos
                if (processedCount % 25 === 0) {
                    saveProgress();
                }
            }
        }
    });

    await Promise.all(workers);
    saveProgress();

    console.log('\n=============================================');
    console.log('🎉 ESPELHAMENTO CONCLUÍDO!');
    console.log(`Total de arquivos no acervo: ${files.length}`);
    console.log(`Sincronizados com sucesso no R2: ${Object.keys(progress.completed).length}`);
    console.log(`Falhas: ${Object.keys(progress.failed).length}`);
    console.log('=============================================');
}

run();
