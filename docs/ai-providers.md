# AI Provider Registry

Last updated: March 2026

## Provider Cascade Order

1. Cerebras (primary)
2. Z.ai (first fallback)
3. Groq (second fallback)
4. Moonshot (last resort)

## Confirmed Working Models

### Cerebras

- Base URL: https://api.cerebras.ai/v1
- Env var: `CEREBRAS_API_KEY`
- Working model: `llama3.1-8b`
- Available models: `llama3.1-8b`, `gpt-oss-120b`
- Notes: `llama-3.3-70b` does NOT exist — returns 404

### Z.ai (Zhipu AI)

- Base URL: https://open.bigmodel.cn/api/paas/v4
- Env var: `ZAI_API_KEY`
- Working model: `GLM-4-32B-0414-128K` (non-reasoning, $0.10/M flat)
- Avoid: `GLM-4.7-Flash`, `GLM-4.5-Flash` — both are reasoning models that return empty content

### Groq

- Base URL: https://api.groq.com/openai/v1
- Env var: `GROQ_API_KEY`
- Working model: `llama-3.1-8b-instant`

### Moonshot

- Base URL: https://api.moonshot.ai/v1
- Env var: `MOONSHOT_API_KEY`
- Working model: `moonshot-v1-8k`

## Free Tier Limits

- **Cerebras**: 1M tokens/day free, 8K context on free tier
- **Z.ai**: `GLM-4-32B-0414-128K` is $0.10/M (not free but very cheap)
- **Groq**: Free tier with rate limits, no credit card required
- **Moonshot**: No free API tier, minimum $1 recharge to activate
