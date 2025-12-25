﻿



import crypto from "crypto";
import express from "express";
import cors from "cors";

import { createRecord, listFields, listRecords, updateRecord, sendMessageToUser } from "./feishu.js";
import {

  getCustomers,

  batchCreateRecords,

  getRecordById,

} from "./feishu.js";



const app = express();

app.use(cors({ origin: true, credentials: true }));

app.use(express.json({ limit: "2mb" }));

const API_CACHE_TTL_MS = Number(process.env.API_CACHE_TTL_MS || 30000);
const apiCache = new Map();
function getCached(key) {
  const hit = apiCache.get(key);
  if (!hit) return null;
  if (Date.now() > hit.expireAt) {
    apiCache.delete(key);
    return null;
  }
  return hit.value;
}
async function withCache(key, ttlMs, fetcher) {
  if (!ttlMs || ttlMs <= 0) return fetcher();
  const cached = getCached(key);
  if (cached !== null) return cached;
  const value = await fetcher();
  apiCache.set(key, { value, expireAt: Date.now() + ttlMs });
  return value;
}



const PORT = process.env.PORT || 4000;

const BUILD_ID = `BDdaily-${new Date().toISOString()}`;

const PROJECT_APP_TOKEN = process.env.FEISHU_PROJECT_APP_TOKEN || process.env.FEISHU_BITABLE_APP_TOKEN;

const PROJECT_TABLE_ID = process.env.FEISHU_BITABLE_PROJECT_TABLE_ID;

const DEAL_APP_TOKEN = process.env.FEISHU_DEAL_APP_TOKEN || PROJECT_APP_TOKEN;

const DEAL_TABLE_ID = process.env.FEISHU_BITABLE_DEAL_TABLE_ID;

const KANBAN_APP_TOKEN = process.env.FEISHU_KANBAN_APP_TOKEN || process.env.FEISHU_BITABLE_APP_TOKEN;
const KANBAN_BOARD_ID = process.env.FEISHU_KANBAN_BOARD_ID;
const DASHBOARD_EMBED_URL = process.env.FEISHU_DASHBOARD_EMBED_URL;
const DAILY_FORM_URL = process.env.DAILY_FORM_URL || "";
const DAILY_FORM_BD_OPEN_IDS = String(process.env.DAILY_FORM_BD_OPEN_IDS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const CRON_SECRET = String(process.env.CRON_SECRET || "").trim();

let cachedJsapiTicket = null;
let jsapiTicketExpireAt = 0;

function getUserAccessToken(req) {
  const auth = String(req.headers.authorization || "");
  if (auth.toLowerCase().startsWith("bearer ")) {
    return auth.slice(7).trim();
  }
  const headerToken = String(req.headers["x-feishu-user-access-token"] || "").trim();
  if (headerToken) return headerToken;
  const envToken = String(process.env.FEISHU_USER_ACCESS_TOKEN || "").trim();
  return envToken;
}

function getCurrentOpenId(req) {
  const headerOpenId = String(req.headers["x-feishu-open-id"] || "").trim();
  if (headerOpenId) return headerOpenId;
  const envOpenId = String(process.env.FEISHU_OPEN_ID || process.env.FEISHU_USER_OPEN_ID || "").trim();
  return envOpenId;
}

async function getJsapiTicket(userAccessToken) {
  if (cachedJsapiTicket && Date.now() < jsapiTicketExpireAt) return cachedJsapiTicket;

  const res = await fetch("https://open.feishu.cn/open-apis/jssdk/ticket/get", {
    method: "GET",
    headers: { Authorization: `Bearer ${userAccessToken}` },
  });

  const json = await res.json().catch(() => ({}));
  if (json?.code !== 0) {
    throw new Error(`jssdk/ticket/get failed: ${JSON.stringify(json)}`);
  }

  const ticket = json?.data?.ticket || "";
  const expireIn = Number(json?.data?.expire_in || 0);
  if (!ticket) throw new Error("jssdk/ticket/get: missing ticket");

  cachedJsapiTicket = ticket;
  jsapiTicketExpireAt = Date.now() + Math.max(0, expireIn - 60) * 1000;
  return ticket;
}

function sendKanbanPlaceholder(res, data, extra = {}) {
  return res.json({
    success: true,
    reserved: true,

    data: data ?? null,

    hint: "Kanban API placeholder; connect to Feishu Kanban later.",

    ...extra,

  });

}



// ====== DEBUG：确认当?server / env ======

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

// ====== 定时提醒：每日表单 ======
app.get("/api/notify/daily", async (req, res) => {
  try {
    if (CRON_SECRET) {
      const header = String(req.headers.authorization || "");
      const token = header.toLowerCase().startsWith("bearer ")
        ? header.slice(7).trim()
        : "";
      if (!token || token !== CRON_SECRET) {
        return res.status(401).json({ success: false, error: "unauthorized" });
      }
    }

    const url = String(req.query.url || DAILY_FORM_URL || "").trim();
    if (!url) {
      return res.status(400).json({ success: false, error: "missing DAILY_FORM_URL" });
    }

    const title = String(req.query.title || "每日表单填写链接").trim();

    const openIds = DAILY_FORM_BD_OPEN_IDS.length
      ? DAILY_FORM_BD_OPEN_IDS
      : [
          "ou_a58586d5eae4171246d9514720e46db7",
          "ou_b89e947decf816f6f337f873358a52ec",
          "ou_f5dac90ed9608641db9db9fa39e2a0ec",
        ];

    let text = `${title}：${url}`;
    if (title.includes("提醒预览")) {
      text = `请点击链接中的"提醒预览"，查收需要跟进的项目提醒：${url}`;
    } else if (title.includes("每日表单")) {
      text = `请点击链接中的"每日表单"进行填写：${url}`;
    }
    const results = [];
    for (const openId of openIds) {
      try {
        const data = await sendMessageToUser(openId, text);
        results.push({ openId, success: true, data });
      } catch (e) {
        results.push({ openId, success: false, error: String(e) });
      }
    }

    res.json({ success: true, count: results.length, results });
  } catch (e) {
    console.error("GET /api/notify/daily failed:", e);
    res.status(500).json({ success: false, error: String(e) });
  }
});
// ====== UserProfile Config ======
app.get("/api/feishu/user-profile-config", async (req, res) => {
  try {
    const rawUrl = String(req.query.url || "").trim();
    let url = rawUrl;

    if (!url) {
      const referer = String(req.headers.referer || req.headers.referrer || "").trim();
      if (referer) {
        url = referer.split("#")[0].split("?")[0];
      }
    }

    if (!url) {
      const origin = String(req.headers.origin || "").trim();
      url = origin;
    }

    const appId = String(process.env.FEISHU_APP_ID || "").trim();
    const openId = getCurrentOpenId(req);
    const nonceStr = crypto.randomBytes(8).toString("hex");
    const timestamp = String(Date.now());

    const userAccessToken = getUserAccessToken(req);
    if (!userAccessToken) {
      // TODO: replace with real user_access_token from your login/session middleware.
      const signature = crypto
        .createHash("sha1")
        .update(`jsapi_ticket=mock&noncestr=${nonceStr}&timestamp=${timestamp}&url=${url}`)
        .digest("hex");

      return res.json({
        appId,
        openId,
        timestamp,
        nonceStr,
        signature,
        url,
        jsApiList: ["user_profile"],
        locale: "zh-CN",
        theme: "light",
      });
    }

    const jsapiTicket = await getJsapiTicket(userAccessToken);
    const string1 = `jsapi_ticket=${jsapiTicket}&noncestr=${nonceStr}&timestamp=${timestamp}&url=${url}`;
    const signature = crypto.createHash("sha1").update(string1).digest("hex");

    return res.json({
      appId,
      openId,
      timestamp,
      nonceStr,
      signature,
      url,
      jsApiList: ["user_profile"],
      locale: "zh-CN",
      theme: "light",
    });
  } catch (e) {
    console.error("GET /api/feishu/user-profile-config failed:", e);
    res.status(500).json({ error: String(e) });
  }
});



// ====== 读取客户 ======

app.get("/api/customers", async (req, res) => {

  try {

    const keyword = (req.query.keyword || "").toString().trim();

    const cacheKey = `customers:${keyword || "all"}`;
    const data = await withCache(cacheKey, API_CACHE_TTL_MS, () => getCustomers({ keyword }));

    res.json({ success: true, data });

  } catch (e) {

    console.error("GET /api/customers failed:", e);

    res.status(500).json({ success: false, error: String(e) });

  }

});



// ====== 写回飞书客户表（最稳：?field_id 写入，避免字段名空格/隐形字符?======

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



  // 2) 容错：忽略所有空白字符再匹配（解?“公司总部 地区?这种?
  const norm = (s) => String(s || "").replace(/\s+/g, "");

  const target = norm(expectedName);



  for (const [name, id] of fieldMap.entries()) {

    if (norm(name) === target) return id;

  }

  return null;

}




function normalizePersonName(name) {
  return String(name || "")
    .trim()
    .replace(/\s+/g, "");
}

function pickPersonId(personObj) {
  if (!personObj || typeof personObj !== "object") return "";
  return (
    personObj.id ||
    personObj.user_id ||
    personObj.open_id ||
    personObj.openId ||
    personObj.userId ||
    personObj?.value?.id ||
    personObj?.value?.user_id ||
    ""
  );
}

function getPersonIdMapFromEnv() {
  const raw = String(process.env.FEISHU_PERSON_ID_MAP || "").trim();
  const map = new Map();
  if (!raw) return map;

  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      parsed.forEach((item) => {
        const name = normalizePersonName(item?.name);
        const id = String(item?.id || "").trim();
        if (name && id) map.set(name, id);
      });
      return map;
    }
    if (parsed && typeof parsed === "object") {
      Object.entries(parsed).forEach(([name, id]) => {
        const key = normalizePersonName(name);
        const val = String(id || "").trim();
        if (key && val) map.set(key, val);
      });
      return map;
    }
  } catch {
    // fall through to csv parser
  }

  raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .forEach((pair) => {
      const [name, id] = pair.split(":").map((s) => s.trim());
      const key = normalizePersonName(name);
      const val = String(id || "").trim();
      if (key && val) map.set(key, val);
    });
  return map;
}

function readPersonIdMapFromEnv() {
  const map = getPersonIdMapFromEnv();
  return Array.from(map.entries()).map(([name, id]) => ({ name, id }));
}

async function resolvePersonFieldValue({ appToken, tableId, fieldName, input }) {
  if (input === undefined || input === null) return null;

  if (Array.isArray(input)) {
    const normalized = input.map((item) => {
      if (item && typeof item === "object") return { id: pickPersonId(item) || item.id };
      return null;
    });
    const valid = normalized.filter((item) => item?.id);
    if (valid.length) return valid;
  }

  if (typeof input === "object" && input !== null) {
    const id = pickPersonId(input);
    if (id) return [{ id }];
  }

  const target = normalizePersonName(input);
  if (!target) return null;

  const envMap = getPersonIdMapFromEnv();
  if (envMap.has(target)) return [{ id: envMap.get(target) }];

  const items = await listRecords({ appToken, tableId, pageSize: 200 });
  for (const it of items || []) {
    const v = it?.fields?.[fieldName];
    if (!Array.isArray(v)) continue;
    for (const personObj of v) {
      const name = normalizePersonName(personObj?.name);
      const id = pickPersonId(personObj);
      if (name && id && name === target) return [{ id }];
    }
  }

  return null;
}

async function getKnownPersonNames({ appToken, tableId, fieldName }) {
  const items = await listRecords({ appToken, tableId, pageSize: 200 });
  const names = new Set();
  for (const it of items || []) {
    const v = it?.fields?.[fieldName];
    if (!Array.isArray(v)) continue;
    for (const personObj of v) {
      const name = normalizePersonName(personObj?.name);
      if (name) names.add(name);
    }
  }
  return Array.from(names).sort((a, b) => a.localeCompare(b, "zh-CN"));
}

async function resolveCustomerBdField(ownerBd) {
  const target = normalizePersonName(ownerBd);
  if (!target) return { value: null, known: [] };

  const envMap = getPersonIdMapFromEnv();
  if (envMap.has(target)) {
    return { value: [{ id: envMap.get(target) }], known: Array.from(envMap.keys()) };
  }

  if (!PROJECT_APP_TOKEN || !PROJECT_TABLE_ID) {
    return { value: null, known: [] };
  }

  const value = await resolvePersonFieldValue({
    appToken: PROJECT_APP_TOKEN,
    tableId: PROJECT_TABLE_ID,
    fieldName: PROJECT_FIELD.bd,
    input: ownerBd,
  });

  const known = await getKnownPersonNames({
    appToken: PROJECT_APP_TOKEN,
    tableId: PROJECT_TABLE_ID,
    fieldName: PROJECT_FIELD.bd,
  });

  return { value, known };
}
app.post("/api/customers", async (req, res) => {

  try {
    console.log("🟦 POST /api/customers body:", req.body);

    const appToken = process.env.FEISHU_BITABLE_APP_TOKEN;

    const tableId = process.env.FEISHU_BITABLE_TABLE_ID;



    if (!appToken || !tableId) {

      return res.status(500).json({

        success: false,

        error: "?缺少 FEISHU_BITABLE_APP_TOKEN ?FEISHU_BITABLE_TABLE_ID",

      });

    }



    const body = req.body || {};



    const shortName = String(body.shortName || body.name || "").trim();

    const companyName = String(body.companyName || "").trim();



    if (!shortName) {

      return res.status(400).json({ success: false, error: "缺少 shortName / name" });

    }

    // 只写你飞书表里真实存在的字段名（UTF-8）
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

    // 人员字段（主BD负责人，type=11）：支持 user_id 或姓名（姓名将自动解析为 user_id）
    const ownerUserId = String(body.ownerUserId || "").trim();
    const ownerBd = String(body.ownerBd || "").trim();
    if (ownerUserId) {
      fields["主BD负责人"] = [{ id: ownerUserId }];
    } else if (ownerBd) {
      const { value: resolved, known } = await resolveCustomerBdField(ownerBd);
      if (!resolved) {
        return res.status(400).json({
          success: false,
          error: `无法解析人员字段 BD='${ownerBd}'（请确保该人员在飞书项目表里出现过一次，或配置 FEISHU_PERSON_ID_MAP）`,
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

      fields, // ?回传实际写入内容

    });

  } catch (e) {

    console.error("POST /api/customers failed:", e);

    return res.status(500).json({ success: false, error: String(e) });

  }

});



// ====== 更新飞书客户表（客户ID不可变）======

app.put("/api/customers/:customerId", async (req, res) => {

  try {
    console.log("🟧 PUT /api/customers body:", req.body, "customerId=", req.params.customerId);

    const appToken = process.env.FEISHU_BITABLE_APP_TOKEN;

    const tableId = process.env.FEISHU_BITABLE_TABLE_ID;



    if (!appToken || !tableId) {

      return res.status(500).json({

        success: false,

        error: "❌缺?FEISHU_BITABLE_APP_TOKEN ?FEISHU_BITABLE_TABLE_ID",

      });

    }



    const customerId = String(req.params.customerId || "").trim();

    if (!customerId) {

      return res.status(400).json({ success: false, error: "缺少 customerId" });

    }



    // 1) resolve record_id（优先当?record_id；否则按字段「客户ID」匹配）

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

    // 人员字段（主BD负责人，type=11）：支持 user_id 或姓名（姓名将自动解析为 user_id）
    const ownerUserId = String(body.ownerUserId || "").trim();

    const ownerBd = String(body.ownerBd || "").trim();

    if (ownerUserId) {

      fields["主BD负责人"] = [{ id: ownerUserId }];

    } else if (ownerBd) {

      const { value: resolved, known } = await resolveCustomerBdField(ownerBd);

      if (!resolved) {

        return res.status(400).json({

          success: false,

          error: `无法解析人员字段 BD='${ownerBd}'（请确保该人员在飞书项目表里出现过一次，或配置 FEISHU_PERSON_ID_MAP）`,

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



// ====== 项目表字段映?& helper ======

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

      return arr.join("?");

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

    const pad2 = (n) => String(n).padStart(2, "0");
    const formatLocal = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
    const formatUtc = (d) => `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;

    const num = Number(str);
    const isNum = !Number.isNaN(num);
    if (isNum) {
      // 只在可能是时间戳时再转，避免普通数字被误判
      const isMs = str.length >= 13 || num > 1e11;
      const isSec = str.length === 10 || (num >= 1e9 && num < 2e10);
      // Feishu 日期字段有时会以 Excel 序列号返回（天数），需特殊处理
      const isExcelSerial = num > 20000 && num < 60000; // roughly 1955-2070

      if (isMs || isSec) {
        const d = new Date(isMs ? num : num * 1000);
        if (!Number.isNaN(d.getTime())) return formatLocal(d);
      }

      if (isExcelSerial) {
        const base = Date.UTC(1899, 11, 30); // Excel 序列号起点（含 1900 闰年 bug 补偿）
        const d = new Date(base + num * 24 * 60 * 60 * 1000);
        if (!Number.isNaN(d.getTime())) return formatUtc(d);
      }

      // 小数字直接原样返回，避免误判
      return str;
    }

    if (/^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/.test(str)) {
      const [y, m, d] = str.replace(/\//g, "-").split("-");
      return `${y}-${pad2(m)}-${pad2(d)}`;
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

    month: f[PROJECT_FIELD.month] || f["所属月份"] || f.month || "",

    nextFollowDate: f[PROJECT_FIELD.nextFollowDate] || f.nextFollowDate || "",

    campaignName: f[PROJECT_FIELD.campaignName] || f.campaignName || "",

    deliverableName: f[PROJECT_FIELD.deliverableName] || f.deliverableName || "",

    expectedAmount: pickNumber(f[PROJECT_FIELD.expectedAmount] || f.expectedAmount),

    totalBdHours: pickNumber(f[PROJECT_FIELD.totalBdHours] || f.totalBdHours),

    lastUpdateDate:
      f[PROJECT_FIELD.lastUpdateDate] ||
      f["最近更新日期"] ||
      f["最新更新日期"] ||
      f.lastUpdateDate ||
      "",

  };



  Object.keys(result).forEach((k) => {

    const v = result[k];

    if (k === "expectedAmount" || k === "totalBdHours") return;

    if (k === "lastUpdateDate" || k === "nextFollowDate") {
      const normalized = normalizeAny(v);
      result[k] = formatDate(normalized);
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



    const projectsAll = await withCache("projects:all", API_CACHE_TTL_MS, async () => {
      const records = await listRecords({
        appToken: PROJECT_APP_TOKEN,
        tableId: PROJECT_TABLE_ID,
        pageSize: 200,
      });
      return (records || []).map((it) => mapProjectRecord(it));
    });

    let projects = projectsAll || [];



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

        error: "缺少项目?appToken/tableId",

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



    // ⚠️ 人员字段（BD/AM）：飞书需?list<object>，这里支持前端传“姓名字符串”并在项目表内自动解析成 id?
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

          error: `无法解析人员字段 BD='${String(body.bd)}'（请确保该人员在飞书表里出现过一次，或配?FEISHU_PERSON_ID_MAP）`,

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

          `无法解析人员字段 AM='${String(body.am)}'（请确保该人员在飞书表里出现过一次，或配?FEISHU_PERSON_ID_MAP）；已忽略该字段以避免写入失败。`

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

        error: "缺少项目?appToken/tableId",

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

    setField("totalBdHours", body.totalBdHours);

    setField("lastUpdateDate", body.lastUpdateDate);

    if (body.expectedAmount !== undefined && body.expectedAmount !== null && body.expectedAmount !== "") {

      const num = Number(body.expectedAmount);

      if (!Number.isNaN(num)) setField("expectedAmount", num);

    }



    // ⚠️ 人员字段（BD/AM）：飞书需?list<object>，这里支持前端传“姓名字符串”并在项目表内自动解析成 id?
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

          error: `无法解析人员字段 BD='${String(body.bd)}'（请确保该人员在飞书表里出现过一次，或配?FEISHU_PERSON_ID_MAP）`,

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

          `无法解析人员字段 AM='${String(body.am)}'（请确保该人员在飞书表里出现过一次，或配?FEISHU_PERSON_ID_MAP）；已忽略该字段以避免更新失败。`

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





// ====== 立项（Deals）======

const formatDateLoose = (v) => {

  if (v === null || v === undefined) return "";

  const str = String(v).trim();

  if (!str || str === "0") return "";

  const pad2 = (n) => String(n).padStart(2, "0");
  const formatLocal = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  const formatUtc = (d) => `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;

  const num = Number(str);
  const isNum = !Number.isNaN(num);

  if (isNum) {

    const isMs = str.length >= 13 || num > 1e11;

    const isSec = str.length === 10 || (num >= 1e9 && num < 2e10);

    const isExcelSerial = num > 20000 && num < 60000;

    if (isMs || isSec) {

      const d = new Date(isMs ? num : num * 1000);

      if (!Number.isNaN(d.getTime())) return formatLocal(d);

    }

    if (isExcelSerial) {

      const base = Date.UTC(1899, 11, 30);
      const d = new Date(base + num * 24 * 60 * 60 * 1000);

      if (!Number.isNaN(d.getTime())) return formatUtc(d);

    }

    return str;

  }

  if (/^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/.test(str)) {

    const [y, m, d] = str.replace(/\//g, "-").split("-");
    return `${y}-${pad2(m)}-${pad2(d)}`;

  }

  return str;
};

const DEAL_FIELD = {
  serialNo: "编号",
  dealId: "立项ID",
  projectId: "项目ID",
  customerId: "客户ID",
  month: "所属月份",
  projectName: "项目名称",
  startDate: "项目开始时间",
  endDate: "项目结束时间",
  belong: "归属",
  isFinished: "是否完结",
  signCompany: "签约公司主体",
  contractEntity: "合同主体",
  incomeWithTax: "含税收入",
  incomeWithoutTax: "不含税收入",
  estimatedCost: "预估成本",
  paidThirdPartyCost: "已付三方成本",
  receivedAmount: "已收金额",
  remainingReceivable: "剩余应收金额",
  firstPaymentDate: "预计首款时间",
  finalPaymentDate: "预计尾款时间",
  grossProfit: "毛利",
  grossMargin: "毛利率",
};

function mapDealRecord(it = {}) {
  const f = it.fields || {};
  const pickSingle = (v) => {
    if (Array.isArray(v)) return pickSingle(v[0]);
    if (typeof v === "object" && v !== null) {
      return v?.name ?? v?.text ?? v?.label ?? v?.value ?? v?.option_name ?? "";
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
      return arr.join(", ");
    }
    if (typeof v === "object" && v !== null) {
      return pickSingle(v);
    }
    return v ?? "";
  };

  const result = {
    serialNo: f[DEAL_FIELD.serialNo] || f.serialNo || "",
    dealId: f[DEAL_FIELD.dealId] || f.dealId || it.record_id || "",
    projectId: f[DEAL_FIELD.projectId] || f.projectId || "",
    customerId: f[DEAL_FIELD.customerId] || f.customerId || "",
    month: f[DEAL_FIELD.month] || f["所属年月"] || f.month || "",
    projectName: f[DEAL_FIELD.projectName] || f.projectName || "",
    startDate: f[DEAL_FIELD.startDate] || f["项目开始日期"] || f.startDate || "",
    endDate: f[DEAL_FIELD.endDate] || f["项目结束日期"] || f.endDate || "",
    belong: f[DEAL_FIELD.belong] || f["归属"] || f.belong || "",
    isFinished: f[DEAL_FIELD.isFinished] ?? f.isFinished ?? "",
    signCompany: f[DEAL_FIELD.signCompany] || f.signCompany || "",
    contractEntity: f[DEAL_FIELD.contractEntity] || f.contractEntity || "",
    incomeWithTax: pickNumber(f[DEAL_FIELD.incomeWithTax] || f.incomeWithTax),
    incomeWithoutTax: pickNumber(f[DEAL_FIELD.incomeWithoutTax] || f.incomeWithoutTax),
    estimatedCost: pickNumber(f[DEAL_FIELD.estimatedCost] || f.estimatedCost),
    paidThirdPartyCost: pickNumber(f[DEAL_FIELD.paidThirdPartyCost] || f.paidThirdPartyCost),
    receivedAmount: pickNumber(f[DEAL_FIELD.receivedAmount] || f.receivedAmount),
    remainingReceivable: pickNumber(f[DEAL_FIELD.remainingReceivable] || f.remainingReceivable),
    firstPaymentDate:
      f[DEAL_FIELD.firstPaymentDate] || f["预计首款日期"] || f.firstPaymentDate || "",
    finalPaymentDate:
      f[DEAL_FIELD.finalPaymentDate] || f["预计尾款日期"] || f.finalPaymentDate || "",
    grossProfit: pickNumber(f[DEAL_FIELD.grossProfit] || f.grossProfit),
    grossMargin: pickNumber(f[DEAL_FIELD.grossMargin] || f.grossMargin),
  };

  Object.keys(result).forEach((k) => {
    const v = result[k];
    if (
      k === "startDate" ||
      k === "endDate" ||
      k === "firstPaymentDate" ||
      k === "finalPaymentDate"
    ) {
      const normalized = normalizeAny(v);
      result[k] = formatDateLoose(normalized);
    } else if (k === "incomeWithTax" || k === "incomeWithoutTax" || k === "estimatedCost" || k === "paidThirdPartyCost" || k === "receivedAmount" || k === "remainingReceivable" || k === "grossProfit" || k === "grossMargin") {
      // already normalized
    } else {
      result[k] = normalizeAny(v);
    }
  });

  result.isFinished = normalizeAny(result.isFinished);
  return result;
}


async function findDealRecordIdByDealId(dealId) {
  const records = await listRecords({
    appToken: DEAL_APP_TOKEN,
    tableId: DEAL_TABLE_ID,
    pageSize: 200,
  });
  const hit = (records || []).find((it) => {
    const f = it.fields || {};
    const val = f[DEAL_FIELD.dealId] || f.dealId || f.id || it.record_id || "";
    return String(val).trim() == String(dealId).trim();
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



    const dealsAll = await withCache("deals:all", API_CACHE_TTL_MS, async () => {
      const records = await listRecords({
        appToken: DEAL_APP_TOKEN,
        tableId: DEAL_TABLE_ID,
        pageSize: 200,
      });
      return (records || []).map((it) => mapDealRecord(it));
    });

    let deals = dealsAll || [];



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



    const toUnixTs = (v) => {

      if (v === undefined || v === null) return undefined;

      if (typeof v === "number" && Number.isFinite(v)) return v < 1e11 ? v * 1000 : v;

      const s = String(v).trim();

      if (!s) return undefined;

      if (/^\d+$/.test(s)) {

        const num = Number(s);

        if (!Number.isFinite(num)) return undefined;

        return num < 1e11 ? num * 1000 : num;

      }

      const d = new Date(s.replace(/\//g, "-"));

      if (Number.isNaN(d.getTime())) return undefined;

      return d.getTime();

    };



    const items = await listFields({ appToken: DEAL_APP_TOKEN, tableId: DEAL_TABLE_ID });

    const fieldNames = new Set((items || []).map((f) => f.field_name));

    const warnings = [];



    

    const setIf = (name, value) => {

      const isEmptyString = typeof value === "string" && value.trim() === "";

      if (value === undefined || value === null || isEmptyString) return;

      if (!fieldNames.has(name)) {

        warnings.push(`field not found: ${name}`);

        return;

      }

      fields[name] = value;

    };





    setIf("立项ID", dealId);

    // 如果立项表没有“项目ID/项目名称”字段，以下两行会被忽略，不会写?
    setIf("项目ID", projectId);

    setIf("客户ID", customerId);

    // setIf("项目名称", String(body.projectName || "").trim());

    const monthVal = normalizeMonth(body.month);

    if (monthVal !== undefined) {
      setIf("所属月份", monthVal);
      setIf("所属年月", monthVal);
    }

    setIf("项目开始时间", toUnixTs(body.startDate));
    setIf("项目开始日期", toUnixTs(body.startDate));

    setIf("项目结束时间", toUnixTs(body.endDate));
    setIf("归属", body.belong);

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



    setIf("预计首款时间", toUnixTs(body.firstPaymentDate));

    setIf("预计尾款时间", toUnixTs(body.finalPaymentDate));



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



    return res.json({ success: true, record_id: recordId, data, fields, warnings });

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



    const toUnixTs = (v) => {

      if (v === undefined || v === null) return undefined;

      if (typeof v === "number" && Number.isFinite(v)) return v < 1e11 ? v * 1000 : v;

      const s = String(v).trim();

      if (!s) return undefined;

      if (/^\d+$/.test(s)) {

        const num = Number(s);

        if (!Number.isFinite(num)) return undefined;

        return num < 1e11 ? num * 1000 : num;

      }

      const d = new Date(s.replace(/\//g, "-"));

      if (Number.isNaN(d.getTime())) return undefined;

      return d.getTime();

    };



    const items = await listFields({ appToken: DEAL_APP_TOKEN, tableId: DEAL_TABLE_ID });

    const fieldNames = new Set((items || []).map((f) => f.field_name));

    const warnings = [];



    

    const setIf = (name, value) => {

      const isEmptyString = typeof value === "string" && value.trim() === "";

      if (value === undefined || value === null || isEmptyString) return;

      if (!fieldNames.has(name)) {

        warnings.push(`field not found: ${name}`);

        return;

      }

      fields[name] = value;

    };





    // 如果表里没有项目ID/名称字段，这些会被忽?
    setIf("项目ID", String(body.projectId || "").trim());

    setIf("客户ID", String(body.customerId || "").trim());

    // setIf("项目名称", String(body.projectName || "").trim());

    const monthVal = normalizeMonth(body.month);

    if (monthVal !== undefined) {
      setIf("所属月份", monthVal);
      setIf("所属年月", monthVal);
    }

    setIf("项目开始时间", toUnixTs(body.startDate));
    setIf("项目开始日期", toUnixTs(body.startDate));

    setIf("项目结束时间", toUnixTs(body.endDate));
    setIf("归属", body.belong);

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



    setIf("预计首款时间", toUnixTs(body.firstPaymentDate));

    setIf("预计尾款时间", toUnixTs(body.finalPaymentDate));



    console.log("🟧 PUT /api/deals fields:", fields, "recordId=", recordId);



    const data = await updateRecord({

      appToken: DEAL_APP_TOKEN,

      tableId: DEAL_TABLE_ID,

      recordId,

      fields,

    });



    return res.json({ success: true, record_id: recordId, data, fields, warnings });

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

// 用于解决“前端传姓名，但飞书 Person 字段需?user_id”的问题?
// 扫描项目表前 200 条记录里 BD/AM 字段出现过的人员对象，输?name -> id?
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

    const collect = (records, fieldName) => {

      const map = new Map();

      for (const it of records || []) {

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

    let customerBd = [];
    if (process.env.FEISHU_BITABLE_APP_TOKEN && process.env.FEISHU_BITABLE_TABLE_ID) {
      const customerItems = await listRecords({
        appToken: process.env.FEISHU_BITABLE_APP_TOKEN,
        tableId: process.env.FEISHU_BITABLE_TABLE_ID,
        pageSize: 200,
      });
      customerBd = collect(customerItems, "主BD负责人");
    }



    return res.json({

      success: true,

      data: {

        bd: collect(items, PROJECT_FIELD.bd),

        am: collect(items, PROJECT_FIELD.am),

        customer_bd: customerBd,

        env_map: readPersonIdMapFromEnv(),

      },

    });

  } catch (e) {

    console.error("GET /api/project-persons failed:", e);

    return res.status(500).json({ success: false, error: String(e) });

  }

});



// ====== 看板（Kanban）接口预?======

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



// ====== 仪表盘（Dashboard）嵌?======

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



if (process.env.VERCEL !== "1") {
  app.listen(PORT, () => {
    console.log(`?API server running at http://localhost:${PORT}`);
  });
}

export default app;


