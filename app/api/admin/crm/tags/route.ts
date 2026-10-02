import { NextResponse } from 'next/server';
import { requireRoles } from '@/lib/server-auth';
import { supabaseAdmin as supabase } from '@/lib/supabase';

export const DEFAULT_SUGGESTED_TAGS = [
    'VIP',
    'Colecionador Anime',
    'Gamer',
    'Lead Quente',
    'Inativo',
    'Comprador Recorrente',
    'Atacado',
    'Marvel & DC',
    'Geek & Cinema'
];

// LISTAR TODAS AS TAGS E CONTAGEM
export async function GET(req: Request) {
    try {
        const sessionOrResponse = await requireRoles(['admin', 'sales', 'finance']);
        if (sessionOrResponse instanceof NextResponse) return sessionOrResponse;

        const { data: clients, error } = await supabase
            .from('clientes')
            .select('tags');

        if (error) throw error;

        // Contabilizar tags existentes
        const tagCounts: Record<string, number> = {};
        
        // Inicializar com as tags padrão (contador 0)
        DEFAULT_SUGGESTED_TAGS.forEach(tag => {
            tagCounts[tag] = 0;
        });

        (clients || []).forEach(c => {
            if (Array.isArray(c.tags)) {
                c.tags.forEach((t: string) => {
                    const trimmed = t.trim();
                    if (trimmed) {
                        tagCounts[trimmed] = (tagCounts[trimmed] || 0) + 1;
                    }
                });
            }
        });

        const result = Object.entries(tagCounts)
            .map(([name, count]) => ({
                name,
                count,
                isDefault: DEFAULT_SUGGESTED_TAGS.includes(name)
            }))
            .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

        return NextResponse.json({
            tags: result,
            defaults: DEFAULT_SUGGESTED_TAGS
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// ATRIBUIÇÃO EM MASSA DE TAGS
export async function POST(req: Request) {
    try {
        const sessionOrResponse = await requireRoles(['admin', 'sales', 'finance']);
        if (sessionOrResponse instanceof NextResponse) return sessionOrResponse;

        const body = await req.json();
        const { clientIds, tag, action } = body; // action: 'add' | 'remove'

        if (!Array.isArray(clientIds) || !clientIds.length || !tag) {
            return NextResponse.json({ error: 'clientIds e tag são obrigatórios' }, { status: 400 });
        }

        const normalizedTag = tag.trim();

        // Buscar clientes atuais
        const { data: clients, error: fetchErr } = await supabase
            .from('clientes')
            .select('id, tags')
            .in('id', clientIds);

        if (fetchErr) throw fetchErr;

        let updatedCount = 0;

        for (const client of (clients || [])) {
            let currentTags: string[] = Array.isArray(client.tags) ? [...client.tags] : [];
            
            if (action === 'remove') {
                currentTags = currentTags.filter(t => t.toLowerCase() !== normalizedTag.toLowerCase());
            } else {
                if (!currentTags.some(t => t.toLowerCase() === normalizedTag.toLowerCase())) {
                    currentTags.push(normalizedTag);
                }
            }

            const { error: updateErr } = await supabase
                .from('clientes')
                .update({ tags: currentTags })
                .eq('id', client.id);

            if (!updateErr) updatedCount++;
        }

        return NextResponse.json({ 
            success: true, 
            updatedCount, 
            message: `Tag "${normalizedTag}" ${action === 'remove' ? 'removida de' : 'aplicada em'} ${updatedCount} clientes.` 
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
