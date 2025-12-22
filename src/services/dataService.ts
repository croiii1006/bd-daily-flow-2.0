/**
 * 数据服务层
 *
 * 统一的数据访问接口：
 * - 项目：优先走后端 /api/projects（后端再去调用飞书）
 * - 客户：优先走后端 /api/customers（后端再去调用飞书）
 * - 其它（立项/每日表单等）：当前仍走 mock（按原有逻辑保持不动）
 */

import { mockDb } from '@/mock/bdMockData';
import { feishuBitableApi } from '@/api/feishuBitableApi';
import type {
  Client,
  Project,
  Deal,
  DailyFormData,
  ReminderItem,
  UnfinishedReminderItem,
  FinishedReminderItem,
  ReminderLevel,
} from '@/types/bd';

// 是否使用“前端直连飞书”的占位 API（当前实现是占位，不建议开启）
const USE_FEISHU_API = false;

async function fetchJson(url: string, init?: RequestInit) {
  const res = await fetch(url, init);
  const json = await res.json().catch(() => null);
  return { res, json };
}

const parseDate = (value: string | Date | undefined | null) => {
  if (!value) return null;
  if (value instanceof Date) {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }
  let str = String(value).trim();
  if (!str) return null;
  str = str.replace(/[./]/g, '-');
  if (/^\d{4}-\d{1,2}-\d{1,2}\s+\d/.test(str)) {
    str = str.replace(' ', 'T');
  }
  const d = new Date(str);
  if (Number.isNaN(d.getTime())) return null;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
};

const getDaysDiff = (from: string | Date | undefined | null, to: string | Date | undefined | null) => {
  const d1 = parseDate(from);
  const d2 = parseDate(to);
  if (!d1 || !d2) return 0;
  const ms = d2.getTime() - d1.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
};

export const dataService = {
  // ==================== 客户操作 ====================

  async getAllClients(): Promise<Client[]> {
    try {
      const { res, json } = await fetchJson('/api/customers', { cache: 'no-store' });
      if (!res.ok || !json?.success) {
        throw new Error(json?.error || `Request failed with status ${res.status}`);
      }
      return (json?.data || []) as Client[];
    } catch (e) {
      console.error('[dataService] getAllClients via backend failed, fallback to mockDb:', e);
      return mockDb.getAllClients();
    }
  },

  async getClientById(customerId: string): Promise<Client | undefined> {
    // 后端目前只提供 list API，前端通过列表过滤拿到单条
    const clients = await dataService.getAllClients();
    return clients.find((c: any) => c?.id === customerId || c?.customerId === customerId);
  },

  async searchClients(keyword: string): Promise<Client[]> {
    const k = String(keyword || '').trim();
    if (!k) return dataService.getAllClients();

    try {
      const { res, json } = await fetchJson(
        `/api/customers?keyword=${encodeURIComponent(k)}`,
        { cache: 'no-store' }
      );
      if (!res.ok || !json?.success) {
        throw new Error(json?.error || `Request failed with status ${res.status}`);
      }
      return (json?.data || []) as Client[];
    } catch (e) {
      console.error('[dataService] searchClients via backend failed, fallback to mockDb:', e);
      return mockDb.searchClients(k);
    }
  },

  async createClient(
    data: Omit<Client, 'id' | 'customerId' | 'relatedProjectIds'>
  ): Promise<Client> {
    // ✅ 必须走后端写回飞书，否则 Network 里不会出现 POST /api/customers
    try {
      const payload = {
        shortName: data.shortName,
        companyName: data.companyName,
        hq: data.hq || '',
        customerType: (data.customerType || '').trim(),
        level: (data.level || '').trim(),
        cooperationStatus: (data.cooperationStatus || '').trim(),
        industry: (data.industry || '').trim(),
        isAnnual: !!data.isAnnual,
        // 后端客户接口读取 ownerBd / ownerUserId
        ownerBd: (data as any).ownerBd || (data as any).owner || '',
        ownerUserId: (data as any).ownerUserId || '',
      };

      const { res, json } = await fetchJson('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify(payload),
      });

      if (!res.ok || !json?.success) {
        throw new Error(json?.error || `Request failed with status ${res.status}`);
      }

      const recordId = json.record_id || json?.data?.records?.[0]?.record_id || '';
      return {
        id: recordId || Date.now().toString(),
        shortName: data.shortName,
        companyName: data.companyName,
        customerType: data.customerType,
        level: data.level || '',
        cooperationStatus: data.cooperationStatus || '',
        industry: data.industry || '',
        hq: data.hq || '',
        isAnnual: !!data.isAnnual,
        owner: (data as any).owner || (data as any).ownerBd || '',
        ownerUserId: (data as any).ownerUserId || '',
        relatedProjectIds: [],
        customerId: recordId || Date.now().toString(),
      };
    } catch (e) {
      console.error('[dataService] createClient via backend failed, fallback to mockDb:', e);
      return mockDb.createClient(data as any);
    }
  },

  async updateClient(customerId: string, data: Partial<Client>): Promise<boolean> {
    // preferred: backend (server -> Feishu), fallback to mock
    try {
      const { res, json } = await fetchJson(`/api/customers/${encodeURIComponent(customerId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify(data || {}),
      });
      if (!res.ok || !json?.success) {
        throw new Error(json?.error || `Request failed with status ${res.status}`);
      }
      return true;
    } catch (e) {
      console.error('[dataService] updateClient via backend failed, fallback to mockDb:', e);
      if (USE_FEISHU_API) {
        return feishuBitableApi.updateClient(customerId, data);
      }
      return mockDb.updateClient(customerId, data);
    }
  },

  // ==================== 项目操作 ====================

  async getAllProjects(): Promise<Project[]> {
    try {
      const { res, json } = await fetchJson('/api/projects', { cache: 'no-store' });
      if (!res.ok || !json?.success) {
        throw new Error(json?.error || `Request failed with status ${res.status}`);
      }
      return (json?.data || []) as Project[];
    } catch (e) {
      console.error('[dataService] getAllProjects via backend failed, fallback to mockDb:', e);
      return mockDb.getAllProjects();
    }
  },

  async getProjectById(projectId: string): Promise<Project | undefined> {
    try {
      const { res, json } = await fetchJson(`/api/projects/${encodeURIComponent(projectId)}`, {
        cache: 'no-store',
      });
      if (res.status === 404) return undefined;
      if (!res.ok || !json?.success) {
        throw new Error(json?.error || `Request failed with status ${res.status}`);
      }
      return (json?.data || undefined) as Project | undefined;
    } catch (e) {
      console.error('[dataService] getProjectById via backend failed, fallback to mockDb:', e);
      return mockDb.getProjectById(projectId);
    }
  },

  async getProjectsByCustomerId(customerId: string): Promise<Project[]> {
    try {
      const q = encodeURIComponent(customerId);
      const { res, json } = await fetchJson(`/api/projects?customerId=${q}`, { cache: 'no-store' });
      if (!res.ok || !json?.success) {
        throw new Error(json?.error || `Request failed with status ${res.status}`);
      }
      return (json?.data || []) as Project[];
    } catch (e) {
      console.error(
        '[dataService] getProjectsByCustomerId via backend failed, fallback to mockDb:',
        e
      );
      return mockDb.getProjectsByCustomerId(customerId);
    }
  },

  async searchProjects(keyword: string): Promise<Project[]> {
    try {
      const q = encodeURIComponent(keyword || '');
      const { res, json } = await fetchJson(`/api/projects?keyword=${q}`, { cache: 'no-store' });
      if (!res.ok || !json?.success) {
        throw new Error(json?.error || `Request failed with status ${res.status}`);
      }
      return (json?.data || []) as Project[];
    } catch (e) {
      console.error('[dataService] searchProjects via backend failed, fallback to mockDb:', e);
      return mockDb.searchProjects(keyword);
    }
  },

  async createProject(
    data: Omit<Project, 'projectId' | 'createdAt' | 'updatedAt'>
  ): Promise<Project> {
    // preferred: backend (server -> Feishu), fallback to mock
    try {
      const { res, json } = await fetchJson('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify(data || {}),
      });
      if (!res.ok || !json?.success) {
        throw new Error(json?.error || `Request failed with status ${res.status}`);
      }
      // Backend returns record_id + fields; we re-fetch list to keep mapping consistent
      const projects = await dataService.getAllProjects();
      const createdId = data?.projectId || json?.record_id;
      return (
        projects.find((p: any) => p?.projectId === createdId) ||
        (projects[0] as any) ||
        (data as any)
      );
    } catch (e) {
      console.error('[dataService] createProject via backend failed, fallback to mockDb:', e);
      return mockDb.createProject(data);
    }
  },

  async updateProject(projectId: string, data: Partial<Project>): Promise<boolean> {
    // preferred: backend (server -> Feishu), fallback to mock
    try {
      const { res, json } = await fetchJson(`/api/projects/${encodeURIComponent(projectId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify(data || {}),
      });
      if (!res.ok || !json?.success) {
        throw new Error(json?.error || `Request failed with status ${res.status}`);
      }
      return true;
    } catch (e) {
      console.error('[dataService] updateProject via backend failed, fallback to mockDb:', e);
      if (USE_FEISHU_API) {
        return feishuBitableApi.updateProject(projectId, data);
      }
      return mockDb.updateProject(projectId, data);
    }
  },

  // ==================== 立项操作 ====================

  async getAllDeals(): Promise<Deal[]> {
    try {
      const { res, json } = await fetchJson('/api/deals', { cache: 'no-store' });
      if (!res.ok || !json?.success) {
        throw new Error(json?.error || `Request failed with status ${res.status}`);
      }
      return (json?.data || []) as Deal[];
    } catch (e) {
      console.error('[dataService] getAllDeals via backend failed, fallback to mockDb:', e);
      return mockDb.getAllDeals();
    }
  },

  async getDealById(dealId: string): Promise<Deal | undefined> {
    const deals = await dataService.getAllDeals();
    return deals.find((d: any) => d?.dealId === dealId);
  },

  async getDealByProjectId(projectId: string): Promise<Deal | undefined> {
    const deals = await dataService.getAllDeals();
    return deals.find((d: any) => d?.projectId === projectId);
  },

  async createDeal(data: Omit<Deal, 'createdAt' | 'updatedAt'>): Promise<Deal> {
    try {
      const { res, json } = await fetchJson('/api/deals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify(data || {}),
      });
      if (!res.ok || !json?.success) {
        throw new Error(json?.error || `Request failed with status ${res.status}`);
      }
      return (data as any) as Deal;
    } catch (e) {
      console.error('[dataService] createDeal via backend failed, fallback to mockDb:', e);
      return mockDb.createDeal(data as any);
    }
  },

  async updateDeal(dealId: string, data: Partial<Deal>): Promise<boolean> {
    try {
      const { res, json } = await fetchJson(`/api/deals/${encodeURIComponent(dealId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify(data || {}),
      });
      if (!res.ok || !json?.success) {
        throw new Error(json?.error || `Request failed with status ${res.status}`);
      }
      return true;
    } catch (e) {
      console.error('[dataService] updateDeal via backend failed, fallback to mockDb:', e);
      if (USE_FEISHU_API) {
        return feishuBitableApi.updateDeal(dealId, data);
      }
      return mockDb.updateDeal(dealId, data);
    }
  },

  // ==================== 每日表单操作 ====================

  async getAllDailyForms(): Promise<DailyFormData[]> {
    return mockDb.getAllDailyForms();
  },

  async createDailyForm(data: Omit<DailyFormData, 'id' | 'createdAt'>): Promise<DailyFormData> {
    return mockDb.createDailyForm(data);
  },

  // ==================== ????????? ====================

  async getUnfinishedReminders(): Promise<UnfinishedReminderItem[]> {
    const projects = await this.getAllProjects();
    const today = new Date();

    const reminderProjectTypes = ['方案&报价', 'POC'];
    const excludeStages = ['丢单'];
    const reminderStages = ['未开始', '进行中', '停滞'];

    return projects
      .filter((p) => {
        const projectType = String(p.projectType || '').trim();
        const stage = String(p.stage || '').trim();
        if (!reminderProjectTypes.includes(projectType)) return false;
        if (excludeStages.includes(stage)) return false;
        if (!reminderStages.includes(stage)) return false;

        if (p.lastUpdateDate) {
          const daysSinceUpdate = getDaysDiff(p.lastUpdateDate, today);
          if (daysSinceUpdate >= 4) return true;
        }

        return false;
      })
      .map((p) => {
        const daysSinceUpdate = p.lastUpdateDate ? getDaysDiff(p.lastUpdateDate, today) : 0;
        let reminderLevel: ReminderLevel = 'normal';
        if (daysSinceUpdate > 14) {
          reminderLevel = 'red';
        } else if (daysSinceUpdate > 7) {
          reminderLevel = 'yellow';
        }

        return {
          projectId: p.projectId,
          projectName: p.projectName,
          customerId: p.customerId || '',
          shortName: p.shortName,
          bd: p.bd,
          projectType: p.projectType,
          stage: p.stage,
          lastUpdateDate: p.lastUpdateDate,
          nextFollowDate: p.nextFollowDate,
          daysSinceUpdate,
          reminderLevel,
        };
      })
      .sort((a, b) => b.daysSinceUpdate - a.daysSinceUpdate);
  },

  async getFinishedReminders(): Promise<FinishedReminderItem[]> {
    const projects = await this.getAllProjects();
    const deals = await this.getAllDeals();
    const today = new Date();

    const projectMap = new Map(projects.map((p) => [p.projectId, p]));

    return deals
      .map((d) => {
        const endDate = d.endDate || '';
        if (!endDate) return null;

        const isFinished = String(d.isFinished ?? '').trim();
        if (isFinished && isFinished !== '否') return null;

        const daysUntilEnd = getDaysDiff(today, endDate);
        let reminderLevel: ReminderLevel = 'normal';
        if (daysUntilEnd < 0) {
          reminderLevel = 'red';
        } else if (daysUntilEnd === 0) {
          reminderLevel = 'yellow';
        } else if (daysUntilEnd <= 7) {
          reminderLevel = 'normal';
        } else {
          return null;
        }

        const p = projectMap.get(d.projectId);
        return {
          projectId: p?.projectId || d.projectId || d.dealId,
          dealId: d.dealId,
          projectName: p?.projectName || d.projectName || d.dealId,
          customerId: p?.customerId || d.customerId || '',
          shortName: p?.shortName || '',
          bd: p?.bd || '',
          projectType: p?.projectType || '签单',
          stage: p?.stage || '未开始',
          projectEndDate: endDate,
          daysUntilEnd,
          reminderLevel,
        } as FinishedReminderItem;
      })
      .filter(Boolean) as FinishedReminderItem[];
  },

  async confirmFollowUp(projectId: string): Promise<boolean> {
    if (USE_FEISHU_API) {
      return feishuBitableApi.sendFollowupReminder(projectId);
    }
    console.log('[DataService] confirmFollowUp called for:', projectId);
    return true;
  },

  async getReminderProjects(): Promise<ReminderItem[]> {
    const unfinished = await this.getUnfinishedReminders();
    return unfinished.map((p) => ({
      projectId: p.projectId,
      projectName: p.projectName,
      shortName: p.shortName,
      bd: p.bd,
      stage: p.stage,
      lastUpdateDate: p.lastUpdateDate,
      nextFollowDate: p.nextFollowDate,
      reason: `${p.daysSinceUpdate} 天未更新`,
    }));
  },

  async sendFollowupReminder(projectId: string): Promise<boolean> {
    if (USE_FEISHU_API) {
      return feishuBitableApi.sendFollowupReminder(projectId);
    }
    console.log('[DataService] sendFollowupReminder called for:', projectId);
    return true;
  },

async sendDailyReminders(): Promise<{ bd: string; count: number; projects: string[] }[]> {
    const unfinished = await this.getUnfinishedReminders();
    const finished = await this.getFinishedReminders();
    
    // 按 BD 分组
    const bdReminderMap = new Map<string, string[]>();
    
    [...unfinished, ...finished].forEach(item => {
      if (!bdReminderMap.has(item.bd)) {
        bdReminderMap.set(item.bd, []);
      }
      bdReminderMap.get(item.bd)!.push(item.projectName);
    });

    const results: { bd: string; count: number; projects: string[] }[] = [];
    
    for (const [bd, projects] of bdReminderMap) {
      // TODO: 未来接入飞书消息 API
      // await feishuBitableApi.sendDailyReminderNotification(bd, projects);
      console.log(`[DataService] 发送每日提醒给 ${bd}:`, projects);
      results.push({ bd, count: projects.length, projects });
    }
    
    return results;
  },
};

export default dataService;
