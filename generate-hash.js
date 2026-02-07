const bcrypt = require('bcryptjs');

const password = '198752';
const hash = bcrypt.hashSync(password, 10);

console.log('Password:', password);
console.log('Hash:', hash);
