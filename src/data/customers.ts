import type { Customer } from '@/types';

// 模拟客户数据库
let customers: Customer[] = [
  {
    id: 'cust-001',
    companyName: '阿里巴巴集团',
    shortName: '阿里',
    departmentName: '市场部',
    customerType: '直客',
    customerLevel: 'S级',
    annualContract: '是',
    industry: '互联网/电商',
    headquarterCity: '杭州',
    mainBD: '张三',
    createdAt: '2024-01-15',
    updatedAt: '2024-01-15',
  },
  {
    id: 'cust-002',
    companyName: '腾讯科技有限公司',
    shortName: '腾讯',
    departmentName: '品牌部',
    customerType: '直客',
    customerLevel: 'A级',
    annualContract: '是',
    industry: '互联网/社交',
    headquarterCity: '深圳',
    mainBD: '李四',
    createdAt: '2024-02-01',
    updatedAt: '2024-02-01',
  },
  {
    id: 'cust-003',
    companyName: '字节跳动',
    shortName: '字节',
    departmentName: '商业化部',
    customerType: '代理',
    customerLevel: 'S级',
    annualContract: '否',
    industry: '互联网/内容',
    headquarterCity: '北京',
    mainBD: '王五',
    createdAt: '2024-02-15',
    updatedAt: '2024-02-15',
  },
];

let customerId = 4;

export const customerDB = {
  getAll: (): Customer[] => {
    return [...customers];
  },

  getById: (id: string): Customer | undefined => {
    return customers.find(c => c.id === id);
  },

  search: (keyword: string): Customer[] => {
    const lowerKeyword = keyword.toLowerCase();
    return customers.filter(
      c =>
        c.companyName.toLowerCase().includes(lowerKeyword) ||
        c.shortName.toLowerCase().includes(lowerKeyword) ||
        c.departmentName.toLowerCase().includes(lowerKeyword)
    );
  },

  create: (data: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>): Customer => {
    const now = new Date().toISOString().split('T')[0];
    const newCustomer: Customer = {
      ...data,
      id: `cust-${String(customerId++).padStart(3, '0')}`,
      createdAt: now,
      updatedAt: now,
    };
    customers.push(newCustomer);
    return newCustomer;
  },

  update: (id: string, data: Partial<Customer>): Customer | null => {
    const index = customers.findIndex(c => c.id === id);
    if (index === -1) return null;
    
    const now = new Date().toISOString().split('T')[0];
    customers[index] = {
      ...customers[index],
      ...data,
      updatedAt: now,
    };
    return customers[index];
  },

  delete: (id: string): boolean => {
    const index = customers.findIndex(c => c.id === id);
    if (index === -1) return false;
    customers.splice(index, 1);
    return true;
  },

  checkExists: (companyName: string, departmentName: string): Customer | undefined => {
    return customers.find(
      c => c.companyName === companyName && c.departmentName === departmentName
    );
  },
};

export default customerDB;
