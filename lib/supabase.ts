import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_API_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('--- SUPABASE CONFIG DEBUG ---');
console.log('URL available:', !!supabaseUrl);
console.log('Key available:', !!supabaseKey);
console.log('Service Key available:', !!supabaseServiceKey);

if (!supabaseUrl || !supabaseKey) {
    console.warn('CRITICAL: Supabase variables are missing! Check .env.local');
}

// Cliente padrão para o frontend (respeita RLS)
export const supabase = createClient(supabaseUrl!, supabaseKey!, {
    auth: {
        persistSession: false,
    },
});

// Cliente Admin para rotas de API (ignora RLS)
// Deve ser usado apenas no servidor
export const supabaseAdmin = supabaseServiceKey
    ? createClient(supabaseUrl!, supabaseServiceKey, {
        auth: {
            persistSession: false,
        },
    })
    : supabase;
