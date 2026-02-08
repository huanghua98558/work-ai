/**
 * API 客户端 - 自动处理权限问题
 */

interface RequestOptions extends RequestInit {
  autoFixRole?: boolean;  // 是否自动修复角色问题
  onPermissionError?: () => void;  // 权限错误回调
}

// 确保只在客户端访问 localStorage
const isClient = typeof window !== 'undefined';

/**
 * 获取 Token
 */
function getToken(): string | null {
  if (!isClient) return null;
  return localStorage.getItem('token');
}

/**
 * 设置 Token
 */
function setToken(token: string): void {
  if (!isClient) return;
  localStorage.setItem('token', token);
}

/**
 * 移除 Token
 */
function removeToken(): void {
  if (!isClient) return;
  localStorage.removeItem('token');
}

/**
 * 认证请求包装器 - 自动处理 403 权限错误
 */
async function authenticatedFetch(
  url: string,
  options: RequestOptions = {}
): Promise<any> {
  const { autoFixRole = true, onPermissionError, ...fetchOptions } = options;

  const token = getToken();

  if (!token && isClient) {
    throw new Error('未登录');
  }

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
    ...fetchOptions.headers,
  };

  try {
    const response = await fetch(url, { ...fetchOptions, headers });

    // 检查 403 权限错误
    if (response.status === 403 && autoFixRole && isClient) {
      console.log('[API 客户端] 检测到权限不足（403），尝试自动修复');

      // 尝试检查并修复角色
      try {
        const checkRes = await fetch('/api/auth/check-role', { headers });
        const checkData = await checkRes.json();

        console.log('[API 客户端] 角色检查结果:', checkData);

        if (checkData.success && checkData.data && !checkData.data.consistent) {
          // 角色不一致，使用新的 Token
          const newToken = checkData.data.newToken;
          console.log('[API 客户端] 使用新的 Token 重新请求');
          setToken(newToken);

          // 显示提示
          showToast('权限已更新', `您的角色已从 ${checkData.data.oldRole} 更新为 ${checkData.data.newRole}，正在重新加载...`);

          // 使用新的 Token 重新请求
          return authenticatedFetch(url, { ...options, autoFixRole: false });
        } else if (checkData.success && checkData.data && checkData.data.consistent) {
          // 角色一致但仍然没有权限
          console.log('[API 客户端] 角色一致但仍然没有权限');
          throw new Error('权限不足');
        }
      } catch (error) {
        console.error('[API 客户端] 检查角色失败:', error);
      }

      // 如果自动修复失败，触发回调或抛出错误
      if (onPermissionError) {
        onPermissionError();
      } else {
        throw new Error('权限不足，请重新登录');
      }
    }

    // 检查其他错误
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || '请求失败');
    }

    return await response.json();
  } catch (error: any) {
    console.error('[API 客户端] 请求失败:', error);
    throw error;
  }
}

/**
 * API 客户端实例 - 兼容旧代码
 */
export const apiClient = {
  /**
   * GET 请求
   */
  async get<T = any>(url: string, params?: any): Promise<{ data: T }> {
    // 如果有参数，将它们附加到 URL 上
    const queryString = params ? `?${new URLSearchParams(params)}` : '';
    const response = await authenticatedFetch(`${url}${queryString}`, { method: 'GET' });
    return { data: response };
  },

  /**
   * POST 请求
   */
  async post<T = any>(url: string, data: any): Promise<{ data: T }> {
    const response = await authenticatedFetch(url, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return { data: response };
  },

  /**
   * PUT 请求
   */
  async put<T = any>(url: string, data: any): Promise<{ data: T }> {
    const response = await authenticatedFetch(url, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return { data: response };
  },

  /**
   * PATCH 请求
   */
  async patch<T = any>(url: string, data: any): Promise<{ data: T }> {
    const response = await authenticatedFetch(url, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    return { data: response };
  },

  /**
   * DELETE 请求
   */
  async delete<T = any>(url: string): Promise<{ data: T }> {
    const response = await authenticatedFetch(url, { method: 'DELETE' });
    return { data: response };
  },

  /**
   * 设置 Token
   */
  setToken,

  /**
   * 获取 Token
   */
  getToken,

  /**
   * 移除 Token
   */
  removeToken,
};

/**
 * 显示 Toast 提示
 */
function showToast(title: string, description: string) {
  // 动态创建 toast 元素
  const toast = document.createElement('div');
  toast.className = 'fixed top-4 right-4 z-50 p-4 bg-blue-500 text-white rounded-lg shadow-lg';
  toast.innerHTML = `
    <div class="font-semibold">${title}</div>
    <div class="text-sm">${description}</div>
  `;
  document.body.appendChild(toast);

  // 3 秒后自动消失
  setTimeout(() => {
    toast.remove();
  }, 3000);
}

/**
 * 创建激活码管理专用的 API 客户端
 */
export const activationCodesAPI = {
  getList: (params?: any) => {
    const queryString = params ? `?${new URLSearchParams(params)}` : '';
    return authenticatedFetch(`/api/activation-codes${queryString}`);
  },

  create: (data: any) => {
    return authenticatedFetch('/api/activation-codes', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  delete: (id: number) => {
    return authenticatedFetch(`/api/activation-codes/${id}`, {
      method: 'DELETE',
    });
  },

  update: (id: number, data: any) => {
    return authenticatedFetch(`/api/activation-codes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
};

/**
 * 创建机器人管理专用的 API 客户端
 */
export const robotsAPI = {
  getList: (params?: any) => {
    const queryString = params ? `?${new URLSearchParams(params)}` : '';
    return authenticatedFetch(`/api/robots${queryString}`);
  },

  create: (data: any) => {
    return authenticatedFetch('/api/robots', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  delete: (id: number) => {
    return authenticatedFetch(`/api/robots/${id}`, {
      method: 'DELETE',
    });
  },

  update: (id: number, data: any) => {
    return authenticatedFetch(`/api/robots/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
};

/**
 * 创建用户管理专用的 API 客户端
 */
export const usersAPI = {
  getCurrentUser: () => {
    return authenticatedFetch('/api/users/me');
  },

  promoteToAdmin: () => {
    return authenticatedFetch('/api/users/promote-admin', {
      method: 'POST',
    });
  },
};
