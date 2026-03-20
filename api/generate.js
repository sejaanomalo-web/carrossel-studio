export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(req.body),
  })
  const data = await response.json()
  res.status(response.status).json(data)
}
```

Commit.

---

**2. Edite `src/App.jsx`**

Clique em `src` → `App.jsx` → ícone de lápis (editar).

Use **Ctrl+F** para encontrar:
```
https://api.anthropic.com/v1/messages
```

Substitua por:
```
/api/generate
