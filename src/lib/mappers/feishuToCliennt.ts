import type { Client } from "@/types/bd";

/**
 * 兼容两种输入：
 * 1) 飞书 records/items 原始结构：{ record_id, fields: {...} }
 * 2) 已经被拍平的对象：{ "客户/部门简称": "...", ... }
 */
export function feishuToClient(raw: any): Client {
  const fields = raw?.fields ?? raw ?? {};

  // ✅ id：优先用飞书 record_id，其次你表里的“客户ID”
  const id =
    raw?.record_id ||
    raw?.id ||
    fields?.record_id ||
    fields?.id ||
    fields?.["客户ID"] ||
    fields?.customerId ||
    "";

  const shortName =
    fields?.shortName ||
    fields?.["客户/部门简称"] ||
    fields?.["客户简称"] ||
    "";

  const companyName =
    fields?.companyName ||
    fields?.["企业名称"] ||
    fields?.["公司名称"] ||
    "";

  const hq =
    fields?.hq ||
    fields?.hqRegion ||
    fields?.["公司总部地区"] ||
    "";

  // 单选字段：可能是 string，也可能是 { name: "xxx" }
  const pickSingle = (v: any) =>
    typeof v === "object" && v !== null ? (v?.name ?? "") : (v ?? "");

  const customerType =
    pickSingle(fields?.["客户类型"]) ||
    fields?.customerType ||
    "";

  const level =
    pickSingle(fields?.["客户等级"]) ||
    fields?.level ||
    "";

  const cooperationStatus =
    pickSingle(fields?.["合作状态"]) ||
    fields?.cooperationStatus ||
    fields?.status ||
    "";

  const industry =
    pickSingle(fields?.["行业大类"]) ||
    fields?.industry ||
    "";

  // 人员字段：通常是数组 [{name,id,...}]
  const owner =
    fields?.owner ||
    fields?.ownerBd ||
    (Array.isArray(fields?.["主BD负责人"]) ? fields?.["主BD负责人"]?.[0]?.name : "") ||
    "";

  // 勾选框：true/false
  const isAnnual = Boolean(fields?.isAnnual ?? fields?.["年框客户"]);

  // 关联字段：你表里是 “项目进度数据表1-客户ID”
  const relatedProjectIds =
    fields?.relatedProjectIds ||
    fields?.projectIds ||
    (Array.isArray(fields?.["项目进度数据表1-客户ID"])
      ? (fields?.["项目进度数据表1-客户ID"]?.[0]?.text_arr ?? [])
      : []);

  return {
    id,
    shortName,
    companyName,
    hq,
    customerType,
    level,
    industry,
    cooperationStatus,
    owner,
    isAnnual,
    relatedProjectIds,
  };
}
