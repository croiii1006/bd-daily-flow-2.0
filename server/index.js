import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import { createRecord, listFields, listRecords, updateRecord } from "./feishu.js";
import {
  getCustomers,
  batchCreateRecords,
  getRecordById,
} from "./feishu.js";

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "2mb" }));

const PORT = process.env.PORT || 4000;
const BUILD_ID = `BDdaily-${new Date().toISOString()}`;
const PROJECT_APP_TOKEN = process.env.FEISHU_PROJECT_APP_TOKEN || process.env.FEISHU_BITABLE_APP_TOKEN;
const PROJECT_TABLE_ID = process.env.FEISHU_BITABLE_PROJECT_TABLE_ID;
const DEAL_APP_TOKEN = process.env.FEISHU_DEAL_APP_TOKEN || PROJECT_APP_TOKEN;
const DEAL_TABLE_ID = process.env.FEISHU_BITABLE_DEAL_TABLE_ID;
const KANBAN_APP_TOKEN = process.env.FEISHU_KANBAN_APP_TOKEN || process.env.FEISHU_BITABLE_APP_TOKEN;
const KANBAN_BOARD_ID = process.env.FEISHU_KANBAN_BOARD_ID;
const DASHBOARD_EMBED_URL = process.env.FEISHU_DASHBOARD_EMBED_URL;

function sendKanbanPlaceholder(res, data, extra = {}) {
  return res.json({
    success: true,
    reserved: true,
    data: data ?? null,
    hint: "Kanban API placeholder; connect to Feishu Kanban later.",
    ...extra,
  });
}

// ====== DEBUG：确认当前 server / env ======
app.get("/api/debug-env", (req, res) => {
  res.json({
    buildId: BUILD_ID,
    cwd: process.cwd(),
    fileHint: "server/index.js",
    env: {
      FEISHU_APP_ID: process.env.FEISHU_APP_ID || null,
      FEISHU_APP_SECRET: process.env.FEISHU_APP_SECRET ? "***" : null,
      FEISHU_BITABLE_APP_TOKEN: process.env.FEISHU_BITABLE_APP_TOKEN || null,
      FEISHU_BITABLE_TABLE_ID: process.env.FEISHU_BITABLE_TABLE_ID || null,
      FEISHU_PROJECT_APP_TOKEN: PROJECT_APP_TOKEN || null,
      FEISHU_BITABLE_PROJECT_TABLE_ID: PROJECT_TABLE_ID || null,
      PORT: process.env.PORT || null,
      NODE_ENV: process.env.NODE_ENV || null,
    },
  });
});

// ====== 读取客户 ======
app.get("/api/customers", async (req, res) => {
  try {
    const keyword = (req.query.keyword || "").toString().trim();
    const data = await getCustomers({ keyword });
    res.json({ success: true, data });
  } catch (e) {
    console.error("GET /api/customers failed:", e);
    res.status(500).json({ success: false, error: String(e) });
  }
});

// ====== 写回飞书客户表（最稳：用 field_id 写入，避免字段名空格/隐形字符） ======
let cachedFieldMap = null;
let cachedFieldMapExpireAt = 0;

async function getFieldMap(appToken, tableId) {
  const now = Date.now();
  if (cachedFieldMap && now < cachedFieldMapExpireAt) return cachedFieldMap;

  const items = await listFields({ appToken, tableId });
  const map = new Map(); // field_name -> field_id
  (items || []).forEach((f) => {
    if (f?.field_name && f?.field_id) map.set(f.field_name, f.field_id);
  });

  cachedFieldMap = map;
  cachedFieldMapExpireAt = now + 60 * 1000; // 60s cache
  return map;
}

function findFieldId(fieldMap, expectedName) {
  // 1) 精确匹配
  if (fieldMap.has(expectedName)) return fieldMap.get(expectedName);

  // 2) 容错：忽略所有空白字符再匹配（解决 “公司总部 地区” 这种）
  const norm = (s) => String(s || "").replace(/\s+/g, "");
  const target = norm(expectedName);

  for (const [name, id] of fieldMap.entries()) {
    if (norm(name) === target) return id;
  }
  return null;
}

app.post("/api/customers", async (req, res) => {
  try {
    const appToken = process.env.FEISHU_BITABLE_APP_TOKEN;
    const tableId = process.env.FEISHU_BITABLE_TABLE_ID;

    if (!appToken || !tableId) {
      return res.status(500).json({
        success: false,
        error: "❌ 缺少 FEISHU_BITABLE_APP_TOKEN 或 FEISHU_BITABLE_TABLE_ID",
      });
    }

    const body = req.body || {};

    const shortName = String(body.shortName || body.name || "").trim();
    const companyName = String(body.companyName || "").trim();

    if (!shortName) {
      return res.status(400).json({ success: false, error: "缺少 shortName 或 name" });
    }

    // ✅ 只写你飞书表里真实存在的字段名（UTF-8）
    const fields = {
      "客户/部门简称": shortName,
      "年框客户": Boolean(body.isAnnual),
    };

    if (companyName) fields["企业名称"] = companyName;

    const hq = String(body.hq || "").trim();
    if (hq) fields["公司总部地区"] = hq;

    const customerType = String(body.customerType || "").trim();
    if (customerType) fields["客户类型"] = customerType;

    const level = String(body.level || "").trim();
    if (level) fields["客户等级"] = level;

    const cooperationStatus = String(body.cooperationStatus || "").trim();
    if (cooperationStatus) fields["合作状态"] = cooperationStatus;

    const industry = String(body.industry || "").trim();
    if (industry) fields["行业大类"] = industry;

    // ✅ 人员字段（主BD负责人，type=11）：支持传 user_id 或姓名（姓名将自动解析为 user_id）
    const ownerUserId = String(body.ownerUserId || "").trim();
    const ownerBd = String(body.ownerBd || "").trim();
    if (ownerUserId) {
      fields["主BD负责人"] = [{ id: ownerUserId }];
    } else if (ownerBd) {
      const { value: resolved, known } = await resolveCustomerBdField(ownerBd);
      if (!resolved) {
        return res.status(400).json({
          success: false,
          error: `无法解析人员字段 BD='${ownerBd}'（请确保该人员在飞书表/项目表里出现过一次，或配置 FEISHU_PERSON_ID_MAP）`,
          known_names: known,
        });
      }
      fields["主BD负责人"] = resolved;
    }

    console.log("🟦 POST /api/customers fields:", fields);

    const data = await batchCreateRecords({
      appToken,
      tableId,
      records: [{ fields }],
    });

    const recordId = data?.records?.[0]?.record_id;
    if (!recordId) {
      return res.status(500).json({
        success: false,
        error: "飞书返回异常：未生成 record_id",
        data,
      });
    }

    return res.json({
      success: true,
      record_id: recordId,
      target: { appToken, tableId },
      fields, // ✅ 回传实际写入内容
    });
  } catch (e) {
    console.error("POST /api/customers failed:", e);
    return res.status(500).json({ success: false, error: String(e) });
  }
});

// ====== 更新飞书客户表（客户ID不可变）======
app.put("/api/customers/:customerId", async (req, res) => {
  try {
    const appToken = process.env.FEISHU_BITABLE_APP_TOKEN;
    const tableId = process.env.FEISHU_BITABLE_TABLE_ID;

    if (!appToken || !tableId) {
      return res.status(500).json({
        success: false,
        error: "❌缺少 FEISHU_BITABLE_APP_TOKEN 或 FEISHU_BITABLE_TABLE_ID",
      });
    }

    const customerId = String(req.params.customerId || "").trim();
    if (!customerId) {
      return res.status(400).json({ success: false, error: "缺少 customerId" });
    }

    // 1) resolve record_id（优先当作 record_id；否则按字段「客户ID」匹配）
    let recordId = null;
    if (/^rec[a-zA-Z0-9]+$/.test(customerId)) {
      recordId = customerId;
    } else {
      const items = await listRecords({
        appToken,
        tableId,
        pageSize: 200,
      });
      const found = (items || []).find((it) => {
        const f = it?.fields || {};
        return String(f["客户ID"] || "").trim() === customerId;
      });
      recordId = found?.record_id || null;
    }

    if (!recordId) {
      return res.status(404).json({
        success: false,
        error: `未找到对应客户（customerId=${customerId}）`,
      });
    }

    // 2) build fields (DO NOT touch 客户ID)
    const body = req.body || {};
    const fields = {};

    const setIf = (fieldName, value) => {
      const isEmptyString = typeof value === "string" && value.trim() === "";
      if (value === undefined || value === null || isEmptyString) return;
      fields[fieldName] = value;
    };

    setIf("客户/部门简称", String(body.shortName || "").trim());
    setIf("企业名称", String(body.companyName || "").trim());
    setIf("公司总部地区", String(body.hq || "").trim());
    setIf("客户类型", body.customerType);
    setIf("客户等级", body.level);
    setIf("合作状态", body.cooperationStatus);
    setIf("行业大类", body.industry);
    if (body.isAnnual !== undefined) setIf("年框客户", Boolean(body.isAnnual));

    // ✅ 人员字段（主BD负责人，type=11）：支持传 user_id 或姓名（姓名将自动解析为 user_id）
    const ownerUserId = String(body.ownerUserId || "").trim();
    const ownerBd = String(body.ownerBd || "").trim();
    if (ownerUserId) {
      fields["主BD负责人"] = [{ id: ownerUserId }];
    } else if (ownerBd) {
      const { value: resolved, known } = await resolveCustomerBdField(ownerBd);
      if (!resolved) {
        return res.status(400).json({
          success: false,
          error: `无法解析人员字段 BD='${ownerBd}'（请确保该人员在飞书表/项目表里出现过一次，或配置 FEISHU_PERSON_ID_MAP）`,
          known_names: known,
        });
      }
      fields["主BD负责人"] = resolved;
    }

    console.log("🟦 PUT /api/customers fields:", fields, "recordId=", recordId);

    const data = await updateRecord({
      appToken,
      tableId,
      recordId,
      fields,
    });

    return res.json({
      success: true,
      record_id: recordId,
      data,
      fields,
    });
  } catch (e) {
    console.error("PUT /api/customers/:customerId failed:", e);
    return res.status(500).json({ success: false, error: String(e) });
  }
});


// ====== 关键：按 record_id 查回飞书确认是否写入成功 ======
app.get("/api/records/:recordId", async (req, res) => {
  try {
    const appToken = process.env.FEISHU_BITABLE_APP_TOKEN;
    const tableId = process.env.FEISHU_BITABLE_TABLE_ID;
    const recordId = req.params.recordId;

    if (!appToken || !tableId) {
      return res.status(500).json({ success: false, error: "missing env appToken/tableId" });
    }

    const data = await getRecordById({ appToken, tableId, recordId });
    res.json({ success: true, data });
  } catch (e) {
    console.error("GET /api/records/:recordId failed:", e);
    res.status(500).json({ success: false, error: String(e) });
  }
});

// ====== 列出表字段（用于确认字段名是否存在）======
app.get("/api/test-fields", async (req, res) => {
  try {
    const appToken = process.env.FEISHU_BITABLE_APP_TOKEN;
    const tableId = process.env.FEISHU_BITABLE_TABLE_ID;

    if (!appToken || !tableId) {
      return res.status(500).json({
        success: false,
        error: "missing env appToken/tableId",
      });
    }

    const items = await listFields({ appToken, tableId });

    const simple = (items || []).map((f) => ({
      field_id: f.field_id,
      field_name: f.field_name,
      type: f.type,
    }));

    res.json({ success: true, data: simple });
  } catch (e) {
    console.error("GET /api/test-fields failed:", e);
    res.status(500).json({ success: false, error: String(e) });
  }
});

// ====== 列出项目表字段（调试用）======
app.get("/api/test-project-fields", async (req, res) => {
  try {
    const appToken = PROJECT_APP_TOKEN;
    const tableId = PROJECT_TABLE_ID;

    if (!appToken || !tableId) {
      return res.status(500).json({
        success: false,
        error: "missing project appToken/tableId",
      });
    }

    const items = await listFields({ appToken, tableId });

    const simple = (items || []).map((f) => ({
      field_id: f.field_id,
      field_name: f.field_name,
      type: f.type,
    }));

    res.json({ success: true, data: simple });
  } catch (e) {
    console.error("GET /api/test-project-fields failed:", e);
    res.status(500).json({ success: false, error: String(e) });
  }
});

// ====== 项目表字段映射 & helper ======
// 使用飞书表单里的显示名，避免空格/隐藏字符导致映射失败
const PROJECT_FIELD = {
  projectId: "项目ID",
  customerId: "客户ID",
  projectName: "项目名称",
  shortName: "客户/部门简称",
  campaignName: "活动名称",
  deliverableName: "交付名称",
  month: "所属年月",
  serviceType: "服务类型",
  projectType: "项目类别",
  stage: "项目进度",
  priority: "优先级",
  expectedAmount: "预估项目金额",
  bd: "BD",
  am: "AM",
  totalBdHours: "累计商务时间（hr）",
  lastUpdateDate: "最新更新日期",
  nextFollowDate: "下次跟进日期",
};

function mapProjectRecord(it = {}) {
  const f = it.fields || {};
  const pickSingle = (v) => {
    if (Array.isArray(v)) return pickSingle(v[0]);
    if (typeof v === "object" && v !== null) {
      return (
        v?.name ??
        v?.text ??
        v?.label ??
        v?.value ??
        v?.option_name ??
        ""
      );
    }
    return v ?? "";
  };
  const pickNumber = (v) => {
    if (Array.isArray(v)) return pickNumber(v[0]);
    if (typeof v === "object" && v !== null) {
      const num = Number(v?.value ?? v?.text ?? v?.name ?? v);
      return Number.isNaN(num) ? 0 : num;
    }
    const num = Number(v);
    return Number.isNaN(num) ? 0 : num;
  };

  const normalizeAny = (v) => {
    if (Array.isArray(v)) {
      const arr = v.map((item) => pickSingle(item)).filter(Boolean);
      return arr.join("、");
    }
    if (typeof v === "object" && v !== null) {
      return pickSingle(v);
    }
    return v ?? "";
  };

  const formatDate = (v) => {
    if (v === null || v === undefined) return "";
    const str = String(v).trim();
    if (!str || str === "0") return "";

    const num = Number(str);
    const isNum = !Number.isNaN(num);
    if (isNum) {
      // 只在可能是时间戳时再转，避免普通数字（如 46009）被误判
      const isMs = str.length >= 13 || num > 1e11;
      const isSec = str.length === 10 || (num >= 1e9 && num < 2e10);
      // Feishu 日期字段有时会以 Excel 序列号返回（天数），需特殊处理
      const isExcelSerial = num > 20000 && num < 60000; // roughly 1955-2070

      if (isMs || isSec) {
        const d = new Date(isMs ? num : num * 1000);
        if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
      }
      if (isExcelSerial) {
        const base = Date.UTC(1899, 11, 30); // Excel 序列号起点（含 1900 闰年 bug 补偿）
        const d = new Date(base + num * 24 * 60 * 60 * 1000);
        if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
      }
      // 小数字直接原样返回，避免误判
      return str;
    }

    // 仅对标准日期格式做解析
    if (/^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/.test(str)) {
      const d = new Date(str.replace(/\//g, "-"));
      if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
    }
    return str;
  };

  const result = {
    projectId:
      f[PROJECT_FIELD.projectId] ||
      f.projectId ||
      f.id ||
      it.record_id ||
      "",
    customerId: f[PROJECT_FIELD.customerId] || f.customerId || "",
    shortName: f[PROJECT_FIELD.shortName] || f.shortName || "",
    projectName: f[PROJECT_FIELD.projectName] || f.projectName || "",
    serviceType: pickSingle(f[PROJECT_FIELD.serviceType] || f.serviceType),
    projectType: pickSingle(f[PROJECT_FIELD.projectType] || f.projectType),
    stage: pickSingle(f[PROJECT_FIELD.stage] || f.stage),
    priority: pickSingle(f[PROJECT_FIELD.priority] || f.priority),
    bd: pickSingle(f[PROJECT_FIELD.bd] || f.bd),
    am: pickSingle(f[PROJECT_FIELD.am] || f.am),
    month: f[PROJECT_FIELD.month] || f.month || "",
    nextFollowDate: f[PROJECT_FIELD.nextFollowDate] || f.nextFollowDate || "",
    campaignName: f[PROJECT_FIELD.campaignName] || f.campaignName || "",
    deliverableName: f[PROJECT_FIELD.deliverableName] || f.deliverableName || "",
    expectedAmount: pickNumber(f[PROJECT_FIELD.expectedAmount] || f.expectedAmount),
    totalBdHours: pickNumber(f[PROJECT_FIELD.totalBdHours] || f.totalBdHours),
    lastUpdateDate: f[PROJECT_FIELD.lastUpdateDate] || f.lastUpdateDate || "",
  };

  Object.keys(result).forEach((k) => {
    const v = result[k];
    if (k === "expectedAmount" || k === "totalBdHours") return;
    if (k === "lastUpdateDate" || k === "nextFollowDate") {
      result[k] = formatDate(v);
    } else {
      result[k] = normalizeAny(v);
    }
  });
  return result;
}

async function findProjectRecordIdByProjectId(projectId) {
  const records = await listRecords({
    appToken: PROJECT_APP_TOKEN,
    tableId: PROJECT_TABLE_ID,
    pageSize: 200,
  });
  const hit = (records || []).find((it) => {
    const f = it.fields || {};
    const val =
      f[PROJECT_FIELD.projectId] ||
      f.projectId ||
      f.id ||
      it.record_id ||
      "";
    return String(val).trim() === String(projectId).trim();
  });
  return hit?.record_id || null;
}

// ====== 读取项目 ======
app.get("/api/projects", async (req, res) => {
  try {
    if (!PROJECT_APP_TOKEN || !PROJECT_TABLE_ID) {
      return res.status(500).json({
        success: false,
        error: "missing project appToken/tableId",
      });
    }

    const keyword = (req.query.keyword || "").toString().trim().toLowerCase();
    const customerId = (req.query.customerId || "").toString().trim();

    const records = await listRecords({
      appToken: PROJECT_APP_TOKEN,
      tableId: PROJECT_TABLE_ID,
      pageSize: 200,
    });

    let projects = (records || []).map((it) => mapProjectRecord(it));

    if (keyword) {
      projects = projects.filter(
        (p) =>
          (p.projectName || "").toLowerCase().includes(keyword) ||
          (p.shortName || "").toLowerCase().includes(keyword)
      );
    }

    if (customerId) {
      projects = projects.filter((p) => String(p.customerId || "") === customerId);
    }

    res.json({ success: true, data: projects });
  } catch (e) {
    console.error("GET /api/projects failed:", e);
    res.status(500).json({ success: false, error: String(e) });
  }
});

app.get("/api/projects/:projectId", async (req, res) => {
  try {
    const projectId = req.params.projectId;
    if (!PROJECT_APP_TOKEN || !PROJECT_TABLE_ID) {
      return res.status(500).json({
        success: false,
        error: "missing project appToken/tableId",
      });
    }

    const recordId = await findProjectRecordIdByProjectId(projectId);
    if (!recordId) {
      return res.status(404).json({ success: false, error: "project not found" });
    }

    const items = await listRecords({
      appToken: PROJECT_APP_TOKEN,
      tableId: PROJECT_TABLE_ID,
      pageSize: 200,
    });
    const hit = (items || []).find((it) => it.record_id === recordId);
    if (!hit) {
      return res.status(404).json({ success: false, error: "project not found" });
    }

    res.json({ success: true, data: mapProjectRecord(hit) });
  } catch (e) {
    console.error("GET /api/projects/:projectId failed:", e);
    res.status(500).json({ success: false, error: String(e) });
  }
});

// ====== 写入/更新项目 ======
app.post("/api/projects", async (req, res) => {
  try {
    if (!PROJECT_APP_TOKEN || !PROJECT_TABLE_ID) {
      return res.status(500).json({
        success: false,
        error: "缺少项目表 appToken/tableId",
      });
    }

    const body = req.body || {};
    const projectName = String(body.projectName || "").trim();
    if (!projectName) {
      return res.status(400).json({ success: false, error: "缺少 projectName" });
    }

    const fields = {};
    const warnings = [];
    const setField = (key, value) => {
      const isEmptyString = typeof value === "string" && value.trim() === "";
      if (value === undefined || value === null || isEmptyString) return;
      fields[PROJECT_FIELD[key]] = value;
    };

    setField("projectName", projectName);
    setField("projectId", String(body.projectId || "").trim());
    setField("customerId", String(body.customerId || "").trim());
    setField("shortName", String(body.shortName || "").trim());
    setField("serviceType", body.serviceType);
    setField("projectType", body.projectType);
    setField("stage", body.stage);
    setField("priority", body.priority);
    setField("month", body.month);
    setField("nextFollowDate", body.nextFollowDate);
    setField("campaignName", body.campaignName);
    setField("deliverableName", body.deliverableName);
    setField("totalBdHours", body.totalBdHours);
    setField("lastUpdateDate", body.lastUpdateDate);
    if (body.expectedAmount !== undefined && body.expectedAmount !== null && body.expectedAmount !== "") {
      const num = Number(body.expectedAmount);
      if (!Number.isNaN(num)) setField("expectedAmount", num);
    }

    // ⚠️ 人员字段（BD/AM）：飞书需要 list<object>，这里支持前端传“姓名字符串”并在项目表内自动解析成 id。
    if (body.bd !== undefined && body.bd !== null && String(body.bd).trim() !== "") {
      const v = await resolvePersonFieldValue({
        appToken: PROJECT_APP_TOKEN,
        tableId: PROJECT_TABLE_ID,
        fieldName: PROJECT_FIELD.bd,
        input: body.bd,
      });
      if (!v) {
        const known = await getKnownPersonNames({
          appToken: PROJECT_APP_TOKEN,
          tableId: PROJECT_TABLE_ID,
          fieldName: PROJECT_FIELD.bd,
        });
        return res.status(400).json({
          success: false,
          error: `无法解析人员字段 BD='${String(body.bd)}'（请确保该人员在飞书表里出现过一次，或配置 FEISHU_PERSON_ID_MAP）`,
          known_names: known,
        });
      }
      fields[PROJECT_FIELD.bd] = v;
    }

    if (body.am !== undefined && body.am !== null && String(body.am).trim() !== "") {
      const v = await resolvePersonFieldValue({
        appToken: PROJECT_APP_TOKEN,
        tableId: PROJECT_TABLE_ID,
        fieldName: PROJECT_FIELD.am,
        input: body.am,
      });
      if (!v) {
        const known = await getKnownPersonNames({
          appToken: PROJECT_APP_TOKEN,
          tableId: PROJECT_TABLE_ID,
          fieldName: PROJECT_FIELD.am,
        });
        warnings.push(
          `无法解析人员字段 AM='${String(body.am)}'（请确保该人员在飞书表里出现过一次，或配置 FEISHU_PERSON_ID_MAP）；已忽略该字段以避免写入失败。`
        );
        console.warn("POST /api/projects warning:", warnings[warnings.length - 1], {
          known_names: known,
        });
      } else {
        fields[PROJECT_FIELD.am] = v;
      }
    }

    console.log("🦆 POST /api/projects fields:", fields);

    const data = await batchCreateRecords({
      appToken: PROJECT_APP_TOKEN,
      tableId: PROJECT_TABLE_ID,
      records: [{ fields }],
    });

    const recordId = data?.records?.[0]?.record_id;
    if (!recordId) {
      return res.status(500).json({
        success: false,
        error: "飞书返回异常：未生成 record_id",
        data,
      });
    }

    res.json({
      success: true,
      record_id: recordId,
      target: { appToken: PROJECT_APP_TOKEN, tableId: PROJECT_TABLE_ID },
      fields,
      warnings,
    });
  } catch (e) {
    console.error("POST /api/projects failed:", e);
    res.status(500).json({ success: false, error: String(e) });
  }
});

app.put("/api/projects/:projectId", async (req, res) => {
  try {
    if (!PROJECT_APP_TOKEN || !PROJECT_TABLE_ID) {
      return res.status(500).json({
        success: false,
        error: "缺少项目表 appToken/tableId",
      });
    }
    const projectId = req.params.projectId;
    const recordId = await findProjectRecordIdByProjectId(projectId);
    if (!recordId) {
      return res.status(404).json({ success: false, error: "project not found" });
    }

    const body = req.body || {};
    const fields = {};
    const warnings = [];
    const setField = (key, value) => {
      const isEmptyString = typeof value === "string" && value.trim() === "";
      if (value === undefined || value === null || isEmptyString) return;
      fields[PROJECT_FIELD[key]] = value;
    };

    setField("projectName", String(body.projectName || "").trim());
    setField("customerId", String(body.customerId || "").trim());
    setField("shortName", String(body.shortName || "").trim());
    setField("serviceType", body.serviceType);
    setField("projectType", body.projectType);
    setField("stage", body.stage);
    setField("priority", body.priority);
    setField("month", body.month);
    setField("nextFollowDate", body.nextFollowDate);
    setField("campaignName", body.campaignName);
    setField("deliverableName", body.deliverableName);
    if (body.expectedAmount !== undefined && body.expectedAmount !== null && body.expectedAmount !== "") {
      const num = Number(body.expectedAmount);
      if (!Number.isNaN(num)) setField("expectedAmount", num);
    }

    // ⚠️ 人员字段（BD/AM）：飞书需要 list<object>，这里支持前端传“姓名字符串”并在项目表内自动解析成 id。
    if (body.bd !== undefined && body.bd !== null && String(body.bd).trim() !== "") {
      const v = await resolvePersonFieldValue({
        appToken: PROJECT_APP_TOKEN,
        tableId: PROJECT_TABLE_ID,
        fieldName: PROJECT_FIELD.bd,
        input: body.bd,
      });
      if (!v) {
        return res.status(400).json({
          success: false,
          error: `无法解析人员字段 BD='${String(body.bd)}'（请确保该人员在飞书表里出现过一次，或配置 FEISHU_PERSON_ID_MAP）`,
        });
      }
      fields[PROJECT_FIELD.bd] = v;
    }

    if (body.am !== undefined && body.am !== null && String(body.am).trim() !== "") {
      const v = await resolvePersonFieldValue({
        appToken: PROJECT_APP_TOKEN,
        tableId: PROJECT_TABLE_ID,
        fieldName: PROJECT_FIELD.am,
        input: body.am,
      });
      if (!v) {
        warnings.push(
          `无法解析人员字段 AM='${String(body.am)}'（请确保该人员在飞书表里出现过一次，或配置 FEISHU_PERSON_ID_MAP）；已忽略该字段以避免更新失败。`
        );
        console.warn("PUT /api/projects warning:", warnings[warnings.length - 1]);
      } else {
        fields[PROJECT_FIELD.am] = v;
      }
    }

    console.log("🦆 PUT /api/projects fields:", fields);

    const data = await updateRecord({
      appToken: PROJECT_APP_TOKEN,
      tableId: PROJECT_TABLE_ID,
      recordId,
      fields,
    });

    res.json({
      success: true,
      record_id: recordId,
      data,
      fields,
      warnings,
    });
  } catch (e) {
    console.error("PUT /api/projects/:projectId failed:", e);
    res.status(500).json({ success: false, error: String(e) });
  }
});


// ====== 立项（Deals） ======
const formatDateLoose = (v) => {
  if (v === null || v === undefined) return "";
  const str = String(v).trim();
  if (!str || str === "0") return "";
  const num = Number(str);
  const isNum = !Number.isNaN(num);
  if (isNum) {
    const isMs = str.length >= 13 || num > 1e11;
    const isSec = str.length === 10 || (num >= 1e9 && num < 2e10);
    const isExcelSerial = num > 20000 && num < 60000; // roughly 1955-2070
    if (isMs || isSec) {
      const d = new Date(isMs ? num : num * 1000);
      if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
    }
    if (isExcelSerial) {
      const base = Date.UTC(1899, 11, 30); // Excel 序列号起点（含 1900 闰年 bug 修正）
      const d = new Date(base + num * 24 * 60 * 60 * 1000);
      if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
    }
    return str; // 其它数字原样返回，避免误改
  }
  if (/^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/.test(str)) {
    const d = new Date(str.replace(/\//g, "-"));
    if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  }
  return str;
};

function mapDealRecord(it) {
  const f = it?.fields || {};
  const num = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  };
  return {
    serialNo: String(f["编号"] || "").trim(),
    dealId: String(f["立项ID"] || f.dealId || f.id || it.record_id || "").trim(),
    projectId: String(f["项目ID"] || f.projectId || "").trim(),
    customerId: String(f["客户ID"] || f.customerId || "").trim(),
    projectName: String(f["项目名称"] || f.projectName || "").trim(),
    month: String(f["所属月份"] ?? f.month ?? "").trim(),

    startDate: formatDateLoose(f["项目开始时间"] ?? f.startDate),
    endDate: formatDateLoose(f["项目结束时间"] ?? f.endDate),
    isFinished: f["是否完结"] ?? f["是否完成"] ?? f.isFinished ?? "",

    signCompany: f["签约公司主体"] || f["签约主体"] || f.signCompany || "",
    incomeWithTax: num(f["含税收入"] ?? f.incomeWithTax),
    incomeWithoutTax: num(f["不含税收入"] ?? f.incomeWithoutTax),
    estimatedCost: num(f["预估成本"] ?? f.estimatedCost),
    paidThirdPartyCost: num(f["已付三方成本"] ?? f.paidThirdPartyCost),
    grossProfit: num(f["毛利"] ?? f.grossProfit),
    grossMargin: num(f["毛利率"] ?? f.grossMargin),
    firstPaymentDate: formatDateLoose(f["预计首款时间"] ?? f.firstPaymentDate),
    finalPaymentDate: formatDateLoose(f["预计尾款时间"] ?? f.finalPaymentDate),
    receivedAmount: num(f["已收金额"] ?? f.receivedAmount),
    remainingReceivable: num(f["剩余应收金额"] ?? f.remainingReceivable),
  };
}

// ====== Feishu Person field helpers (BD/AM 等人员字段) ======
const PERSON_ID_CACHE = new Map();

function readPersonIdMapFromEnv() {
  const raw = process.env.FEISHU_PERSON_ID_MAP || process.env.FEISHU_USER_ID_MAP || "";
  if (!raw) return {};
  try {
    const obj = JSON.parse(raw);
    return obj && typeof obj === "object" ? obj : {};
  } catch {
    return {};
  }
}

function normalizePersonName(name) {
  return String(name || "").trim();
}

function pickPersonId(personObj) {
  if (!personObj || typeof personObj !== "object") return "";
  return String(
    personObj.id ??
      personObj.user_id ??
      personObj.open_id ??
      personObj.union_id ??
      ""
  ).trim();
}

async function getPersonNameToIdMap({ appToken, tableId, fieldName }) {
  const cacheKey = `${appToken}:${tableId}:${fieldName}`;
  const cached = PERSON_ID_CACHE.get(cacheKey);
  if (cached && Date.now() < cached.expireAt) return cached.map;

  const items = await listRecords({ appToken, tableId, pageSize: 200 });
  const map = new Map();

  for (const it of items || []) {
    const v = it?.fields?.[fieldName];
    if (!Array.isArray(v)) continue;
    for (const personObj of v) {
      const n = normalizePersonName(personObj?.name);
      const id = pickPersonId(personObj);
      if (n && id && !map.has(n)) map.set(n, id);
    }
  }

  PERSON_ID_CACHE.set(cacheKey, { expireAt: Date.now() + 5 * 60 * 1000, map });
  return map;
}

async function resolvePersonFieldValue({ appToken, tableId, fieldName, input }) {
  if (Array.isArray(input)) return input;

  const name = normalizePersonName(input);
  if (!name) return null;

  const envMap = readPersonIdMapFromEnv();
  const envId = String(envMap?.[name] || "").trim();
  if (envId) return [{ id: envId }];

  const map = await getPersonNameToIdMap({ appToken, tableId, fieldName });
  const id = map.get(name);
  if (!id) return null;
  return [{ id }];
}

async function getKnownPersonNames({ appToken, tableId, fieldName }) {
  const map = await getPersonNameToIdMap({ appToken, tableId, fieldName });
  return Array.from(map.keys()).sort((a, b) => a.localeCompare(b, "zh-CN"));
}

// 客户表 BD 解析：优先用客户表自身人员列，其次回退用项目表 BD 列（因为项目表通常已有人员选择，能拿到 user_id）
async function resolveCustomerBdField(name) {
  // 1) 尝试直接用客户表
  const primary = await resolvePersonFieldValue({
    appToken: process.env.FEISHU_BITABLE_APP_TOKEN,
    tableId: process.env.FEISHU_BITABLE_TABLE_ID,
    fieldName: "主BD负责人",
    input: name,
  });
  if (primary) return { value: primary, known: await getKnownPersonNames({
    appToken: process.env.FEISHU_BITABLE_APP_TOKEN,
    tableId: process.env.FEISHU_BITABLE_TABLE_ID,
    fieldName: "主BD负责人",
  }) };

  // 2) 回退：用项目表 BD 列里的人员，常见场景：客户表人员列为空，但项目表已经有 BD 人员
  if (PROJECT_APP_TOKEN && PROJECT_TABLE_ID) {
    const fallback = await resolvePersonFieldValue({
      appToken: PROJECT_APP_TOKEN,
      tableId: PROJECT_TABLE_ID,
      fieldName: PROJECT_FIELD.bd,
      input: name,
    });
    if (fallback) {
      const known = await getKnownPersonNames({
        appToken: PROJECT_APP_TOKEN,
        tableId: PROJECT_TABLE_ID,
        fieldName: PROJECT_FIELD.bd,
      });
      return { value: fallback, known };
    }
  }

  // 3) 仍解析失败
  return { value: null, known: [] };
}

async function findDealRecordIdByDealId(dealId) {
  if (!DEAL_APP_TOKEN || !DEAL_TABLE_ID) return null;

  const records = await listRecords({
    appToken: DEAL_APP_TOKEN,
    tableId: DEAL_TABLE_ID,
    pageSize: 200,
  });

  const hit = (records || []).find((it) => {
    const f = it.fields || {};
    const val = f["立项ID"] || f.dealId || f.id || it.record_id || "";
    return String(val).trim() === String(dealId).trim();
  });
  return hit?.record_id || null;
}

app.get("/api/deals", async (req, res) => {
  try {
    if (!DEAL_APP_TOKEN || !DEAL_TABLE_ID) {
      return res.status(500).json({
        success: false,
        error:
          "missing deal appToken/tableId (FEISHU_DEAL_APP_TOKEN/FEISHU_BITABLE_DEAL_TABLE_ID)",
      });
    }

    const keyword = (req.query.keyword || "").toString().trim().toLowerCase();
    const projectId = (req.query.projectId || "").toString().trim();

    const records = await listRecords({
      appToken: DEAL_APP_TOKEN,
      tableId: DEAL_TABLE_ID,
      pageSize: 200,
    });

    let deals = (records || []).map((it) => mapDealRecord(it));

    if (keyword) {
      deals = deals.filter((d) =>
        (d.projectName || "").toLowerCase().includes(keyword)
      );
    }

    if (projectId) {
      deals = deals.filter((d) => String(d.projectId || "") === projectId);
    }

    res.json({ success: true, data: deals });
  } catch (e) {
    console.error("GET /api/deals failed:", e);
    res.status(500).json({ success: false, error: String(e) });
  }
});

app.post("/api/deals", async (req, res) => {
  try {
    if (!DEAL_APP_TOKEN || !DEAL_TABLE_ID) {
      return res.status(500).json({
        success: false,
        error:
          "missing deal appToken/tableId (FEISHU_DEAL_APP_TOKEN/FEISHU_BITABLE_DEAL_TABLE_ID)",
      });
    }

    const body = req.body || {};
    const dealId = String(body.dealId || "").trim();
    const projectId = String(body.projectId || "").trim(); // 兼容旧表单：如果表里没有字段，会自动忽略
    const customerId = String(body.customerId || "").trim();

    if (!dealId)
      return res.status(400).json({ success: false, error: "missing dealId" });

    const fields = {};
    const normalizeMonth = (v) => {
      const s = String(v ?? "").trim();
      if (!s) return undefined;
      const m = s.match(/(?:^|\.)(\d{1,2})$/); // 取末尾的月份数字
      const n = Number(m ? m[1] : s);
      return Number.isFinite(n) ? n : s;
    };
    const setIf = (name, value) => {
      const isEmptyString = typeof value === "string" && value.trim() === "";
      if (value === undefined || value === null || isEmptyString) return;
      fields[name] = value;
    };

    setIf("立项ID", dealId);
    // 如果立项表没有“项目ID/项目名称”字段，以下两行会被忽略，不会写入
    setIf("项目ID", projectId);
    setIf("客户ID", customerId);
    // setIf("项目名称", String(body.projectName || "").trim());
    const monthVal = normalizeMonth(body.month);
    if (monthVal !== undefined) setIf("所属月份", monthVal);

    setIf("项目开始时间", body.startDate);
    setIf("项目结束时间", body.endDate);
    setIf("是否完结", body.isFinished);
    setIf("签约公司主体", body.signCompany);

    if (body.incomeWithTax !== undefined && body.incomeWithTax !== "")
      setIf("含税收入", Number(body.incomeWithTax));
    if (body.incomeWithoutTax !== undefined && body.incomeWithoutTax !== "")
      setIf("不含税收入", Number(body.incomeWithoutTax));
    if (body.estimatedCost !== undefined && body.estimatedCost !== "")
      setIf("预估成本", Number(body.estimatedCost));
    if (body.paidThirdPartyCost !== undefined && body.paidThirdPartyCost !== "")
      setIf("已付三方成本", Number(body.paidThirdPartyCost));
    if (body.receivedAmount !== undefined && body.receivedAmount !== "")
      setIf("已收金额", Number(body.receivedAmount));

    if (body.thirdPartyCost !== undefined && body.thirdPartyCost !== "")
      setIf("已付三方成本", Number(body.thirdPartyCost));
    if (body.grossProfit !== undefined && body.grossProfit !== "")
      setIf("毛利", Number(body.grossProfit));
    if (body.grossMargin !== undefined && body.grossMargin !== "")
      setIf("毛利率", Number(body.grossMargin));
    if (body.remainingReceivable !== undefined && body.remainingReceivable !== "")
      setIf("剩余应收金额", Number(body.remainingReceivable));

    setIf("预计首款时间", body.firstPaymentDate);
    setIf("预计尾款时间", body.finalPaymentDate);

    console.log("🟧 POST /api/deals fields:", fields);

    const data = await batchCreateRecords({
      appToken: DEAL_APP_TOKEN,
      tableId: DEAL_TABLE_ID,
      records: [{ fields }],
    });

    const recordId = data?.records?.[0]?.record_id;
    if (!recordId) {
      return res.status(500).json({
        success: false,
        error: "feishu returned no record_id",
        data,
      });
    }

    return res.json({ success: true, record_id: recordId, data, fields });
  } catch (e) {
    console.error("POST /api/deals failed:", e);
    return res.status(500).json({ success: false, error: String(e) });
  }
});

app.put("/api/deals/:dealId", async (req, res) => {
  try {
    if (!DEAL_APP_TOKEN || !DEAL_TABLE_ID) {
      return res.status(500).json({
        success: false,
        error:
          "missing deal appToken/tableId (FEISHU_DEAL_APP_TOKEN/FEISHU_BITABLE_DEAL_TABLE_ID)",
      });
    }

    const dealId = String(req.params.dealId || "").trim();
    const recordId = await findDealRecordIdByDealId(dealId);
    if (!recordId)
      return res.status(404).json({ success: false, error: "deal not found" });

    const body = req.body || {};
    const fields = {};
    const normalizeMonth = (v) => {
      const s = String(v ?? "").trim();
      if (!s) return undefined;
      const m = s.match(/(?:^|\.)(\d{1,2})$/);
      const n = Number(m ? m[1] : s);
      return Number.isFinite(n) ? n : s;
    };
    const setIf = (name, value) => {
      const isEmptyString = typeof value === "string" && value.trim() === "";
      if (value === undefined || value === null || isEmptyString) return;
      fields[name] = value;
    };

    // 如果表里没有项目ID/名称字段，这些会被忽略
    setIf("项目ID", String(body.projectId || "").trim());
    setIf("客户ID", String(body.customerId || "").trim());
    // setIf("项目名称", String(body.projectName || "").trim());
    const monthVal = normalizeMonth(body.month);
    if (monthVal !== undefined) setIf("所属月份", monthVal);
    setIf("项目开始时间", body.startDate);
    setIf("项目结束时间", body.endDate);
    setIf("是否完结", body.isFinished);
    setIf("签约公司主体", body.signCompany);

    if (body.incomeWithTax !== undefined && body.incomeWithTax !== "")
      setIf("含税收入", Number(body.incomeWithTax));
    if (body.incomeWithoutTax !== undefined && body.incomeWithoutTax !== "")
      setIf("不含税收入", Number(body.incomeWithoutTax));
    if (body.estimatedCost !== undefined && body.estimatedCost !== "")
      setIf("预估成本", Number(body.estimatedCost));
    if (body.paidThirdPartyCost !== undefined && body.paidThirdPartyCost !== "")
      setIf("已付三方成本", Number(body.paidThirdPartyCost));
    if (body.receivedAmount !== undefined && body.receivedAmount !== "")
      setIf("已收金额", Number(body.receivedAmount));

    if (body.thirdPartyCost !== undefined && body.thirdPartyCost !== "")
      setIf("已付三方成本", Number(body.thirdPartyCost));
    if (body.grossProfit !== undefined && body.grossProfit !== "")
      setIf("毛利", Number(body.grossProfit));
    if (body.grossMargin !== undefined && body.grossMargin !== "")
      setIf("毛利率", Number(body.grossMargin));
    if (body.remainingReceivable !== undefined && body.remainingReceivable !== "")
      setIf("剩余应收金额", Number(body.remainingReceivable));

    setIf("预计首款时间", body.firstPaymentDate);
    setIf("预计尾款时间", body.finalPaymentDate);

    console.log("🟧 PUT /api/deals fields:", fields, "recordId=", recordId);

    const data = await updateRecord({
      appToken: DEAL_APP_TOKEN,
      tableId: DEAL_TABLE_ID,
      recordId,
      fields,
    });

    return res.json({ success: true, record_id: recordId, data, fields });
  } catch (e) {
    console.error("PUT /api/deals/:dealId failed:", e);
    return res.status(500).json({ success: false, error: String(e) });
  }
});

app.get("/api/test-deal-fields", async (req, res) => {
  try {
    if (!DEAL_APP_TOKEN || !DEAL_TABLE_ID) {
      return res.status(500).json({
        success: false,
        error:
          "missing deal appToken/tableId (FEISHU_DEAL_APP_TOKEN/FEISHU_BITABLE_DEAL_TABLE_ID)",
      });
    }
    const items = await listFields({
      appToken: DEAL_APP_TOKEN,
      tableId: DEAL_TABLE_ID,
    });
    const simple = (items || []).map((f) => ({
      field_id: f.field_id,
      field_name: f.field_name,
      type: f.type,
    }));
    res.json({ success: true, data: simple });
  } catch (e) {
    console.error("GET /api/test-deal-fields failed:", e);
    res.status(500).json({ success: false, error: String(e) });
  }
});

// ====== 列出项目表里的人员字段可用值（调试用）======
// 用于解决“前端传姓名，但飞书 Person 字段需要 user_id”的问题。
// 扫描项目表前 200 条记录里 BD/AM 字段出现过的人员对象，输出 name -> id。
app.get("/api/project-persons", async (req, res) => {
  try {
    if (!PROJECT_APP_TOKEN || !PROJECT_TABLE_ID) {
      return res.status(500).json({
        success: false,
        error: "missing project appToken/tableId",
      });
    }

    const items = await listRecords({
      appToken: PROJECT_APP_TOKEN,
      tableId: PROJECT_TABLE_ID,
      pageSize: 200,
    });

    const collect = (fieldName) => {
      const map = new Map();
      for (const it of items || []) {
        const v = it?.fields?.[fieldName];
        if (!Array.isArray(v)) continue;
        for (const personObj of v) {
          const name = normalizePersonName(personObj?.name);
          const id = pickPersonId(personObj);
          if (name && id && !map.has(name)) map.set(name, id);
        }
      }
      return Array.from(map.entries())
        .map(([name, id]) => ({ name, id }))
        .sort((a, b) => a.name.localeCompare(b.name, "zh-CN"));
    };

    return res.json({
      success: true,
      data: {
        bd: collect(PROJECT_FIELD.bd),
        am: collect(PROJECT_FIELD.am),
        env_map: readPersonIdMapFromEnv(),
      },
    });
  } catch (e) {
    console.error("GET /api/project-persons failed:", e);
    return res.status(500).json({ success: false, error: String(e) });
  }
});

// ====== 看板（Kanban）接口预留 ======
app.get("/api/kanban/boards", (req, res) => {
  const boards = KANBAN_BOARD_ID
    ? [{ id: KANBAN_BOARD_ID, name: "Feishu Kanban", description: "飞书看板占位" }]
    : [];
  return sendKanbanPlaceholder(res, boards, {
    target: { appToken: KANBAN_APP_TOKEN || null, boardId: KANBAN_BOARD_ID || null },
  });
});

app.get("/api/kanban/boards/:boardId", (req, res) => {
  const boardId = String(req.params.boardId || "").trim();
  const board = boardId
    ? { id: boardId, name: "Feishu Kanban", description: "飞书看板占位" }
    : null;
  return sendKanbanPlaceholder(res, board);
});

app.get("/api/kanban/boards/:boardId/columns", (req, res) => {
  return sendKanbanPlaceholder(res, []);
});

app.get("/api/kanban/boards/:boardId/cards", (req, res) => {
  return sendKanbanPlaceholder(res, []);
});

app.post("/api/kanban/boards/:boardId/cards", (req, res) => {
  const boardId = String(req.params.boardId || "").trim();
  const payload = req.body || {};
  return sendKanbanPlaceholder(res, null, {
    action: "create_card",
    boardId,
    payload,
  });
});

app.put("/api/kanban/boards/:boardId/cards/:cardId", (req, res) => {
  const boardId = String(req.params.boardId || "").trim();
  const cardId = String(req.params.cardId || "").trim();
  const payload = req.body || {};
  return sendKanbanPlaceholder(res, null, {
    action: "update_card",
    boardId,
    cardId,
    payload,
  });
});

app.patch("/api/kanban/boards/:boardId/cards/:cardId/move", (req, res) => {
  const boardId = String(req.params.boardId || "").trim();
  const cardId = String(req.params.cardId || "").trim();
  const payload = req.body || {};
  return sendKanbanPlaceholder(res, null, {
    action: "move_card",
    boardId,
    cardId,
    payload,
  });
});

app.post("/api/kanban/boards/:boardId/sync", (req, res) => {
  const boardId = String(req.params.boardId || "").trim();
  return sendKanbanPlaceholder(res, { syncedAt: new Date().toISOString() }, { boardId });
});

app.post("/api/kanban/boards/:boardId/push", (req, res) => {
  const boardId = String(req.params.boardId || "").trim();
  return sendKanbanPlaceholder(res, { pushedAt: new Date().toISOString() }, { boardId });
});

// ====== 仪表盘（Dashboard）嵌入 ======
app.get("/api/dashboard/embed", (req, res) => {
  if (!DASHBOARD_EMBED_URL) {
    return res.status(500).json({
      success: false,
      error: "missing FEISHU_DASHBOARD_EMBED_URL",
    });
  }
  return res.json({
    success: true,
    data: { url: DASHBOARD_EMBED_URL },
  });
});

app.listen(PORT, () => {
  console.log(`✅ API server running at http://localhost:${PORT}`);
});
