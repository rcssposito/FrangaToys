const fs = require('fs');
const file = 'c:\\Users\\rcssp\\Desktop\\FrangaToys\\web\\app\\api\\admin\\figures\\route.ts';
let content = fs.readFileSync(file, 'utf8');

// Use regex to remove any block starting with 'if (!session' up to '}'
content = content.replace(/if \(!session[^{]*\{[^}]*\}/g, '');

fs.writeFileSync(file, content, 'utf8');
console.log('Fixed figures/route.ts');
