import type { DailySummary } from '@/types';

// 模拟每日复盘数据库
let dailySummaries: DailySummary[] = [
  {
    id: 'daily-001',
    date: '2024-03-15',
    projectId: 'proj-001',
    projectName: '2024年3月-阿里-双11预热-直播带货',
    communicationDuration: '2小时',
    taskSummary: '与客户确认直播脚本，讨论主播人选，初步确定直播时间安排。',
    createdAt: '2024-03-15',
  },
];

let dailyId = 2;

export const dailyDB = {
  getAll: (): DailySummary[] => {
    return [...dailySummaries];
  },

  getById: (id: string): DailySummary | undefined => {
    return dailySummaries.find(d => d.id === id);
  },

  getByDate: (date: string): DailySummary[] => {
    return dailySummaries.filter(d => d.date === date);
  },

  create: (data: Omit<DailySummary, 'id' | 'createdAt'>): DailySummary => {
    const now = new Date().toISOString().split('T')[0];
    const newSummary: DailySummary = {
      ...data,
      id: `daily-${String(dailyId++).padStart(3, '0')}`,
      createdAt: now,
    };
    dailySummaries.push(newSummary);
    return newSummary;
  },

  delete: (id: string): boolean => {
    const index = dailySummaries.findIndex(d => d.id === id);
    if (index === -1) return false;
    dailySummaries.splice(index, 1);
    return true;
  },
};

export default dailyDB;
