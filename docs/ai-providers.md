# AI Provider Registry

Last updated: March 2026

## Provider Cascade Order

1. Cerebras (primary)
2. Z.ai (first fallback)
3. Groq (second fallback)
4. Moonshot (last resort)

## Confirmed Working Models

### Cerebras (confirmed working)

- Base URL: https://api.cerebras.ai/v1
- Env var: `CEREBRAS_API_KEY`
- Working model: `llama3.1-8b`
- Available models: `llama3.1-8b`, `gpt-oss-120b`
- Notes: `llama-3.3-70b` does NOT exist — returns 404

### Z.ai (Zhipu AI) (confirmed working)

- Base URL: https://open.bigmodel.cn/api/paas/v4
- Env var: `ZAI_API_KEY`
- Working model: `glm-4.5-air` ($0.20/M in, $1.10/M out)
- Available models: `glm-4.5`, `glm-4.5-air`, `glm-4.6`, `glm-4.7`, `glm-5`
- **IMPORTANT**: All models default to reasoning mode which returns empty `content` and fills `reasoning_content` instead. You MUST pass `"thinking": {"type": "disabled"}` in the request body to get normal chat completions.
- Avoid: `GLM-4-32B-0414-128K` — does NOT exist (400 "model does not exist")

### Groq (confirmed working)

- Base URL: https://api.groq.com/openai/v1
- Env var: `GROQ_API_KEY`
- Working model: `llama-3.1-8b-instant`

### Moonshot (confirmed working)

- Base URL: https://api.moonshot.ai/v1
- Env var: `MOONSHOT_API_KEY`
- Working model: `moonshot-v1-8k`

## Free Tier Limits

- **Cerebras**: 1M tokens/day free, 8K context on free tier
- **Z.ai**: `glm-4.5-air` is $0.20/M in, $1.10/M out (cheap but not free)
- **Groq**: Free tier with rate limits, no credit card required
- **Moonshot**: No free API tier, minimum $1 recharge to activate
