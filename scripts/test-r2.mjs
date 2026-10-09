import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
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
const publicUrl = process.env.CLOUDFLARE_R2_PUBLIC_URL;

console.log('--- TESTE DE CONECTIVIDADE COM CLOUDFLARE R2 ---');
console.log('Endpoint:', endpoint);
console.log('Access Key ID:', accessKeyId ? `${accessKeyId.slice(0, 6)}...` : 'NÃO CONFIGURADO');
console.log('Bucket:', bucket);
console.log('Public URL:', publicUrl);

if (!endpoint || !accessKeyId || !secretAccessKey) {
    console.error('❌ Credenciais incompletas no .env!');
    process.exit(1);
}

const client = new S3Client({
    region: 'auto',
    endpoint,
    credentials: {
        accessKeyId,
        secretAccessKey,
    },
});

async function run() {
    try {
        const key = '_system/test_connection.txt';
        const body = `Conexão bem-sucedida com o Cloudflare R2 da Franga Toys em ${new Date().toISOString()}`;

        console.log(`\n1. Enviando arquivo de teste para [${bucket}/${key}]...`);
        const command = new PutObjectCommand({
            Bucket: bucket,
            Key: key,
            Body: body,
            ContentType: 'text/plain; charset=utf-8',
            CacheControl: 'public, max-age=3600',
        });

        await client.send(command);
        console.log('✅ Upload com S3 SDK concluído com sucesso!');

        const fullPublicUrl = `${publicUrl.replace(/\/+$/, '')}/${key}`;
        console.log(`\n2. Testando URL pública: ${fullPublicUrl}`);

        const res = await fetch(fullPublicUrl);
        if (res.ok) {
            const text = await res.text();
            console.log(`✅ Acesso público OK (Status ${res.status}): "${text.trim()}"`);
            console.log('\n🎉 SPRINT 1 VALIDADA COM SUCESSO ABSOLUTO!');
        } else {
            console.warn(`⚠️ O arquivo subiu, mas a URL pública retornou status ${res.status}.`);
        }
    } catch (err) {
        console.error('❌ Falha na conexão com o R2:', err);
        process.exit(1);
    }
}

run();
