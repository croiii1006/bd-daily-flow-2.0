export type UserProfileConfig = {
  appId: string;
  openId: string;
  timestamp: string;
  nonceStr: string;
  signature: string;
  jsApiList: ['user_profile'];
};

type UserProfileComponent = {
  unmount?: () => void;
};

let configured = false;
let configInFlight = false;
let lastConfigAt = 0;

export function initUserProfileConfig(config?: UserProfileConfig): boolean {
  if (configured) return true;
  if (!config) return false;
  if (!window.webComponent?.config) return false;
  const result = window.webComponent.config({
    appId: config.appId,
    openId: config.openId,
    timestamp: config.timestamp,
    nonceStr: config.nonceStr,
    signature: config.signature,
    jsApiList: ['user_profile'],
  });
  if (result && typeof (result as Promise<void>).then === "function") {
    (result as Promise<void>)
      .then(() => {
        configured = true;
      })
      .catch(() => {});
  } else {
    configured = true;
  }
  return true;
}

export function initUserProfileFromWindow(): boolean {
  return initUserProfileConfig(window.__FEISHU_USER_PROFILE_CONFIG__);
}

async function applyUserProfileConfig(config: UserProfileConfig): Promise<boolean> {
  if (configured) return true;
  if (!window.webComponent?.config) return false;
  const result = window.webComponent.config({
    appId: config.appId,
    openId: config.openId,
    timestamp: config.timestamp,
    nonceStr: config.nonceStr,
    signature: config.signature,
    jsApiList: ["user_profile"],
  });
  if (result && typeof (result as Promise<void>).then === "function") {
    await result;
  }
  configured = true;
  return true;
}

async function waitForWebComponent(timeoutMs = 5000, intervalMs = 200): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (window.webComponent?.config) return true;
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  return false;
}

export async function loadUserProfileConfig(configUrl?: string): Promise<boolean> {
  // 必须先注入 config 并完成鉴权：UserProfile 组件只在鉴权成功后才能渲染，
  // 且 signature 只能使用一次（有效期约 10 分钟），所以这里集中处理并避免重复 config。
  if (configured) return true;
  if (configInFlight) return false;
  configInFlight = true;

  if (window.__FEISHU_USER_PROFILE_CONFIG__) {
    const ready = await waitForWebComponent();
    if (!ready) {
      console.error("[UserProfile] webComponent not ready");
      configInFlight = false;
      return false;
    }
    const ok = await applyUserProfileConfig(window.__FEISHU_USER_PROFILE_CONFIG__);
    if (ok) lastConfigAt = Date.now();
    configInFlight = false;
    return ok;
  }

  const cleanUrl = `${window.location.origin}${window.location.pathname}`;
  const baseUrl =
    configUrl ||
    (import.meta as any).env?.VITE_FEISHU_USER_PROFILE_CONFIG_URL ||
    "/api/feishu/user-profile-config";
  const url = baseUrl.includes("url=")
    ? baseUrl
    : `${baseUrl}${baseUrl.includes("?") ? "&" : "?"}url=${encodeURIComponent(cleanUrl)}`;

  try {
    const res = await fetch(url, { credentials: "include" });
    if (!res.ok) {
      console.error("[UserProfile] config fetch failed:", res.status);
      configInFlight = false;
      return false;
    }
    const data = await res.json().catch(() => null);
    const config = data?.config || data;
    if (!config) {
      console.error("[UserProfile] empty config response");
      configInFlight = false;
      return false;
    }
    window.__FEISHU_USER_PROFILE_CONFIG__ = config as UserProfileConfig;
    const ready = await waitForWebComponent();
    if (!ready) {
      console.error("[UserProfile] webComponent not ready");
      configInFlight = false;
      return false;
    }
    const ok = await applyUserProfileConfig(config as UserProfileConfig);
    if (ok) lastConfigAt = Date.now();
    configInFlight = false;
    return ok;
  } catch (error) {
    console.error("[UserProfile] load config error:", error);
    configInFlight = false;
    return false;
  }
}

export function renderUserProfile(openId: string, mountNode: HTMLElement): UserProfileComponent | null {
  if (!window.webComponent?.render) return null;
  return window.webComponent.render('UserProfile', { openId }, mountNode) as UserProfileComponent;
}
