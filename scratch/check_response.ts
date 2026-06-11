
async function checkRawResponse() {
    try {
        const res = await fetch('https://brasilapi.com.br/api/cep/v2/02755090');
        const data = await res.json();
        console.log('02755090 response:', JSON.stringify(data, null, 2));

        const res2 = await fetch('https://brasilapi.com.br/api/cep/v2/01310930');
        const data2 = await res2.json();
        console.log('01310930 response:', JSON.stringify(data2, null, 2));
    } catch (err: any) {
        console.error(err);
    }
}
checkRawResponse();
