import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const imageUrl = searchParams.get('url');

    if (!imageUrl) {
        return new NextResponse('URL parameter missing', { status: 400 });
    }

    try {
        const res = await fetch(imageUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        if (!res.ok) {
            return new NextResponse(`Failed to fetch image: ${res.statusText}`, { status: res.status });
        }

        const contentType = res.headers.get('content-type') || 'image/png';
        const buffer = await res.arrayBuffer();

        return new NextResponse(buffer, {
            status: 200,
            headers: {
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=86400, s-maxage=86400',
                'Access-Control-Allow-Origin': '*'
            }
        });
    } catch (err: any) {
        console.error('Erro no proxy de imagem:', err);
        return new NextResponse(`Error proxying image: ${err?.message || err}`, { status: 500 });
    }
}
