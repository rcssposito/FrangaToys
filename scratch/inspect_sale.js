const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || process.env.SUPABASE_URI;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function main() {
    if (!supabaseUrl || !supabaseServiceKey) {
        console.error('Missing env variables. Make sure to run node with --env-file=.env');
        return;
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
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

    console.log('SALE 47:', JSON.stringify(sale, null, 2));

    if (sale.cliente_id) {
        const { data: client } = await supabase
            .from('clientes')
            .select('*')
            .eq('id', sale.cliente_id)
            .single();
        console.log('CLIENT DETAILS:', JSON.stringify(client, null, 2));
    }
}

main();
