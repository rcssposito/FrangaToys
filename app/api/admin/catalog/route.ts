import { NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase';

export async function PUT(req: Request) {
    try {
        const body = await req.json();
        const { updates } = body;

        if (!Array.isArray(updates)) {
            return NextResponse.json({ error: 'Updates must be an array' }, { status: 400 });
        }

        console.log(`[BatchUpdate] Processing ${updates.length} items...`);

        const errors = [];
        let successCount = 0;

        for (const item of updates) {
            const { id, ...fields } = item;

            // Split fields between 'figuras' and 'figuras_meta'
            const figuraFields: any = {};
            const metaFields: any = {};

            // Map frontend keys to DB columns
            if (fields.nome !== undefined) figuraFields.nome = fields.nome;
            if (fields.serie_id !== undefined) figuraFields.serie_id = fields.serie_id;
            if (fields.studio_id !== undefined) figuraFields.studio_id = fields.studio_id;

            if (fields.altura_cm !== undefined) metaFields.altura_cm = fields.altura_cm;
            if (fields.resina_kg !== undefined) metaFields.resina_kg = fields.resina_kg;
            if (fields.horas_impressao !== undefined) metaFields.horas_impressao = fields.horas_impressao;
            if (fields.horas_pintura !== undefined) metaFields.horas_pintura = fields.horas_pintura;

            // Update 'figuras'
            if (Object.keys(figuraFields).length > 0) {
                const { error } = await supabase.from('figuras').update(figuraFields).eq('id', id);
                if (error) {
                    errors.push({ id, table: 'figuras', error: error.message });
                    continue; // Skip meta update if base fails?
                }
            }

            // Update 'figuras_meta' (Upsert is safer if row doesn't exist)
            if (Object.keys(metaFields).length > 0) {
                // Check if meta exists
                const { data: existingMeta } = await supabase.from('figuras_meta').select('figura_id').eq('figura_id', id).single();

                let metaError;
                if (existingMeta) {
                    const { error } = await supabase.from('figuras_meta').update(metaFields).eq('figura_id', id);
                    metaError = error;
                } else {
                    const { error } = await supabase.from('figuras_meta').insert({ figura_id: id, ...metaFields });
                    metaError = error;
                }

                if (metaError) {
                    errors.push({ id, table: 'figuras_meta', error: metaError.message });
                }
            }
            successCount++;
        }

        if (errors.length > 0) {
            return NextResponse.json({
                success: false,
                message: `Processed with ${errors.length} errors`,
                errors
            }, { status: 207 });
        }

        return NextResponse.json({ success: true, count: successCount });

    } catch (error: any) {
        console.error('Batch update error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
