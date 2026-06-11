
async function testNominatim() {
    const originCep = '02755-090'; 
    const destCep = '01310-930';

    async function geocodeCep(cep: string) {
        const url = `https://nominatim.openstreetmap.org/search?postalcode=${encodeURIComponent(cep)}&country=Brazil&format=json`;
        try {
            const res = await fetch(url, {
                headers: {
                    'User-Agent': 'FrangaToys/1.0 (contato@frangatoys.com.br)'
                }
            });
            const data = await res.json();
            if (Array.isArray(data) && data.length > 0) {
                return {
                    lat: parseFloat(data[0].lat),
                    lon: parseFloat(data[0].lon),
                    displayName: data[0].display_name
                };
            }
        } catch (err: any) {
            console.error('Geocode error:', err.message);
        }
        return null;
    }

    console.log('Testando Nominatim...');
    const origin = await geocodeCep(originCep);
    console.log('Origem geocoded:', origin);

    const dest = await geocodeCep(destCep);
    console.log('Destino geocoded:', dest);
}

testNominatim();
