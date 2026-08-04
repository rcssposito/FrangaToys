import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const DEFAULT_REPO_URL = 'https://drive.google.com/drive/folders/1aB9Xx-NZe2K7lweVx33GMucElUsgzHEf';

/**
 * GET: Retorna a URL do repositório ativo do Patreon salva no banco.
 */
export async function GET() {
    try {
        const { data, error } = await supabase
            .from('download_tokens')
            .select('real_file_url')
            .eq('figure_id', -999) // Marcador especial para a URL de configuração do repositório ativo
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (error || !data?.real_file_url) {
            return NextResponse.json({ repoUrl: DEFAULT_REPO_URL });
        }

        return NextResponse.json({ repoUrl: data.real_file_url });
    } catch (e: any) {
        return NextResponse.json({ repoUrl: DEFAULT_REPO_URL });
    }
}

/**
 * POST: Atualiza a URL do repositório ativo no banco de dados.
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { repoUrl } = body;

        if (!repoUrl) {
            return NextResponse.json({ error: 'URL do repositório é obrigatória.' }, { status: 400 });
        }

        const cleanUrl = repoUrl.trim();

        // Salva a nova URL ativa no Supabase
        await supabase
            .from('download_tokens')
            .insert({
                token: `config_repo_${Date.now()}`,
                patron_email: 'admin@frangatoys.com.br',
                patron_name: 'Configuração Admin',
                figure_id: -999, // Marcador de repositório ativo
                file_name: 'Configuração da Pasta Ativa do Patreon',
                real_file_url: cleanUrl,
                is_used: true,
                used_at: new Date().toISOString()
            });

        return NextResponse.json({ success: true, repoUrl: cleanUrl });
    } catch (error: any) {
        console.error('Erro ao salvar repositório ativo:', error);
        return NextResponse.json({ error: error.message || 'Erro ao salvar no banco' }, { status: 500 });
    }
}
