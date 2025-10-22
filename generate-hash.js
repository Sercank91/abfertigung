const bcrypt = require('bcryptjs');

async function generateHash() {
    const password = 'test123';
    const hash = await bcrypt.hash(password, 10);
    console.log('Passwort: test123');
    console.log('Hash:', hash);
}

generateHash();