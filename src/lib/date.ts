const pad2 = (value: number | string) => String(value).padStart(2, "0");

const formatYmdParts = (year: number | string, month: number | string, day: number | string) =>
  `${year}-${pad2(month)}-${pad2(day)}`;

const formatYmd = (date: Date) =>
  formatYmdParts(date.getFullYear(), date.getMonth() + 1, date.getDate());

// 飞书时间戳/日期字符串的兜底展示格式化
export const formatDateSafe = (value: unknown): string => {
  if (value === null || value === undefined) return "";

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return "";
    return formatYmd(value);
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return formatYmd(date);
  }

  if (typeof value !== "string") return "";

  const raw = value.trim();
  if (!raw) return "";

  if (/^\d{13}$/.test(raw)) {
    const num = Number(raw);
    if (!Number.isFinite(num)) return "";
    const date = new Date(num);
    if (Number.isNaN(date.getTime())) return "";
    return formatYmd(date);
  }

  const simpleMatch = raw.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
  if (simpleMatch) {
    return formatYmdParts(simpleMatch[1], simpleMatch[2], simpleMatch[3]);
  }

  let normalized = raw.replace(/[./]/g, "-");
  if (/^\d{4}-\d{1,2}-\d{1,2}\s+\d/.test(normalized)) {
    normalized = normalized.replace(" ", "T");
  }

  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return raw;
  return formatYmd(date);
};
