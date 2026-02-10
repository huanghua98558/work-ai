-- 更新管理员账户密码
-- 手机号: 13800138000
-- 密码: admin123
-- 执行前请先进入数据库: sudo -u postgres psql -d workbot

UPDATE users SET password_hash = '$2a$10$cOytWBCtTGvenhlXnALXg.FbrAeUgcnUuSTvsR1P400d3SMk8kxhS', updated_at = NOW() WHERE phone = '13800138000';

-- 验证更新结果
SELECT id, nickname, phone, LENGTH(password_hash) as hash_length, password_hash FROM users WHERE phone = '13800138000';
