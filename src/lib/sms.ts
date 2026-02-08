import { getDatabase } from "@/lib/db";
import { sql } from "drizzle-orm";

// 验证码配置
export const SMS_CODE_EXPIRY = 300; // 5分钟（秒）
export const SMS_CODE_LENGTH = 6; // 验证码长度
export const SMS_CODE_RATE_LIMIT = 60; // 同一手机号60秒内只能发送一次

/**
 * 生成随机验证码
 */
export function generateCode(length: number = SMS_CODE_LENGTH): string {
  return Math.floor(Math.random() * Math.pow(10, length))
    .toString()
    .padStart(length, '0');
}

/**
 * 发送短信验证码
 * TODO: 集成阿里云SMS或其他短信服务
 * 这里先使用控制台输出模拟发送
 */
export async function sendSMS(phone: string, code: string, type: string = 'login'): Promise<boolean> {
  try {
    console.log(`[SMS 模拟发送] 手机号: ${phone}, 验证码: ${code}, 类型: ${type}`);
    
    // TODO: 实际开发中集成阿里云SMS
    // const sms = new SMS({
    //   accessKeyId: process.env.ALIYUN_ACCESS_KEY_ID,
    //   accessKeySecret: process.env.ALIYUN_ACCESS_KEY_SECRET,
    // });
    // await sms.send({
    //   PhoneNumbers: phone,
    //   SignName: 'WorkBot',
    //   TemplateCode: 'SMS_TEMPLATE_CODE',
    //   TemplateParam: JSON.stringify({ code }),
    // });
    
    return true;
  } catch (error) {
    console.error('发送短信失败:', error);
    return false;
  }
}

/**
 * 创建验证码记录
 */
export async function createVerificationCode(
  phone: string,
  type: string = 'login',
  ipAddress?: string
): Promise<string | null> {
  try {
    const db = await getDatabase();
    const code = generateCode();
    // 使用数据库的当前时间计算过期时间
    const now = new Date();
    const expiresAt = new Date(now.getTime() + SMS_CODE_EXPIRY * 1000);

    console.log(`[创建验证码] Phone: ${phone}, Code: ${code}, Now: ${now.toISOString()}, Expires: ${expiresAt.toISOString()}`);

    // 创建验证码记录
    await db.execute(sql`
      INSERT INTO sms_verification_codes (phone, code, type, expires_at, ip_address)
      VALUES (${phone}, ${code}, ${type}, ${expiresAt.toISOString()}, ${ipAddress || null})
    `);

    // 发送短信
    const sent = await sendSMS(phone, code, type);
    if (!sent) {
      console.error('短信发送失败');
      return null;
    }

    return code;
  } catch (error) {
    console.error('创建验证码失败:', error);
    return null;
  }
}

/**
 * 检查手机号是否在发送限制时间内
 */
export async function checkRateLimit(phone: string, seconds: number = SMS_CODE_RATE_LIMIT): Promise<boolean> {
  try {
    const db = await getDatabase();
    
    const thresholdTime = new Date(Date.now() - seconds * 1000).toISOString();
    
    const result = await db.execute(sql`
      SELECT COUNT(*) as count
      FROM sms_verification_codes
      WHERE phone = ${phone}
        AND created_at > ${thresholdTime}
    `);

    const count = parseInt(result.rows[0].count as string);
    console.log(`[RateLimit] Phone: ${phone}, Count: ${count}, Threshold: ${thresholdTime}`);
    return count === 0;
  } catch (error) {
    console.error('检查发送限制失败:', error);
    return false;
  }
}

/**
 * 验证验证码
 */
export async function verifyCode(
  phone: string,
  code: string,
  type: string = 'login'
): Promise<boolean> {
  try {
    const db = await getDatabase();

    // 查找未使用的有效验证码
    const result = await db.execute(sql`
      SELECT id, code
      FROM sms_verification_codes
      WHERE phone = ${phone}
        AND code = ${code}
        AND type = ${type}
        AND expires_at > NOW()
        AND used = false
      ORDER BY created_at DESC
      LIMIT 1
    `);

    if (result.rows.length === 0) {
      return false;
    }

    const verificationCode = result.rows[0];

    // 标记为已使用
    await db.execute(sql`
      UPDATE sms_verification_codes
      SET used = true, used_at = NOW()
      WHERE id = ${verificationCode.id}
    `);

    return true;
  } catch (error) {
    console.error('验证码验证失败:', error);
    return false;
  }
}

/**
 * 清理过期的验证码记录
 */
export async function cleanExpiredCodes(): Promise<number> {
  try {
    const db = await getDatabase();

    const result = await db.execute(sql`
      DELETE FROM sms_verification_codes
      WHERE expires_at < NOW()
      RETURNING id
    `);

    return result.rowCount || 0;
  } catch (error) {
    console.error('清理过期验证码失败:', error);
    return 0;
  }
}
