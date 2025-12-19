/**
 * 飞书多维表 API 封装（占位）
 * 
 * 当前版本仅作为接口预留，不实际调用飞书 API。
 * 未来接入时只需替换此文件中的实现即可。
 * 
 * 飞书 Bitable API 文档:
 * - https://open.feishu.cn/document/uAjLw4CM/ukTMukTMukTM/reference/bitable-v1/app-table-record/search
 * - https://open.feishu.cn/document/uAjLw4CM/ukTMukTMukTM/reference/bitable-v1/app-table-record/create
 * - https://open.feishu.cn/document/uAjLw4CM/ukTMukTMukTM/reference/bitable-v1/app-table-record/update
 */

import type { Client, Project, Deal } from '@/types/bd';

// 飞书 API 配置（未来需要填入真实值）
const FEISHU_CONFIG = {
  appId: 'YOUR_APP_ID',
  appSecret: 'YOUR_APP_SECRET',
  baseId: 'YOUR_BITABLE_BASE_ID',
  tables: {
    clients: 'YOUR_CLIENT_TABLE_ID',
    projects: 'YOUR_PROJECT_TABLE_ID',
    deals: 'YOUR_DEAL_TABLE_ID',
  },
};

/**
 * 获取飞书访问令牌
 * TODO: 实现真实的 OAuth 或 App Access Token 获取逻辑
 */
async function getAccessToken(): Promise<string> {
  // TODO: 调用飞书 API 获取 tenant_access_token
  // POST https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal
  console.log('[Feishu Bitable API] getAccessToken called');
  return 'mock_access_token';
}

export const feishuBitableApi = {
  // ==================== 客户表操作 ====================
  
  /**
   * 获取所有客户
   * TODO: 调用飞书 Bitable 客户表，返回 Client[]
   */
  fetchClients: async (): Promise<Client[]> => {
    console.log('[Feishu Bitable API] fetchClients called');
    // TODO: GET https://open.feishu.cn/open-apis/bitable/v1/apps/{app_token}/tables/{table_id}/records
    return [];
  },

  /**
   * 创建客户记录
   */
  
  createClient: async (data: Omit<Client, 'customerId' | 'projectIds' | 'createdAt' | 'updatedAt'>): Promise<Client | null> => {
    console.log('[Feishu Bitable API] createClient called with:', data);
    // TODO: POST https://open.feishu.cn/open-apis/bitable/v1/apps/{app_token}/tables/{table_id}/records
    return null;
  },

  /**
   * 更新客户记录
   */
  updateClient: async (customerId: string, data: Partial<Client>): Promise<boolean> => {
    console.log('[Feishu Bitable API] updateClient called with:', customerId, data);
    // TODO: PUT https://open.feishu.cn/open-apis/bitable/v1/apps/{app_token}/tables/{table_id}/records/{record_id}
    return false;
  },

  /**
   * 搜索客户
   */
  searchClients: async (keyword: string): Promise<Client[]> => {
    console.log('[Feishu Bitable API] searchClients called with:', keyword);
    // TODO: POST https://open.feishu.cn/open-apis/bitable/v1/apps/{app_token}/tables/{table_id}/records/search
    return [];
  },

  // ==================== 项目表操作 ====================

  /**
   * 获取所有项目
   * TODO: 调用项目进度数据表
   */
  fetchProjects: async (): Promise<Project[]> => {
    console.log('[Feishu Bitable API] fetchProjects called');
    return [];
  },

  /**
   * 创建项目记录
   */
  createProject: async (data: Omit<Project, 'projectId' | 'createdAt' | 'updatedAt'>): Promise<Project | null> => {
    console.log('[Feishu Bitable API] createProject called with:', data);
    return null;
  },

  /**
   * 更新项目记录
   */
  updateProject: async (projectId: string, data: Partial<Project>): Promise<boolean> => {
    console.log('[Feishu Bitable API] updateProject called with:', projectId, data);
    return false;
  },

  /**
   * 搜索项目
   */
  searchProjects: async (keyword: string): Promise<Project[]> => {
    console.log('[Feishu Bitable API] searchProjects called with:', keyword);
    return [];
  },

  // ==================== 立项表操作 ====================

  /**
   * 获取所有立项记录
   * TODO: 调用立项数据表
   */
  fetchDeals: async (): Promise<Deal[]> => {
    console.log('[Feishu Bitable API] fetchDeals called');
    return [];
  },

  /**
   * 创建立项记录
   */
  createDeal: async (data: Omit<Deal, 'dealId' | 'createdAt' | 'updatedAt'>): Promise<Deal | null> => {
    console.log('[Feishu Bitable API] createDeal called with:', data);
    return null;
  },

  /**
   * 更新立项记录
   */
  updateDeal: async (dealId: string, data: Partial<Deal>): Promise<boolean> => {
    console.log('[Feishu Bitable API] updateDeal called with:', dealId, data);
    return false;
  },

  // ==================== 通知相关 ====================

  /**
   * 发送跟进提醒
   * TODO: 发送消息给对应BD（使用飞书消息 API）
   */
  sendFollowupReminder: async (projectId: string): Promise<boolean> => {
    console.log('[Feishu Bitable API] sendFollowupReminder called with:', projectId);
    // TODO: POST https://open.feishu.cn/open-apis/im/v1/messages
    return false;
  },
};

export default feishuBitableApi;
