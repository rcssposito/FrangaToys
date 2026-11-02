import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import path from 'path';

export const dynamic = 'force-dynamic';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

const CATEGORY_FOLDER_MAP: Record<string, string> = {
    'Anime': '00 - Anime',
    'Games': '01 - Games',
    'Marvel': '02 - Marvel',
    'DC': '03 - DC',
    'Random': '04 - Random'
};

const GEMINI_MODELS_TO_TRY = [
    'gemini-2.5-flash',
    'gemini-3.6-flash',
    'gemini-3.5-flash',
    'gemini-3-flash-preview',
    'gemini-3.1-flash-lite',
    'gemini-3.5-flash-lite',
];

const GROQ_MODELS_TO_TRY = [
    'openai/gpt-oss-120b',
    'qwen/qwen3.8-27b',
    'openai/gpt-oss-20b',
    'allam-2-7b',
];

function cleanJsonArrayResponse(raw: string): string {
    const trimmed = raw.trim();
    // Remove blocos markdown ```json ... ``` se presentes
    const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenceMatch && fenceMatch[1]) {
        return fenceMatch[1].trim();
    }
    const startBracket = trimmed.indexOf('[');
    const endBracket = trimmed.lastIndexOf(']');
    if (startBracket !== -1 && endBracket !== -1 && endBracket > startBracket) {
        return trimmed.slice(startBracket, endBracket + 1);
    }
    return trimmed;
}

async function generateAnalysisWithFallback(prompt: string, geminiKey?: string, groqKey?: string): Promise<{ rawJson: string; modelUsed: string }> {
    const errors: string[] = [];

    // 1. Tenta cascata de modelos oficiais do Gemini
    if (geminiKey) {
        for (const modelId of GEMINI_MODELS_TO_TRY) {
            try {
                const geminiRes = await fetch(
                    `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${geminiKey}`,
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            contents: [{ parts: [{ text: prompt }] }],
                            generationConfig: { responseMimeType: 'application/json' }
                        })
                    }
                );

                if (!geminiRes.ok) {
                    const errText = await geminiRes.text();
                    errors.push(`${modelId}: ${geminiRes.status}`);
                    continue;
                }

                const geminiData = await geminiRes.json();
                const rawJsonText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
                if (rawJsonText) {
                    return { rawJson: cleanJsonArrayResponse(rawJsonText), modelUsed: modelId };
                }
            } catch (err: any) {
                errors.push(`${modelId}: ${err.message}`);
            }
        }
    }

    // 2. Fallback automático para Groq
    if (groqKey) {
        for (const groqModel of GROQ_MODELS_TO_TRY) {
            try {
                const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${groqKey}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        model: groqModel,
                        messages: [{ role: 'user', content: prompt }],
                        temperature: 0.2,
                    }),
                });

                if (!groqRes.ok) {
                    errors.push(`Groq(${groqModel}): ${groqRes.status}`);
                    continue;
                }

                const groqData = await groqRes.json();
                const content = groqData.choices?.[0]?.message?.content;
                if (content) {
                    return { rawJson: cleanJsonArrayResponse(content), modelUsed: `Groq (${groqModel})` };
                }
            } catch (err: any) {
                errors.push(`Groq(${groqModel}): ${err.message}`);
            }
        }
    }

    throw new Error(`Todos os modelos falharam (${errors.join(', ')})`);
}
function escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const files: string[] = body.files || [];

        if (!files.length) {
            return NextResponse.json({ error: 'Nenhum arquivo fornecido para análise.' }, { status: 400 });
        }

        const geminiKey = process.env.GEMINI_API_KEY;
        const groqKey = process.env.GROQ_API_KEY;
        if (!geminiKey && !groqKey) {
            return NextResponse.json({ error: 'Nenhuma chave GEMINI_API_KEY ou GROQ_API_KEY configurada no ambiente.' }, { status: 500 });
        }

        // 1. Busca todas as séries oficiais e categorias canônicas cadastradas no banco
        const [{ data: seriesList }, { data: categoriesList }] = await Promise.all([
            supabase.from('series').select('id, nome, categoria_id').order('nome'),
            supabase.from('categorias').select('id, nome')
        ]);

        const catIdToName: Record<number, string> = {};
        (categoriesList || []).forEach((c: any) => { catIdToName[c.id] = c.nome; });

        const seriesByCat: Record<string, string[]> = {
            'Anime': [],
            'Games': [],
            'Marvel': [],
            'DC': [],
            'Random': []
        };
        const canonicalSeriesMap = new Map<string, { nome: string; categoria: string }>();

        const SERIES_ALIASES: Record<string, string> = {
            'grand theft auto': 'GTA',
            'gta v': 'GTA',
            'gta 5': 'GTA',
            'gta vi': 'GTA',
            'gta 6': 'GTA',
            'my hero academia': 'Boku no Hero',
            'the legend of zelda': 'Legend of Zelda',
            'zelda': 'Legend of Zelda',
            'final fantasy vii': 'Final Fantasy 07',
            'final fantasy 7': 'Final Fantasy 07',
            'final fantasy vi': 'Final Fantasy 06',
            'final fantasy 6': 'Final Fantasy 06',
            'final fantasy viii': 'Final Fantasy 08',
            'final fantasy 8': 'Final Fantasy 08',
            'final fantasy ix': 'Final Fantasy 09',
            'final fantasy 9': 'Final Fantasy 09',
            'final fantasy x': 'Final Fantasy 10',
            'final fantasy 10': 'Final Fantasy 10',
            'final fantasy xii': 'Final Fantasy 12',
            'final fantasy 12': 'Final Fantasy 12',
            'final fantasy xiii': 'Final Fantasy 13',
            'final fantasy 13': 'Final Fantasy 13',
            'final fantasy xiv': 'Final Fantasy 14',
            'final fantasy 14': 'Final Fantasy 14',
            'final fantasy xv': 'Final Fantasy 15',
            'final fantasy 15': 'Final Fantasy 15',
            'final fantasy xvi': 'Final Fantasy 16',
            'final fantasy 16': 'Final Fantasy 16',
            'alien': 'Movies',
            'aliens': 'Movies',
            'the ring': 'Movies',
            'frankenstein': 'Monsters',
            'dracula': 'Monsters',
            'universal monsters': 'Monsters',
            'originals': 'Originais',
            'original': 'Originais',
            'patreon original': 'Originais',
            'patreon originals': 'Originais',
            'pokémon': 'Pokemon',
            'spider-man': 'Spider man',
            'spiderman': 'Spider man',
            'x-men': 'X-men',
            'xmen': 'X-men',
            'dandadan': 'DanDaDan',
            'yu-gi-oh': 'Yu gi oh!',
            'yugioh': 'Yu gi oh!'
        };

        (seriesList || []).forEach((s: any) => {
            const cat = catIdToName[s.categoria_id] || 'Random';
            if (seriesByCat[cat]) {
                seriesByCat[cat].push(s.nome);
            }
            canonicalSeriesMap.set(s.nome.toLowerCase().trim(), { nome: s.nome, categoria: cat });
        });

        // 2. Monta o Prompt Especializado de Alta Precisão
        const prompt = `Você é o especialista mestre em organização de arquivos 3D e taxonomia de colecionáveis da loja Franga Toys.
Sua missão é analisar nomes de arquivos de colecionáveis 3D (.zip, .rar, .7z) e extrair metadados perfeitamente canônicos e padronizados para o catálogo.

CATEGORIAS DA LOJA E SUAS SÉRIES OFICIAIS CANÔNICAS NO BANCO:
- Anime (00 - Anime): ${seriesByCat['Anime'].join(', ')}
- Games (01 - Games): ${seriesByCat['Games'].join(', ')}
- Marvel (02 - Marvel): ${seriesByCat['Marvel'].join(', ')}
- DC (03 - DC): ${seriesByCat['DC'].join(', ')}
- Random (04 - Random): ${seriesByCat['Random'].join(', ')}

REGRAS OBRIGATÓRIAS DE PADRONIZAÇÃO (NÃO VIOLE):
1. CANONICAL SERIES MATCH: Se o personagem pertencer a uma das franquias acima, use OBRIGATORIAMENTE a grafia oficial exata listada!
   - Exemplo: Use "GTA" (e NUNCA "Grand Theft Auto").
   - Exemplo: Use "Pokemon" (e NUNCA "Originals" ou "Random") para qualquer Pokémon (inclusive Ghost Trio = Gastly, Haunter, Gengar).
   - Exemplo: Use "Final Fantasy 07" (e NUNCA "Final Fantasy VII" ou "Final Fantasy 7").
   - Exemplo: Use "Boku no Hero" (e NUNCA "My Hero Academia").
   - Exemplo: Use "Legend of Zelda" (e NUNCA "The Legend of Zelda").

2. FILMES, TERROR, MONSTROS E CULTURA POP:
   - Se for um clássico do terror, cinema, monstros ou cultura pop (ex: Frankenstein, Dracula, Sadako/O Chamado, Alien, Predator, Jason Voorhees, Chucky):
     A categoria é SEMPRE "Random", e a série deve ser "Movies" ou "Monsters" (ou franquia se existir no catálogo).
   - NUNCA repita o nome do personagem como série! (PROIBIDO: serie "Frankenstein" + personagem "Frankenstein". CORRETO: serie "Monsters" + personagem "Frankenstein").

3. LIMPEZA DO NOME DO PERSONAGEM:
   - Remova termos técnicos de fatiamento 3D: STL, Pre-Supported, Supported, Unsupported, NSFW, SFW, Premium, PremiumVersion, Cut, Merged, Bust, Scale, etc.
   - Remova tags de estúdio do nome do personagem: @kaidan3d, _NYMPHA3D, Nomnom, etc.
   - MANTENHA variantes importantes do personagem/traje/transformação (ex: "Tifa Honey Bee", "Jason", "Ghost Trio", "Alien Queen", "Tuxedo Mask", "Lemillion").

4. DETECÇÃO DE VERSÃO NO PRÓPRIO ARQUIVO:
   - Se o arquivo contiver explicitamente v2, v3, etc., identifique no campo "versaoNoArquivo". Se não contiver, deixe null.

5. ESTÚDIO:
   - Identifique o estúdio modelador se presente (ex: "kaidan3d" -> "Kaidan 3D", "NYMPHA3D" -> "Nympha3D", etc.). Se não houver, "Não detectado".

Retorne APENAS um array JSON válido:
[
  {
    "arquivo": "nome exato do arquivo",
    "categoria": "Anime | Games | Marvel | DC | Random",
    "serie": "Nome Exato da Série Canônica",
    "personagem": "Nome Limpo com Variante se houver",
    "versaoNoArquivo": 2 ou null,
    "studio": "Nome do Estúdio",
    "confianca": 0.95
  }
]

Arquivos para analisar:
${JSON.stringify(files)}`;

        // 3. Chamada com cascata de modelos Gemini + Fallback Groq
        const { rawJson: rawJsonText, modelUsed } = await generateAnalysisWithFallback(prompt, geminiKey, groqKey);

        const aiResults: Array<{
            arquivo: string;
            categoria: string;
            serie: string;
            personagem: string;
            versaoNoArquivo?: number | null;
            studio: string;
            confianca: number;
        }> = JSON.parse(rawJsonText);

        // 4. Execução Determinística: Normalização Canônica e Cálculo Preciso de Versão
        const finalResults = await Promise.all(
            aiResults.map(async (item) => {
                const ext = path.extname(item.arquivo).toLowerCase();
                let itemSerie = (item.serie || '').trim();
                let itemPersonagem = (item.personagem || '').trim();
                let itemCategoria = (item.categoria || '').trim();

                // 4.1 Normalização por Alias
                const lowerSerie = itemSerie.toLowerCase();
                if (SERIES_ALIASES[lowerSerie]) {
                    itemSerie = SERIES_ALIASES[lowerSerie];
                }

                // 4.2 Validação Canônica no Banco
                const canonical = canonicalSeriesMap.get(itemSerie.toLowerCase());
                if (canonical) {
                    itemSerie = canonical.nome;
                    itemCategoria = canonical.categoria;
                }

                // 4.3 Prevenção de duplicidade Série - Personagem
                if (itemSerie.toLowerCase() === itemPersonagem.toLowerCase()) {
                    itemSerie = itemCategoria === 'Random' ? 'Monsters' : 'Movies';
                    itemCategoria = 'Random';
                }

                // 4.4 Limpeza de ruído e fatiamento no nome do personagem
                itemPersonagem = itemPersonagem
                    .replace(/\b(stl|pre[- ]?supported|supported|unsupported|nsfw|sfw|premium(version)?|cut|merged|scale|1[/-]10|1[/-]6)\b/gi, '')
                    .replace(/@\w+/g, '')
                    .replace(/[-_]+/g, ' ')
                    .trim();

                // Capitalização uniforme
                itemPersonagem = itemPersonagem.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());

                // 4.5 Detecção de versão explícita no arquivo original
                let detectedVersion: number | null = null;
                if (typeof item.versaoNoArquivo === 'number' && item.versaoNoArquivo > 0) {
                    detectedVersion = item.versaoNoArquivo;
                } else {
                    const fileVersionMatch = item.arquivo.match(/(?:^|[\s_.-])v(\d+)(?:[\s_.-]|$)/i);
                    if (fileVersionMatch && fileVersionMatch[1]) {
                        detectedVersion = parseInt(fileVersionMatch[1], 10);
                    }
                }

                // 4.6 Consulta figuras no banco para histórico de versões desta peça específica
                const searchPattern = `%${itemPersonagem}%`;
                const { data: matchingFigures } = await supabase
                    .from('figuras')
                    .select('id, nome')
                    .ilike('nome', searchPattern);

                const exactBaseRegex = new RegExp(`^${escapeRegex(itemSerie)}\\s*-\\s*${escapeRegex(itemPersonagem)}(?:\\s+v(\\d+)|$)`, 'i');
                const existingVersions: number[] = [];
                (matchingFigures || []).forEach((f: any) => {
                    const match = f.nome.match(exactBaseRegex);
                    if (match) {
                        existingVersions.push(match[1] ? parseInt(match[1], 10) : 1);
                    }
                });

                let finalVersion: number;
                if (detectedVersion !== null) {
                    finalVersion = detectedVersion;
                } else if (existingVersions.length > 0) {
                    finalVersion = Math.max(...existingVersions) + 1;
                } else {
                    finalVersion = 1;
                }

                const categoriaValida = CATEGORY_FOLDER_MAP[itemCategoria] ? itemCategoria : 'Random';
                const folderCategory = CATEGORY_FOLDER_MAP[categoriaValida] || '04 - Random';
                const proposedName = `${itemSerie} - ${itemPersonagem} v${finalVersion}${ext}`;

                return {
                    originalFile: item.arquivo,
                    categoria: categoriaValida,
                    targetFolder: folderCategory,
                    serie: itemSerie,
                    personagem: itemPersonagem,
                    studio: item.studio,
                    confianca: Math.round((item.confianca || 0.95) * 100),
                    versaoCalculada: finalVersion,
                    versoesExistentes: existingVersions.sort((a, b) => a - b),
                    figurasExistentes: (matchingFigures || []).filter((f: any) => exactBaseRegex.test(f.nome)).map((f: any) => f.nome),
                    proposedName: proposedName
                };
            })
        );

        return NextResponse.json({
            success: true,
            modelUsed,
            totalAnalyzed: finalResults.length,
            results: finalResults
        });
    } catch (error: any) {
        console.error('Erro na análise de IA:', error);
        return NextResponse.json({ error: error.message || 'Erro interno na análise' }, { status: 500 });
    }
}
