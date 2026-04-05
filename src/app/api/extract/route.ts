import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(request: NextRequest) {
  try {
    const { text, apiKey } = await request.json()
    if (!text?.trim()) return NextResponse.json({ error: 'No text provided' }, { status: 400 })

    // Use user's key if provided, fall back to env var
    const key = apiKey || process.env.ANTHROPIC_API_KEY
    if (!key) return NextResponse.json({ 
      error: 'No API key configured. Add your Anthropic API key in Settings to use AI extraction.' 
    }, { status: 400 })

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        messages: [{
          role: 'user',
          content: `You are a data extraction assistant for a game project management tool called Codex. Extract structured data from the following game project documents.

Return ONLY a valid JSON object with these exact fields (omit any field if not found):

{
  "projectName": "string",
  "genre": "shooter|rpg|strategy|narrative|platformer|puzzle|simulation|horror|blank",
  "gdd": {
    "premise": "string",
    "coreMechanics": "string",
    "playerFantasy": "string",
    "setting": "string",
    "progression": "string",
    "market": "string",
    "tech": "string",
    "scope": "string"
  },
  "decisions": [{"section": "string", "chose": "string", "rejected": "string"}],
  "tasks": [{"text": "string", "period": "daily|weekly|monthly|yearly", "priority": "high|medium|low"}],
  "milestones": [{"name": "string", "status": "planned|active|done", "progress": 0, "target_date": "string"}],
  "features": [{"name": "string", "note": "string", "status": "planned|active|done|cut"}],
  "risks": [{"name": "string", "severity": "high|medium|low", "note": "string", "mitigation": "string"}],
  "costs": [{"name": "string", "category": "string", "amount": 0, "cost_type": "monthly|one-time"}],
  "fundingTarget": 0
}

Return ONLY the JSON object. No explanation, no markdown, no code blocks.

DOCUMENTS:
${text}`
        }]
      })
    })

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: { message: response.statusText } }))
      const msg = err?.error?.message || response.statusText
      return NextResponse.json({ error: `AI error: ${msg}` }, { status: 500 })
    }

    const data = await response.json()
    const content = data.content?.[0]?.text || ''
    const clean = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const parsed = JSON.parse(clean)
    return NextResponse.json({ data: parsed })

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
