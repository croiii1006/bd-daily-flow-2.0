import type { Project } from '@/types';

// 模拟项目数据库
let projects: Project[] = [
  {
    id: 'proj-001',
    customerId: 'cust-001',
    shortName: '阿里',
    projectName: '2024年3月-阿里-双11预热-直播带货',
    month: '2024年3月',
    serviceType: '直播服务',
    activityName: '双11预热',
    deliveryName: '直播带货',
    projectCategory: '签单',
    projectStatus: '执行中',
    priority: '高',
    estimatedAmount: 500000,
    bd: '张三',
    am: '赵六',
    createdAt: '2024-03-01',
    updatedAt: '2024-03-01',
  },
  {
    id: 'proj-002',
    customerId: 'cust-002',
    shortName: '腾讯',
    projectName: '2024年4月-腾讯-品牌升级-视频制作',
    month: '2024年4月',
    serviceType: '内容制作',
    activityName: '品牌升级',
    deliveryName: '视频制作',
    projectCategory: '跟进中',
    projectStatus: '方案沟通',
    priority: '中',
    estimatedAmount: 300000,
    bd: '李四',
    am: '钱七',
    createdAt: '2024-03-15',
    updatedAt: '2024-03-15',
  },
];

let projectId = 3;

export const projectDB = {
  getAll: (): Project[] => {
    return [...projects];
  },

  getById: (id: string): Project | undefined => {
    return projects.find(p => p.id === id);
  },

  getByCustomerId: (customerId: string): Project[] => {
    return projects.filter(p => p.customerId === customerId);
  },

  search: (keyword: string): Project[] => {
    const lowerKeyword = keyword.toLowerCase();
    return projects.filter(
      p =>
        p.projectName.toLowerCase().includes(lowerKeyword) ||
        p.shortName.toLowerCase().includes(lowerKeyword) ||
        p.activityName.toLowerCase().includes(lowerKeyword) ||
        p.deliveryName.toLowerCase().includes(lowerKeyword)
    );
  },

  create: (data: Omit<Project, 'id' | 'projectName' | 'createdAt' | 'updatedAt'>): Project => {
    const now = new Date().toISOString().split('T')[0];
    // 自动生成项目名称
    const projectName = `${data.month}-${data.shortName}-${data.activityName}-${data.deliveryName}`;
    
    const newProject: Project = {
      ...data,
      id: `proj-${String(projectId++).padStart(3, '0')}`,
      projectName,
      createdAt: now,
      updatedAt: now,
    };
    projects.push(newProject);
    return newProject;
  },

  update: (id: string, data: Partial<Project>): Project | null => {
    const index = projects.findIndex(p => p.id === id);
    if (index === -1) return null;
    
    const now = new Date().toISOString().split('T')[0];
    const updated = {
      ...projects[index],
      ...data,
      updatedAt: now,
    };
    
    // 如果关键字段更新了，重新生成项目名称
    if (data.month || data.shortName || data.activityName || data.deliveryName) {
      updated.projectName = `${updated.month}-${updated.shortName}-${updated.activityName}-${updated.deliveryName}`;
    }
    
    projects[index] = updated;
    return projects[index];
  },

  delete: (id: string): boolean => {
    const index = projects.findIndex(p => p.id === id);
    if (index === -1) return false;
    projects.splice(index, 1);
    return true;
  },

  getSignedProjects: (): Project[] => {
    return projects.filter(p => p.projectCategory === '签单');
  },
};

export default projectDB;
