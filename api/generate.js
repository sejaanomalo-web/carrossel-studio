module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).end()

  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'GROQ_API_KEY não configurada' })

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body

    // Troca modelo para Groq
    const groqBody = {
      ...body,
      model: 'llama-3.3-70b-versatile',
    }

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        max_tokens: 1000,
        messages: body.messages,
      }),
    })

    const data = await response.json()

    // Adapta resposta do Groq para o formato Anthropic que o app espera
    const text = data.choices?.[0]?.message?.content || ''
    return res.status(200).json({
      content: [{ type: 'text', text }]
    })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
