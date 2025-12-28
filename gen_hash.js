const bcrypt = require('bcryptjs');
const hash = bcrypt.hashSync('AbacaxiMarinadoAoFrangoAtropelado', 10);
const fs = require('fs');
fs.writeFileSync('hash.txt', hash);
console.log('New hash generated.');
