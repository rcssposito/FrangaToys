
async function testDistance() {
    const originCep = '02755090'; // Ateliê
    const destCep = '01310930';   // Avenida Paulista

    console.log(`Testando distância de ${originCep} para ${destCep}...`);

    try {
        // 1. Obter coordenadas da origem (Vamos mockar ou buscar)
        // CEP Origem: 02755-090
        const resOrigin = await fetch(`https://brasilapi.com.br/api/cep/v2/${originCep}`);
        const dataOrigin = await resOrigin.json();
        const originCoords = dataOrigin.location?.coordinates;
        console.log('Origem Coords (BrasilAPI):', originCoords);

        // 2. Obter coordenadas do destino
        const resDest = await fetch(`https://brasilapi.com.br/api/cep/v2/${destCep}`);
        const dataDest = await resDest.json();
        const destCoords = dataDest.location?.coordinates;
        console.log('Destino Coords (BrasilAPI):', destCoords);

        if (!originCoords || !destCoords) {
            console.error('Não foi possível obter coordenadas para um dos CEPs.');
            return;
        }

        const lon1 = originCoords.longitude;
        const lat1 = originCoords.latitude;
        const lon2 = destCoords.longitude;
        const lat2 = destCoords.latitude;

        // 3. Obter rota real por OSRM
        const osrmUrl = `http://router.project-osrm.org/route/v1/driving/${lon1},${lat1};${lon2},${lat2}?overview=false`;
        const resRoute = await fetch(osrmUrl);
        const routeData = await resRoute.json();

        if (routeData.code === 'Ok' && routeData.routes?.length > 0) {
            const distanceMeters = routeData.routes[0].distance;
            const distanceKm = distanceMeters / 1000;
            const durationSeconds = routeData.routes[0].duration;
            const durationMin = durationSeconds / 60;

            console.log(`\n--- RESULTADO DA ROTA ---`);
            console.log(`Distância de Carro: ${distanceKm.toFixed(2)} km`);
            console.log(`Tempo Estimado de Carro: ${durationMin.toFixed(0)} min`);

            // Fórmula estilo Uber: Taxa Base (R$ 5.00) + R$ 2.50 por km
            const taxaBase = 5.00;
            const valorPorKm = 2.50;
            const totalFrete = taxaBase + (distanceKm * valorPorKm);
            console.log(`Preço Calculado (Estilo Uber): R$ ${totalFrete.toFixed(2)}`);
        } else {
            console.error('Erro na resposta do OSRM:', routeData);
        }

    } catch (err: any) {
        console.error('Erro na requisição:', err.message);
    }
}

testDistance();
