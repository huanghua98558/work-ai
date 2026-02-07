# WorkBot 激活码管理逻辑

## 概述

激活码管理是WorkBot系统的核心功能，实现"一码一设备"机制，防止激活码滥用。

---

## 一、激活码使用规则

### 基本规则
1. **一码一设备**：一个激活码只能绑定一个设备ID（deviceId）
2. **同一设备可多次激活**：卸载重装后可以用同一个激活码重新激活
3. **不同设备不能使用同一激活码**：防止激活码泄露后被多人使用
4. **同一激活码，同一设备，可以无限次激活**：只要deviceId不变

### 有效性检查
- 激活码是否存在
- 激活码是否已过期
- 激活码是否已使用
- 激活码是否绑定到当前设备

---

## 二、APP激活流程

### 完整流程图

```
┌─────────────────────────────────────────────────────────────┐
│  1. 用户在APP输入激活码                                      │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  2. APP获取设备信息（deviceInfo）                            │
│  ├─ deviceId：系统提供的唯一标识                             │
│  │  ├─ Android：Settings.Secure.ANDROID_ID                 │
│  │  └─ iOS：UIDevice.current.identifierForVendor           │
│  ├─ model：设备型号                                          │
│  ├─ os：操作系统                                             │
│  ├─ osVersion：系统版本                                      │
│  ├─ manufacturer：厂商                                       │
│  ├─ network：网络类型                                        │
│  ├─ appVersion：APP版本                                      │
│  ├─ totalMemory：内存大小                                   │
│  └─ screenResolution：屏幕分辨率                            │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  3. APP调用 POST /api/robot-ids/activate                    │
│  输入：                                                      │
│  {                                                          │
│    "code": "3CQ4Z9LE",                                      │
│    "deviceInfo": {                                          │
│      "deviceId": "device-001",                              │
│      "model": "Samsung Galaxy S21",                         │
│      "os": "Android",                                       │
│      "osVersion": "12",                                     │
│      "manufacturer": "Samsung",                             │
│      "network": "4G",                                       │
│      "appVersion": "1.0.0",                                 │
│      "totalMemory": 8192,                                  │
│      "screenResolution": "1080x2400"                        │
│    }                                                        │
│  }                                                          │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  4. 服务器验证激活码 + 设备绑定                              │
│  ├─ 检查激活码是否存在                                       │
│  ├─ 检查激活码是否已过期                                     │
│  ├─ 检查激活码是否已使用                                     │
│  ├─ 如果已使用，检查是否绑定到同一个设备（deviceId）         │
│  │  ├─ 如果绑定到不同设备 → ❌ 返回错误                      │
│  │  └─ 如果绑定到同一个设备 → ✅ 允许重新激活                 │
│  ├─ 生成robotId（随机生成）                                  │
│  ├─ 生成token（JWT）                                        │
│  ├─ 激活码绑定到该deviceId                                   │
│  └─ 保存设备信息                                             │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  5. 服务器返回                                                │
│  输出：                                                      │
│  {                                                          │
│    "success": true,                                         │
│    "code": 0,                                              │
│    "data": {                                                │
│      "robotId": "RBml9n7nikHIMZU0",                         │
│      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."     │
│    }                                                        │
│  }                                                          │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  6. APP保存robotId和token到本地                              │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  7. APP开始与服务器建立正式通讯（WebSocket）                  │
│  连接地址：wss://your-domain.coze.site/ws/connect?token=... │
└─────────────────────────────────────────────────────────────┘
```

---

## 三、deviceId管理

### deviceId获取方式

#### Android
```kotlin
import android.provider.Settings

val deviceId = Settings.Secure.getString(
    context.contentResolver,
    Settings.Secure.ANDROID_ID
)
```

#### iOS
```swift
import UIKit

let deviceId = UIDevice.current.identifierForVendor?.uuidString
```

### deviceId特点
- **唯一性**：每个设备都有唯一的deviceId
- **持久性**：卸载APP后deviceId不变
- **稳定性**：系统提供的标识，不容易被修改
- **安全性**：防止用户轻易伪造设备ID

### deviceId的作用
1. **设备绑定**：实现"一码一设备"
2. **设备识别**：区分不同设备
3. **防滥用**：防止同一激活码在多个设备上使用
4. **设备统计**：统计设备型号分布、系统版本分布等

---

## 四、设备变更处理

### 场景1：卸载重装
- **情况**：用户卸载APP后重新安装
- **deviceId**：不变
- **结果**：✅ 可以用同一个激活码重新激活
- **原因**：deviceId不变，系统识别为同一设备

### 场景2：刷机、改机、更换设备
- **情况**：用户修改了deviceId
  - 使用改机软件
  - 刷机
  - 更换设备
- **deviceId**：变化
- **结果**：❌ 激活失败
- **错误信息**："激活码已绑定到其他设备"（错误码：2004）
- **原因**：deviceId变化，系统识别为不同设备

### 解决方案：管理员解绑

#### 流程
```
1. 用户联系管理员
   ↓
2. 管理员在后台查看激活码绑定情况
   ├─ 查看激活码：3CQ4Z9LE
   ├─ 查看绑定的deviceId：device-001
   ├─ 查看设备信息：Samsung Galaxy S21
   └─ 查看激活时间：2025-02-07 10:30
   ↓
3. 管理员执行"解绑设备"操作
   ├─ 确认用户身份
   ├─ 确认解绑原因（如：更换设备）
   ├─ 执行解绑（清空activation_codes.device_id）
   └─ 记录操作日志
   ↓
4. 用户可以使用激活码在新设备上激活
   ├─ 新设备deviceId：device-002
   ├─ 调用activate接口
   └─ ✅ 激活成功
```

#### 管理后台功能
```
激活码详情页面：
├─ 激活码信息
│  ├─ 激活码：3CQ4Z9LE
│  ├─ 状态：已使用
│  ├─ 有效期：2025-02-07 - 2026-02-07
│  ├─ 绑定用户：张三
│  └─ 创建时间：2025-02-07 10:00
│
├─ 设备绑定信息
│  ├─ 设备ID：device-001
│  ├─ 设备型号：Samsung Galaxy S21
│  ├─ 操作系统：Android 12
│  ├─ 厂商：Samsung
│  ├─ 网络类型：4G
│  ├─ APP版本：1.0.0
│  ├─ 激活时间：2025-02-07 10:30
│  └─ [解绑设备] 按钮
│
└─ 操作日志
   ├─ 2025-02-07 10:00 - 激活码生成
   ├─ 2025-02-07 10:30 - 设备device-001激活
   └─ 2025-02-10 15:00 - 管理员解绑设备
```

---

## 五、数据库设计

### activation_codes表

```sql
CREATE TABLE activation_codes (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(32) UNIQUE NOT NULL,
  user_id VARCHAR(36) REFERENCES users(id),
  robot_id VARCHAR(36) REFERENCES robots(id),
  device_id VARCHAR(128),  -- ⚠️ 绑定的设备ID
  status VARCHAR(20) DEFAULT 'unused',
  valid_days INTEGER NOT NULL,
  expires_at TIMESTAMP,
  activated_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_activation_codes_code ON activation_codes(code);
CREATE INDEX idx_activation_codes_user_id ON activation_codes(user_id);
CREATE INDEX idx_activation_codes_status ON activation_codes(status);
CREATE INDEX idx_activation_codes_device_id ON activation_codes(device_id);
```

### robots表

```sql
CREATE TABLE robots (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  robot_id VARCHAR(64) UNIQUE NOT NULL,
  user_id VARCHAR(36) NOT NULL REFERENCES users(id),
  name VARCHAR(128) NOT NULL,
  status VARCHAR(20) DEFAULT 'offline',
  device_id VARCHAR(128),  -- ⚠️ 绑定的设备ID
  device_info JSONB,       -- ⚠️ 完整的设备信息
  activated_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP,
  deleted_at TIMESTAMP
);

-- 索引
CREATE INDEX idx_robots_user_id ON robots(user_id);
CREATE INDEX idx_robots_status ON robots(status);
CREATE INDEX idx_robots_device_id ON robots(device_id);
```

---

## 六、API接口

### 1. 激活机器人

#### 接口信息
- **方法**：POST
- **路径**：`/api/robot-ids/activate`
- **认证**：无需认证

#### 请求参数
```json
{
  "code": "3CQ4Z9LE",
  "deviceInfo": {
    "deviceId": "device-001",
    "model": "Samsung Galaxy S21",
    "os": "Android",
    "osVersion": "12",
    "manufacturer": "Samsung",
    "network": "4G",
    "appVersion": "1.0.0",
    "totalMemory": 8192,
    "screenResolution": "1080x2400"
  }
}
```

#### 响应成功
```json
{
  "success": true,
  "code": 0,
  "data": {
    "robotId": "RBml9n7nikHIMZU0",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

#### 响应失败

**激活码不存在**
```json
{
  "success": false,
  "code": 2001,
  "message": "激活码无效"
}
```

**激活码已过期**
```json
{
  "success": false,
  "code": 2003,
  "message": "激活码已过期"
}
```

**激活码已绑定到其他设备** ⚠️ 新增
```json
{
  "success": false,
  "code": 2004,
  "message": "激活码已绑定到其他设备"
}
```

---

### 2. 解绑设备（管理员）

#### 接口信息
- **方法**：POST
- **路径**：`/api/admin/activation-codes/unbind-device`
- **认证**：需要管理员权限

#### 请求参数
```json
{
  "code": "3CQ4Z9LE",
  "reason": "用户更换设备"
}
```

#### 响应成功
```json
{
  "success": true,
  "code": 0,
  "message": "设备解绑成功"
}
```

---

## 七、业务逻辑

### 激活码验证逻辑（伪代码）

```typescript
async function activateCode(code: string, deviceInfo: DeviceInfo) {
  const deviceId = deviceInfo.deviceId;

  // 1. 查询激活码
  const activationCode = await db.select()
    .from(activationCodes)
    .where(eq(activationCodes.code, code))
    .limit(1);

  // 2. 检查激活码是否存在
  if (!activationCode) {
    return { success: false, code: 2001, message: "激活码无效" };
  }

  // 3. 检查激活码是否已过期
  if (activationCode.expires_at < new Date()) {
    return { success: false, code: 2003, message: "激活码已过期" };
  }

  // 4. 检查激活码是否已使用
  if (activationCode.status === 'used') {
    // 检查是否绑定到同一个设备（允许卸载重装）
    if (activationCode.device_id !== deviceId) {
      return { success: false, code: 2004, message: "激活码已绑定到其他设备" };
    }
    // 同一设备，允许重新激活
  }

  // 5. 生成robotId和token
  const robotId = generateRobotId();
  const token = generateToken(robotId);

  // 6. 更新激活码状态
  await db.update(activationCodes)
    .set({
      status: 'used',
      device_id: deviceId,
      activated_at: new Date()
    })
    .where(eq(activationCodes.id, activationCode.id));

  // 7. 创建或更新机器人记录
  if (activationCode.robot_id) {
    // 机器人已存在，更新设备信息
    await db.update(robots)
      .set({
        device_id: deviceId,
        device_info: deviceInfo,
        activated_at: new Date()
      })
      .where(eq(robots.robot_id, activationCode.robot_id));
  } else {
    // 机器人不存在，创建新机器人
    await db.insert(robots).values({
      robot_id: robotId,
      user_id: activationCode.user_id,
      name: `机器人-${robotId.slice(-6)}`,
      status: 'offline',
      device_id: deviceId,
      device_info: deviceInfo,
      activated_at: new Date()
    });

    // 更新激活码的robot_id
    await db.update(activationCodes)
      .set({ robot_id: robotId })
      .where(eq(activationCodes.id, activationCode.id));
  }

  // 8. 记录系统日志
  await logSystemEvent({
    type: 'activation',
    level: 'info',
    message: `设备${deviceId}激活机器人${robotId}`,
    context: {
      activationCodeId: activationCode.id,
      deviceInfo: deviceInfo
    }
  });

  // 9. 返回robotId和token
  return {
    success: true,
    code: 0,
    data: {
      robotId: robotId,
      token: token
    }
  };
}
```

### 解绑设备逻辑（伪代码）

```typescript
async function unbindDevice(code: string, reason: string, adminId: string) {
  // 1. 查询激活码
  const activationCode = await db.select()
    .from(activationCodes)
    .where(eq(activationCodes.code, code))
    .limit(1);

  if (!activationCode) {
    return { success: false, code: 2001, message: "激活码不存在" };
  }

  // 2. 检查激活码是否已使用
  if (activationCode.status !== 'used') {
    return { success: false, code: 2002, message: "激活码未使用" };
  }

  // 3. 记录解绑前的设备信息
  const oldDeviceId = activationCode.device_id;

  // 4. 解绑设备（清空device_id）
  await db.update(activationCodes)
    .set({
      device_id: null,
      activated_at: null
    })
    .where(eq(activationCodes.id, activationCode.id));

  // 5. 记录系统日志
  await logSystemEvent({
    type: 'audit',
    level: 'info',
    message: `管理员${adminId}解绑激活码${code}的设备${oldDeviceId}，原因：${reason}`,
    context: {
      activationCodeId: activationCode.id,
      oldDeviceId: oldDeviceId,
      reason: reason,
      adminId: adminId
    }
  });

  // 6. 返回成功
  return {
    success: true,
    code: 0,
    message: "设备解绑成功"
  };
}
```

---

## 八、错误码定义

| 错误码 | 说明 | 处理建议 |
|-------|------|---------|
| 0 | 成功 | - |
| 2001 | 激活码无效 | 检查激活码是否正确 |
| 2002 | 激活码已使用 | 检查是否已绑定到其他设备 |
| 2003 | 激活码已过期 | 联系管理员重新生成激活码 |
| 2004 | 激活码已绑定到其他设备 | 联系管理员解绑设备 |

---

## 九、最佳实践

### 1. deviceId获取
- ✅ 使用系统提供的设备ID
- ❌ 不要使用随机UUID
- ❌ 不要使用可修改的标识

### 2. 激活码生成
- ✅ 使用加密安全的随机算法
- ✅ 激活码长度不少于8位
- ✅ 激活码包含大小写字母和数字
- ❌ 不要使用简单的序列号

### 3. 设备变更处理
- ✅ 提供管理员解绑功能
- ✅ 记录详细的操作日志
- ✅ 限制解绑次数（防止滥用）
- ❌ 不要自动解绑（需要管理员审核）

### 4. 安全防护
- ✅ 验证激活码的有效期
- ✅ 验证deviceId的格式
- ✅ 记录所有激活尝试
- ✅ 异常情况告警
- ❌ 不要泄露设备信息给其他用户

---

## 十、常见问题

### Q1: 为什么同一激活码不能在多个设备上使用？
A: 这是为了防止激活码泄露后被多人使用，保护用户权益。

### Q2: 卸载重装后为什么可以用同一个激活码重新激活？
A: 因为deviceId不变，系统识别为同一设备，允许重新激活。

### Q3: 更换设备后如何使用激活码？
A: 需要联系管理员解绑旧设备，然后在新设备上激活。

### Q4: deviceId可以被修改吗？
A: 理论上可以通过改机软件、刷机等方式修改，但这违反使用规则。

### Q5: 激活码过期了怎么办？
A: 联系管理员，管理员可以生成新的激活码。

### Q6: 如何防止激活码被滥用？
A:
- 一码一设备机制
- 管理员审核解绑
- 记录操作日志
- 异常情况告警

---

**文档结束**
