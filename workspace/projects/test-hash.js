import bcrypt from 'bcryptjs';

const password = '198752';
const hash = bcrypt.hashSync(password, 10);
console.log('Password:', password);
console.log('Hash:', hash);
console.log('Verify:', bcrypt.compareSync(password, hash));

// 测试之前的哈希
const oldHash = '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';
console.log('Old hash verify:', bcrypt.compareSync(password, oldHash));
