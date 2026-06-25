import { supabaseAdmin as supabase } from '../lib/supabase.ts';

async function main() {
    const { data: sale, error } = await supabase
        .from('vendas')
        .select(`
            *,
            figuras (
                nome,
                codigo
            )
        `)
        .eq('id', 47)
        .single();

    if (error) {
        console.error('Error fetching sale:', error);
        return;
    }

    console.log('SALE 47:', sale);

    if (sale.cliente_id) {
        const { data: client } = await supabase
            .from('clientes')
            .select('*')
            .eq('id', sale.cliente_id)
            .single();
        console.log('CLIENT DETAILS:', client);
    }
}

main();
