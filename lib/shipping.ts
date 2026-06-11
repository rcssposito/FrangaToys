/**
 * Utility for shipping calculation via Melhor Envio.
 */

export interface ShippingQuoteParams {
    sCepDestino: string;
    nVlPeso?: number;
    nVlComprimento?: number;
    nVlAltura?: number;
    nVlLargura?: number;
    destLat?: number;
    destLng?: number;
    debug?: boolean;
}

export interface ShippingService {
    Codigo: string;
    Valor: number;
    PrazoEntrega: number;
    Nome: string;
    Empresa: string;
}

export async function calculateShipping(params: ShippingQuoteParams): Promise<ShippingService[]> {
    const sCepOrigem = process.env.NEXT_PUBLIC_CEP_ORIGEM;
    const token = process.env.MELHORENVIO_TOKEN || process.env.Franga;

    if (!sCepOrigem || !token) {
        throw new Error('Configuração do Melhor Envio incompleta no servidor');
    }

    const { sCepDestino, nVlPeso, nVlComprimento, nVlAltura, nVlLargura } = params;

    const response = await fetch('https://melhorenvio.com.br/api/v2/me/shipment/calculate', {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'User-Agent': 'FrangaToys (rcssposito@gmail.com)'
        },
        body: JSON.stringify({
            from: { postal_code: sCepOrigem.replace(/\D/g, '') },
            to: { postal_code: sCepDestino.replace(/\D/g, '') },
            package: {
                weight: Math.max(nVlPeso || 0.3, 0.3),
                width: Math.max(nVlLargura || 10, 10),
                height: Math.max(nVlAltura || 2, 2),
                length: Math.max(nVlComprimento || 15, 15)
            }
        })
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao calcular frete no Melhor Envio');
    }

    const result = await response.json();
    
    const quotes: ShippingService[] = result
        .filter((service: any) => !service.error)
        .map((service: any) => ({
            Codigo: service.id === 1 ? '04510' : (service.id === 2 ? '04014' : String(service.id)),
            Valor: service.price,
            PrazoEntrega: service.delivery_time,
            Nome: service.name,
            Empresa: service.company.name
        }));

    const localQuotes: ShippingService[] = [];

    // 1. Sempre adicionar a opção de Retirada (R$ 0,00)
    localQuotes.push({
        Codigo: 'retirada',
        Valor: 0,
        PrazoEntrega: 0,
        Nome: 'Retirada no Ateliê',
        Empresa: 'Franga Toys'
    });

    // 2. Tentar calcular a Entrega de Carro se a distância for viável (Local)
    try {
        const cleanDestCep = sCepDestino.replace(/\D/g, '');
        const cleanOrigemCep = sCepOrigem.replace(/\D/g, '');

        const isDebug = !!params.debug;
        const addDebugQuote = (codigo: string, valor: number, nome: string) => {
            if (isDebug) {
                localQuotes.push({
                    Codigo: codigo,
                    Valor: valor,
                    PrazoEntrega: 0,
                    Nome: nome,
                    Empresa: 'Franga Toys Debug'
                });
            }
        };

        addDebugQuote('debug_ceps', 0, `CEP Dest: ${cleanDestCep} | CEP Origem: ${cleanOrigemCep}`);

        let destLat = params.destLat;
        let destLng = params.destLng;

        if (destLat === undefined || destLng === undefined || isNaN(destLat) || isNaN(destLng)) {
            // Obter coordenadas do destino via AwesomeAPI (Fallback no servidor)
            const destGeocodeRes = await fetch(`https://cep.awesomeapi.com.br/json/${cleanDestCep}`, {
                headers: {
                    'User-Agent': 'FrangaToys/1.0 (contato@frangatoys.com.br)'
                }
            });
            if (destGeocodeRes.ok) {
                const destData = await destGeocodeRes.json();
                destLat = parseFloat(destData.lat);
                destLng = parseFloat(destData.lng);
                addDebugQuote('debug_dest_geocode_success', 0, `Dest resolved on server: ${destLng}, ${destLat}`);
            } else {
                addDebugQuote('debug_dest_geocode_fail', destGeocodeRes.status, `Dest Geocode fail status: ${destGeocodeRes.status}`);
            }
        } else {
            addDebugQuote('debug_dest_passed', 0, `Coords passadas pelo cliente: ${destLng}, ${destLat}`);
        }

        if (destLat !== undefined && destLng !== undefined && !isNaN(destLat) && !isNaN(destLng)) {
            // Obter coordenadas do ateliê (Origem). Padrão para Jardim Primavera, SP se falhar
            let originLat = -23.4888303;
            let originLng = -46.6799967;

            try {
                const originGeocodeRes = await fetch(`https://cep.awesomeapi.com.br/json/${cleanOrigemCep}`, {
                    headers: {
                        'User-Agent': 'FrangaToys/1.0 (contato@frangatoys.com.br)'
                    }
                });
                if (originGeocodeRes.ok) {
                    const originData = await originGeocodeRes.json();
                    if (originData.lat && originData.lng) {
                        originLat = parseFloat(originData.lat);
                        originLng = parseFloat(originData.lng);
                        addDebugQuote('debug_origin_coords', 0, `Origem resolved: ${originLng}, ${originLat}`);
                    }
                } else {
                    addDebugQuote('debug_origin_fail', originGeocodeRes.status, `Origem API fail status: ${originGeocodeRes.status}`);
                }
            } catch (origemErr: any) {
                addDebugQuote('debug_origin_error', 0, `Origem catch: ${origemErr.message}`);
            }

            // Obter distância de direção real via OSRM API (grátis)
            const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${originLng},${originLat};${destLng},${destLat}?overview=false`;
            addDebugQuote('debug_osrm_url', 0, `OSRM URL: ${osrmUrl}`);

            const routeRes = await fetch(osrmUrl, {
                headers: {
                    'User-Agent': 'FrangaToys/1.0 (contato@frangatoys.com.br)'
                }
            });

            if (routeRes.ok) {
                const routeData = await routeRes.json();
                if (routeData.code === 'Ok' && routeData.routes?.length > 0) {
                    const distanceKm = routeData.routes[0].distance / 1000;
                    addDebugQuote('debug_distance', Number(distanceKm.toFixed(2)), `Distancia calculada: ${distanceKm.toFixed(2)} km`);

                    // Limite de 50km para entrega local
                    if (distanceKm <= 50) {
                        // Racional: R$ 5,00 base + R$ 2,20 por KM
                        const taxaBase = 5.00;
                        const valorPorKm = 2.20;
                        const totalCarro = taxaBase + (distanceKm * valorPorKm);

                        localQuotes.push({
                            Codigo: 'entrega_local',
                            Valor: Number(totalCarro.toFixed(2)),
                            PrazoEntrega: 1, // Geralmente entregue 1 dia após a conclusão da peça
                            Nome: 'Entrega da Loja',
                            Empresa: 'Franga Toys'
                        });
                    }
                } else {
                    addDebugQuote('debug_osrm_route_error', 0, `OSRM route error: ${routeData.code}`);
                }
            } else {
                addDebugQuote('debug_osrm_http_error', routeRes.status, `OSRM HTTP status: ${routeRes.status}`);
            }
        } else {
            addDebugQuote('debug_dest_coords_invalid', 0, `Dest coords invalidas ou ausentes`);
        }
    } catch (localErr: any) {
        console.error('Erro ao calcular frete de carro local:', localErr);
        if (params.debug) {
            localQuotes.push({
                Codigo: 'debug_catch_error',
                Valor: 0,
                PrazoEntrega: 0,
                Nome: `General catch: ${localErr.message || String(localErr)}`,
                Empresa: 'Franga Toys Debug'
            });
        }
    }

    return [...localQuotes, ...quotes];
}
