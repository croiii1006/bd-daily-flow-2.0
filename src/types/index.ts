export interface Customer {
  id: string;
  companyName: string;
  shortName: string;
  departmentName: string;
  customerType: string;
  customerLevel: string;
  annualContract: string;
  industry: string;
  headquarterCity: string;
  mainBD: string;
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  customerId: string;
  shortName: string;
  projectName: string;
  month: string;
  serviceType: string;
  activityName: string;
  deliveryName: string;
  projectCategory: string;
  projectStatus: string;
  priority: string;
  estimatedAmount: number;
  bd: string;
  am: string;
  createdAt: string;
  updatedAt: string;
}

export interface Signoff {
  id: string;
  projectId: string;
  startDate: string;
  endDate: string;
  isCompleted: string;
  contractEntity: string;
  revenueWithTax: number;
  revenueWithoutTax: number;
  estimatedCost: number;
  firstPaymentDate: string;
  finalPaymentDate: string;
  receivedAmount: number;
  createdAt: string;
  updatedAt: string;
}

export interface DailySummary {
  id: string;
  date: string;
  projectId: string;
  projectName: string;
  communicationDuration: string;
  taskSummary: string;
  createdAt: string;
}

export interface User {
  id: string;
  username: string;
  name: string;
}
