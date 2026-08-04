const folderId = '1aB9Xx-NZe2K7IweVx33GMucElUsgzHEf';

async function testDrive() {
    const url = `https://drive.google.com/embeddedfolderview?id=${folderId}`;
    console.log('Fetching:', url);
    const res = await fetch(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
    });

    const html = await res.text();
    console.log('HTML Length:', html.length);
    console.log('Includes first-time:', html.includes('first-time'));

    // Find occurrences of first-time in html
    let idx = 0;
    while ((idx = html.indexOf('first-time', idx)) !== -1) {
        console.log('FOUND SNIPPET:', html.substring(idx - 100, idx + 150));
        idx += 10;
    }
}

testDrive();
