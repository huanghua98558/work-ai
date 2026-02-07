const bcrypt = require('bcryptjs');

async function generateHash() {
  const password = '198752';
  const hash = await bcrypt.hash(password, 10);
  console.log('Password hash:', hash);
}

generateHash();
