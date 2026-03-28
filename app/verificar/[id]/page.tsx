import { createClient } from '@supabase/supabase-js';
import Image from 'next/image';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function VerificarPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;

    const { data: sale } = await supabase
        .from('vendas')
        .select('id')
        .eq('id', id)
        .single();

    return (
        <div className="min-h-screen bg-black flex items-center justify-center p-4">
            <div className="max-w-md w-100 flex flex-col items-center">
                {sale ? (
                    <img 
                        src="/Aprovado.png" 
                        alt="Autenticidade Confirmada"
                        style={{ width: '100%', height: 'auto' }}
                    />
                ) : (
                    <img 
                        src="/Reprovado.png" 
                        alt="Não Encontrado"
                        style={{ width: '100%', height: 'auto' }}
                    />
                )}
            </div>
        </div>
    );
}
