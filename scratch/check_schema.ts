
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkSchema() {
    console.log('--- BUSCANDO EXEMPLO DE FIGURA E ESTÚDIO ---');
    
    // Tentativa 1: Buscar colunas de figuras
    const { data: figures, error: figError } = await supabase
        .from('figuras')
        .select('*')
        .limit(1);

    if (figures && figures[0]) {
        console.log('Colunas de figuras:', Object.keys(figures[0]));
    }

    // Tentativa 2: Buscar colunas de studios
    const { data: studios, error: stuError } = await supabase
        .from('studios')
        .select('*')
        .limit(1);

    if (studios && studios[0]) {
        console.log('Colunas de studios:', Object.keys(studios[0]));
    }
}

checkSchema();
