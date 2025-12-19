/**
 * BD 日常小程序 - Mock 数据
 * 模拟飞书多维表数据，用于 Demo 阶段
 */

import type { Client, Project, Deal, DailyFormData } from '@/types/bd';

// ==================== 客户 Mock 数据 ====================
export const mockClients: Client[] = [
  {
    customerId: 'CG2025-0001',
    shortName: '完美日记',
    brandDeptName: '品牌市场部',
    companyName: '逸仙电商科技有限公司',
    customerType: '品牌方',
    customerLevel: 'SKA',
    isAnnual: true,
    status: '合作中',
    industry: '美妆时尚',
    hqRegion: '广州',
    ownerBd: '张三',
    projectIds: ['ORAN2512-0001', 'ORAN2512-0002'],
    createdAt: '2025-01-15',
    updatedAt: '2025-06-01',
  },
  {
    customerId: 'CG2025-0002',
    shortName: '蕉下户外',
    brandDeptName: '电商运营部',
    companyName: '深圳减字科技有限公司',
    customerType: '品牌方',
    customerLevel: '战略',
    isAnnual: false,
    status: '合作中',
    industry: '服装配饰',
    hqRegion: '深圳',
    ownerBd: '李四',
    projectIds: ['ORAN2512-0003'],
    createdAt: '2025-02-20',
    updatedAt: '2025-05-15',
  },
  {
    customerId: 'CG2025-0003',
    shortName: '字节MCN',
    brandDeptName: '达人合作部',
    companyName: '北京字节跳动科技有限公司',
    customerType: '平台',
    customerLevel: '普通',
    isAnnual: false,
    status: '潜在',
    industry: '平台&工具',
    hqRegion: '北京',
    ownerBd: '王五',
    projectIds: [],
    createdAt: '2025-03-10',
    updatedAt: '2025-03-10',
  },
  {
    customerId: 'CG2025-0004',
    shortName: '群邑媒介',
    brandDeptName: '数字营销部',
    companyName: '群邑媒介有限公司',
    customerType: '代理',
    customerLevel: '战略',
    isAnnual: true,
    status: '合作中',
    industry: '其他',
    hqRegion: '上海',
    ownerBd: '张三',
    projectIds: ['ORAN2512-0004'],
    createdAt: '2025-01-05',
    updatedAt: '2025-06-10',
  },
];

// ==================== 项目 Mock 数据 ====================
export const mockProjects: Project[] = [
  {
    projectId: 'ORAN2512-0001',
    customerId: 'CG2025-0001',
    projectName: '2025.06-完美日记-618大促-达人直播',
    shortName: '完美日记',
    campaignName: '618大促',
    deliverableName: '达人直播',
    month: '2025.06',
    serviceType: '直播带货',
    projectType: '签单',
    stage: '进行中',
    priority: 'P0',
    expectedAmount: 500000,
    bd: '张三',
    am: '小明',
    totalBdHours: 45,
    lastUpdateDate: '2025/06/01',
    nextFollowDate: '2025/06/08',
    dealId: 'DEAL2025-0001',
    createdAt: '2025-04-15',
    updatedAt: '2025-06-01',
  },
  {
    projectId: 'ORAN2512-0002',
    customerId: 'CG2025-0001',
    projectName: '2025.07-完美日记-新品上市-内容种草',
    shortName: '完美日记',
    campaignName: '新品上市',
    deliverableName: '内容种草',
    month: '2025.07',
    serviceType: '达人营销',
    projectType: 'POC',
    stage: '未开始',
    priority: 'P0',
    expectedAmount: 300000,
    bd: '张三',
    am: '小红',
    totalBdHours: 20,
    lastUpdateDate: '2025/06/05',
    nextFollowDate: '2025/06/12',
    createdAt: '2025-05-20',
    updatedAt: '2025-06-05',
  },
  {
    projectId: 'ORAN2512-0003',
    customerId: 'CG2025-0002',
    projectName: '2025.07-蕉下户外-夏日防晒-品牌传播',
    shortName: '蕉下户外',
    campaignName: '夏日防晒',
    deliverableName: '品牌传播',
    month: '2025.07',
    serviceType: '品牌传播',
    projectType: '签单',
    stage: 'FA',
    priority: 'P1',
    expectedAmount: 200000,
    bd: '李四',
    totalBdHours: 15,
    lastUpdateDate: '2025/06/02',
    nextFollowDate: '2025/06/09',
    createdAt: '2025-05-25',
    updatedAt: '2025-06-02',
  },
  {
    projectId: 'ORAN2512-0004',
    customerId: 'CG2025-0004',
    projectName: '2025.06-群邑媒介-Q3规划-培训咨询',
    shortName: '群邑媒介',
    campaignName: 'Q3规划',
    deliverableName: '培训咨询',
    month: '2025.06',
    serviceType: '培训咨询',
    projectType: '方案&报价',
    stage: '未开始',
    priority: 'P2',
    expectedAmount: 50000,
    bd: '张三',
    totalBdHours: 5,
    lastUpdateDate: '2025/05/28',
    nextFollowDate: '2025/06/04',
    createdAt: '2025-05-28',
    updatedAt: '2025-05-28',
  },
  {
    projectId: 'ORAN2512-0005',
    customerId: 'CG2025-0003',
    projectName: '2025.08-字节MCN-达人孵化-技术服务',
    shortName: '字节MCN',
    campaignName: '达人孵化',
    deliverableName: '技术服务',
    month: '2025.08',
    serviceType: '技术服务',
    projectType: 'POC',
    stage: 'FA',
    priority: 'P1',
    expectedAmount: 100000,
    bd: '王五',
    totalBdHours: 2,
    lastUpdateDate: '2025/05/20',
    nextFollowDate: '2025/05/27',
    createdAt: '2025-05-20',
    updatedAt: '2025-05-20',
  },
];

// ==================== 立项 Mock 数据 ====================
export const mockDeals: Deal[] = [
  {
    dealId: 'DEAL2025-0001',
    projectId: 'ORAN2512-0001',
    projectStartDate: '2025-06-01',
    projectEndDate: '2025-06-30',
    month: '2025.06',
    isFinished: false,
    signCompany: '橙意互动',
    incomeWithTax: 500000,
    incomeWithoutTax: 442478,
    estimatedCost: 300000,
    paidThirdPartyCost: 150000,
    grossProfit: 142478,
    grossMargin: 0.322,
    expectedFirstPaymentDate: '2025-06-15',
    expectedLastPaymentDate: '2025-07-15',
    receivedAmount: 250000,
    remainingReceivable: 250000,
    createdAt: '2025-05-20',
    updatedAt: '2025-06-01',
  },
];

// ==================== 每日表单 Mock 数据 ====================
export const mockDailyForms: DailyFormData[] = [
  {
    id: 'DAILY-2025-06-01-001',
    date: '2025-06-01',
    hasNewClient: false,
    hasNewOrUpdateProject: true,
    projectEntries: [
      { projectId: 'ORAN2512-0001', projectName: '2025.06-完美日记-618大促-达人直播', bdHours: 3 },
      { projectId: 'ORAN2512-0002', projectName: '2025.07-完美日记-新品上市-内容种草', bdHours: 2 },
    ],
    createdAt: '2025-06-01T18:00:00Z',
  },
];

// ==================== 数据库模拟类 ====================
class MockDatabase {
  private clients: Client[] = [...mockClients];
  private projects: Project[] = [...mockProjects];
  private deals: Deal[] = [...mockDeals];
  private dailyForms: DailyFormData[] = [...mockDailyForms];

  // 客户操作
  getAllClients(): Client[] {
    return [...this.clients];
  }

  getClientById(customerId: string): Client | undefined {
    return this.clients.find(c => c.customerId === customerId);
  }

  searchClients(keyword: string): Client[] {
    const lowerKeyword = keyword.toLowerCase();
    return this.clients.filter(c =>
      c.shortName.toLowerCase().includes(lowerKeyword) ||
      c.companyName.toLowerCase().includes(lowerKeyword) ||
      c.brandDeptName.toLowerCase().includes(lowerKeyword)
    );
  }

  createClient(data: Omit<Client, 'customerId' | 'projectIds' | 'createdAt' | 'updatedAt'>): Client {
    const newClient: Client = {
      ...data,
      customerId: `CG2025-${String(this.clients.length + 1).padStart(4, '0')}`,
      projectIds: [],
      createdAt: new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString().split('T')[0],
    };
    this.clients.push(newClient);
    return newClient;
  }

  updateClient(customerId: string, data: Partial<Client>): boolean {
    const index = this.clients.findIndex(c => c.customerId === customerId);
    if (index === -1) return false;
    this.clients[index] = {
      ...this.clients[index],
      ...data,
      updatedAt: new Date().toISOString().split('T')[0],
    };
    return true;
  }

  // 项目操作
  getAllProjects(): Project[] {
    return [...this.projects];
  }

  getProjectById(projectId: string): Project | undefined {
    return this.projects.find(p => p.projectId === projectId);
  }

  getProjectsByCustomerId(customerId: string): Project[] {
    return this.projects.filter(p => p.customerId === customerId);
  }

  searchProjects(keyword: string): Project[] {
    const lowerKeyword = keyword.toLowerCase();
    return this.projects.filter(p =>
      p.projectName.toLowerCase().includes(lowerKeyword) ||
      p.shortName.toLowerCase().includes(lowerKeyword) ||
      p.campaignName.toLowerCase().includes(lowerKeyword)
    );
  }

  createProject(data: Omit<Project, 'projectId' | 'createdAt' | 'updatedAt'>): Project {
    const newProject: Project = {
      ...data,
      projectId: `ORAN2512-${String(this.projects.length + 1).padStart(4, '0')}`,
      createdAt: new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString().split('T')[0],
    };
    this.projects.push(newProject);
    
    // 更新客户的 projectIds
    const client = this.clients.find(c => c.customerId === data.customerId);
    if (client) {
      client.projectIds.push(newProject.projectId);
    }
    
    return newProject;
  }

  updateProject(projectId: string, data: Partial<Project>): boolean {
    const index = this.projects.findIndex(p => p.projectId === projectId);
    if (index === -1) return false;
    this.projects[index] = {
      ...this.projects[index],
      ...data,
      updatedAt: new Date().toISOString().split('T')[0],
    };
    return true;
  }

  // 立项操作
  getAllDeals(): Deal[] {
    return [...this.deals];
  }

  getDealById(dealId: string): Deal | undefined {
    return this.deals.find(d => d.dealId === dealId);
  }

  getDealByProjectId(projectId: string): Deal | undefined {
    return this.deals.find(d => d.projectId === projectId);
  }

  createDeal(data: Omit<Deal, 'dealId' | 'createdAt' | 'updatedAt'>): Deal {
    const newDeal: Deal = {
      ...data,
      dealId: `DEAL2025-${String(this.deals.length + 1).padStart(4, '0')}`,
      createdAt: new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString().split('T')[0],
    };
    this.deals.push(newDeal);
    
    // 更新项目的 dealId
    const project = this.projects.find(p => p.projectId === data.projectId);
    if (project) {
      project.dealId = newDeal.dealId;
    }
    
    return newDeal;
  }

  updateDeal(dealId: string, data: Partial<Deal>): boolean {
    const index = this.deals.findIndex(d => d.dealId === dealId);
    if (index === -1) return false;
    this.deals[index] = {
      ...this.deals[index],
      ...data,
      updatedAt: new Date().toISOString().split('T')[0],
    };
    return true;
  }

  // 每日表单操作
  getAllDailyForms(): DailyFormData[] {
    return [...this.dailyForms];
  }

  createDailyForm(data: Omit<DailyFormData, 'id' | 'createdAt'>): DailyFormData {
    const newForm: DailyFormData = {
      ...data,
      id: `DAILY-${data.date}-${String(this.dailyForms.length + 1).padStart(3, '0')}`,
      createdAt: new Date().toISOString(),
    };
    this.dailyForms.push(newForm);
    return newForm;
  }
}

// 导出单例
export const mockDb = new MockDatabase();
