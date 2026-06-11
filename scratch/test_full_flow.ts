
async function testFullFlow() {
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

    try {
        const origin = await geocodeCep(originCep);
        const dest = await geocodeCep(destCep);

        if (!origin || !dest) {
            console.error('Falha ao obter coordenadas para um dos CEPs.');
            return;
        }

        // Call OSRM API
        const osrmUrl = `http://router.project-osrm.org/route/v1/driving/${origin.lng},${origin.lat};${dest.lng},${dest.lat}?overview=false`;
        const resRoute = await fetch(osrmUrl);
        const routeData = await resRoute.json();

        if (routeData.code === 'Ok' && routeData.routes?.length > 0) {
            const distanceKm = routeData.routes[0].distance / 1000;
            const durationMin = routeData.routes[0].duration / 60;

            console.log(`\n--- RESULTADO DA ROTA REAL ---`);
            console.log(`Endereço Origem: ${origin.address}, ${origin.district}, ${origin.city}`);
            console.log(`Endereço Destino: ${dest.address}, ${dest.district}, ${dest.city}`);
            console.log(`Distância de Carro: ${distanceKm.toFixed(2)} km`);
            console.log(`Tempo Estimado de Viagem: ${durationMin.toFixed(0)} minutos`);

            // Racional Uber: R$ 5,00 base + R$ 2,20 por KM + R$ 0,20 por minuto
            const taxaBase = 5.00;
            const valorPorKm = 2.20;
            const valorPorMinuto = 0.20;
            const totalUber = taxaBase + (distanceKm * valorPorKm) + (durationMin * valorPorMinuto);

            console.log(`\n--- CÁLCULO ESTILO UBER ---`);
            console.log(`Taxa Base: R$ ${taxaBase.toFixed(2)}`);
            console.log(`Componente KM: R$ ${(distanceKm * valorPorKm).toFixed(2)}`);
            console.log(`Componente Tempo: R$ ${(durationMin * valorPorMinuto).toFixed(2)}`);
            console.log(`Valor do Frete (Carro): R$ ${totalUber.toFixed(2)}`);
        } else {
            console.error('Falha ao calcular rota via OSRM:', routeData);
        }

    } catch (err: any) {
        console.error(err);
    }
}

testFullFlow();
