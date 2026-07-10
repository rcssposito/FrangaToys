import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase';
import { createHash } from 'crypto';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { status } = body;

        if (status !== 'accepted' && status !== 'rejected') {
            return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
        }

        const ip = req.headers.get('x-forwarded-for') || 'unknown-ip';
        const userAgent = req.headers.get('user-agent') || 'unknown-user-agent';

        // Hash IP to comply with LGPD guidelines on personal identifiers logging
        const ipHash = createHash('sha256').update(ip).digest('hex');

        const { error } = await supabase
            .from('consent_logs')
            .insert({
                ip_hash: ipHash,
                user_agent: userAgent,
                consent_type: status
            });

        if (error) {
            console.error('Error inserting consent log:', error);
            throw error;
        }

        return NextResponse.json({ success: true });
    } catch (err: any) {
        console.error('Consent logging API error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
