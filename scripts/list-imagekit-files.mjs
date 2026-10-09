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

const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;
if (!privateKey) {
    console.error('❌ IMAGEKIT_PRIVATE_KEY não encontrada!');
    process.exit(1);
}

const authHeader = `Basic ${Buffer.from(`${privateKey}:`).toString('base64')}`;

async function listAllFiles() {
    console.log('--- LISTANDO ARQUIVOS DO IMAGEKIT ---');
    let allFiles = [];
    let skip = 0;
    const limit = 100;

    while (true) {
        process.stdout.write(`Buscando lote (skip=${skip}, limit=${limit})... `);
        const res = await fetch(`https://api.imagekit.io/v1/files?limit=${limit}&skip=${skip}`, {
            headers: {
                Authorization: authHeader,
            },
        });

        if (!res.ok) {
            const err = await res.text();
            console.error(`Erro ${res.status}: ${err}`);
            break;
        }

        const files = await res.json();
        console.log(`encontrados ${files.length} arquivos.`);

        if (!files || files.length === 0) break;
        allFiles.push(...files);

        if (files.length < limit) break;
        skip += limit;
    }

    console.log(`\nTotal de arquivos encontrados no ImageKit: ${allFiles.length}`);

    // Agrupamento por pasta
    const byFolder = {};
    allFiles.forEach(f => {
        const folder = f.filePath ? path.dirname(f.filePath) : 'raiz';
        byFolder[folder] = (byFolder[folder] || 0) + 1;
    });

    console.log('\nDistribuição por pastas:');
    Object.entries(byFolder).forEach(([folder, count]) => {
        console.log(`- ${folder}: ${count} arquivos`);
    });

    // Salvar manifesto para auditoria
    const manifestPath = path.join(__dirname, 'imagekit-manifest.json');
    fs.writeFileSync(manifestPath, JSON.stringify(allFiles, null, 2));
    console.log(`\nManifesto salvo em: ${manifestPath}`);
}

listAllFiles();
