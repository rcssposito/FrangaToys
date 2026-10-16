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

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const files: string[] = body.files || [];

        if (!files.length) {
            return NextResponse.json({ error: 'Nenhum arquivo fornecido para análise.' }, { status: 400 });
        }

        const geminiKey = process.env.GEMINI_API_KEY;
        if (!geminiKey) {
            return NextResponse.json({ error: 'GEMINI_API_KEY não configurada no ambiente.' }, { status: 500 });
        }

        // 1. Busca nomes de séries mais comuns para dar contexto ao modelo
        const { data: existingSeries } = await supabase
            .from('series')
            .select('nome')
            .limit(200);

        const seriesList = (existingSeries || []).map(s => s.nome).join(', ');

        // 2. Monta o Prompt Especializado
        const prompt = `Você é um especialista em organização de arquivos 3D e taxonomia de colecionáveis da loja Franga Toys.
Categorias válidas: Anime, Games, Marvel, DC, Random.

Algumas séries já existentes no catálogo da loja para referência de grafia:
${seriesList}

Para cada arquivo fornecido na lista abaixo, identifique:
1. "categoria": Uma entre: "Anime", "Games", "Marvel", "DC", "Random".
2. "serie": O nome canônico oficial da franquia (ex: "Dragon Age", "Chainsaw Man", "Naruto", "The Witcher", "Movies - Puss in Boots"). Se for peça original de estúdio (Patreon), use o nome do estúdio ou "Originals".
3. "personagem": O nome limpo do personagem principal (ex: "Morrigan", "Power", "Geralt", "Puss in Boots"). Remova tags de fatiamento 3D como STL, Pre-Supported, 3D, v1.0, data, etc.
4. "studio": O estúdio criador se identificado no nome (ex: "Nomnom Figures", "Bulkamancer", "Sanix", etc). Caso contrário, "Não detectado".
5. "confianca": Valor de 0.0 a 1.0 indicando sua certeza na identificação.

Responda SOMENTE com um JSON array estruturado exatamente neste formato:
[
  {
    "arquivo": "nome original exato do arquivo",
    "categoria": "...",
    "serie": "...",
    "personagem": "...",
    "studio": "...",
    "confianca": 0.95
  }
]

Arquivos para analisar:
${JSON.stringify(files)}`;

        // 3. Chamada ao Google Gemini REST API
        const geminiRes = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
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
            throw new Error(`Falha na API Gemini: ${geminiRes.status} - ${errText}`);
        }

        const geminiData = await geminiRes.json();
        const rawJsonText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!rawJsonText) {
            throw new Error('Nenhuma resposta gerada pela IA.');
        }

        const aiResults: Array<{
            arquivo: string;
            categoria: string;
            serie: string;
            personagem: string;
            studio: string;
            confianca: number;
        }> = JSON.parse(rawJsonText);

        // 4. Execução Determinística: Validação com Banco de Dados para Cálculo de Versão
        const finalResults = await Promise.all(
            aiResults.map(async (item) => {
                const ext = path.extname(item.arquivo).toLowerCase();
                const categoriaValida = CATEGORY_FOLDER_MAP[item.categoria] ? item.categoria : 'Random';
                const folderCategory = CATEGORY_FOLDER_MAP[categoriaValida] || '04 - Random';

                // Consulta figuras existentes com nome parecido para detectar histórico de versões
                const searchPattern = `%${item.personagem}%`;
                const { data: matchingFigures } = await supabase
                    .from('figuras')
                    .select('id, nome')
                    .ilike('nome', searchPattern);

                // Filtra figuras da mesma série / personagem
                const sameCharFigures = (matchingFigures || []).filter(f => {
                    const nomeLower = f.nome.toLowerCase();
                    const serieLower = item.serie.toLowerCase();
                    const charLower = item.personagem.toLowerCase();
                    return nomeLower.includes(charLower) && (nomeLower.includes(serieLower) || item.categoria === 'Random');
                });

                // Detecta versões existentes (procura por " v1", " v2", etc.)
                const versions: number[] = [];
                sameCharFigures.forEach(f => {
                    const match = f.nome.match(/v(\d+)/i);
                    if (match && match[1]) {
                        versions.push(parseInt(match[1], 10));
                    }
                });

                let nextVersion = 1;
                if (versions.length > 0) {
                    const maxVersion = Math.max(...versions);
                    nextVersion = maxVersion + 1;
                }

                // Monta o nome proposto padronizado: "Série - Personagem Vn.ext"
                const proposedName = `${item.serie} - ${item.personagem} v${nextVersion}${ext}`;

                return {
                    originalFile: item.arquivo,
                    categoria: categoriaValida,
                    targetFolder: folderCategory,
                    serie: item.serie,
                    personagem: item.personagem,
                    studio: item.studio,
                    confianca: Math.round((item.confianca || 0.9) * 100),
                    versaoCalculada: nextVersion,
                    versoesExistentes: versions.sort((a, b) => a - b),
                    figurasExistentes: sameCharFigures.map(f => f.nome),
                    proposedName: proposedName
                };
            })
        );

        return NextResponse.json({
            success: true,
            totalAnalyzed: finalResults.length,
            results: finalResults
        });
    } catch (error: any) {
        console.error('Erro na análise de IA:', error);
        return NextResponse.json({ error: error.message || 'Erro interno na análise' }, { status: 500 });
    }
}
