/**
 * bd.ts
 * ⚠️ 当前项目阶段的「唯一稳定类型源」
 * 目标：不白屏、不爆红，允许少量“兼容字段（alias）”
 */

/* ================= 客户 Client ================= */

export interface Client {
  /** ✅ 新：统一字段 */
  id: string;                // 内部ID
  shortName: string;         // 客户/部门简称
  companyName: string;       // 企业名称
  customerType: string;      // 客户类型（单选 name）

  level?: string;            // 客户等级（单选）
  isAnnual?: boolean;        // 年框客户
  cooperationStatus?: string;// 合作状态（单选）
  industry?: string;         // 行业大类（单选）
  hq?: string;               // 公司总部地区（文本）

  owner?: string;            // ✅ 展示/筛选用：主BD姓名（UI 用）
  ownerUserId?: string;      // ✅ 写回飞书用：主BD user_id
  ownerOpenId?: string;      // openId for UserProfile

  relatedProjectIds?: string[]; // ✅ 展示用：关联项目

  /** 🧯 兼容旧代码（DailyFormTab / dataService 可能在用） */
  customerId?: string;       // alias -> id
  customerLevel?: string;    // alias -> level
  status?: string;           // alias -> cooperationStatus
  hqRegion?: string;         // alias -> hq
  ownerBd?: string;          // alias -> owner
}

/* ================= 项目 Project ================= */

export type ProjectStage = import('@/config/bdOptions').ProjectStage;
export type ProjectType = import('@/config/bdOptions').ProjectType;
export type ProjectPriority = import('@/config/bdOptions').ProjectPriority;

export interface Project {
  /** ✅ 新：统一字段 */
  projectId: string;

  customerId: string;      // 关联客户 id（旧代码也在用 customerId）
  shortName: string;       // 冗余存客户简称（用于展示/拼项目名）

  projectName: string;     // 展示用项目名（month-shortName-campaign-deliverable）
  serviceType: string;
  projectType: ProjectType;
  stage: ProjectStage;
  priority: ProjectPriority;

  bd: string;
  bdOpenId?: string;
  am?: string;

  month: string;
  nextFollowDate?: string;

  /** 🧯 兼容 DailyFormTab / 你旧的项目创建逻辑 */
  campaignName?: string;
  deliverableName?: string;
  expectedAmount?: number;

  totalBdHours?: number;
  lastUpdateDate?: string;
}

/* ================= Deal ================= */

export interface Deal {
  serialNo?: string;       // 飞书表「编号」（自动生成）
  dealId: string;
  projectId: string;
  customerId?: string;
  month: string;

  projectName?: string;

  startDate?: string;
  endDate?: string;
  isFinished?: string | boolean;

  signCompany?: string;
  contractEntity?: string;

  incomeWithTax?: number;
  incomeWithoutTax?: number;
  estimatedCost?: number;
  paidThirdPartyCost?: number;
  receivedAmount?: number;
  remainingReceivable?: number;

  firstPaymentDate?: string;
  finalPaymentDate?: string;

  grossProfit?: number;
  grossMargin?: number;
}

/* ================= Daily ================= */

export interface DailyProjectEntry {
  projectId: string;
  projectName: string;
  bdHours: number;
}

/** 🧯 可选：如果 dataService.createDailyForm 有类型，可以补一个 */
export interface DailyForm {
  date: string;
  hasNewClient: boolean;
  newClientData?: any;
  hasNewOrUpdateProject: boolean;
  projectEntries: DailyProjectEntry[];
}

/* ================= Reminder ================= */

/** 提醒状态类型 */
export type ReminderLevel = 'normal' | 'yellow' | 'red';

/** 未立项项目提醒项 */
export interface UnfinishedReminderItem {
  projectId: string;
  projectName: string;
  customerId?: string;
  shortName: string;
  bd: string;
  bdOpenId?: string;
  projectType: ProjectType;
  stage: ProjectStage;
  lastUpdateDate?: string;
  nextFollowDate?: string;
  daysSinceUpdate: number;
  reminderLevel: ReminderLevel;
  isFollowedUp?: boolean;
}

/** 已立项项目提醒项 */
export interface FinishedReminderItem {
  projectId: string;
  dealId: string;
  projectName: string;
  customerId?: string;
  shortName: string;
  bd: string;
  bdOpenId?: string;
  projectType: ProjectType;
  stage: ProjectStage;
  projectEndDate: string;
  daysUntilEnd: number;
  reminderLevel: ReminderLevel;
  isFollowedUp?: boolean;
}

/** 兼容旧代码的 ReminderItem */
export interface ReminderItem {
  projectId: string;
  projectName: string;
  shortName: string;
  bd: string;
  bdOpenId?: string;
  stage: ProjectStage;
  lastUpdateDate?: string;
  nextFollowDate?: string;
  reason: string;
}

/* ================= Kanban ================= */

export interface KanbanBoard {
  id: string;
  name: string;
  description?: string;
}

export interface KanbanColumn {
  id: string;
  boardId: string;
  name: string;
  position?: number;
}

export interface KanbanCard {
  id: string;
  boardId: string;
  columnId: string;
  title: string;
  description?: string;
  assignee?: string;
  dueDate?: string;
  tags?: string[];
  position?: number;
  sourceRecordId?: string;
}

/* ================= 下拉选项（所有 Tab 依赖） ================= */

/* ???? */
export {
  CUSTOMER_TYPE_OPTIONS,
  INDUSTRY_OPTIONS,
  CLIENT_LEVEL_OPTIONS,
  COOPERATION_STATUS_OPTIONS,
} from '@/config/bdOptions';

/* ???? */
export {
  PROJECT_TYPE_OPTIONS,
  PROJECT_STAGE_OPTIONS,
  PROJECT_PRIORITY_OPTIONS,
  PROJECT_STAGE_BADGE_CLASS,
  PROJECT_TABLE_COLUMNS,
  DEAL_TABLE_COLUMNS,
  REMINDER_TABLE_COLUMNS,
  CUSTOMER_LIST_COLUMNS,
  DAILY_SUMMARY_COLUMNS,
  SIGNOFF_LIST_COLUMNS,
  LEGACY_PROJECT_LIST_COLUMNS,
} from '@/config/bdOptions';

export { SERVICE_TYPE_OPTIONS } from '@/config/bdOptions';

/* 人员 */
export { BD_OPTIONS } from '@/config/bdOptions';
export { AM_OPTIONS } from '@/config/bdOptions';

/* 时间 */
export { MONTH_OPTIONS } from '@/config/bdOptions';
export { CONTRACT_ENTITIES, COMPLETION_STATUS } from '@/config/bdOptions';
export interface DailyFormProjectEntry {
  projectId: string;
  projectName: string;
  bdHours: number;
}

export interface DailyFormData {
  id: string;
  date: string; // YYYY-MM-DD
  hasNewClient: boolean;
  newClientData?: any;

  hasNewOrUpdateProject: boolean;
  projectEntries: DailyFormProjectEntry[];

  createdAt: string;
}
