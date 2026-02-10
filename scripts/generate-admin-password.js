const bcrypt = require('bcryptjs');

const password = 'admin123';
const salt = bcrypt.genSaltSync(10);
const hash = bcrypt.hashSync(password, salt);

console.log('Password:', password);
console.log('Hash:', hash);
console.log('\nSQL to update admin user:');
console.log(`UPDATE users SET password_hash = '${hash}' WHERE phone = '13800138000';`);
