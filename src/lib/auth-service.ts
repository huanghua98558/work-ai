import { apiClient } from './api-client';

export interface LoginParams {
  phone: string;
  smsCode: string;
}

export interface RegisterParams {
  phone: string;
  password: string;
  name: string;
}

export interface User {
  id: number;
  phone: string;
  name: string;
  role: string;
  createdAt: string;
}

export class AuthService {
  async login(params: LoginParams) {
    const response = await apiClient.post<{ token: string; user: User }>(
      '/api/user/login-by-sms',
      params
    );
    
    if (response.data?.token) {
      apiClient.setToken(response.data.token);
    }
    
    return response;
  }

  async register(params: RegisterParams) {
    const response = await apiClient.post<{ token: string; user: User }>(
      '/api/auth/register',
      params
    );
    
    if (response.data?.token) {
      apiClient.setToken(response.data.token);
    }
    
    return response;
  }

  async sendSmsCode(phone: string) {
    return apiClient.post('/api/user/send-sms', { phone });
  }

  async refreshToken() {
    const response = await apiClient.post<{ token: string }>('/api/auth/refresh-token', {});
    
    if (response.data?.token) {
      apiClient.setToken(response.data.token);
    }
    
    return response;
  }

  logout() {
    apiClient.removeToken();
  }

  isAuthenticated(): boolean {
    return !!apiClient.getToken();
  }
}

export const authService = new AuthService();
