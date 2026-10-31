process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
import * as fs from 'fs';
import * as path from 'path';

function resolveFilePath(filename: string): string {
    const cwd = process.cwd();
    if (fs.existsSync(path.join(cwd, filename))) {
        return path.join(cwd, filename);
    }
    if (path.basename(cwd).toLowerCase() === 'web') {
        return path.join(cwd, filename);
    }
    if (fs.existsSync(path.join(cwd, 'web', filename))) {
        return path.join(cwd, 'web', filename);
    }
    return path.join(cwd, 'web', filename);
}

// Carrega variáveis do .env para o process.env imediatamente
const envPath = resolveFilePath('.env');
if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf-8');
    for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const match = trimmed.match(/^([^=]+)=(.*)$/);
        if (match) {
            let val = match[2].trim();
            if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
                val = val.substring(1, val.length - 1);
            }
            const k = match[1].trim();
            if (!process.env[k]) process.env[k] = val;
        }
    }
}

import { google, drive_v3 } from 'googleapis';
import { ZipArchive } from 'archiver';
import { pipeline } from 'stream/promises';
import { supabaseAdmin as supabase } from '../supabase';

const tokenPath = resolveFilePath('.google-user-token.json');
export const curatedTxtPath = resolveFilePath('pastas_compartilhadas.txt');
export const curatedJsonPath = resolveFilePath('pastas_compartilhadas.json');
export const subfolderCachePath = resolveFilePath('.drive-subfolders-cache.json');
export const archivesCachePath = resolveFilePath('.drive-archives-cache.json');

// Carrega variáveis do .env
function loadEnv(): Record<string, string> {
    if (!fs.existsSync(envPath)) return {};
    const content = fs.readFileSync(envPath, 'utf-8');
    const vars: Record<string, string> = {};
    for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const match = trimmed.match(/^([^=]+)=(.*)$/);
        if (match) {
            let val = match[2].trim();
            if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
                val = val.substring(1, val.length - 1);
            }
            vars[match[1].trim()] = val;
        }
    }
    return vars;
}

// Obtém cliente OAuth autenticado
export async function getDriveClient(): Promise<drive_v3.Drive> {
    const env = loadEnv();
    const clientId = env['GOOGLE_OAUTH_CLIENT_ID'];
    const clientSecret = env['GOOGLE_OAUTH_CLIENT_SECRET'];

    if (!clientId || !clientSecret) {
        throw new Error('GOOGLE_OAUTH_CLIENT_ID ou GOOGLE_OAUTH_CLIENT_SECRET não configurados no .env');
    }

    if (!fs.existsSync(tokenPath)) {
        throw new Error('Token do Google Drive não encontrado. É necessário autenticar via drive-audit primeiro.');
    }

    const tokenData = JSON.parse(fs.readFileSync(tokenPath, 'utf-8'));
    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
    oauth2Client.setCredentials(tokenData);

    // Salva novo token se for renovado automaticamente
    oauth2Client.on('tokens', (tokens) => {
        const current = JSON.parse(fs.readFileSync(tokenPath, 'utf-8'));
        const updated = { ...current, ...tokens };
        fs.writeFileSync(tokenPath, JSON.stringify(updated, null, 2), 'utf-8');
    });

    return google.drive({ version: 'v3', auth: oauth2Client });
}

export interface DriveFolderMeta {
    id: string;
    name: string;
    parentFolderName?: string;
    isPackSubfolder?: boolean;
    isArchiveFile?: boolean;
    archiveExtension?: string;
    studioName: string;
    studioEmail: string;
    studioKey: string;
    studioId?: number;
    sharedWithMeTime?: string;
    webViewLink?: string;
    isDownloadedLocally?: boolean;
    inCatalog?: boolean;
    matchedFigureName?: string;
    matchedFigureId?: number;
    localPath?: string;
}

// Normaliza texto para cruzamento inteligente entre nomes de pastas e figuras do catálogo
export function normalizeFigureText(text: string): string {
    return (text || '')
        .replace(/([a-z])([A-Z])/g, '$1 $2') // Separa PascalCase: "OzeMaki" -> "Oze Maki"
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\bv\d+\b/g, '') // remove v1, v2, v3
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

// Colapsa consoantes repetidas para tolerância a variações fonéticas (ex: "hallibel" -> "halibel")
export function collapseConsonants(text: string): string {
    return (text || '').replace(/([b-df-hj-np-tv-z])\1+/g, '$1');
}

// Mapa canônico para unificar múltiplas contas do mesmo estúdio (Limitado aos 4 estúdios principais)
export const STUDIO_ALIAS_MAP: Record<string, { canonicalName: string; canonicalKey: string }> = {
    'nomnomfigures@gmail.com': { canonicalName: 'NomNom Figures', canonicalKey: 'nomnom' },
    'nomnom3dprint.studios@gmail.com': { canonicalName: 'NomNom Figures', canonicalKey: 'nomnom' },
    'bulkamancer@gmail.com': { canonicalName: 'Bulkamancer', canonicalKey: 'bulkamancer' },
    'kuromufigures@gmail.com': { canonicalName: 'Kuromu Figures', canonicalKey: 'kuromu' },
    'luiz_shurato@hotmail.com': { canonicalName: 'LA Figures', canonicalKey: 'la_figures' }
};

// Verifica se um estúdio faz parte dos 4 estúdios autorizados (Bulkamancer, Nomnom, Kuromu, LA)
export function isTargetStudio(name: string, email: string): boolean {
    const n = (name || '').toLowerCase();
    const e = (email || '').toLowerCase();
    return (
        n.includes('bulkamancer') || e.includes('bulkamancer') ||
        n.includes('nomnom') || e.includes('nomnom') ||
        n.includes('kuromu') || e.includes('kuromu') ||
        n.includes('la figures') || n.includes('luiz_shurato') || e.includes('luiz_shurato')
    );
}

// Obtém o mapa consolidado de estúdios (combina STUDIO_ALIAS_MAP com o arquivo pastas_compartilhadas.txt)
export function getStudioAliasMap(): Record<string, { canonicalName: string; canonicalKey: string }> {
    const map = { ...STUDIO_ALIAS_MAP };

    if (fs.existsSync(curatedTxtPath)) {
        const content = fs.readFileSync(curatedTxtPath, 'utf-8');
        const lines = content.split('\n');
        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('=')) continue;

            const match = trimmed.match(/(?:•\s*)?(?:Compartilhado por:\s*)?([^:(\n]+?)\s*(?:\(([^)]+@[^)]+)\)|:\s*([^\s]+@[^\s]+))/i);
            if (match) {
                const studioName = match[1].replace(/^[•\s-]+/, '').trim();
                const email = (match[2] || match[3] || '').toLowerCase().trim();
                if (email && studioName && isTargetStudio(studioName, email)) {
                    const key = studioName.toLowerCase().replace(/[^a-z0-9]/g, '');
                    map[email] = {
                        canonicalName: studioName,
                        canonicalKey: key || email
                    };
                }
            }
        }
    }

    return map;
}

// Pastas técnicas internas que pertencem à própria figura e NÃO devem ser tratadas como figuras avulsas
export const TECHNICAL_SUBFOLDER_REGEX = /^(stl.*|psup.*|pusp.*|mini.*|img.*|presupport.*|supported.*|unsupported.*|render.*|image.*|photo.*|test.*|lychee|chitubox|sliced|bonus|nsfw|sfw|parts|chitu|cws|old|bust|base|head|split)$/i;

// Nomes de arquivos de arquivo técnico que são partes de uma mesma peça (ex: bulkamancer uncut, pre_supported)
export const TECHNICAL_ARCHIVE_REGEX = /^(uncut|pre_supported|supported|no_supports|stl|lys|presupport|psup|mini|img|renders|render|parts|base|hairfix)/i;

// Padrão que identifica se uma pasta mestre é um pacote/release mensal que contém figuras avulsas
export const PACK_NAME_REGEX = /release|pack|lootbox|atualiza|last models|models|\d{2}-\d{4}|\d{4}-\d{2}|welcome|\b(?:january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{4}\b/i;

// Obtém os e-mails dos estúdios autorizados direto da tabela 'studios' no Supabase.
// A fonte primária de verdade é o banco de dados (coluna drive_emails), restrito a Bulkamancer, Nomnom, Kuromu e LA Figures.
export async function getAllowedStudioEmails(): Promise<string[]> {
    const emails = new Set<string>();

    try {
        const { data: dbStudios, error } = await supabase
            .from('studios')
            .select('nome, drive_emails');

        if (!error && dbStudios) {
            for (const s of dbStudios) {
                if (!isTargetStudio(s.nome, '')) continue;
                for (const e of (s.drive_emails || [])) {
                    const norm = e.toLowerCase().trim();
                    if (norm && isTargetStudio(s.nome, norm)) emails.add(norm);
                }
            }
        }
    } catch (err: any) {
        console.warn('Erro ao carregar e-mails dos estúdios do banco:', err.message);
    }

    // Garante presença dos 4 estúdios principais
    emails.add('bulkamancer@gmail.com');
    emails.add('nomnomfigures@gmail.com');
    emails.add('nomnom3dprint.studios@gmail.com');
    emails.add('kuromufigures@gmail.com');
    emails.add('luiz_shurato@hotmail.com');

    return Array.from(emails);
}

// Sanitiza nomes para compatibilidade com pastas e arquivos do Windows
export function sanitizeWindowsFilename(name: string): string {
    return name
        .replace(/[\\/:*?"<>|]/g, '_')
        .replace(/\s+/g, ' ')
        .trim();
}

// Limpa nome de arquivos de arquivo (.zip/.rar) para extrair o nome limpo do personagem
export function cleanArchiveFigureName(filename: string): { cleanName: string; extension: string } {
    const extMatch = filename.match(/\.(zip|rar|7z)$/i);
    const extension = extMatch ? extMatch[0].toLowerCase() : '.zip';
    const cleanName = filename
        .replace(/\.(zip|rar|7z)$/i, '')
        .replace(/\s*by\s+.*$/i, '')
        .replace(/\s*-\s*Ryodan Studio.*$/i, '')
        .replace(/\s*\(Premium Tier\)/i, '')
        .replace(/\s+/g, ' ')
        .trim();
    return { cleanName, extension };
}

// Verifica se um modelo já foi baixado localmente (.zip, .rar ou pasta descompactada)
export function checkLocalFigureExists(
    destinationBaseFolder: string,
    figureName: string,
    studioName?: string
): { exists: boolean; localPath?: string } {
    const safeName = sanitizeWindowsFilename(figureName);
    const exts = ['.zip', '.rar', '.7z', ''];

    for (const ext of exts) {
        const direct = path.join(destinationBaseFolder, `${safeName}${ext}`);
        if (fs.existsSync(direct)) return { exists: true, localPath: direct };

        if (studioName) {
            const studioSafe = sanitizeWindowsFilename(studioName);
            const studioPath = path.join(destinationBaseFolder, studioSafe, `${safeName}${ext}`);
            if (fs.existsSync(studioPath)) return { exists: true, localPath: studioPath };
        }
    }

    return { exists: false };
}

// Atualiza os caches de subpastas e de arquivos compactados para pacotes de lançamento
export async function syncSubfolderCache(drive: drive_v3.Drive, folders: any[]): Promise<void> {
    let subCache: Record<string, { id: string; name: string }[]> = {};
    if (fs.existsSync(subfolderCachePath)) {
        try { subCache = JSON.parse(fs.readFileSync(subfolderCachePath, 'utf-8')); } catch { subCache = {}; }
    }

    let archCache: Record<string, { id: string; name: string; size: number; mimeType: string }[]> = {};
    if (fs.existsSync(archivesCachePath)) {
        try { archCache = JSON.parse(fs.readFileSync(archivesCachePath, 'utf-8')); } catch { archCache = {}; }
    }

    const concurrency = 6;
    for (let i = 0; i < folders.length; i += concurrency) {
        const chunk = folders.slice(i, i + concurrency);
        await Promise.all(chunk.map(async (f) => {
            // 1. Busca subpastas
            if (!subCache[f.id]) {
                try {
                    const res: any = await drive.files.list({
                        q: `'${f.id}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
                        fields: 'files(id, name)',
                        pageSize: 100
                    });
                    const sub = res.data.files || [];
                    if (sub.length > 0) {
                        subCache[f.id] = sub.map((s: any) => ({ id: s.id, name: s.name }));
                    }
                } catch {
                    // Silencioso
                }
            }

            // 2. Busca arquivos compactados avulsos (.zip, .rar, .7z)
            if (!archCache[f.id]) {
                try {
                    const res: any = await drive.files.list({
                        q: `'${f.id}' in parents and (mimeType = 'application/zip' or mimeType = 'application/x-zip-compressed' or mimeType = 'application/x-rar-compressed' or mimeType = 'application/vnd.rar' or mimeType = 'application/x-7z-compressed' or name contains '.zip' or name contains '.rar' or name contains '.7z') and trashed = false`,
                        fields: 'files(id, name, size, mimeType)',
                        pageSize: 100
                    });
                    const archives = res.data.files || [];
                    if (archives.length > 0) {
                        archCache[f.id] = archives.map((a: any) => ({
                            id: a.id,
                            name: a.name,
                            size: Number(a.size || 0),
                            mimeType: a.mimeType
                        }));
                    }
                } catch {
                    // Silencioso
                }
            }
        }));
    }

    fs.writeFileSync(subfolderCachePath, JSON.stringify(subCache, null, 2), 'utf-8');
    fs.writeFileSync(archivesCachePath, JSON.stringify(archCache, null, 2), 'utf-8');
}

// Lista as pastas/figuras filtradas, ignorando pastas mestre e promovendo tanto subpastas quanto arquivos rar/zip avulsos
export async function getCuratedFolders(
    destinationBaseFolder: string = 'D:\\rcssp\\Downloads\\3d\\3 - Com suporte',
    includeStudioFolder: boolean = false
): Promise<{
    folders: DriveFolderMeta[];
    studios: { key: string; name: string; emails: string[]; count: number; studioId?: number }[];
    totalCatalogMatched: number;
    totalNovelties: number;
}> {
    // 1. Carrega estúdios cadastrados no banco com seus drive_emails
    const emailToDbStudio = new Map<string, { id: number; nome: string; slug: string }>();
    const dbAllowedEmails = new Set<string>();

    try {
        const { data: dbStudios, error: studioErr } = await supabase
            .from('studios')
            .select('id, nome, drive_emails');

        if (!studioErr && dbStudios) {
            for (const s of dbStudios) {
                if (!isTargetStudio(s.nome, '')) continue;
                const emails: string[] = s.drive_emails || [];
                const slug = s.nome.toLowerCase().replace(/[^a-z0-9]/g, '');
                for (const e of emails) {
                    const normEmail = e.toLowerCase().trim();
                    if (normEmail && isTargetStudio(s.nome, normEmail)) {
                        emailToDbStudio.set(normEmail, {
                            id: s.id,
                            nome: s.nome,
                            slug
                        });
                        dbAllowedEmails.add(normEmail);
                    }
                }
            }
        }
    } catch (err: any) {
        console.warn('Não foi possível carregar estúdios do Supabase:', err.message);
    }

    // Garante que os e-mails dos 4 estúdios principais estejam no conjunto permitido
    dbAllowedEmails.add('bulkamancer@gmail.com');
    dbAllowedEmails.add('nomnomfigures@gmail.com');
    dbAllowedEmails.add('nomnom3dprint.studios@gmail.com');
    dbAllowedEmails.add('kuromufigures@gmail.com');
    dbAllowedEmails.add('luiz_shurato@hotmail.com');

    let rawFolders: any[] = [];
    if (fs.existsSync(curatedJsonPath)) {
        rawFolders = JSON.parse(fs.readFileSync(curatedJsonPath, 'utf-8'));
    }

    // Filtra estritamente apenas pastas pertencentes aos 4 estúdios
    const filtered = rawFolders.filter(f => {
        const ownerEmail = f.owners?.[0]?.emailAddress?.toLowerCase().trim();
        const ownerName = f.owners?.[0]?.displayName || '';
        return (
            (ownerEmail && dbAllowedEmails.has(ownerEmail)) ||
            isTargetStudio(ownerName, ownerEmail || '')
        );
    });

    // 2. Carrega os caches de subpastas e de arquivos compactados
    let subfolderCache: Record<string, { id: string; name: string }[]> = {};
    if (fs.existsSync(subfolderCachePath)) {
        try { subfolderCache = JSON.parse(fs.readFileSync(subfolderCachePath, 'utf-8')); } catch { subfolderCache = {}; }
    }

    let archivesCache: Record<string, { id: string; name: string; size: number }[]> = {};
    if (fs.existsSync(archivesCachePath)) {
        try { archivesCache = JSON.parse(fs.readFileSync(archivesCachePath, 'utf-8')); } catch { archivesCache = {}; }
    }

    const studioMap = new Map<string, { key: string; name: string; emails: string[]; count: number; studioId?: number }>();
    const itemsToProcess: DriveFolderMeta[] = [];
    const studioAliasMap = getStudioAliasMap();

    for (const f of filtered) {
        const ownerEmail = f.owners?.[0]?.emailAddress?.toLowerCase().trim() || '';
        const rawOwnerName = f.owners?.[0]?.displayName || f.owners?.[0]?.emailAddress || 'Desconhecido';

        // Prioridade 1: Estúdio cadastrado no Supabase com drive_emails
        const dbStudio = emailToDbStudio.get(ownerEmail);
        // Prioridade 2: Alias map estático / TXT
        const alias = studioAliasMap[ownerEmail];

        const studioId = dbStudio?.id;
        const studioName = dbStudio?.nome || (alias ? alias.canonicalName : rawOwnerName);
        const studioKey = dbStudio?.slug || (alias ? alias.canonicalKey : (ownerEmail || 'outro'));

        const isPack = PACK_NAME_REGEX.test(f.name || '');

        // 1. Verifica se tem subpastas que representam figuras individuais
        const subs = subfolderCache[f.id] || [];
        const nonTechnicalSubs = subs.filter(s => !TECHNICAL_SUBFOLDER_REGEX.test(s.name.trim()));
        const isMasterPackWithSubfolders = isPack && nonTechnicalSubs.length > 0;

        // 2. Verifica se a pasta mãe contém arquivos .zip/.rar avulsos onde cada arquivo é uma figura
        // (ex: luiz_shurato "Last models" ou ryodanstudio "Welcome Pack")
        const archives = archivesCache[f.id] || [];
        const isSingleFigureArchives = archives.every(a => {
            const clean = a.name.toLowerCase();
            return TECHNICAL_ARCHIVE_REGEX.test(clean) ||
                clean.includes('supported') ||
                clean.includes('uncut') ||
                clean.includes('stl') ||
                clean.includes('presupport');
        });
        const isArchiveContainer = isPack && !isSingleFigureArchives && archives.length >= 2;

        if (isMasterPackWithSubfolders) {
            // PROMOVE as subpastas como os modelos reais e descarta a pasta mestre
            for (const sub of nonTechnicalSubs) {
                const localCheck = checkLocalFigureExists(destinationBaseFolder, sub.name, studioName);

                itemsToProcess.push({
                    id: sub.id,
                    name: sub.name,
                    parentFolderName: f.name,
                    isPackSubfolder: true,
                    studioName,
                    studioEmail: ownerEmail,
                    studioKey,
                    studioId,
                    sharedWithMeTime: f.sharedWithMeTime || f.modifiedTime,
                    webViewLink: `https://drive.google.com/drive/folders/${sub.id}`,
                    isDownloadedLocally: localCheck.exists,
                    localPath: localCheck.localPath
                });
            }
        } else if (isArchiveContainer) {
            // PROMOVE cada arquivo .zip/.rar avulso como uma figura individual e descarta a pasta mestre!
            for (const a of archives) {
                const { cleanName, extension } = cleanArchiveFigureName(a.name);
                const localCheck = checkLocalFigureExists(destinationBaseFolder, cleanName, studioName);

                itemsToProcess.push({
                    id: a.id,
                    name: cleanName,
                    parentFolderName: f.name,
                    isPackSubfolder: true,
                    isArchiveFile: true,
                    archiveExtension: extension,
                    studioName,
                    studioEmail: ownerEmail,
                    studioKey,
                    studioId,
                    sharedWithMeTime: f.sharedWithMeTime || f.modifiedTime,
                    webViewLink: `https://drive.google.com/file/d/${a.id}/view`,
                    isDownloadedLocally: localCheck.exists,
                    localPath: localCheck.localPath
                });
            }
        } else {
            // Figura avulsa individual
            const localCheck = checkLocalFigureExists(destinationBaseFolder, f.name || '', studioName);

            itemsToProcess.push({
                id: f.id,
                name: f.name || 'Sem Nome',
                isPackSubfolder: false,
                studioName,
                studioEmail: ownerEmail,
                studioKey,
                studioId,
                sharedWithMeTime: f.sharedWithMeTime || f.modifiedTime,
                webViewLink: f.webViewLink,
                isDownloadedLocally: localCheck.exists,
                localPath: localCheck.localPath
            });
        }
    }

    // Ordenação estritamente por DATA que compartilharam comigo (mais recente primeiro)
    itemsToProcess.sort((a, b) => {
        const tA = new Date(a.sharedWithMeTime || 0).getTime();
        const tB = new Date(b.sharedWithMeTime || 0).getTime();
        return tB - tA;
    });

    // Deduplicação por ID e por estúdio + nome normalizado (mantendo a data mais recente)
    const seenIds = new Set<string>();
    const seenSignatures = new Set<string>();
    const uniqueItems: DriveFolderMeta[] = [];

    for (const item of itemsToProcess) {
        if (seenIds.has(item.id)) continue;

        const norm = normalizeFigureText(item.name);
        const sig = `${item.studioKey}:${norm}`;
        if (seenSignatures.has(sig)) {
            continue; // Já pegamos a versão mais recente desta figura
        }

        seenIds.add(item.id);
        seenSignatures.add(sig);
        uniqueItems.push(item);

        // Contabiliza no estúdio unificado
        if (!studioMap.has(item.studioKey)) {
            studioMap.set(item.studioKey, {
                key: item.studioKey,
                name: item.studioName,
                emails: [item.studioEmail],
                count: 0,
                studioId: item.studioId
            });
        } else {
            const entry = studioMap.get(item.studioKey)!;
            if (!entry.emails.includes(item.studioEmail)) entry.emails.push(item.studioEmail);
            if (!entry.studioId && item.studioId) entry.studioId = item.studioId;
        }
        studioMap.get(item.studioKey)!.count++;
    }

    return {
        folders: uniqueItems,
        studios: Array.from(studioMap.values()).sort((a, b) => b.count - a.count),
        totalCatalogMatched: 0,
        totalNovelties: uniqueItems.filter(f => !f.isDownloadedLocally).length
    };
}

// Inspeciona os arquivos contidos dentro de uma pasta do Google Drive (recursivo)
export interface InspectItem {
    id: string;
    name: string;
    size?: number;
    formattedSize: string;
    mimeType: string;
    relativePath: string;
}

export interface SubFolderItem {
    id: string;
    name: string;
    fileCount: number;
    totalBytes: number;
    formattedTotalSize: string;
    files: InspectItem[];
    isDownloadedLocally?: boolean;
}

export interface InspectionResult {
    hasSubfolders: boolean;
    totalFiles: number;
    totalBytes: number;
    formattedTotalSize: string;
    directFiles: InspectItem[];
    subfolders: SubFolderItem[];
    items: InspectItem[];
}

export async function inspectDriveFolder(
    folderId: string,
    destinationBaseFolder?: string,
    studioName?: string,
    isArchiveFile: boolean = false
): Promise<InspectionResult> {
    const drive = await getDriveClient();

    // Se o item for um arquivo compactado avulso (.zip/.rar direto do Drive)
    if (isArchiveFile) {
        const fileRes = await drive.files.get({
            fileId: folderId,
            fields: 'id, name, size, mimeType'
        });
        const sizeNum = Number(fileRes.data.size || 0);
        const item: InspectItem = {
            id: fileRes.data.id || folderId,
            name: fileRes.data.name || 'Arquivo compactado',
            size: sizeNum,
            formattedSize: formatBytes(sizeNum),
            mimeType: fileRes.data.mimeType || 'application/zip',
            relativePath: sanitizeWindowsFilename(fileRes.data.name || 'arquivo.zip')
        };
        return {
            hasSubfolders: false,
            totalFiles: 1,
            totalBytes: sizeNum,
            formattedTotalSize: formatBytes(sizeNum),
            directFiles: [item],
            subfolders: [],
            items: [item]
        };
    }

    const allItems: InspectItem[] = [];
    const directFiles: InspectItem[] = [];
    const subfolders: SubFolderItem[] = [];
    let grandTotalBytes = 0;

    // 1. Obtém os filhos imediatos da pasta
    let pageToken: string | undefined = undefined;
    const immediateChildren: any[] = [];

    do {
        const res: any = await drive.files.list({
            q: `'${folderId}' in parents and trashed = false`,
            fields: 'nextPageToken, files(id, name, mimeType, size)',
            pageSize: 100,
            pageToken
        });
        immediateChildren.push(...(res.data.files || []));
        pageToken = res.data.nextPageToken;
    } while (pageToken);

    // Função auxiliar para varrer recursivamente uma subpasta
    async function walk(currentFolderId: string, currentRelativePath: string, bucket: InspectItem[]) {
        let pt: string | undefined = undefined;
        do {
            const res: any = await drive.files.list({
                q: `'${currentFolderId}' in parents and trashed = false`,
                fields: 'nextPageToken, files(id, name, mimeType, size)',
                pageSize: 100,
                pageToken: pt
            });

            const files = res.data.files || [];
            for (const file of files) {
                if (file.mimeType === 'application/vnd.google-apps.folder') {
                    await walk(file.id, path.join(currentRelativePath, sanitizeWindowsFilename(file.name)), bucket);
                } else {
                    const sizeNum = file.size ? Number(file.size) : 0;
                    const item: InspectItem = {
                        id: file.id,
                        name: file.name,
                        size: sizeNum,
                        formattedSize: formatBytes(sizeNum),
                        mimeType: file.mimeType || 'application/octet-stream',
                        relativePath: path.join(currentRelativePath, sanitizeWindowsFilename(file.name))
                    };
                    bucket.push(item);
                }
            }
            pt = res.data.nextPageToken;
        } while (pt);
    }

    // 2. Separa entre arquivos diretos e subpastas de modelos
    for (const child of immediateChildren) {
        if (child.mimeType === 'application/vnd.google-apps.folder') {
            const subBucket: InspectItem[] = [];
            const subSafeName = sanitizeWindowsFilename(child.name);
            await walk(child.id, subSafeName, subBucket);

            const subTotalBytes = subBucket.reduce((acc, curr) => acc + (curr.size || 0), 0);
            grandTotalBytes += subTotalBytes;
            allItems.push(...subBucket);

            let isDownloadedLocally = false;
            if (destinationBaseFolder) {
                const localCheck = checkLocalFigureExists(destinationBaseFolder, child.name, studioName);
                isDownloadedLocally = localCheck.exists;
            }

            subfolders.push({
                id: child.id,
                name: child.name,
                fileCount: subBucket.length,
                totalBytes: subTotalBytes,
                formattedTotalSize: formatBytes(subTotalBytes),
                files: subBucket,
                isDownloadedLocally
            });
        } else {
            const sizeNum = child.size ? Number(child.size) : 0;
            grandTotalBytes += sizeNum;
            const directItem: InspectItem = {
                id: child.id,
                name: child.name,
                size: sizeNum,
                formattedSize: formatBytes(sizeNum),
                mimeType: child.mimeType || 'application/octet-stream',
                relativePath: sanitizeWindowsFilename(child.name)
            };
            directFiles.push(directItem);
            allItems.push(directItem);
        }
    }

    // Ordena subpastas por nome
    subfolders.sort((a, b) => a.name.localeCompare(b.name));

    return {
        hasSubfolders: subfolders.length > 0,
        totalFiles: allItems.length,
        totalBytes: grandTotalBytes,
        formattedTotalSize: formatBytes(grandTotalBytes),
        directFiles,
        subfolders,
        items: allItems
    };
}

export function formatBytes(bytes: number): string {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Baixa os arquivos de uma pasta do Drive e salva DIRETAMENTE em arquivo compactado .ZIP (ou baixa direto o .zip/.rar original)
export async function downloadDriveFolder(
    folderId: string,
    destinationBaseFolder: string,
    studioName: string,
    folderName: string,
    onProgress?: (data: {
        currentFile: string;
        fileIndex: number;
        totalFiles: number;
        bytesDownloadedInFile: number;
        fileTotalBytes: number;
        totalFolderBytes: number;
        folderBytesDownloaded: number;
        status: 'downloading' | 'skipped' | 'completed' | 'error';
        error?: string;
    }) => void,
    includeStudioFolder: boolean = false,
    isArchiveFile: boolean = false,
    archiveExtension: string = '.zip'
): Promise<{ success: boolean; filesDownloaded: number; filesSkipped: number; totalBytes: number; zipPath: string }> {
    const drive = await getDriveClient();

    const safeFolder = sanitizeWindowsFilename(folderName);
    const targetDir = includeStudioFolder
        ? path.join(destinationBaseFolder, sanitizeWindowsFilename(studioName))
        : destinationBaseFolder;

    fs.mkdirSync(targetDir, { recursive: true });

    // CASO 1: O item já é um arquivo compactado (.zip ou .rar) no Google Drive (ex: luiz_shurato ou ryodanstudio)
    // Fazemos stream direto sem recriar zip dentro de zip!
    if (isArchiveFile) {
        const ext = archiveExtension || '.zip';
        const finalFilePath = path.join(targetDir, `${safeFolder}${ext}`);
        const tempFilePath = path.join(targetDir, `${safeFolder}.downloading${ext}`);

        const fileMeta = await drive.files.get({ fileId: folderId, fields: 'size, name' });
        const fileSize = Number(fileMeta.data.size || 0);

        const res = await drive.files.get(
            { fileId: folderId, alt: 'media' },
            { responseType: 'stream' }
        );

        let bytesDownloaded = 0;
        const outputStream = fs.createWriteStream(tempFilePath);

        res.data.on('data', (chunk: Buffer) => {
            bytesDownloaded += chunk.length;
            if (onProgress) {
                onProgress({
                    currentFile: `${safeFolder}${ext}`,
                    fileIndex: 1,
                    totalFiles: 1,
                    bytesDownloadedInFile: bytesDownloaded,
                    fileTotalBytes: fileSize || bytesDownloaded,
                    totalFolderBytes: fileSize || bytesDownloaded,
                    folderBytesDownloaded: bytesDownloaded,
                    status: 'downloading'
                });
            }
        });

        await pipeline(res.data, outputStream);

        if (fs.existsSync(tempFilePath)) {
            if (fs.existsSync(finalFilePath)) fs.unlinkSync(finalFilePath);
            fs.renameSync(tempFilePath, finalFilePath);
        }

        if (onProgress) {
            onProgress({
                currentFile: `${safeFolder}${ext}`,
                fileIndex: 1,
                totalFiles: 1,
                bytesDownloadedInFile: bytesDownloaded,
                fileTotalBytes: fileSize || bytesDownloaded,
                totalFolderBytes: fileSize || bytesDownloaded,
                folderBytesDownloaded: bytesDownloaded,
                status: 'completed'
            });
        }

        return {
            success: true,
            filesDownloaded: 1,
            filesSkipped: 0,
            totalBytes: bytesDownloaded,
            zipPath: finalFilePath
        };
    }

    // CASO 2: Pasta com vários arquivos soltos/subpastas -> compacta em stream diretamente para .ZIP
    const { items, totalBytes } = await inspectDriveFolder(folderId);

    const finalZipPath = path.join(targetDir, `${safeFolder}.zip`);
    const tempZipPath = path.join(targetDir, `${safeFolder}.downloading.zip`);

    // Prepara o stream do arquivo .zip
    const outputStream = fs.createWriteStream(tempZipPath);
    const archive = new ZipArchive({
        zlib: { level: 5 },
        forceZip64: true
    });

    archive.pipe(outputStream);

    let filesDownloaded = 0;
    let filesSkipped = 0;
    let folderBytesDownloaded = 0;

    for (let i = 0; i < items.length; i++) {
        const item = items[i];

        try {
            const res = await drive.files.get(
                { fileId: item.id, alt: 'media' },
                { responseType: 'stream' }
            );

            let bytesInFile = 0;
            res.data.on('data', (chunk: Buffer) => {
                bytesInFile += chunk.length;
                folderBytesDownloaded += chunk.length;
                if (onProgress) {
                    onProgress({
                        currentFile: item.name,
                        fileIndex: i + 1,
                        totalFiles: items.length,
                        bytesDownloadedInFile: bytesInFile,
                        fileTotalBytes: item.size || bytesInFile,
                        totalFolderBytes: totalBytes,
                        folderBytesDownloaded,
                        status: 'downloading'
                    });
                }
            });

            // Adiciona o arquivo diretamente no fluxo do ZIP
            archive.append(res.data, { name: item.relativePath });

            // Aguarda o término do download deste arquivo antes de avançar para o próximo
            await new Promise((resolve, reject) => {
                res.data.on('end', resolve);
                res.data.on('error', reject);
            });

            filesDownloaded++;

            if (onProgress) {
                onProgress({
                    currentFile: item.name,
                    fileIndex: i + 1,
                    totalFiles: items.length,
                    bytesDownloadedInFile: bytesInFile,
                    fileTotalBytes: item.size || bytesInFile,
                    totalFolderBytes: totalBytes,
                    folderBytesDownloaded,
                    status: 'completed'
                });
            }
        } catch (err: any) {
            console.error(`Erro ao baixar arquivo ${item.name}:`, err.message);
            if (onProgress) {
                onProgress({
                    currentFile: item.name,
                    fileIndex: i + 1,
                    totalFiles: items.length,
                    bytesDownloadedInFile: 0,
                    fileTotalBytes: item.size || 0,
                    totalFolderBytes: totalBytes,
                    folderBytesDownloaded,
                    status: 'error',
                    error: err.message
                });
            }
        }
    }

    // Finaliza o empacotamento do ZIP
    const finishPromise = new Promise((resolve, reject) => {
        outputStream.on('close', () => resolve(true));
        outputStream.on('error', (err) => reject(err));
    });

    await archive.finalize();
    await finishPromise;

    // Renomeia o arquivo temporário para o nome final
    if (fs.existsSync(tempZipPath)) {
        if (fs.existsSync(finalZipPath)) {
            fs.unlinkSync(finalZipPath);
        }
        fs.renameSync(tempZipPath, finalZipPath);
    }

    return {
        success: true,
        filesDownloaded,
        filesSkipped,
        totalBytes,
        zipPath: finalZipPath
    };
}
