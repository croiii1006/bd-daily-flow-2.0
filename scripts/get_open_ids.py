#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import json
import os
import sys
import urllib.request
from pathlib import Path


def post_json(url, payload, headers=None):
    data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers=headers or {}, method="POST")
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode("utf-8"))


def load_env_from_file():
    env_path = Path(__file__).resolve().parents[1] / "server" / ".env"
    if not env_path.exists():
        return
    for line in env_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key and key not in os.environ:
            os.environ[key] = value


def main():
    load_env_from_file()
    app_id = os.environ.get("FEISHU_APP_ID", "").strip()
    app_secret = os.environ.get("FEISHU_APP_SECRET", "").strip()
    if not app_id or not app_secret:
        print("缺少 FEISHU_APP_ID / FEISHU_APP_SECRET 环境变量", file=sys.stderr)
        sys.exit(1)

    raw_mobiles = [
        "+86-18817233598",
        "+86-18976480533",
        "+86-18616516389",
    ]
    mobiles = []
    for m in raw_mobiles:
        cleaned = "".join(ch for ch in str(m) if ch.isdigit())
        if cleaned.startswith("86") and len(cleaned) > 11:
            cleaned = cleaned[2:]
        if cleaned:
            mobiles.append(cleaned)
    print("使用的手机号列表（11位）：", mobiles)

    token_resp = post_json(
        "https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal",
        {"app_id": app_id, "app_secret": app_secret},
        headers={"Content-Type": "application/json; charset=utf-8"},
    )
    if token_resp.get("code") != 0:
        print("获取 tenant_access_token 失败:", token_resp, file=sys.stderr)
        sys.exit(1)

    token = token_resp["tenant_access_token"]
    user_resp = post_json(
        "https://open.feishu.cn/open-apis/contact/v3/users/batch_get_id",
        {"mobile_list": mobiles, "user_id_type": "open_id"},
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json; charset=utf-8",
        },
    )
    if user_resp.get("code") != 0:
        print("批量获取 open_id 失败:", user_resp, file=sys.stderr)
        sys.exit(1)

    user_list = user_resp.get("data", {}).get("user_list", [])
    if not user_list:
        print("未返回用户列表，请检查手机号格式或权限。原始响应：")
        print(json.dumps(user_resp, ensure_ascii=False, indent=2))
        return
    print("open_id 结果：")
    for item in user_list:
        name = item.get("name") or ""
        mobile = item.get("mobile") or ""
        open_id = item.get("open_id") or ""
        print(f"- {name} {mobile} -> {open_id}")


if __name__ == "__main__":
    main()
