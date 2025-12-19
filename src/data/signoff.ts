import type { Signoff } from '@/types';

// 模拟立项数据库
let signoffs: Signoff[] = [
  {
    id: 'sign-001',
    projectId: 'proj-001',
    startDate: '2024-03-01',
    endDate: '2024-03-31',
    isCompleted: '否',
    contractEntity: '北京XX科技有限公司',
    revenueWithTax: 500000,
    revenueWithoutTax: 442477.88,
    estimatedCost: 300000,
    firstPaymentDate: '2024-03-05',
    finalPaymentDate: '2024-04-15',
    receivedAmount: 250000,
    createdAt: '2024-03-01',
    updatedAt: '2024-03-01',
  },
];

let signoffId = 2;

export const signoffDB = {
  getAll: (): Signoff[] => {
    return [...signoffs];
  },

  getById: (id: string): Signoff | undefined => {
    return signoffs.find(s => s.id === id);
  },

  getByProjectId: (projectId: string): Signoff | undefined => {
    return signoffs.find(s => s.projectId === projectId);
  },

  create: (data: Omit<Signoff, 'id' | 'createdAt' | 'updatedAt'>): Signoff => {
    const now = new Date().toISOString().split('T')[0];
    const newSignoff: Signoff = {
      ...data,
      id: `sign-${String(signoffId++).padStart(3, '0')}`,
      createdAt: now,
      updatedAt: now,
    };
    signoffs.push(newSignoff);
    return newSignoff;
  },

  update: (id: string, data: Partial<Signoff>): Signoff | null => {
    const index = signoffs.findIndex(s => s.id === id);
    if (index === -1) return null;
    
    const now = new Date().toISOString().split('T')[0];
    signoffs[index] = {
      ...signoffs[index],
      ...data,
      updatedAt: now,
    };
    return signoffs[index];
  },

  delete: (id: string): boolean => {
    const index = signoffs.findIndex(s => s.id === id);
    if (index === -1) return false;
    signoffs.splice(index, 1);
    return true;
  },

  hasSignoff: (projectId: string): boolean => {
    return signoffs.some(s => s.projectId === projectId);
  },
};

export default signoffDB;
