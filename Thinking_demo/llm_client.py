# -*- coding: utf-8 -*-
"""可选的 OpenAI 兼容 LLM 客户端。

在线模式下，可对接：
  - 任意 OpenAI 兼容 API（设置 OPENAI_API_KEY / OPENAI_BASE_URL / OPENAI_MODEL）
  - Qwen / DeepSeek / Moonshot 等国内厂商的 OpenAI 兼容端点
  - 本地 Ollama（默认 http://localhost:11434/v1，模型如 qwen2.5:7b）

若未配置任何环境变量，则视为离线，永远使用脚本模式。
"""
from __future__ import annotations

import os
from typing import Optional

import httpx


def _env(name: str, default: Optional[str] = None) -> Optional[str]:
    val = os.environ.get(name)
    if val is None or val == "":
        return default
    return val


class LLMConfig:
    base_url: str
    api_key: str
    model: str
    timeout: float

    def __init__(self) -> None:
        self.base_url = _env("OPENAI_BASE_URL", "https://api.openai.com/v1").rstrip("/")
        self.api_key = _env("OPENAI_API_KEY", "")
        self.model = _env("OPENAI_MODEL", "gpt-4o-mini")
        self.timeout = float(_env("OPENAI_TIMEOUT", "30"))

    @property
    def available(self) -> bool:
        # Ollama 本地不需要 api_key；其他端点需要
        if "localhost" in self.base_url or "127.0.0.1" in self.base_url:
            return True
        return bool(self.api_key)


def chat_complete(messages: list[dict], temperature: float = 0.7,
                  max_tokens: int = 256) -> str:
    """简单的同步 chat completion 调用，返回 assistant 内容。

    `messages` 是 OpenAI chat 格式 `[{"role": "system"|"user"|"assistant", "content": "..."}]`
    """
    cfg = LLMConfig()
    if not cfg.available:
        raise RuntimeError("LLM 未配置：请设置 OPENAI_API_KEY (或使用本地 Ollama)")

    url = f"{cfg.base_url}/chat/completions"
    headers = {"Content-Type": "application/json"}
    if cfg.api_key:
        headers["Authorization"] = f"Bearer {cfg.api_key}"

    payload = {
        "model": cfg.model,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
    }

    with httpx.Client(timeout=cfg.timeout) as client:
        resp = client.post(url, headers=headers, json=payload)
        resp.raise_for_status()
        data = resp.json()
        return data["choices"][0]["message"]["content"].strip()


def llm_status() -> dict:
    cfg = LLMConfig()
    return {
        "available": cfg.available,
        "base_url": cfg.base_url,
        "model": cfg.model,
        "has_key": bool(cfg.api_key),
    }
