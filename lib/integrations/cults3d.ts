export interface CultsModel {
    id: string;
    name: string;
    url: string;
    downloadsCount: number;
    likesCount: number;
    viewsCount: number;
    illustrationUrl: string;
    creatorName: string;
    isSubscribedStudio?: boolean;
}

export async function fetchCultsTrendingModels(limit: number = 8, subscribedStudiosList?: string[]): Promise<{ models: CultsModel[]; isConfigured: boolean }> {
    const apiKey = process.env.CULTS_API_KEY;

    if (!apiKey) {
        return { isConfigured: false, models: [] };
    }

    const liveModels: CultsModel[] = [];

    try {
        const username = process.env.CULTS_USERNAME || 'rcssposito';
        const authHeader = 'Basic ' + Buffer.from(`${username}:${apiKey}`).toString('base64');
        
        const studioSearchList = (subscribedStudiosList && subscribedStudiosList.length > 0)
            ? subscribedStudiosList
            : ['Bulkamancer', '3Dmoonn', 'Nomnom', 'Kaidan', 'Tanuki', 'LionRealm', 'h3LL'];

        for (const studioName of studioSearchList) {
            const query = `
                query SearchCreations($q: String!) {
                  creationsSearchBatch(query: $q, limit: 3) {
                    results {
                      id
                      name
                      url
                      downloadsCount
                      likesCount
                      illustrationUrl
                      creator {
                        nick
                      }
                    }
                  }
                }
            `;

            try {
                const response = await fetch('https://cults3d.com/graphql', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': authHeader,
                        'User-Agent': 'FrangaToysAdmin/1.0'
                    },
                    body: JSON.stringify({ query, variables: { q: studioName } }),
                    next: { revalidate: 3600 }
                });

                if (response.ok) {
                    const json = await response.json();
                    const results = json.data?.creationsSearchBatch?.results || [];

                    for (const item of results) {
                        liveModels.push({
                            id: item.id || '',
                            name: item.name || 'Sem Título',
                            url: item.url || `https://cults3d.com/en/search?q=${encodeURIComponent(studioName)}`,
                            downloadsCount: item.downloadsCount || 0,
                            likesCount: item.likesCount || 0,
                            viewsCount: item.likesCount ? item.likesCount * 3 : 0,
                            illustrationUrl: item.illustrationUrl || '',
                            creatorName: item.creator?.nick || studioName,
                            isSubscribedStudio: true
                        });
                    }
                }
            } catch (singleErr) {
                console.error(`Error searching Cults3D for studio ${studioName}:`, singleErr);
            }

            if (liveModels.length >= limit) break;
        }

        if (liveModels.length > 0) {
            return { isConfigured: true, models: liveModels.slice(0, limit) };
        }
    } catch (err) {
        console.error('Error fetching Cults3D API:', err);
    }

    return { isConfigured: true, models: liveModels };
}
