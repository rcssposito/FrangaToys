
import { NextResponse, NextRequest } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase';

// LISTAR FIGURAS + METADADOS
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const search = searchParams.get('search') || '';
        const categoria_id = searchParams.get('categoria_id');

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
        imagem_url,
        tem_extras,
        serie_id,
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

        // 2. Filter by Search Term (Name)
        if (search) {
            query = query.ilike('nome', `%${search}%`);
        }

        // 3. Sorting
        // "No botão todos a busca é por ordem alfabética"
        query = query.order('nome', { ascending: true });

        // Remove arbitrary limits (or set a very high one if pagination is not strictly implemented in frontend yet)
        query = query.range(0, 4999);

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
                serie: (Array.isArray(item.series) ? item.series[0]?.nome : item.series?.nome) || 'Sem Série',
                categoria: cat.nome || 'Outros',
                categoria_id: cat.id || 0,
                imagem_url: item.imagem_url,
                tem_extras: item.tem_extras || false,
                altura_cm: meta.altura_cm ?? 0,
                largura_cm: meta.largura_cm ?? 0,
                profundidade_cm: meta.profundidade_cm ?? 0,
                resina_kg: meta.resina_kg ?? 0,
                horas_impressao: meta.horas_impressao ?? 0,
                horas_pintura: meta.horas_pintura ?? 0,
                escala: meta.escala ?? 100,
            };
        });

        return NextResponse.json(formatted);

    } catch (error: any) {
        console.error('Error fetching figures:', error);
        return NextResponse.json({ error: 'Failed to fetch figures' }, { status: 500 });
    }
}

// ATUALIZAR FIGURA (METADATA)
export async function PUT(req: Request) {
    try {
        const body = await req.json();
        const { id, nome, serie, imagem_url, tem_extras, ...rawMeta } = body;

        if (tem_extras !== undefined) {
            const { error: figError } = await supabase
                .from('figuras')
                .update({ tem_extras })
                .eq('id', id);

            if (figError) {
                console.error('Error updating figuras:', figError);
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
        const { id } = await req.json();
        if (!id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 });

        const { error } = await supabase.from('figuras').delete().eq('id', id);
        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
