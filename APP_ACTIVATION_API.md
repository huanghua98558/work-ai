# WorkBot APP 端激活技术文档

## 文档版本

- **版本**: v1.0
- **更新日期**: 2026-02-09
- **适用平台**: WorkBot APP (Android/iOS)
- **API Base URL**: `https://your-workbot-domain.com`

---

## 目录

1. [激活流程概述](#激活流程概述)
2. [API 接口说明](#api-接口说明)
3. [错误码说明](#错误码说明)
4. [示例代码](#示例代码)
5. [安全注意事项](#安全注意事项)
6. [最佳实践](#最佳实践)
7. [常见问题](#常见问题)

---

## 激活流程概述

### 流程图

```
┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐
│  APP端  │    │  服务器  │    │  数据库  │    │  企业微信│
└────┬────┘    └────┬────┘    └────┬────┘    └────┬────┘
     │              │              │              │
     │ 1. 用户输入激活码          │              │
     ├──────────────>│              │              │
     │              │ 2. 查询激活码  │              │
     │              ├──────────────>│              │
     │              │ 3. 返回激活码信息            │
     │              │<──────────────┤              │
     │              │ 4. 验证激活码  │              │
     │              │              │              │
     │              │ 5. 绑定设备    │              │
     │              ├──────────────>│              │
     │              │ 6. 生成Token  │              │
     │              ├──────────────>│              │
     │ 7. 返回Token │              │              │
     │<──────────────┤              │              │
     │              │ 8. 保存Token  │              │
     │ 9. 使用Token  │              │              │
     ├──────────────>│              │              │
     │              │              │              │
     │ 10. 同步配置  │              │              │
     ├──────────────>│              │              │
     │              │ 11. 查询配置  │              │
     │              ├──────────────>│              │
     │ 12. 返回配置  │              │              │
     │<──────────────┤              │              │
     │ 13. 连接企业微信            │              │
     ├──────────────────────────────>              │
     │              │              │              │
```

### 激活步骤

1. **用户输入激活码**
   - APP 端获取用户输入的激活码
   - 收集设备信息（设备ID、品牌、型号、系统版本等）

2. **发送激活请求**
   - 调用 `/api/activation-codes/activate` 接口
   - 携带激活码和设备信息

3. **服务器验证**
   - 验证激活码是否存在
   - 检查激活码状态（是否禁用、是否过期、是否达上限）
   - 检查设备是否已绑定（防止重复激活）
   - 检查设备是否已绑定其他激活码

4. **绑定设备**
   - 创建设备绑定记录
   - 生成访问 Token（24小时有效期）
   - 生成刷新 Token（用于续期）
   - 更新激活码使用次数

5. **返回结果**
   - 返回机器人ID、Token、过期时间等信息
   - APP 端保存 Token 到本地安全存储

6. **获取配置**
   - 使用 Token 调用 `/api/device/config` 接口
   - 获取企业微信 API 地址、回调地址等配置
   - 保存配置到本地

7. **连接企业微信**
   - 使用配置信息连接企业微信
   - 开始接收和发送消息

---

## API 接口说明

### 1. 激活接口

#### 基本信息

- **接口地址**: `POST /api/activation-codes/activate`
- **Content-Type**: `application/json`
- **认证**: 无需认证（激活时不需要 Token）

#### 请求参数

**Body (JSON)**:

```json
{
  "code": "ABC123DEF456",
  "userId": 1001,
  "deviceInfo": {
    "deviceId": "unique_device_id_123",
    "brand": "Xiaomi",
    "model": "Redmi Note 12",
    "os": "Android",
    "osVersion": "13",
    "manufacturer": "Xiaomi",
    "network": "WiFi",
    "appVersion": "1.0.0",
    "totalMemory": 8192,
    "screenResolution": "2400x1080"
  }
}
```

**参数说明**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `code` | string | ✅ 是 | 激活码（不区分大小写） |
| `userId` | number | ❌ 否 | 用户ID（用于绑定机器人到用户账户） |
| `deviceInfo` | object | ✅ 是 | 设备信息对象 |
| `deviceInfo.deviceId` | string | ✅ 是 | 设备唯一标识（建议使用设备UUID或MAC地址） |
| `deviceInfo.brand` | string | ❌ 否 | 设备品牌 |
| `deviceInfo.model` | string | ❌ 否 | 设备型号 |
| `deviceInfo.os` | string | ❌ 否 | 操作系统（Android/iOS） |
| `deviceInfo.osVersion` | string | ❌ 否 | 系统版本 |
| `deviceInfo.manufacturer` | string | ❌ 否 | 制造商 |
| `deviceInfo.network` | string | ❌ 否 | 网络类型（WiFi/4G/5G） |
| `deviceInfo.appVersion` | string | ❌ 否 | APP版本号 |
| `deviceInfo.totalMemory` | number | ❌ 否 | 设备总内存（MB） |
| `deviceInfo.screenResolution` | string | ❌ 否 | 屏幕分辨率 |

#### 响应格式

**成功响应 (200)**:

```json
{
  "success": true,
  "data": {
    "robotId": "BOT-20250109-ABC123",
    "robotUuid": "BOT-20250109-ABC123",
    "robotName": "我的工作助手",
    "token": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
    "refreshToken": "z9y8x7w6v5u4t3s2r1q0p9o8n7m6l5k4",
    "expiresAt": "2026-01-10T21:44:41.000Z",
    "message": "激活成功",
    "remainingUses": 9,
    "isNewActivation": true
  }
}
```

**已激活设备 (200)**:

```json
{
  "success": true,
  "data": {
    "robotId": "BOT-20250109-ABC123",
    "robotUuid": "BOT-20250109-ABC123",
    "robotName": "我的工作助手",
    "token": "existing_token_here",
    "refreshToken": "existing_refresh_token",
    "expiresAt": "2026-01-10T21:44:41.000Z",
    "message": "设备已激活，Token有效",
    "remainingUses": 9,
    "isNewActivation": false
  }
}
```

**错误响应 (400/404)**:

```json
{
  "success": false,
  "error": "激活码不存在"
}
```

#### 响应参数说明

| 参数 | 类型 | 说明 |
|------|------|------|
| `success` | boolean | 是否成功 |
| `data.robotId` | string | 机器人ID（唯一标识符，用于后续所有请求） |
| `data.robotUuid` | string | 机器人UUID（同robotId） |
| `data.robotName` | string | 机器人名称 |
| `data.token` | string | 访问Token（24小时有效） |
| `data.refreshToken` | string | 刷新Token（用于续期） |
| `data.expiresAt` | string | Token过期时间（ISO 8601格式） |
| `data.message` | string | 提示信息 |
| `data.remainingUses` | number | 剩余使用次数（null表示无限制） |
| `data.isNewActivation` | boolean | 是否为首次激活 |

---

### 2. 设备配置查询接口

#### 基本信息

- **接口地址**: `GET /api/device/config`
- **认证**: 需要认证（在 Header 中携带 Token）

#### 请求头

```
Authorization: Bearer {token}
X-Robot-Id: {robotId}
```

**参数说明**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `Authorization` | string | ✅ 是 | 认证信息，格式：`Bearer {token}` |
| `X-Robot-Id` | string | ❌ 否 | 机器人ID（可选，也可从Token中获取） |

#### 请求示例

```bash
curl -X GET "https://your-workbot-domain.com/api/device/config" \
  -H "Authorization: Bearer a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6" \
  -H "X-Robot-Id: BOT-20250109-ABC123"
```

#### 响应格式

**成功响应 (200)**:

```json
{
  "success": true,
  "data": {
    "worktoolApiUrl": "https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxx",
    "resultCallbackUrl": "https://your-workbot-domain.com/api/worktool/callback",
    "robotId": "BOT-20250109-ABC123",
    "secretKey": "your_secret_key_here",
    "updatedAt": 1705236281000
  }
}
```

**未配置 (200)**:

```json
{
  "success": true,
  "data": {
    "worktoolApiUrl": null,
    "resultCallbackUrl": null,
    "robotId": "BOT-20250109-ABC123",
    "secretKey": null,
    "updatedAt": 1705236281000,
    "message": "机器人尚未配置"
  }
}
```

**错误响应 (401)**:

```json
{
  "success": false,
  "error": "Token 无效",
  "code": "INVALID_TOKEN"
}
```

**错误响应 (404)**:

```json
{
  "success": false,
  "error": "机器人不存在",
  "code": "ROBOT_NOT_FOUND"
}
```

#### 响应参数说明

| 参数 | 类型 | 说明 |
|------|------|------|
| `success` | boolean | 是否成功 |
| `data.worktoolApiUrl` | string | 企业微信 Webhook 地址 |
| `data.resultCallbackUrl` | string | 结果回调地址 |
| `data.robotId` | string | 机器人ID |
| `data.secretKey` | string | 密钥（用于验证回调请求） |
| `data.updatedAt` | number | 配置更新时间戳（毫秒） |

---

### 3. Token 刷新接口（可选）

> **注意**: 当前版本暂未提供自动刷新接口，Token 过期后需要重新激活。

如果需要手动刷新 Token，可以重新调用激活接口，服务器会检测到设备已绑定并返回新的 Token。

---

## 错误码说明

### 激活错误码

| 错误信息 | HTTP状态码 | 说明 | 解决方案 |
|---------|-----------|------|---------|
| `激活码不存在` | 400 | 输入的激活码在数据库中不存在 | 检查激活码是否正确，联系管理员获取激活码 |
| `激活码已被禁用` | 400 | 激活码已被管理员禁用 | 联系管理员确认激活码状态 |
| `激活码已过期` | 400 | 激活码已超过有效期 | 联系管理员获取新的激活码 |
| `激活码使用次数已达上限` | 400 | 激活码已达到最大使用次数 | 联系管理员获取新的激活码 |
| `机器人不存在` | 404 | 激活码绑定的机器人不存在 | 联系管理员检查激活码配置 |
| `该设备已绑定到其他激活码，请先解绑` | 400 | 设备已绑定到其他激活码 | 联系管理员解绑设备后重新激活 |
| `请求参数错误` | 400 | 请求参数格式不正确 | 检查请求参数是否符合要求 |

### 配置查询错误码

| 错误信息 | HTTP状态码 | 说明 | 解决方案 |
|---------|-----------|------|---------|
| `缺少认证信息` | 401 | 请求头中缺少 Authorization | 在请求头中添加 `Authorization: Bearer {token}` |
| `Token 无效` | 401 | Token 不存在或已过期 | 重新激活获取新的 Token |
| `缺少机器人ID` | 400 | 请求头中缺少 X-Robot-Id | 在请求头中添加 `X-Robot-Id: {robotId}` |
| `机器人不存在` | 404 | 机器人ID不存在 | 检查机器人ID是否正确 |

### 网络错误码

| 错误信息 | 说明 | 解决方案 |
|---------|------|---------|
| `网络连接失败` | 无法连接到服务器 | 检查网络连接，稍后重试 |
| `请求超时` | 服务器响应超时 | 检查网络连接，稍后重试 |
| `服务器错误` | 服务器内部错误 | 联系技术支持 |

---

## 示例代码

### Android (Kotlin)

#### 1. 激活示例

```kotlin
import android.content.Context
import android.os.Build
import android.provider.Settings
import com.google.gson.Gson
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.*
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody.Companion.toRequestBody
import java.io.IOException
import java.util.*

// 数据类
data class DeviceInfo(
    val deviceId: String,
    val brand: String? = null,
    val model: String? = null,
    val os: String? = null,
    val osVersion: String? = null,
    val manufacturer: String? = null,
    val network: String? = null,
    val appVersion: String? = null,
    val totalMemory: Long? = null,
    val screenResolution: String? = null
)

data class ActivateRequest(
    val code: String,
    val userId: Int? = null,
    val deviceInfo: DeviceInfo
)

data class ActivateResponse(
    val success: Boolean,
    val data: ActivateData? = null,
    val error: String? = null
)

data class ActivateData(
    val robotId: String,
    val robotUuid: String,
    val robotName: String,
    val token: String,
    val refreshToken: String,
    val expiresAt: String,
    val message: String,
    val remainingUses: Int? = null,
    val isNewActivation: Boolean
)

// 激活管理器
class ActivationManager(private val context: Context) {
    private val client = OkHttpClient()
    private val gson = Gson()
    private val BASE_URL = "https://your-workbot-domain.com"

    // 获取设备ID
    fun getDeviceId(): String {
        return Settings.Secure.getString(
            context.contentResolver,
            Settings.Secure.ANDROID_ID
        )
    }

    // 获取设备信息
    fun getDeviceInfo(): DeviceInfo {
        return DeviceInfo(
            deviceId = getDeviceId(),
            brand = Build.BRAND,
            model = Build.MODEL,
            os = "Android",
            osVersion = Build.VERSION.RELEASE,
            manufacturer = Build.MANUFACTURER,
            network = getNetworkType(),
            appVersion = getAppVersion(),
            totalMemory = getTotalMemory(),
            screenResolution = getScreenResolution()
        )
    }

    // 激活激活码
    suspend fun activateCode(code: String, userId: Int? = null): Result<ActivateData> {
        return withContext(Dispatchers.IO) {
            try {
                val deviceInfo = getDeviceInfo()
                val request = ActivateRequest(
                    code = code,
                    userId = userId,
                    deviceInfo = deviceInfo
                )

                val json = gson.toJson(request)
                val body = json.toRequestBody("application/json".toMediaType())

                val httpRequest = Request.Builder()
                    .url("$BASE_URL/api/activation-codes/activate")
                    .post(body)
                    .build()

                val response = client.newCall(httpRequest).execute()
                val responseBody = response.body?.string()

                if (response.isSuccessful && responseBody != null) {
                    val activateResponse = gson.fromJson(responseBody, ActivateResponse::class.java)
                    if (activateResponse.success && activateResponse.data != null) {
                        // 保存 Token 到本地安全存储
                        saveToken(activateResponse.data)
                        Result.success(activateResponse.data)
                    } else {
                        Result.failure(Exception(activateResponse.error ?: "激活失败"))
                    }
                } else {
                    Result.failure(Exception("HTTP ${response.code}: ${responseBody}"))
                }
            } catch (e: Exception) {
                Result.failure(e)
            }
        }
    }

    // 保存 Token 到本地
    private fun saveToken(data: ActivateData) {
        val prefs = context.getSharedPreferences("workbot", Context.MODE_PRIVATE)
        prefs.edit().apply {
            putString("robotId", data.robotId)
            putString("token", data.token)
            putString("refreshToken", data.refreshToken)
            putString("expiresAt", data.expiresAt)
            putString("robotName", data.robotName)
            apply()
        }
    }

    // 获取保存的 Token
    fun getSavedToken(): String? {
        val prefs = context.getSharedPreferences("workbot", Context.MODE_PRIVATE)
        return prefs.getString("token", null)
    }

    // 检查 Token 是否过期
    fun isTokenExpired(): Boolean {
        val prefs = context.getSharedPreferences("workbot", Context.MODE_PRIVATE)
        val expiresAt = prefs.getString("expiresAt", null) ?: return true
        val expiryDate = try {
            SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).parse(expiresAt)
        } catch (e: Exception) {
            return true
        }
        return Date().after(expiryDate)
    }

    // 辅助方法
    private fun getNetworkType(): String {
        // 实现网络类型检测逻辑
        return "WiFi"
    }

    private fun getAppVersion(): String {
        return try {
            context.packageManager.getPackageInfo(context.packageName, 0).versionName
        } catch (e: Exception) {
            "1.0.0"
        }
    }

    private fun getTotalMemory(): Long {
        val activityManager = context.getSystemService(Context.ACTIVITY_SERVICE) as android.app.ActivityManager
        val memInfo = android.app.ActivityManager.MemoryInfo()
        activityManager.getMemoryInfo(memInfo)
        return memInfo.totalMem / (1024 * 1024)
    }

    private fun getScreenResolution(): String {
        val windowManager = context.getSystemService(Context.WINDOW_SERVICE) as android.view.WindowManager
        val metrics = android.util.DisplayMetrics()
        windowManager.defaultDisplay.getMetrics(metrics)
        return "${metrics.widthPixels}x${metrics.heightPixels}"
    }
}
```

#### 2. 配置查询示例

```kotlin
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

data class ConfigResponse(
    val success: Boolean,
    val data: ConfigData? = null,
    val error: String? = null,
    val code: String? = null
)

data class ConfigData(
    val worktoolApiUrl: String?,
    val resultCallbackUrl: String?,
    val robotId: String,
    val secretKey: String?,
    val updatedAt: Long,
    val message: String? = null
)

// 配置管理器
class ConfigManager(private val context: Context) {
    private val client = OkHttpClient()
    private val gson = Gson()
    private val BASE_URL = "https://your-workbot-domain.com"

    // 获取配置
    suspend fun getConfig(): Result<ConfigData> {
        return withContext(Dispatchers.IO) {
            try {
                val token = getSavedToken()
                val robotId = getSavedRobotId()

                if (token == null || robotId == null) {
                    return@withContext Result.failure(Exception("未激活"))
                }

                val httpRequest = Request.Builder()
                    .url("$BASE_URL/api/device/config")
                    .get()
                    .addHeader("Authorization", "Bearer $token")
                    .addHeader("X-Robot-Id", robotId)
                    .build()

                val response = client.newCall(httpRequest).execute()
                val responseBody = response.body?.string()

                if (response.isSuccessful && responseBody != null) {
                    val configResponse = gson.fromJson(responseBody, ConfigResponse::class.java)
                    if (configResponse.success && configResponse.data != null) {
                        // 保存配置到本地
                        saveConfig(configResponse.data)
                        Result.success(configResponse.data)
                    } else {
                        Result.failure(Exception(configResponse.error ?: "获取配置失败"))
                    }
                } else {
                    Result.failure(Exception("HTTP ${response.code}: ${responseBody}"))
                }
            } catch (e: Exception) {
                Result.failure(e)
            }
        }
    }

    // 保存配置
    private fun saveConfig(data: ConfigData) {
        val prefs = context.getSharedPreferences("workbot", Context.MODE_PRIVATE)
        prefs.edit().apply {
            putString("worktoolApiUrl", data.worktoolApiUrl)
            putString("resultCallbackUrl", data.resultCallbackUrl)
            putString("secretKey", data.secretKey)
            putLong("configUpdatedAt", data.updatedAt)
            apply()
        }
    }

    // 获取保存的配置
    fun getSavedConfig(): Map<String, String?> {
        val prefs = context.getSharedPreferences("workbot", Context.MODE_PRIVATE)
        return mapOf(
            "worktoolApiUrl" to prefs.getString("worktoolApiUrl", null),
            "resultCallbackUrl" to prefs.getString("resultCallbackUrl", null),
            "secretKey" to prefs.getString("secretKey", null)
        )
    }

    private fun getSavedToken(): String? {
        val prefs = context.getSharedPreferences("workbot", Context.MODE_PRIVATE)
        return prefs.getString("token", null)
    }

    private fun getSavedRobotId(): String? {
        val prefs = context.getSharedPreferences("workbot", Context.MODE_PRIVATE)
        return prefs.getString("robotId", null)
    }
}
```

#### 3. 使用示例

```kotlin
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.launch

class MainViewModel : ViewModel() {
    private val activationManager = ActivationManager(appContext)
    private val configManager = ConfigManager(appContext)

    fun activate(code: String) {
        viewModelScope.launch {
            when (val result = activationManager.activateCode(code)) {
                is Result.Success -> {
                    val data = result.getOrNull()!!
                    println("激活成功: ${data.robotName}")
                    println("机器人ID: ${data.robotId}")
                    println("Token: ${data.token}")
                    
                    // 激活成功后获取配置
                    loadConfig()
                }
                is Result.Failure -> {
                    println("激活失败: ${result.exceptionOrNull()?.message}")
                }
            }
        }
    }

    private fun loadConfig() {
        viewModelScope.launch {
            when (val result = configManager.getConfig()) {
                is Result.Success -> {
                    val config = result.getOrNull()!!
                    println("配置获取成功")
                    println("API URL: ${config.worktoolApiUrl}")
                    println("回调地址: ${config.resultCallbackUrl}")
                    
                    // 开始连接企业微信
                    connectToWeWork(config)
                }
                is Result.Failure -> {
                    println("获取配置失败: ${result.exceptionOrNull()?.message}")
                }
            }
        }
    }

    private fun connectToWeWork(config: ConfigData) {
        // 使用配置连接企业微信
        // ...
    }
}
```

---

### iOS (Swift)

#### 1. 激活示例

```swift
import Foundation
import UIKit

// 数据模型
struct DeviceInfo: Codable {
    let deviceId: String
    let brand: String?
    let model: String?
    let os: String?
    let osVersion: String?
    let manufacturer: String?
    let network: String?
    let appVersion: String?
    let totalMemory: Int?
    let screenResolution: String?
}

struct ActivateRequest: Codable {
    let code: String
    let userId: Int?
    let deviceInfo: DeviceInfo
}

struct ActivateResponse: Codable {
    let success: Bool
    let data: ActivateData?
    let error: String?
}

struct ActivateData: Codable {
    let robotId: String
    let robotUuid: String
    let robotName: String
    let token: String
    let refreshToken: String
    let expiresAt: String
    let message: String
    let remainingUses: Int?
    let isNewActivation: Bool
}

// 激活管理器
class ActivationManager {
    static let shared = ActivationManager()
    private let baseURL = "https://your-workbot-domain.com"
    
    // 获取设备ID
    func getDeviceId() -> String {
        return UIDevice.current.identifierForVendor?.uuidString ?? "unknown"
    }
    
    // 获取设备信息
    func getDeviceInfo() -> DeviceInfo {
        let device = UIDevice.current
        let screenSize = UIScreen.main.bounds.size
        
        return DeviceInfo(
            deviceId: getDeviceId(),
            brand: "Apple",
            model: device.model,
            os: device.systemName,
            osVersion: device.systemVersion,
            manufacturer: "Apple",
            network: getNetworkType(),
            appVersion: getAppVersion(),
            totalMemory: getTotalMemory(),
            screenResolution: "\(Int(screenSize.width))x\(Int(screenSize.height))"
        )
    }
    
    // 激活激活码
    func activateCode(code: String, userId: Int? = nil) async throws -> ActivateData {
        let deviceInfo = getDeviceInfo()
        let request = ActivateRequest(
            code: code,
            userId: userId,
            deviceInfo: deviceInfo
        )
        
        let url = URL(string: "\(baseURL)/api/activation-codes/activate")!
        var urlRequest = URLRequest(url: url)
        urlRequest.httpMethod = "POST"
        urlRequest.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let encoder = JSONEncoder()
        urlRequest.httpBody = try? encoder.encode(request)
        
        let (data, response) = try await URLSession.shared.data(for: urlRequest)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            throw ActivationError.invalidResponse
        }
        
        guard httpResponse.statusCode == 200 else {
            throw ActivationError.httpError(httpResponse.statusCode)
        }
        
        let activateResponse = try JSONDecoder().decode(ActivateResponse.self, from: data)
        
        guard activateResponse.success, let data = activateResponse.data else {
            throw ActivationError.activationFailed(activateResponse.error ?? "未知错误")
        }
        
        // 保存 Token 到本地
        saveToken(data)
        
        return data
    }
    
    // 保存 Token
    private func saveToken(_ data: ActivateData) {
        UserDefaults.standard.set(data.robotId, forKey: "robotId")
        UserDefaults.standard.set(data.token, forKey: "token")
        UserDefaults.standard.set(data.refreshToken, forKey: "refreshToken")
        UserDefaults.standard.set(data.expiresAt, forKey: "expiresAt")
        UserDefaults.standard.set(data.robotName, forKey: "robotName")
    }
    
    // 获取保存的 Token
    func getSavedToken() -> String? {
        return UserDefaults.standard.string(forKey: "token")
    }
    
    // 检查 Token 是否过期
    func isTokenExpired() -> Bool {
        guard let expiresAt = UserDefaults.standard.string(forKey: "expiresAt") else {
            return true
        }
        
        let formatter = ISO8601DateFormatter()
        guard let expiryDate = formatter.date(from: expiresAt) else {
            return true
        }
        
        return Date() > expiryDate
    }
    
    // 辅助方法
    private func getNetworkType() -> String {
        // 实现网络类型检测逻辑
        return "WiFi"
    }
    
    private func getAppVersion() -> String {
        return Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "1.0.0"
    }
    
    private func getTotalMemory() -> Int {
        return ProcessInfo.processInfo.physicalMemory / (1024 * 1024)
    }
}

enum ActivationError: Error {
    case invalidResponse
    case httpError(Int)
    case activationFailed(String)
}
```

#### 2. 配置查询示例

```swift
struct ConfigResponse: Codable {
    let success: Bool
    let data: ConfigData?
    let error: String?
    let code: String?
}

struct ConfigData: Codable {
    let worktoolApiUrl: String?
    let resultCallbackUrl: String?
    let robotId: String
    let secretKey: String?
    let updatedAt: Double
    let message: String?
}

// 配置管理器
class ConfigManager {
    static let shared = ConfigManager()
    private let baseURL = "https://your-workbot-domain.com"
    
    // 获取配置
    func getConfig() async throws -> ConfigData {
        guard let token = ActivationManager.shared.getSavedToken(),
              let robotId = UserDefaults.standard.string(forKey: "robotId") else {
            throw ConfigError.notActivated
        }
        
        let url = URL(string: "\(baseURL)/api/device/config")!
        var urlRequest = URLRequest(url: url)
        urlRequest.httpMethod = "GET"
        urlRequest.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        urlRequest.setValue(robotId, forHTTPHeaderField: "X-Robot-Id")
        
        let (data, response) = try await URLSession.shared.data(for: urlRequest)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            throw ConfigError.invalidResponse
        }
        
        guard httpResponse.statusCode == 200 else {
            throw ConfigError.httpError(httpResponse.statusCode)
        }
        
        let configResponse = try JSONDecoder().decode(ConfigResponse.self, from: data)
        
        guard configResponse.success, let data = configResponse.data else {
            throw ConfigError.fetchFailed(configResponse.error ?? "未知错误")
        }
        
        // 保存配置
        saveConfig(data)
        
        return data
    }
    
    // 保存配置
    private func saveConfig(_ data: ConfigData) {
        UserDefaults.standard.set(data.worktoolApiUrl, forKey: "worktoolApiUrl")
        UserDefaults.standard.set(data.resultCallbackUrl, forKey: "resultCallbackUrl")
        UserDefaults.standard.set(data.secretKey, forKey: "secretKey")
        UserDefaults.standard.set(data.updatedAt, forKey: "configUpdatedAt")
    }
    
    // 获取保存的配置
    func getSavedConfig() -> [String: String?] {
        return [
            "worktoolApiUrl": UserDefaults.standard.string(forKey: "worktoolApiUrl"),
            "resultCallbackUrl": UserDefaults.standard.string(forKey: "resultCallbackUrl"),
            "secretKey": UserDefaults.standard.string(forKey: "secretKey")
        ]
    }
}

enum ConfigError: Error {
    case notActivated
    case invalidResponse
    case httpError(Int)
    case fetchFailed(String)
}
```

#### 3. 使用示例

```swift
import SwiftUI

class MainViewModel: ObservableObject {
    @Published var isLoading = false
    @Published var errorMessage: String?
    @Published var robotName: String?
    
    func activate(code: String) {
        isLoading = true
        errorMessage = nil
        
        Task {
            do {
                let activationData = try await ActivationManager.shared.activateCode(code: code)
                
                DispatchQueue.main.async {
                    self.robotName = activationData.robotName
                    print("激活成功: \(activationData.robotName)")
                    print("机器人ID: \(activationData.robotId)")
                    print("Token: \(activationData.token)")
                    
                    // 激活成功后获取配置
                    self.loadConfig()
                }
            } catch {
                DispatchQueue.main.async {
                    self.errorMessage = "激活失败: \(error.localizedDescription)"
                    self.isLoading = false
                }
            }
        }
    }
    
    private func loadConfig() {
        Task {
            do {
                let config = try await ConfigManager.shared.getConfig()
                
                DispatchQueue.main.async {
                    print("配置获取成功")
                    print("API URL: \(config.worktoolApiUrl ?? "未配置")")
                    print("回调地址: \(config.resultCallbackUrl ?? "未配置")")
                    
                    // 开始连接企业微信
                    self.connectToWeWork(config: config)
                    
                    self.isLoading = false
                }
            } catch {
                DispatchQueue.main.async {
                    self.errorMessage = "获取配置失败: \(error.localizedDescription)"
                    self.isLoading = false
                }
            }
        }
    }
    
    private func connectToWeWork(config: ConfigData) {
        // 使用配置连接企业微信
        // ...
    }
}
```

---

## 安全注意事项

### 1. Token 安全

- ✅ **加密存储**: Token 必须存储在安全的存储中
  - Android: 使用 `EncryptedSharedPreferences` 或 Android Keystore
  - iOS: 使用 Keychain
  - 避免使用明文存储在 `SharedPreferences` 或 `UserDefaults`

- ✅ **传输安全**: 所有 API 请求必须使用 HTTPS
  - 防止中间人攻击
  - 验证 SSL 证书

- ✅ **Token 过期处理**: Token 过期后必须重新激活
  - 不要尝试篡改过期时间
  - Token 有效期为 24 小时

### 2. 设备信息安全

- ✅ **设备ID唯一性**: 设备ID必须在设备生命周期内保持不变
  - Android: 使用 `Settings.Secure.ANDROID_ID`
  - iOS: 使用 `UIDevice.current.identifierForVendor`

- ✅ **设备信息完整性**: 提供完整的设备信息
  - 有助于管理员识别问题设备
  - 有助于统计分析

### 3. 网络安全

- ✅ **请求重试**: 网络错误时自动重试
  - 最多重试 3 次
  - 使用指数退避策略

- ✅ **超时处理**: 设置合理的请求超时时间
  - 建议超时时间: 30 秒

- ✅ **错误处理**: 优雅处理各种错误情况
  - 网络错误
  - 服务器错误
  - 参数错误

### 4. 代码安全

- ✅ **混淆代码**: 发布前进行代码混淆
  - Android: 使用 ProGuard 或 R8
  - iOS: Xcode 自动优化

- ✅ **防逆向**: 防止逆向工程
  - 不要硬编码敏感信息
  - 使用证书固定（Certificate Pinning）

---

## 最佳实践

### 1. 激活流程

1. **首次启动检查**
   ```kotlin
   fun checkActivationStatus() {
       if (isTokenExpired()) {
           // Token 过期，引导用户重新激活
           showActivationScreen()
       } else {
           // Token 有效，直接使用
           loadConfig()
       }
   }
   ```

2. **激活失败处理**
   ```kotlin
   fun handleActivationError(error: String) {
       when (error) {
           "激活码不存在" -> showErrorCodeNotFound()
           "激活码已过期" -> showErrorCodeExpired()
           "激活码使用次数已达上限" -> showCodeLimitReached()
           else -> showError(error)
       }
   }
   ```

3. **自动重新激活**
   ```kotlin
   fun autoReactivate(refreshToken: String) {
       // 使用刷新Token重新激活
       activateCode(refreshToken)
   }
   ```

### 2. 配置管理

1. **配置缓存**
   ```kotlin
   fun getCachedConfig(): ConfigData? {
       val prefs = context.getSharedPreferences("workbot", Context.MODE_PRIVATE)
       val updatedAt = prefs.getLong("configUpdatedAt", 0)
       
       // 配置缓存 1 小时
       if (System.currentTimeMillis() - updatedAt < 3600000) {
           return getSavedConfig()
       }
       
       return null
   }
   ```

2. **配置更新监听**
   ```kotlin
   fun startConfigSync() {
       // 每 5 分钟同步一次配置
       val timer = Timer()
       timer.scheduleAtFixedRate(5000, 300000) {
           viewModelScope.launch {
               getConfig()
           }
       }
   }
   ```

### 3. 错误处理

1. **统一错误处理**
   ```kotlin
   sealed class WorkBotError {
       data class NetworkError(val message: String) : WorkBotError()
       data class AuthError(val message: String) : WorkBotError()
       data class ServerError(val code: Int, val message: String) : WorkBotError()
       data class ActivationError(val message: String) : WorkBotError()
   }
   
   fun handleError(error: Throwable): WorkBotError {
       return when (error) {
           is IOException -> WorkBotError.NetworkError("网络连接失败")
           is HttpException -> WorkBotError.ServerError(error.code(), error.message())
           else -> WorkBotError.ActivationError(error.message ?: "未知错误")
       }
   }
   ```

2. **用户友好提示**
   ```kotlin
   fun showError(error: WorkBotError) {
       val message = when (error) {
           is WorkBotError.NetworkError -> "网络连接失败，请检查网络后重试"
           is WorkBotError.AuthError -> "认证失败，请重新激活"
           is WorkBotError.ServerError -> "服务器错误，请稍后重试"
           is WorkBotError.ActivationError -> error.message
       }
       
       showErrorDialog(message)
   }
   ```

---

## 常见问题

### Q1: 激活码输入后提示"激活码不存在"

**A**: 检查以下几点：
1. 激活码是否正确（不区分大小写）
2. 是否有多余的空格或特殊字符
3. 联系管理员确认激活码是否有效

### Q2: 激活成功但无法获取配置

**A**: 检查以下几点：
1. Token 是否已过期（有效期为 24 小时）
2. 机器人ID是否正确
3. 网络连接是否正常
4. 联系管理员检查机器人配置

### Q3: Token 过期后如何处理？

**A**: Token 过期后需要重新激活：
1. 重新调用激活接口
2. 服务器会检测到设备已绑定
3. 返回新的 Token（无需新的激活码）

### Q4: 如何检测网络连接状态？

**A**: 
- **Android**: 使用 `ConnectivityManager`
- **iOS**: 使用 `NetworkReachabilityManager`

### Q5: 如何处理 Token 存储问题？

**A**: 
- **Android**: 使用 `EncryptedSharedPreferences`
- **iOS**: 使用 `Keychain`

### Q6: 激活码可以使用多次吗？

**A**: 这取决于激活码的配置：
- 如果设置了 `max_uses`，则最多使用 `max_uses` 次
- 如果未设置 `max_uses`，则可以无限次使用
- 同一个设备只能激活一次

### Q7: 如何验证 Token 是否有效？

**A**: 调用配置接口，如果返回 `Token 无效` 错误，说明 Token 已过期或无效。

### Q8: 如何处理网络超时？

**A**: 
1. 设置合理的超时时间（建议 30 秒）
2. 实现自动重试机制（最多 3 次）
3. 使用指数退避策略

---

## 联系支持

如有任何问题，请联系：
- **技术支持邮箱**: support@workbot.com
- **文档更新**: https://docs.workbot.com/activation

---

## 更新日志

### v1.0 (2026-02-09)
- 初始版本
- 提供激活接口
- 提供配置查询接口
- 提供错误码说明
- 提供 Android 和 iOS 示例代码
