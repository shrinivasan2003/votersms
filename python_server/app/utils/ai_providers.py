"""
Provider-agnostic AI call layer for Nadia AI.

Supported providers
-------------------
OpenAI-compatible (single code path via `openai` SDK):
  deepseek, openai, groq, mistral, together

Native SDK providers:
  anthropic  — uses `anthropic` SDK
  gemini     — uses `google-generativeai` SDK

New providers: add an entry to PROVIDER_REGISTRY. No other changes needed.
"""
from __future__ import annotations

import json
import re
from typing import Any

# ── Provider registry ─────────────────────────────────────────────────────────

PROVIDER_REGISTRY: dict[str, dict] = {
    "deepseek": {
        "label":    "DeepSeek",
        "base_url": "https://api.deepseek.com",
        "sdk":      "openai_compat",
        "models":   ["deepseek-chat", "deepseek-reasoner"],
    },
    "openai": {
        "label":    "OpenAI",
        "base_url": "https://api.openai.com/v1",
        "sdk":      "openai_compat",
        "models":   ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo"],
    },
    "groq": {
        "label":    "Groq",
        "base_url": "https://api.groq.com/openai/v1",
        "sdk":      "openai_compat",
        "models":   ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "mixtral-8x7b-32768"],
    },
    "mistral": {
        "label":    "Mistral AI",
        "base_url": "https://api.mistral.ai/v1",
        "sdk":      "openai_compat",
        "models":   ["mistral-large-latest", "mistral-small-latest", "open-mistral-7b"],
    },
    "together": {
        "label":    "Together AI",
        "base_url": "https://api.together.xyz/v1",
        "sdk":      "openai_compat",
        "models":   [
            "meta-llama/Llama-3.3-70B-Instruct-Turbo",
            "mistralai/Mixtral-8x7B-Instruct-v0.1",
            "Qwen/Qwen2.5-72B-Instruct-Turbo",
        ],
    },
    "anthropic": {
        "label":    "Anthropic",
        "base_url": "https://api.anthropic.com",
        "sdk":      "anthropic",
        "models":   ["claude-opus-4-5", "claude-sonnet-4-5", "claude-haiku-4-5"],
    },
    "gemini": {
        "label":    "Google Gemini",
        "base_url": "https://generativelanguage.googleapis.com",
        "sdk":      "gemini",
        "models":   ["gemini-1.5-pro", "gemini-1.5-flash", "gemini-2.0-flash"],
    },
}


def get_provider_info(provider_key: str) -> dict:
    """Return registry entry or raise ValueError."""
    info = PROVIDER_REGISTRY.get(provider_key.lower())
    if not info:
        raise ValueError(f"Unknown provider: {provider_key}")
    return info


# ── Prompt builder ─────────────────────────────────────────────────────────────

def build_email_prompt(context: str, variables: list[str], fmt: str) -> tuple[str, str]:
    """Return (system_prompt, user_prompt) for email generation."""
    var_list = ", ".join(variables) if variables else "{{FirstName}}, {{LastName}}, {{FullName}}"
    format_note = "The body must be valid HTML." if fmt == "HTML" else "The body must be plain text (no HTML tags)."

    system = (
        "You are Nadia AI, a professional email copywriter for a civic outreach platform.\n"
        "CRITICAL INSTRUCTION: Your entire response must be ONLY a valid JSON array. "
        "Do NOT write any introduction, explanation, commentary, or text outside the JSON.\n"
        "OUTPUT FORMAT — respond with exactly this structure and nothing else:\n"
        '[{"subject": "...", "body": "..."}, {"subject": "...", "body": "..."}]\n'
        "Rules:\n"
        "- Exactly 2 objects in the array\n"
        '- Each object must have "subject" (string) and "body" (string) keys\n'
        "- Use ONLY the variables provided by the user inside double curly braces\n"
        f"- {format_note}\n"
        "- No markdown code fences, no leading/trailing text — raw JSON array only"
    )

    user = (
        f"Available template variables: {var_list}\n\n"
        f"Email purpose:\n{context}\n\n"
        "Output the JSON array of 2 email variations now:"
    )
    return system, user


# ── Response parser ────────────────────────────────────────────────────────────

def _parse_variations(raw: str) -> list[dict]:
    """
    Robustly extract a JSON array from the LLM response.

    Handles all common model misbehaviours:
      - Markdown fences (```json … ```)
      - Preamble text before the array  ("Here are two variations: [...]")
      - Postamble text after the array
      - Single-object responses (wrapped into a list)
    """
    raw = raw.strip()

    # 1. Strip markdown code fences
    raw = re.sub(r"^```(?:json)?\s*", "", raw, flags=re.IGNORECASE)
    raw = re.sub(r"\s*```\s*$", "", raw)
    raw = raw.strip()

    # 2. Try direct parse first (happy path)
    try:
        data = json.loads(raw)
        return _extract_items(data)
    except json.JSONDecodeError:
        pass

    # 3. Find the first JSON array anywhere in the text
    match = re.search(r"\[.*\]", raw, re.DOTALL)
    if match:
        try:
            data = json.loads(match.group(0))
            return _extract_items(data)
        except json.JSONDecodeError:
            pass

    # 4. Find a single JSON object and wrap it
    match = re.search(r"\{.*\}", raw, re.DOTALL)
    if match:
        try:
            data = json.loads(match.group(0))
            if isinstance(data, dict):
                return _extract_items([data])
        except json.JSONDecodeError:
            pass

    raise ValueError(
        "The AI provider did not return a valid JSON response. "
        "Please try again — if the problem persists, try a different model."
    )


def _extract_items(data: Any) -> list[dict]:
    """Validate and normalise the parsed JSON into a list of {subject, body} dicts."""
    if isinstance(data, dict):
        data = [data]
    if not isinstance(data, list) or len(data) < 1:
        raise ValueError("Expected a JSON array with at least 1 item")
    result = []
    for item in data[:2]:
        if not isinstance(item, dict):
            continue
        subject = str(item.get("subject", "")).strip()
        body    = str(item.get("body", "")).strip()
        if subject or body:
            result.append({"subject": subject, "body": body})
    if not result:
        raise ValueError("No valid email variations found in the AI response")
    return result


# ── Caller: OpenAI-compatible ─────────────────────────────────────────────────

def _call_openai_compat(api_key: str, base_url: str, model: str, system: str, user: str) -> tuple[list[dict], dict]:
    try:
        from openai import OpenAI
    except ImportError as exc:
        raise RuntimeError("openai package is not installed. Run: pip install openai") from exc

    client = OpenAI(api_key=api_key, base_url=base_url)
    response = client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system",  "content": system},
            {"role": "user",    "content": user},
        ],
        temperature=0.75,
        max_tokens=2048,
    )
    raw = response.choices[0].message.content or ""
    usage = {
        "prompt_tokens":     getattr(response.usage, "prompt_tokens", 0),
        "completion_tokens": getattr(response.usage, "completion_tokens", 0),
        "total_tokens":      getattr(response.usage, "total_tokens", 0),
    }
    return _parse_variations(raw), usage


# ── Caller: Anthropic ────────────────────────────────────────────────────────

def _call_anthropic(api_key: str, model: str, system: str, user: str) -> tuple[list[dict], dict]:
    try:
        import anthropic
    except ImportError as exc:
        raise RuntimeError("anthropic package is not installed. Run: pip install anthropic") from exc

    client = anthropic.Anthropic(api_key=api_key)
    response = client.messages.create(
        model=model,
        max_tokens=2048,
        system=system,
        messages=[{"role": "user", "content": user}],
        temperature=0.75,
    )
    raw = response.content[0].text if response.content else ""
    usage = {
        "prompt_tokens":     getattr(response.usage, "input_tokens", 0),
        "completion_tokens": getattr(response.usage, "output_tokens", 0),
        "total_tokens":      getattr(response.usage, "input_tokens", 0) + getattr(response.usage, "output_tokens", 0),
    }
    return _parse_variations(raw), usage


# ── Caller: Google Gemini ────────────────────────────────────────────────────

def _call_gemini(api_key: str, model: str, system: str, user: str) -> tuple[list[dict], dict]:
    try:
        import google.generativeai as genai
    except ImportError as exc:
        raise RuntimeError(
            "google-generativeai package is not installed. Run: pip install google-generativeai"
        ) from exc

    genai.configure(api_key=api_key)
    gemini_model = genai.GenerativeModel(
        model_name=model,
        system_instruction=system,
    )
    response = gemini_model.generate_content(user)
    raw = response.text or ""
    # Gemini token counts (may be None on some responses)
    pt = getattr(getattr(response, "usage_metadata", None), "prompt_token_count", 0) or 0
    ct = getattr(getattr(response, "usage_metadata", None), "candidates_token_count", 0) or 0
    usage = {
        "prompt_tokens":     pt,
        "completion_tokens": ct,
        "total_tokens":      pt + ct,
    }
    return _parse_variations(raw), usage


# ── Public entry point ────────────────────────────────────────────────────────

def generate_email_variations(
    provider: str,
    api_key: str,
    model: str,
    context: str,
    variables: list[str],
    fmt: str = "Plain Text",
) -> tuple[list[dict[str, Any]], dict[str, int]]:
    """
    Call the configured AI provider and return:
      - list of {subject, body} dicts (1–2 items)
      - usage dict {prompt_tokens, completion_tokens, total_tokens}
    """
    info = get_provider_info(provider)
    system, user = build_email_prompt(context, variables, fmt)

    if info["sdk"] == "openai_compat":
        return _call_openai_compat(api_key, info["base_url"], model, system, user)
    if info["sdk"] == "anthropic":
        return _call_anthropic(api_key, model, system, user)
    if info["sdk"] == "gemini":
        return _call_gemini(api_key, model, system, user)

    raise ValueError(f"No caller implemented for sdk type: {info['sdk']}")


def validate_config(provider: str, api_key: str, model: str) -> None:
    """
    Make a minimal test call to verify the key and model are valid.
    Raises an exception with a descriptive message on failure.
    """
    info = get_provider_info(provider)
    test_system = "Reply only with the word: OK"
    test_user   = "Are you ready?"

    if info["sdk"] == "openai_compat":
        try:
            from openai import OpenAI
        except ImportError as exc:
            raise RuntimeError("openai package not installed") from exc
        client = OpenAI(api_key=api_key, base_url=info["base_url"])
        client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": test_user}],
            max_tokens=5,
        )

    elif info["sdk"] == "anthropic":
        try:
            import anthropic
        except ImportError as exc:
            raise RuntimeError("anthropic package not installed") from exc
        client = anthropic.Anthropic(api_key=api_key)
        client.messages.create(
            model=model,
            max_tokens=5,
            system=test_system,
            messages=[{"role": "user", "content": test_user}],
        )

    elif info["sdk"] == "gemini":
        try:
            import google.generativeai as genai
        except ImportError as exc:
            raise RuntimeError("google-generativeai package not installed") from exc
        genai.configure(api_key=api_key)
        genai.GenerativeModel(model_name=model).generate_content(test_user)
