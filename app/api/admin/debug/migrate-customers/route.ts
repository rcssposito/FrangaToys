import { NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase';

export async function GET() {
    try {
        console.log('--- Iniciando Migração Automática de Clientes ---');

        // 1. Buscar todas as vendas que têm contato e nome
        const { data: sales, error: salesError } = await supabase
            .from('vendas')
            .select('cliente_nome, cliente_contato')
            .not('cliente_contato', 'is', null)
            .not('cliente_nome', 'is', null);

        if (salesError) throw salesError;

        // 2. Identificar clientes únicos (Agrupando por telefone)
        const customerMap = new Map();
        sales.forEach(s => {
            const contact = (s.cliente_contato || '').trim();
            const name = (s.cliente_nome || '').trim();
            if (contact && name && !customerMap.has(contact)) {
                customerMap.set(contact, name);
            }
        });

        const migrationStats = {
            totalVendasProcessadas: sales.length,
            clientesUnicosIdentificados: customerMap.size,
            novosClientesCriados: 0,
            erros: [] as string[]
        };

        // 3. Processar inserção e vínculo
        for (const [telefone, nome] of customerMap.entries()) {
            try {
                // Verificar se já existe
                const { data: existing } = await supabase
                    .from('clientes')
                    .select('id')
                    .eq('telefone', telefone)
                    .maybeSingle();

                let clienteId = existing?.id;

                if (!clienteId) {
                    // Criar cliente
                    const { data: newCustomer, error: createError } = await supabase
                        .from('clientes')
                        .insert([{ nome, telefone }])
                        .select()
                        .single();

                    if (createError) throw createError;
                    clienteId = newCustomer.id;
                    migrationStats.novosClientesCriados++;
                }

                // Vincular vendas ao cliente_id
                const { error: updateError } = await supabase
                    .from('vendas')
                    .update({ cliente_id: clienteId })
                    .eq('cliente_contato', telefone);

                if (updateError) throw updateError;

            } catch (err: any) {
                migrationStats.erros.push(`Falha no cliente ${nome} (${telefone}): ${err.message}`);
            }
        }

        return NextResponse.json({
            success: true,
            message: 'Migração concluída com sucesso!',
            stats: migrationStats
        });

    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
