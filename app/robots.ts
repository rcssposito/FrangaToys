
import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
    return {
        rules: [
            {
                userAgent: '*',
                disallow: '/', // Bloqueia 100% de indexação para crawlers
            },
        ],
    };
}

