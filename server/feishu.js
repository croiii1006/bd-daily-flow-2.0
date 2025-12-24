// server/feishu.js
console.log("✅ feishu.js loaded (VERSION = FEISHU_FINAL)");

let cachedToken = null;
let tokenExpireAt = 0;

// ========================
// 1) Token
// ========================
export async function getTenantAccessToken() {
  if (cachedToken && Date.now() < tokenExpireAt) return cachedToken;

  const appIdRaw = process.env.FEISHU_APP_ID ?? "";
  const appSecretRaw = process.env.FEISHU_APP_SECRET ?? "";

  const app_id = appIdRaw.trim();
  const app_secret = appSecretRaw.trim();

  // ✅ 关键排查：看看有没有隐藏空格/换行
  console.log("🔍 FEISHU_APP_ID len:", appIdRaw.length, "->", app_id.length);
  console.log("🔍 FEISHU_APP_SECRET len:", appSecretRaw.length, "->", app_secret.length);

  if (!app_id || !app_secret) {
    throw new Error("FEISHU_APP_ID / FEISHU_APP_SECRET 为空（trim 后为空）");
  }

  const res = await fetch(
    "https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal",
    {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({ app_id, app_secret }),
    }
  );

  const json = await res.json();
  if (json.code !== 0) {
    throw new Error("获取 tenant_access_token 失败：" + JSON.stringify(json));
  }

  cachedToken = json.tenant_access_token;
  tokenExpireAt = Date.now() + (json.expire - 60) * 1000;
  return cachedToken;
}


// 统一请求封装（带飞书错误抛出）
async function feishuFetch(url, { method = "GET", headers = {}, body } = {}) {
  const token = await getTenantAccessToken();

  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...headers,
    },
    body,
  });

  const json = await res.json().catch(() => ({}));

  // 飞书 open-api：成功一般 code=0
  if (json?.code !== 0) {
    throw new Error(
      `${method} ${url} failed: ${JSON.stringify(json)}`
    );
  }
  return json;
}

// ========================
// 2) Debug helpers
// ========================
export async function listTables({ appToken } = {}) {
  const at = appToken || process.env.FEISHU_BITABLE_APP_TOKEN;
  const url = `https://open.feishu.cn/open-apis/bitable/v1/apps/${at}/tables?page_size=200`;
  const json = await feishuFetch(url);
  return json.data?.items || [];
}

export async function listFields({ appToken, tableId }) {
  const at = appToken || process.env.FEISHU_BITABLE_APP_TOKEN;
  const tid = tableId || process.env.FEISHU_BITABLE_TABLE_ID;

  const url = `https://open.feishu.cn/open-apis/bitable/v1/apps/${at}/tables/${tid}/fields?page_size=200`;
  const json = await feishuFetch(url);
  return json.data?.items || [];
}

// ========================
// 4) Message
// ========================
export async function sendMessageToUser(openId, text) {
  const receiveId = String(openId || "").trim();
  if (!receiveId) throw new Error("sendMessageToUser: openId is required");
  const url = "https://open.feishu.cn/open-apis/im/v1/messages?receive_id_type=open_id";
  const body = {
    receive_id: receiveId,
    msg_type: "text",
    content: JSON.stringify({ text: String(text || "") }),
  };
  const json = await feishuFetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(body),
  });
  return json?.data || null;
}

// ========================
// 3) Read records
// ========================
export async function listRecords({
  appToken,
  tableId,
  pageSize = 200,
} = {}) {
  const at = appToken || process.env.FEISHU_BITABLE_APP_TOKEN;
  const tid = tableId || process.env.FEISHU_BITABLE_TABLE_ID;

  // 备注：如果记录 > 200，需要做分页（page_token）。先满足你现在 demo。
  const url = `https://open.feishu.cn/open-apis/bitable/v1/apps/${at}/tables/${tid}/records?page_size=${pageSize}`;
  const json = await feishuFetch(url);
  return json.data?.items || [];
}

/**
 * 你现有的 customers 映射（保持你原来的字段）
 * keyword：前端传来用于搜索
 */
export async function getCustomers({ keyword } = {}) {
  const items = await listRecords({
    appToken: process.env.FEISHU_BITABLE_APP_TOKEN,
    tableId: process.env.FEISHU_BITABLE_TABLE_ID,
    pageSize: 200,
  });

  const customers = items.map((it) => {
    const f = it.fields || {};

    return {
      id: f["客户ID"] ?? it.record_id,

      shortName: f["客户/部门简称"] || "",
      companyName: f["企业名称"] || "",
      hq: f["公司总部地区"] || "",

      customerType: f["客户类型"] || "",
      level: f["客户等级"] || "",
      industry: f["行业大类"] || "",
      cooperationStatus: f["合作状态"] || "",

      isAnnual: f["年框客户"] === true,

      owner:
        Array.isArray(f["主BD负责人"]) && f["主BD负责人"][0]
          ? f["主BD负责人"][0].name
          : "",

      relatedProjectIds:
        Array.isArray(f["项目日志表"]) && f["项目日志表"][0]
          ? f["项目日志表"][0].text_arr || []
          : Array.isArray(f["项目进度数据表1-客户ID"]) &&
            f["项目进度数据表1-客户ID"][0]
          ? f["项目进度数据表1-客户ID"][0].text_arr || []
          : [],
    };
  });

  if (keyword) {
    const k = String(keyword).toLowerCase();
    return customers.filter(
      (c) =>
        (c.shortName || "").toLowerCase().includes(k) ||
        (c.companyName || "").toLowerCase().includes(k)
    );
  }

  return customers;
}

// ========================
// 4) Write records (推荐 batch_create)
// ========================
/**
 * ✅ 推荐：批量新增（你在调试台成功的方式）
 * records: [{ fields: {...} }, ...]
 */
export async function batchCreateRecords({ appToken, tableId, records }) {
  const token = await getTenantAccessToken();

  const res = await fetch(
    `https://open.feishu.cn/open-apis/bitable/v1/apps/${appToken}/tables/${tableId}/records/batch_create`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify({ records }),
    }
  );

  const json = await res.json();
  if (json.code !== 0) {
    throw new Error(`batchCreateRecords failed: ${JSON.stringify(json)}`);
  }
  return json.data;
}

/**
 * 单条新增（保留，不推荐）
 */
export async function createRecord({ appToken, tableId, fields }) {
  const at = appToken || process.env.FEISHU_BITABLE_APP_TOKEN;
  const tid = tableId || process.env.FEISHU_BITABLE_TABLE_ID;

  const url = `https://open.feishu.cn/open-apis/bitable/v1/apps/${at}/tables/${tid}/records`;
  const json = await feishuFetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({ fields }),
  });

  return json.data;
}

/**
 * 更新记录
 */
export async function updateRecord({ appToken, tableId, recordId, fields }) {
  const at = appToken || process.env.FEISHU_BITABLE_APP_TOKEN;
  const tid = tableId || process.env.FEISHU_BITABLE_TABLE_ID;

  if (!recordId) throw new Error("updateRecord: recordId 必填");

  const url = `https://open.feishu.cn/open-apis/bitable/v1/apps/${at}/tables/${tid}/records/${recordId}`;
  const json = await feishuFetch(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({ fields }),
  });

  return json.data;
}

/**
 * 删除多条记录
 */
export async function deleteRecords({ appToken, tableId, recordIds }) {
  const at = appToken || process.env.FEISHU_BITABLE_APP_TOKEN;
  const tid = tableId || process.env.FEISHU_BITABLE_TABLE_ID;

  if (!Array.isArray(recordIds) || recordIds.length === 0) {
    throw new Error("deleteRecords: recordIds 不能为空数组");
  }

  const url = `https://open.feishu.cn/open-apis/bitable/v1/apps/${at}/tables/${tid}/records/batch_delete`;
  const json = await feishuFetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({ record_ids: recordIds }),
  });

  return json.data;
}

// ========================
// 5) Your business helpers (直接给你可用的“新增客户”)
// ========================
/**
 * 新增客户（按你表头字段写入）
 * 你前端只需要传：{ shortName: "xxx", ...可选 }
 */
export async function createCustomer({
  shortName,
  companyName = "",
  hq = "",
  customerType = "",
  level = "",
  cooperationStatus = "",
  industry = "",
  isAnnual = false,
} = {}) {
  if (!shortName) throw new Error("shortName is required");

  const appToken = process.env.FEISHU_BITABLE_APP_TOKEN;
  const tableId = process.env.FEISHU_BITABLE_TABLE_ID;

  const fields = {
    "客户/部门简称": shortName,
    "企业名称": companyName || "",
    "公司总部地区": hq || "",

    // 单选：先按“选项文本”写入（必须与表里选项完全一致）
    "客户类型": customerType || "",
    "客户等级": level || "",
    "合作状态": cooperationStatus || "",
    "行业大类": industry || "",

    // 勾选/布尔
    "年框客户": !!isAnnual,
  };

  // ✅ 把空字符串的单选字段删掉，避免单选字段校验失败（有些表不接受空）
  for (const k of ["客户类型", "客户等级", "合作状态", "行业大类"]) {
    if (!fields[k]) delete fields[k];
  }

  const data = await batchCreateRecords({
    appToken,
    tableId,
    records: [{ fields }],
  });

  return data;
}
export async function getRecordById({ appToken, tableId, recordId }) {
  const token = await getTenantAccessToken();

  const res = await fetch(
    `https://open.feishu.cn/open-apis/bitable/v1/apps/${appToken}/tables/${tableId}/records/${recordId}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  const json = await res.json();
  if (json.code !== 0) {
    throw new Error(`getRecordById failed: ${JSON.stringify(json)}`);
  }
  return json.data;
}

