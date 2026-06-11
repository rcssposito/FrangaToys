
async function testAwesomeAPI() {
    const originCep = '02755090'; 
    const destCep = '01310930';

    async function geocodeCep(cep: string) {
        const url = `https://cep.awesomeapi.com.br/json/${cep}`;
        try {
            const res = await fetch(url);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            return {
                lat: parseFloat(data.lat),
                lng: parseFloat(data.lng),
                address: data.address,
                district: data.district,
                city: data.city
            };
        } catch (err: any) {
            console.error(`AwesomeAPI error for ${cep}:`, err.message);
        }
        return null;
    }

    console.log('Testando AwesomeAPI...');
    const origin = await geocodeCep(originCep);
    console.log('Origem geocoded:', origin);

    const dest = await geocodeCep(destCep);
    console.log('Destino geocoded:', dest);
}

testAwesomeAPI();
