// 临时用户数据存储（由于数据库连接问题，暂时使用内存存储）
import bcrypt from 'bcryptjs';

export interface User {
  id: number;
  phone: string;
  nickname: string;
  role: string;
  status: string;
  avatar: string | null;
  passwordHash: string;
  lastLoginAt: Date | null;
  createdAt: Date;
}

// 内存中的用户数据
const usersData: User[] = [
  {
    id: 3,
    phone: 'hh198752',
    nickname: '超级管理员',
    role: 'admin',
    status: 'active',
    avatar: null,
    passwordHash: '$2a$10$Yuj.XpeTzY9SEvNOjDZAourceqAc3DujtsJyXRs/g8Pe/v56MOpeq', // 198752
    lastLoginAt: null,
    createdAt: new Date('2026-02-07'),
  },
];

// 用户数据操作类
export class UserStore {
  async findByPhone(phone: string): Promise<User | null> {
    return usersData.find(u => u.phone === phone && u.status === 'active') || null;
  }

  async findById(id: number): Promise<User | null> {
    return usersData.find(u => u.id === id) || null;
  }

  async updateLastLogin(userId: number): Promise<void> {
    const user = usersData.find(u => u.id === userId);
    if (user) {
      user.lastLoginAt = new Date();
    }
  }

  async verifyPassword(phone: string, password: string): Promise<User | null> {
    const user = await this.findByPhone(phone);
    if (!user) {
      return null;
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    return isValid ? user : null;
  }

  async getAllUsers(): Promise<User[]> {
    return usersData.filter(u => u.status === 'active');
  }

  async createUser(data: Omit<User, 'id' | 'passwordHash' | 'createdAt' | 'lastLoginAt'> & { password: string }): Promise<User> {
    const id = Math.max(...usersData.map(u => u.id)) + 1;
    const passwordHash = await bcrypt.hash(data.password, 10);

    const newUser: User = {
      id,
      phone: data.phone,
      nickname: data.nickname,
      role: data.role,
      status: data.status,
      avatar: data.avatar,
      passwordHash,
      lastLoginAt: null,
      createdAt: new Date(),
    };

    usersData.push(newUser);
    return newUser;
  }
}

// 导出单例
export const userStore = new UserStore();
