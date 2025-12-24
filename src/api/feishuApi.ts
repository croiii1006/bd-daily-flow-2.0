// src/api/feishuApi.ts

/**
 * 前端调用本地 Node 服务的飞书 API 封装
 *
 * 后端地址默认同域：/api
 * 约定接口：
 *   GET  /api/customers           获取全部客户
 *   GET  /api/customers?keyword=  按关键字搜索客户（可选，将来用）
 */

import type { Customer, Project, Signoff, DailySummary } from '@/types';

// 后端基础地址：默认同域，必要时用环境变量覆盖
const API_BASE_URL = (import.meta as any).env?.VITE_FEISHU_API_BASE_URL || '';

console.log('🔥 FEISHU API BASE URL =', API_BASE_URL);
/**
 * 通用请求封装
 */
async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });

  if (!res.ok) {
    const text = await res.text();
    console.error('请求失败:', res.status, text);
    throw new Error(text || `Request failed with status ${res.status}`);
  }

  return res.json() as Promise<T>;
}

export const feishuApi = {
  // ==================== 客户相关 API ====================

  /**
   * 获取所有客户（从你本地 Node 服务 -> 再到飞书）
   */
  // feishuApi.ts
// ✅ 写回新增客户到后端 -> 后端再写回飞书
async createCustomerToFeishu(payload: {
  shortName: string;
  companyName: string;
  brandDeptName?: string;
}) {
  // ⚠️ 关键：确保 fetch 用 JSON stringify（UTF-8）发送
  const data = await request<any>('/api/customers', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  return data;
},

async getAllCustomers(): Promise<any[]> {
  const data = await request<any>('/api/customers');

  console.log('🟦 /api/customers 原始返回:', data);

  // 你的后端结构是 { success: true, data: [...] }
  if (!data || !Array.isArray(data.data)) {
    console.warn('⚠️ getAllCustomers 期望 { success, data: [] }，实际为：', data);
    return [];
  }

  const list = data.data;
  console.log('✅ 解析出的客户数组长度:', list.length);

  // 这里先把 Feishu 原始结构原样返回，后面在 dataService 里做二次转换
  return list;
},



    /**
     * 搜索客户（预留，将来可以用 keyword 做后端过滤）
     */
  async searchCustomer(keyword: string): Promise<Customer[]> {
    const q = encodeURIComponent(keyword);
    const data = await request<{ items: Customer[] }>(
      `/api/customers?keyword=${q}`,
    );
    return data.items || [];
  },

  /**
   * 根据 ID 获取客户（简单做法：先把全部拉下来前端自己找）
   */
  async getCustomerById(id: string): Promise<Customer | null> {
    const list = await feishuApi.getAllCustomers();
    return list.find((c: any) => c.id === id || c.customerId === id) || null;
  },

  /**
   * 创建客户 / 更新客户 —— 先保留 TODO，将来等你后端写好再连
   */
  async createCustomer(
    _data: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<Customer | null> {
    console.warn('createCustomer 目前还是占位，尚未接通后端');
    return null;
  },

  async updateCustomer(
    _id: string,
    _data: Partial<Customer>,
  ): Promise<boolean> {
    console.warn('updateCustomer 目前还是占位，尚未接通后端');
    return false;
  },

  // ==================== 项目 / 立项 / 每日复盘 ====================
  // 这些先保留占位，等你先把 “客户列表” 打通之后再一步步实现

  async createProject(
    _data: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<Project | null> {
    console.warn('createProject 目前还是占位');
    return null;
  },

  async updateProject(_id: string, _data: Partial<Project>): Promise<boolean> {
    console.warn('updateProject 目前还是占位');
    return false;
  },

  async searchProject(_keyword: string): Promise<Project[]> {
    console.warn('searchProject 目前还是占位');
    return [];
  },

  async getAllProjects(): Promise<Project[]> {
    console.warn('getAllProjects 目前还是占位');
    return [];
  },

  async getProjectById(_id: string): Promise<Project | null> {
    console.warn('getProjectById 目前还是占位');
    return null;
  },

  async createSignoff(
    _data: Omit<Signoff, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<Signoff | null> {
    console.warn('createSignoff 目前还是占位');
    return null;
  },

  async updateSignoff(_id: string, _data: Partial<Signoff>): Promise<boolean> {
    console.warn('updateSignoff 目前还是占位');
    return false;
  },

  async getSignoffByProjectId(_projectId: string): Promise<Signoff | null> {
    console.warn('getSignoffByProjectId 目前还是占位');
    return null;
  },

  async createDailySummary(
    _data: Omit<DailySummary, 'id' | 'createdAt'>,
  ): Promise<DailySummary | null> {
    console.warn('createDailySummary 目前还是占位');
    return null;
  },

  async getDailySummaryByDate(_date: string): Promise<DailySummary[]> {
    console.warn('getDailySummaryByDate 目前还是占位');
    return [];
  },
};

export default feishuApi;
