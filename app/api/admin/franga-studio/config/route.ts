import { NextRequest, NextResponse } from 'next/server';
import { requireRoles } from '@/lib/server-auth';
import { supabaseAdmin as supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const { data } = await supabase
            .from('franga_studio_config')
            .select('key, value');

        const configMap: Record<string, any> = {};
        (data || []).forEach(item => {
            configMap[item.key] = item.value;
        });

        const deliveryMode = configMap['delivery_mode'] || 'gumroad';
        const patreonAccessRule = configMap['patreon_access_rule'] || 'paid_only';
        let enabledProducts: string[] = [];
        try {
            if (configMap['enabled_gumroad_products']) {
                enabledProducts = JSON.parse(configMap['enabled_gumroad_products']);
            }
        } catch {}

        return NextResponse.json({
            deliveryMode,
            patreonAccessRule,
            enabledProducts
        });
    } catch (e: any) {
        return NextResponse.json({ deliveryMode: 'gumroad', patreonAccessRule: 'paid_only', enabledProducts: [] });
    }
}

export async function POST(req: NextRequest) {
    try {
        const auth = await requireRoles(['admin', 'franga_studio']);
        if (auth instanceof NextResponse) return auth;

        const body = await req.json();
        const { deliveryMode, patreonAccessRule, enabledProducts } = body;

        if (deliveryMode) {
            if (!['gumroad', 'drive', 'both'].includes(deliveryMode)) {
                return NextResponse.json({ error: 'Modo de entrega inválido. Escolha entre: gumroad, drive ou both' }, { status: 400 });
            }

            const { error: err1 } = await supabase
                .from('franga_studio_config')
                .upsert({
                    key: 'delivery_mode',
                    value: deliveryMode,
                    updated_at: new Date().toISOString()
                });
            if (err1) throw err1;
        }

        if (patreonAccessRule) {
            if (!['paid_only', 'all'].includes(patreonAccessRule)) {
                return NextResponse.json({ error: 'Regra de acesso inválida. Escolha entre: paid_only ou all' }, { status: 400 });
            }

            const { error: errRule } = await supabase
                .from('franga_studio_config')
                .upsert({
                    key: 'patreon_access_rule',
                    value: patreonAccessRule,
                    updated_at: new Date().toISOString()
                });
            if (errRule) throw errRule;
        }

        if (Array.isArray(enabledProducts)) {
            const { error: err2 } = await supabase
                .from('franga_studio_config')
                .upsert({
                    key: 'enabled_gumroad_products',
                    value: JSON.stringify(enabledProducts),
                    updated_at: new Date().toISOString()
                });
            if (err2) throw err2;
        }

        return NextResponse.json({
            success: true,
            deliveryMode,
            patreonAccessRule,
            enabledProducts
        });
    } catch (error: any) {
        console.error('Erro ao salvar configuração do Franga Studio:', error);
        return NextResponse.json({ error: error.message || 'Erro interno' }, { status: 500 });
    }
}

