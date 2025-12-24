/// <reference types="vite/client" />

type FeishuUserProfileConfig = {
  appId: string;
  openId: string;
  timestamp: string;
  nonceStr: string;
  signature: string;
  jsApiList: ['user_profile'];
};

type FeishuWebComponent = {
  config?: (config: FeishuUserProfileConfig) => void;
  render?: (name: 'UserProfile', props: { openId: string }, mountNode: HTMLElement) => {
    unmount?: () => void;
  };
};

interface Window {
  webComponent?: FeishuWebComponent;
  __FEISHU_USER_PROFILE_CONFIG__?: FeishuUserProfileConfig;
}
