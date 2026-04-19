
import { NextResponse, NextRequest } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase';
import { createClient } from '@/lib/supabase/server';

const checkAuth = async () => {
    const supabaseClient = await createClient();
    const { data: { user }, error } = await supabaseClient.auth.getUser();
    if (error || !user || !user.email) return null;

    const { data: adminUser } = await supabase
        .from('admin_users')
        .select('id, email, roles')
        .eq('email', user.email)
        .single();

    if (!adminUser) return null;
    return adminUser;
};


// LISTAR FIGURAS + METADADOS
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const search = searchParams.get('search') || '';
        const categoria_id = searchParams.get('categoria_id');
        const studio_id = searchParams.get('studio_id');
        const page = parseInt(searchParams.get('page') || '0');
        const limit = parseInt(searchParams.get('limit') || '50');

        // Dynamically select join type based on filtering
        const shouldFilterCategory = categoria_id && categoria_id !== '0';
        const seriesJoin = shouldFilterCategory ? 'series:series!inner' : 'series:series';
        // Note: We need 'categorias' inside series to display category name even if not filtering
        // But if filtering, we want !inner to ensure match.
        const categoryJoin = shouldFilterCategory ? 'categorias:categorias!inner' : 'categorias:categorias';

        let query = supabase
            .from('figuras')
            .select(`
        id, 
        nome, 
        codigo,
        imagem_url,
        disponivel,
        tem_extras,
        sinonimos,
        serie_id,
        studio_id,
        ${seriesJoin} ( 
            nome, 
            ${categoryJoin} ( nome, id ) 
        ),
        figuras_meta ( 
          altura_cm, 
          largura_cm, 
          profundidade_cm, 
          resina_kg, 
          horas_impressao, 
          horas_pintura,
          escala
        )
      `);

        // 1. Filter by Category ID
        if (shouldFilterCategory) {
            query = query.eq('series.categorias.id', categoria_id);
        }

        // 1b. Filter by Studio ID
        if (studio_id && studio_id !== '0') {
            query = query.eq('studio_id', studio_id);
        }

        // 2. Filter by Search Term (Name)
        if (search) {
            query = query.or(`nome.ilike.%${search}%,sinonimos.ilike.%${search}%`);
        }

        // 3. Sorting
        const isNovidades = searchParams.get('novidades') === 'true';
        if (isNovidades) {
            query = query.order('id', { ascending: false });
        } else {
            // "No botão todos a busca é por ordem alfabética"
            query = query.order('nome', { ascending: true });
        }

        const from = page * limit;
        const to = from + limit - 1;
        query = query.range(from, to);

        const { data, error } = await query;

        if (error) throw error;

        // Helper to extract category safely
        const getCategory = (item: any) => {
            const series = Array.isArray(item.series) ? item.series[0] : item.series;
            if (!series) return { nome: 'Outros', id: 0 };

            const cat = Array.isArray(series.categorias) ? series.categorias[0] : series.categorias;
            if (!cat) return { nome: 'Outros', id: 0 };

            return cat;
        };

        // Formatar para ficar plano (flat) para o frontend
        const formatted = data.map((item: any) => {
            const meta = item.figuras_meta && item.figuras_meta.length > 0 ? item.figuras_meta[0] : (item.figuras_meta || {});
            const cat = getCategory(item);

            return {
                id: item.id,
                nome: item.nome,
                codigo: item.codigo,
                serie: (Array.isArray(item.series) ? item.series[0]?.nome : item.series?.nome) || 'Sem Série',
                categoria: cat.nome || 'Outros',
                categoria_id: cat.id || 0,
                imagem_url: item.imagem_url,
                disponivel: item.disponivel || false,
                tem_extras: item.tem_extras || false,
                sinonimos: item.sinonimos || '',
                altura_cm: meta.altura_cm ?? 0,
                largura_cm: meta.largura_cm ?? 0,
                profundidade_cm: meta.profundidade_cm ?? 0,
                resina_kg: meta.resina_kg ?? 0,
                horas_impressao: meta.horas_impressao ?? 0,
                horas_pintura: meta.horas_pintura ?? 0,
                escala: meta.escala ?? 100,
            };
        });

        const nextCursor = formatted.length === limit ? page + 1 : undefined;

        return NextResponse.json({ items: formatted, nextCursor });

    } catch (error: any) {
        console.error('Error fetching figures:', error);
        return NextResponse.json({ error: 'Failed to fetch figures' }, { status: 500 });
    }
}

// ATUALIZAR FIGURA (METADATA)
export async function PUT(req: Request) {
    try {
        const session = await checkAuth();
        if (!session || !session.roles || (!session.roles.includes('admin') && !session.roles.includes('pricing'))) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const body = await req.json();
        const { id, nome, serie, imagem_url, disponivel, tem_extras, sinonimos, ...rawMeta } = body;

        const updateFields: any = {};
        if (nome !== undefined) updateFields.nome = nome;
        if (disponivel !== undefined) updateFields.disponivel = disponivel;
        if (tem_extras !== undefined) updateFields.tem_extras = tem_extras;
        // Removido: O catálogo não pode escrever diretamente o sinônimo na tabela figuras.
        // if (sinonimos !== undefined) updateFields.sinonimos = sinonimos;

        if (Object.keys(updateFields).length > 0 || sinonimos !== undefined) {
            // Get slug dynamically if we need to sync to figuras_sinonimos
            let figuraSlug = null;
            if (sinonimos !== undefined) {
                const { data: slugData } = await supabase
                    .from('figuras')
                    .select('slug')
                    .eq('id', id)
                    .single();
                figuraSlug = slugData?.slug;
            }

            if (Object.keys(updateFields).length > 0) {
                const { error: figError } = await supabase
                    .from('figuras')
                    .update(updateFields)
                    .eq('id', id);

                if (figError) {
                    console.error('Error updating figuras:', figError);
                }
            }

            if (sinonimos !== undefined && figuraSlug) {
                const { error: sinError } = await supabase
                    .from('figuras_sinonimos')
                    .upsert({ figura_slug: figuraSlug, sinonimos }, { onConflict: 'figura_slug' });
                
                if (sinError) {
                    console.error('Error updating figuras_sinonimos from catalog:', sinError);
                }
            }
        }

        // Filter to ensure only valid columns are passed to Supabase
        const meta: any = {
            resina_kg: rawMeta.resina_kg,
            horas_impressao: rawMeta.horas_impressao,
            horas_pintura: rawMeta.horas_pintura,
            altura_cm: rawMeta.altura_cm,
            largura_cm: rawMeta.largura_cm,
            profundidade_cm: rawMeta.profundidade_cm,
            escala: rawMeta.escala
        };

        // SMART SCALING LOGIC
        // SMART SCALING LOGIC (Non-Destructive)
        // Fetch current meta including ORIGINAL dimensions
        const { data: currentMeta, error: fetchError } = await supabase
            .from('figuras_meta')
            .select('escala, altura_cm, largura_cm, profundidade_cm, altura_original, largura_original, profundidade_original')
            .eq('figura_id', id)
            .single();

        if (!fetchError && currentMeta) {
            const oldScale = Number(currentMeta.escala) || 100;
            const newScale = Number(meta.escala) || 100;

            const hasScaleChanged = oldScale !== newScale && newScale > 0;

            if (hasScaleChanged) {
                // CASE 1: Scale Changed -> Recalculate dimensions from ORIGINAL
                // If original is missing (shouldn't happen with backfill), backfill on the fly
                const factor = newScale / 100.0;

                const originalH = currentMeta.altura_original ?? (currentMeta.altura_cm && oldScale > 0 ? currentMeta.altura_cm / (oldScale / 100.0) : null);
                const originalW = currentMeta.largura_original ?? (currentMeta.largura_cm && oldScale > 0 ? currentMeta.largura_cm / (oldScale / 100.0) : null);
                const originalD = currentMeta.profundidade_original ?? (currentMeta.profundidade_cm && oldScale > 0 ? currentMeta.profundidade_cm / (oldScale / 100.0) : null);

                if (originalH !== null) meta.altura_cm = Math.round(Number(originalH) * factor);
                if (originalW !== null) meta.largura_cm = Math.round(Number(originalW) * factor);
                if (originalD !== null) meta.profundidade_cm = Math.round(Number(originalD) * factor);

                // Ensure Originals are set if they were missing and we have them now
                if (originalH !== null) meta.altura_original = originalH;
                if (originalW !== null) meta.largura_original = originalW;
                if (originalD !== null) meta.profundidade_original = originalD;

            } else {
                // CASE 2: Scale NOT Changed -> Check for Manual Dimension Edits
                // If user edited height manually, we must update the ORIGINAL to match this new reality at current scale.
                const scaleFactor = (newScale || 100) / 100.0;

                if (meta.altura_cm !== undefined && meta.altura_cm !== currentMeta.altura_cm) {
                    meta.altura_original = meta.altura_cm !== null ? meta.altura_cm / scaleFactor : null;
                }
                if (meta.largura_cm !== undefined && meta.largura_cm !== currentMeta.largura_cm) {
                    meta.largura_original = meta.largura_cm !== null ? meta.largura_cm / scaleFactor : null;
                }
                if (meta.profundidade_cm !== undefined && meta.profundidade_cm !== currentMeta.profundidade_cm) {
                    meta.profundidade_original = meta.profundidade_cm !== null ? meta.profundidade_cm / scaleFactor : null;
                }
            }
        } else {
            // CASE 3: New Record (No currentMeta)
            // Initialize Original Dimensions based on provided dimensions and scale
            const scaleFactor = (Number(meta.escala) || 100) / 100.0;
            if (meta.altura_cm !== undefined) meta.altura_original = meta.altura_cm !== null ? meta.altura_cm / scaleFactor : null;
            if (meta.largura_cm !== undefined) meta.largura_original = meta.largura_cm !== null ? meta.largura_cm / scaleFactor : null;
            if (meta.profundidade_cm !== undefined) meta.profundidade_original = meta.profundidade_cm !== null ? meta.profundidade_cm / scaleFactor : null;
        }

        console.log('Upserting meta for ID:', id, meta);

        // Atualiza apenas a tabela meta
        const { error } = await supabase
            .from('figuras_meta')
            .upsert({
                figura_id: id,
                ...meta
            }, { onConflict: 'figura_id' });

        if (error) {
            console.error('Supabase Upsert Error Detailed:', JSON.stringify(error, null, 2));
            return NextResponse.json({ error: 'Database Error', details: error }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('API Catch Error:', error);
        return NextResponse.json({ error: error.message || 'Unknown Error', stack: error.stack }, { status: 500 });
    }
}

// DELETAR FIGURA
export async function DELETE(req: Request) {
    try {
        const session = await checkAuth();
        if (!session || !session.roles || (!session.roles.includes('admin') && !session.roles.includes('pricing'))) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const { id } = await req.json();
        if (!id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 });

        // 1. Buscar dados da figura para limpeza (Slug e Imagem)
        const { data: figura } = await supabase
            .from('figuras')
            .select('slug, imagem_url')
            .eq('id', id)
            .single();

        // 1.5 Limpeza no ImageKit (Aguardamos para garantir que a Vercel não mate o processo)
        if (figura?.imagem_url) {
            try {
                console.log(`[CleanUp] Iniciando limpeza para: ${figura.imagem_url}`);
                await deleteImageFromImageKit(figura.imagem_url);
            } catch (err) {
                console.error('[ImageKit] Falha na limpeza automática:', err);
                // Não travamos a execução principal se a limpeza falhar
            }
        }

        // 2. Desvincular Vendas...

        // 2. Desvincular Vendas (Preserva o histórico financeiro, apenas remove a ligação com o ID)
        const { error: errorVendas } = await supabase
            .from('vendas')
            .update({ figura_id: null })
            .eq('figura_id', id);
        
        if (errorVendas) console.error('Erro ao desvincular vendas:', errorVendas);

        // 3. Deletar Metadados
        const { error: errorMeta } = await supabase
            .from('figuras_meta')
            .delete()
            .eq('figura_id', id);

        if (errorMeta) console.error('Erro ao deletar metadados:', errorMeta);

        // 4. Deletar Sinônimos (se o slug existir)
        if (figura?.slug) {
            const { error: errorSin } = await supabase
                .from('figuras_sinonimos')
                .delete()
                .eq('figura_slug', figura.slug);
            
            if (errorSin) console.error('Erro ao deletar sinônimos:', errorSin);
        }

        // 5. Exclusão Final da Figura
        const { error: errorFigura } = await supabase
            .from('figuras')
            .delete()
            .eq('id', id);

        if (errorFigura) throw errorFigura;

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Erro fatal na exclusão:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// HELPER: Limpeza de imagem no ImageKit via API REST
async function deleteImageFromImageKit(url: string) {
    const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;
    const endpoint = process.env.IMAGEKIT_URL_ENDPOINT || 'https://ik.imagekit.io/lojinha3d';

    if (!privateKey) {
        console.warn('[ImageKit] Private Key não configurada. Limpeza abortada.');
        return;
    }

    try {
        // 1. Extrair o path relativo (ignora query params e o hostname)
        // Ex: https://ik.imagekit.io/lojinha3d/random/figura.webp -> random/figura.webp
        const cleanUrl = url.split('?')[0];
        
        if (!cleanUrl.includes(endpoint)) {
            console.log('[ImageKit] URL não pertence ao endpoint configurado. Ignorando.');
            return;
        }

        let path = cleanUrl.replace(endpoint, '');
        if (path.startsWith('/')) path = path.substring(1);
        
        if (!path) return;

        console.log(`[ImageKit] Tentando localizar arquivo: ${path}`);

        // Auth Header (Basic Auth: privateKey + :)
        const auth = Buffer.from(`${privateKey}:`).toString('base64');

        // 2. Buscar o fileId pelo path (ImageKit API)
        // IMPORTANTE: encodeURIComponent no path para evitar erro em nomes com espaços/traços
        const listResponse = await fetch(`https://api.imagekit.io/v1/files?path=${encodeURIComponent(path)}`, {
            headers: { 'Authorization': `Basic ${auth}` }
        });

        if (!listResponse.ok) {
            console.error(`[ImageKit] Erro ao buscar arquivo (${listResponse.status}): ${listResponse.statusText}`);
            return;
        }
        
        const files: any = await listResponse.json();
        if (!files || files.length === 0) {
            // Tenta uma busca secundária sem o path exato se falhou (fallback)
            console.log(`[ImageKit] Busca exata por path falhou para: ${path}. Tentando busca por nome.`);
            const fileName = path.split('/').pop() || '';
            const listResponseFallback = await fetch(`https://api.imagekit.io/v1/files?name=${encodeURIComponent(fileName)}`, {
                headers: { 'Authorization': `Basic ${auth}` }
            });
            const fallbackFiles: any = await listResponseFallback.json();
            
            if (!fallbackFiles || fallbackFiles.length === 0) {
                console.log(`[ImageKit] Arquivo não encontrado após fallback: ${fileName}`);
                return;
            }
            
            // Verifica se o path bate (segurança para não deletar arquivos com mesmo nome em pastas diferentes)
            const match = fallbackFiles.find((f: any) => f.filePath === '/' + path || f.filePath === path);
            if (!match) {
                console.log(`[ImageKit] Nome encontrado mas caminho não confere.`);
                return;
            }
            files.push(match);
        }

        const fileId = files[0].fileId;

        // 3. Deletar pelo fileId
        console.log(`[ImageKit] Deletando fileId: ${fileId}`);
        const deleteResponse = await fetch(`https://api.imagekit.io/v1/files/${fileId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Basic ${auth}` }
        });

        if (deleteResponse.ok) {
            console.log(`[ImageKit] Limpeza concluída com sucesso: ${fileId} (${path})`);
        } else {
            const errorData = await deleteResponse.json();
            console.error(`[ImageKit] Falha na exclusão do arquivo ${fileId}:`, errorData);
        }
    } catch (err) {
        console.error('[ImageKit] Erro crítico na limpeza automática:', err);
    }
}
