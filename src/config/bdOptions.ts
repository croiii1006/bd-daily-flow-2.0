export const PROJECT_STAGE_OPTIONS = [
  '未开始',
  '进行中',
  'FA',
  '丢单',
  '停滞',
] as const;

export type ProjectStage = (typeof PROJECT_STAGE_OPTIONS)[number];

export const PROJECT_TYPE_OPTIONS = ['方案&报价', 'POC', '签单'] as const;
export type ProjectType = (typeof PROJECT_TYPE_OPTIONS)[number];

export const PROJECT_PRIORITY_OPTIONS = ['P0', 'P1', 'P2'] as const;
export type ProjectPriority = (typeof PROJECT_PRIORITY_OPTIONS)[number];

export const PROJECT_STAGE_BADGE_CLASS: Record<ProjectStage, string> = {
  未开始: 'bg-secondary/10 text-secondary-foreground border-secondary/30',
  进行中: 'bg-primary/10 text-primary border-primary/30',
  FA: 'bg-primary/10 text-primary border-primary/30',
  丢单: 'bg-destructive/10 text-destructive border-destructive/30',
  停滞: 'bg-warning/10 text-warning border-warning/30',
};

export const BD_OPTIONS = ['邹思敏', '张三', '李四', '王五'] as const;
export type BdOption = (typeof BD_OPTIONS)[number];

export const AM_OPTIONS = ['小明', '小红', '小华', '小李'] as const;
export type AmOption = (typeof AM_OPTIONS)[number];

export const MONTH_OPTIONS = [
  '2025.01',
  '2025.02',
  '2025.03',
  '2025.04',
  '2025.05',
  '2025.06',
  '2025.07',
  '2025.08',
  '2025.09',
  '2025.10',
  '2025.11',
  '2025.12',
] as const;

export const CUSTOMER_TYPE_OPTIONS = [
  '品牌方',
  '代理',
  '机构',
  '平台',
  '政府',
  '潜在客户',
] as const;

export const INDUSTRY_OPTIONS = [
  '汽车',
  '3C',
  '美妆时尚',
  '服装配饰',
  '家装家居',
  '宠物',
  '平台&工具',
  '文旅文创',
  '食品饮料',
  '生物医药',
  '金融投资',
  '其他B2B服务',
  '教育',
  '医疗健康',
  '美妆',
] as const;

export const CLIENT_LEVEL_OPTIONS = ['SKA', 'KA', '普通', '战略', 'A', '潜力'] as const;

export const COOPERATION_STATUS_OPTIONS = [
  '潜在',
  '合作中',
  '暂停',
  '流失',
  '沟通中',
  '已报价',
] as const;

export const SERVICE_TYPE_OPTIONS = [
  '达人营销',
  '内容策划',
  '直播带货',
  '品牌传播',
  '社媒运营',
  '数据分析',
  '培训咨询',
  '技术服务',
  '其他',
] as const;

/**
 * 旧版（src/data/options.ts）仍在使用的下拉选项，保持兼容。
 * 后续可以逐步迁移到 bd.ts 的 Client/Project 口径。
 */
export const CUSTOMER_TYPES = ['直客', '代理', '渠道'] as const;
export const CUSTOMER_LEVELS = ['S级', 'A级', 'B级', 'C级'] as const;
export const ANNUAL_CONTRACT_OPTIONS = ['是', '否'] as const;
export const INDUSTRIES = [
  '互联网电商',
  '互联网社交',
  '互联网内容',
  '金融/银行',
  '金融/保险',
  '汽车/制造',
  '快消/食品',
  '快消/日化',
  '医药/健康',
  '教育/培训',
  '房产',
  '旅游/酒店',
  '零售/百货',
  '科技/硬件',
  '游戏/娱乐',
  '其他',
] as const;
export const BD_LIST = ['张三', '李四', '王五', '赵六', '钱七', '孙八'] as const;
export const AM_LIST = ['赵六', '钱七', '孙八', '周九', '吴十'] as const;
export const MONTHS = [
  '2024年1月',
  '2024年2月',
  '2024年3月',
  '2024年4月',
  '2024年5月',
  '2024年6月',
  '2024年7月',
  '2024年8月',
  '2024年9月',
  '2024年10月',
  '2024年11月',
  '2024年12月',
  '2025年1月',
  '2025年2月',
  '2025年3月',
] as const;
export const SERVICE_TYPES = [
  '直播服务',
  '内容制作',
  '活动策划',
  '媒介投放',
  '社交运营',
  '创意设计',
  '综合服务',
] as const;
export const PROJECT_CATEGORIES = ['签单', '跟进中', '意向沟通', '已流失'] as const;
export const PROJECT_STATUS = [
  '立项中',
  '方案沟通',
  '报价中',
  '签约中',
  '执行中',
  '已完成',
  '已暂停',
] as const;
export const PRIORITIES = ['高', '中', '低'] as const;
export const COMPLETION_STATUS = ['是', '否'] as const;
export const CONTRACT_ENTITIES = [
  '北京XX科技有限公司',
  '上海XX传媒有限公司',
  '深圳XX文化有限公司',
  '杭州XX网络有限公司',
] as const;
export const COMMUNICATION_DURATIONS = [
  '30分钟以内',
  '30分钟-1小时',
  '1-2小时',
  '2-3小时',
  '3小时以上',
] as const;

export const PROJECT_TABLE_COLUMNS = [
  { key: 'projectId', title: '项目ID', headClassName: 'w-[100px]' },
  { key: 'customerId', title: '客户ID', headClassName: 'w-[80px]' },
  { key: 'projectName', title: '项目名称', headClassName: 'w-[120px]' },
  { key: 'shortName', title: '客户/部门简称', headClassName: 'w-[120px]' },
  { key: 'campaignName', title: '活动名称', headClassName: 'w-[100px]' },
  { key: 'deliverableName', title: '交付名称', headClassName: 'w-[100px]' },
  { key: 'month', title: '所属年月', headClassName: 'w-[80px]' },
  { key: 'serviceType', title: '服务类型', headClassName: 'w-[100px]' },
  { key: 'projectType', title: '项目类别', headClassName: 'w-[80px]' },
  { key: 'stage', title: '项目进度', headClassName: 'w-[100px]' },
  { key: 'priority', title: '优先级', headClassName: 'w-[70px]' },
  { key: 'expectedAmount', title: '预估项目金额', headClassName: 'w-[110px]' },
  { key: 'bd', title: 'BD', headClassName: 'w-[80px]' },
  { key: 'am', title: 'AM', headClassName: 'w-[80px]' },
  { key: 'totalBdHours', title: '累计商务时间(hr)', headClassName: 'w-[130px]' },
  { key: 'lastUpdateDate', title: '最新更新日期', headClassName: 'w-[120px]' },
  { key: 'nextFollowDate', title: '下次跟进日期', headClassName: 'w-[120px]' },
] as const;

export const REMINDER_TABLE_COLUMNS = [
  { key: 'projectName', title: '项目名称' },
  { key: 'shortName', title: '客户', headClassName: 'w-[80px]' },
  { key: 'bd', title: 'BD', headClassName: 'w-[60px]' },
  { key: 'stage', title: '阶段', headClassName: 'w-[80px]' },
  { key: 'lastUpdateDate', title: '最近更新', headClassName: 'w-[100px]' },
  { key: 'nextFollowDate', title: '下次跟进', headClassName: 'w-[100px]' },
  { key: 'reason', title: '提醒原因', headClassName: 'w-[120px]' },
  { key: 'action', title: '操作', headClassName: 'w-[80px]' },
] as const;

export const DEAL_TABLE_COLUMNS = [
  { key: 'dealId', title: '立项ID', headClassName: 'w-[120px]' },
  { key: 'projectId', title: '项目ID', headClassName: 'w-[120px]' },
  { key: 'projectName', title: '项目名称', headClassName: 'w-[120px]' },
  { key: 'signCompany', title: '签约主体', headClassName: 'w-[80px]' },
  { key: 'incomeWithTax', title: '含税收入', headClassName: 'w-[100px] text-right' },
  { key: 'incomeWithoutTax', title: '不含税收入', headClassName: 'w-[100px] text-right' },
  { key: 'estimatedCost', title: '预估成本', headClassName: 'w-[100px] text-right' },
  { key: 'grossMargin', title: '毛利率', headClassName: 'w-[70px] text-right' },
  { key: 'receivedAmount', title: '已收金额', headClassName: 'w-[100px] text-right' },
  { key: 'remainingReceivable', title: '剩余应收', headClassName: 'w-[100px] text-right' },
] as const;

export const CUSTOMER_LIST_COLUMNS = [
  { key: 'customerId', title: '客户ID' },
  { key: 'shortName', title: '客户简称' },
  { key: 'brandName', title: '品牌/部门' },
  { key: 'type', title: '客户类型' },
  { key: 'level', title: '客户等级' },
  { key: 'industry', title: '行业大类' },
  { key: 'bdOwner', title: '主BD' },
] as const;

export const DAILY_SUMMARY_COLUMNS = [
  { key: 'date', title: '日期' },
  { key: 'projectName', title: '项目名称' },
  { key: 'communicationDuration', title: '沟通时长' },
  { key: 'taskSummary', title: '任务总结' },
  { key: 'action', title: '操作', headClassName: 'text-right' },
] as const;

export const SIGNOFF_LIST_COLUMNS = [
  { key: 'projectName', title: '项目名称' },
  { key: 'customer', title: '客户' },
  { key: 'status', title: '立项状态' },
  { key: 'contractEntity', title: '签约主体' },
  { key: 'incomeWithTax', title: '含税收入' },
  { key: 'receivedAmount', title: '已收金额' },
  { key: 'action', title: '操作', headClassName: 'text-right' },
] as const;

export const LEGACY_PROJECT_LIST_COLUMNS = [
  { key: 'projectName', title: '项目名称' },
  { key: 'customer', title: '客户' },
  { key: 'projectCategory', title: '项目类别' },
  { key: 'projectStatus', title: '项目进度' },
  { key: 'priority', title: '优先级' },
  { key: 'estimatedAmount', title: '预估金额' },
  { key: 'bd', title: 'BD' },
  { key: 'action', title: '操作', headClassName: 'text-right' },
] as const;
