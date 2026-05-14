
// Script simplificado sem dependências externas
async function testMelhorEnvio() {
    const token = process.env.MELHORENVIO_TOKEN || process.env.Franga;
    const cepOrigem = process.env.NEXT_PUBLIC_CEP_ORIGEM;

    console.log('--- TESTANDO MELHOR ENVIO ---');
    console.log('CEP Origem:', cepOrigem);
    console.log('Token Encontrado:', token ? 'SIM (Começa com ' + token.substring(0, 10) + '...)' : 'NÃO');

    if (!token || !cepOrigem) {
        console.error('ERRO: Variáveis de ambiente não carregadas. Rode com: npx tsx --env-file=.env scratch/shipping_test.ts');
        return;
    }

    try {
        const response = await fetch('https://melhorenvio.com.br/api/v2/me/shipment/calculate', {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token.trim()}`,
                'User-Agent': 'FrangaToys (rcssposito@gmail.com)'
            },
            body: JSON.stringify({
                from: { postal_code: cepOrigem.replace(/\D/g, '') },
                to: { postal_code: '01310930' },
                package: { weight: 0.3, width: 10, height: 10, length: 10 }
            })
        });

        const data = await response.json();
        console.log('Status HTTP:', response.status);
        
        if (response.status === 401) {
            console.error('❌ ERRO DE AUTENTICAÇÃO: O token é inválido ou expirou.');
        } else {
            console.log('Resposta:', JSON.stringify(data, null, 2));
        }
    } catch (err: any) {
        console.error('Erro na requisição:', err.message);
    }
}

testMelhorEnvio();
