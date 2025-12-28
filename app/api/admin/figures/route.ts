
import { NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase';

// LISTAR FIGURAS + METADADOS
export async function GET() {
    try {
        const { data, error } = await supabase
            .from('figuras')
            .select(`
        id, 
        nome, 
        imagem_url,
        series ( nome ),
        figuras_meta ( 
          altura_cm, 
          largura_cm, 
          profundidade_cm, 
          resina_kg, 
          horas_impressao, 
          horas_pintura 
        )
      `)
            .order('id', { ascending: true });

        if (error) throw error;

        // Formatar para ficar plano (flat) para o frontend
        const formatted = data.map((item: any) => {
            const meta = item.figuras_meta;
            return {
                id: item.id,
                nome: item.nome,
                serie: item.series?.nome || 'Sem Série',
                imagem_url: item.imagem_url,
                altura_cm: meta?.altura_cm || 0,
                largura_cm: meta?.largura_cm || 0,
                profundidade_cm: meta?.profundidade_cm || 0,
                resina_kg: meta?.resina_kg || 0,
                horas_impressao: meta?.horas_impressao || 0,
                horas_pintura: meta?.horas_pintura || 0,
            };
        });

        return NextResponse.json(formatted);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// ATUALIZAR FIGURA (METADATA)
export async function PUT(req: Request) {
    try {
        const body = await req.json();
        const { id, ...meta } = body;

        // Atualiza apenas a tabela meta
        const { error } = await supabase
            .from('figuras_meta')
            .upsert({
                figura_id: id,
                ...meta,
                updated_at: new Date().toISOString()
            }, { onConflict: 'figura_id' });

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
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
