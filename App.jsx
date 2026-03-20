import { useState, useRef } from 'react'
import { zipSync, strToU8 } from 'fflate'

const BRANDS = {
  anomalo: {
    name: 'Anômalo Hub',
    color: '#C8FF00',
    description: 'Conteúdo sobre negócios, empreendedorismo, tecnologia e comportamento. Linguagem direta, provocativa, voltada para fundadores e profissionais ambiciosos.',
    topics: ['empreendedorismo', 'negócios', 'mindset', 'tecnologia', 'liderança', 'comportamento'],
  },
  f2sports: {
    name: 'F2 Sports',
    color: '#FF3C3C',
    description: 'Conteúdo sobre esporte, competição, atletas e mentalidade vencedora. Linguagem intensa, motivacional, voltada para fãs de esporte e atletas.',
    topics: ['futebol', 'basquete', 'tênis', 'atletismo', 'competição', 'mentalidade esportiva'],
  },
}

const TEMPLATES = ['TEMPLATE ALTERNATIVO', 'TEMPLATE MKT INSIDER', 'TEMPLATE TWITTER']

async function loadImageFromUrl(url) {
  const proxies = [
    `https://wsrv.nl/?url=${encodeURIComponent(url)}&output=jpg&q=90`,
    `https://images.weserv.nl/?url=${encodeURIComponent(url)}&output=jpg&q=90`,
    url,
  ]
  for (const src of proxies) {
    try {
      const dataUrl = await new Promise((resolve, reject) => {
        const img = new Image()
        img.crossOrigin = 'anonymous'
        img.onload = () => {
          const canvas = document.createElement('canvas')
          canvas.width = img.naturalWidth || 1080
          canvas.height = img.naturalHeight || 1080
          canvas.getContext('2d').drawImage(img, 0, 0)
          const d = canvas.toDataURL('image/jpeg', 0.92)
          d.length > 2000 ? resolve(d) : reject()
        }
        img.onerror = reject
        img.src = src
      })
      return dataUrl
    } catch { /* try next */ }
  }
  throw new Error('falhou')
}

function dataUrlToBytes(dataUrl) {
  const bin = atob(dataUrl.split(',')[1])
  const arr = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i)
  return arr
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename
  document.body.appendChild(a); a.click()
  setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url) }, 500)
}

function ImageZone({ slideNum, brandColor, person, query, onImageSet }) {
  const [image, setImage] = useState(null)
  const [url, setUrl] = useState('')
  const [loadingUrl, setLoadingUrl] = useState(false)
  const [urlError, setUrlError] = useState('')
  const [dragging, setDragging] = useState(false)
  const fileRef = useRef()

  function applyImage(dataUrl, name) {
    const d = { dataUrl, name: name || `img-${slideNum}.jpg` }
    setImage(d); onImageSet(slideNum, d); setUrlError(''); setUrl('')
  }

  function handleFile(file) {
    if (!file || !file.type.startsWith('image/')) return
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
    const reader = new FileReader()
    reader.onload = e => applyImage(e.target.result, `img-${slideNum}.${ext}`)
    reader.readAsDataURL(file)
  }

  function handleDrop(e) {
    e.preventDefault(); setDragging(false)
    const imgUrl = e.dataTransfer.getData('text/uri-list') || e.dataTransfer.getData('text/plain')
    if (imgUrl?.startsWith('http')) { setUrl(imgUrl); doLoadUrl(imgUrl); return }
    handleFile(e.dataTransfer.files?.[0])
  }

  function handlePaste(e) {
    for (const item of (e.clipboardData?.items || [])) {
      if (item.type.startsWith('image/')) { handleFile(item.getAsFile()); return }
    }
    const text = e.clipboardData.getData('text/plain')
    if (text?.startsWith('http')) setUrl(text)
  }

  async function doLoadUrl(target) {
    const u = (target || url).trim()
    if (!u) return
    setLoadingUrl(true); setUrlError('')
    try {
      applyImage(await loadImageFromUrl(u), `img-${slideNum}.jpg`)
    } catch {
      setUrlError('Não carregou pela URL. Baixe a imagem e arraste aqui, ou Ctrl+V.')
    } finally { setLoadingUrl(false) }
  }

  const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}&tbm=isch&tbs=isz:l,itp:photo`

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
      <div
        onDrop={handleDrop}
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onPaste={handlePaste}
        tabIndex={0}
        onClick={() => !image && fileRef.current?.click()}
        style={{
          position: 'relative', borderRadius: 8, overflow: 'hidden',
          border: `1.5px dashed ${dragging ? brandColor : image ? '#222' : '#1c1c1c'}`,
          background: dragging ? `${brandColor}08` : image ? '#0d0d0d' : '#101010',
          minHeight: image ? 150 : 88,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: image ? 'default' : 'pointer', outline: 'none', transition: 'all 0.15s',
        }}
      >
        {image ? (
          <>
            <img src={image.dataUrl} alt="" style={{ width: '100%', height: 150, objectFit: 'cover', display: 'block' }} />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.88) 0%, transparent 50%)', display: 'flex', alignItems: 'flex-end', padding: '9px 11px', gap: 7 }}>
              <span style={{ flex: 1, fontSize: 10, color: '#999', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>✓ {image.name}</span>
              <button onClick={e => { e.stopPropagation(); setImage(null); onImageSet(slideNum, null) }}
                style={{ fontSize: 10, padding: '3px 8px', borderRadius: 4, border: '1px solid #555', background: 'rgba(0,0,0,0.75)', color: '#bbb', cursor: 'pointer' }}>
                Trocar
              </button>
            </div>
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: 14, pointerEvents: 'none' }}>
            <div style={{ fontSize: 22, marginBottom: 5 }}>📷</div>
            <div style={{ fontSize: 11, color: '#383838', lineHeight: 1.5 }}>
              <span style={{ color: brandColor }}>Arraste</span>, Ctrl+V ou clique
            </div>
            <div style={{ fontSize: 10, color: '#252525', marginTop: 2 }}>{person}</div>
          </div>
        )}
      </div>
      <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handleFile(e.target.files?.[0])} />
      <div style={{ display: 'flex', gap: 6 }}>
        <a href={googleUrl} target="_blank" rel="noreferrer" style={{ flexShrink: 0, padding: '7px 11px', borderRadius: 6, fontSize: 11, fontWeight: 700, background: `${brandColor}12`, color: brandColor, border: `1px solid ${brandColor}28`, textDecoration: 'none', whiteSpace: 'nowrap' }}>
          🔍 Google
        </a>
        <input
          value={url}
          onChange={e => { setUrl(e.target.value); setUrlError('') }}
          onKeyDown={e => e.key === 'Enter' && doLoadUrl()}
          placeholder="Cole URL da imagem + Enter..."
          style={{ flex: 1, padding: '7px 10px', borderRadius: 6, border: `1px solid ${urlError ? '#ff3c3c44' : '#1c1c1c'}`, background: '#101010', color: '#bbb', fontSize: 11, fontFamily: 'inherit', outline: 'none' }}
        />
        <button onClick={() => doLoadUrl()} disabled={loadingUrl || !url.trim()}
          style={{ flexShrink: 0, padding: '7px 12px', borderRadius: 6, border: '1px solid #1c1c1c', background: '#141414', color: loadingUrl ? '#2a2a2a' : '#666', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', minWidth: 60 }}>
          {loadingUrl ? '···' : '↵'}
        </button>
      </div>
      {urlError && <div style={{ fontSize: 10, color: '#cc4444', lineHeight: 1.4 }}>⚠ {urlError}</div>}
    </div>
  )
}

export default function App() {
  const [brand, setBrand] = useState('anomalo')
  const [theme, setTheme] = useState('')
  const [slideCount, setSlideCount] = useState(7)
  const [template, setTemplate] = useState('TEMPLATE ALTERNATIVO')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [images, setImages] = useState({})
  const [edits, setEdits] = useState({})
  const [zipping, setZipping] = useState(false)
  const [step, setStep] = useState('form')

  const b = BRANDS[brand]
  const c = b.color

  function handleImageSet(num, data) {
    setImages(p => { const n = { ...p }; data ? (n[num] = data) : delete n[num]; return n })
  }
  function setEdit(num, field, val) { setEdits(p => ({ ...p, [`${num}_${field}`]: val })) }
  function getVal(num, field, fallback) {
    const k = `${num}_${field}`
    return edits[k] !== undefined ? edits[k] : (fallback || '')
  }

  async function generate() {
    if (!theme.trim()) return
    setLoading(true); setResult(null); setError(null); setImages({}); setEdits({})
    const prompt = `Você é especialista em carrosséis para Instagram.
Marca: ${b.name} — ${b.description}
Temas: ${b.topics.join(', ')}
TEMA: "${theme}"
SLIDES: ${slideCount} (inclui capa e CTA)
Para cada slide sugira UMA pessoa famosa diferente (ator, atleta, empresário, CEO, artista, jogador) cuja foto reforce a mensagem. Priorize pessoas muito reconhecidas e em alta.
Responda SOMENTE JSON válido sem texto antes/depois:
{"titulo_carrossel":"...","hook":"...","slides":[{"numero":1,"tipo":"capa","titulo":"máx 7 palavras","subtitulo":"máx 12 palavras","pessoa":"Nome Completo","motivo_pessoa":"1 frase","query_google":"Nome high resolution photo 2024","query_alt":"Nome official press photo"}],"hashtags":["t1","t2","t3","t4","t5"]}
Regras: slide 1=capa, último=cta, pessoa diferente em cada slide, queries em inglês.`
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 1000, messages: [{ role: 'user', content: prompt }] }),
      })
      const data = await res.json()
      const text = (data.content || []).map(i => i.text || '').join('')
      const parsed = JSON.parse(text.replace(/```json|```/g, '').trim())
      setResult(parsed); setStep('result')
    } catch { setError('Erro ao gerar roteiro. Tente novamente.') }
    finally { setLoading(false) }
  }

  function buildJson() {
    if (!result) return {}
    return {
      template,
      titulo_carrossel: result.titulo_carrossel,
      hook: result.hook,
      slides: result.slides.map(s => ({
        numero: s.numero, tipo: s.tipo,
        titulo: getVal(s.numero, 'titulo', s.titulo),
        subtitulo: getVal(s.numero, 'subtitulo', s.subtitulo),
        imagem: images[s.numero] ? `img-${s.numero}.jpg` : null,
      })),
      hashtags: result.hashtags || [],
    }
  }

  function downloadJson() {
    triggerDownload(new Blob([JSON.stringify(buildJson(), null, 2)], { type: 'application/json' }), 'roteiro.json')
  }

  function downloadZip() {
    setZipping(true)
    try {
      const json = buildJson()
      const imgEntries = Object.entries(images)
      const files = {}
      files['roteiro.json'] = strToU8(JSON.stringify(json, null, 2))
      files['instrucoes.txt'] = strToU8([
        `CARROSSEL: ${result.titulo_carrossel}`,
        `TEMPLATE: ${template}`,
        `SLIDES: ${result.slides.length} | IMAGENS: ${imgEntries.length}/${result.slides.length}`,
        '',
        'COMO USAR NO FIGMA:',
        '1. Abra o Figma com seu template',
        '2. Plugins > Desenvolvimento > Carrossel Auto-Fill',
        `3. Selecione o template: ${template}`,
        '4. Cole o conteúdo do roteiro.json',
        '5. Clique "Preencher slides →"',
        '6. Arraste cada img-N.jpg para o layer img-N no Figma',
        '',
        `HOOK: ${result.hook}`,
        `HASHTAGS: ${(result.hashtags || []).map(h => '#' + h.replace('#', '')).join(' ')}`,
      ].join('\n'))
      for (const [num, img] of imgEntries) {
        if (img?.dataUrl) files[`img-${num}.jpg`] = dataUrlToBytes(img.dataUrl)
      }
      const zipped = zipSync(files, { level: 1 })
      const slug = (result.titulo_carrossel || 'carrossel').substring(0, 32).toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
      triggerDownload(new Blob([zipped], { type: 'application/zip' }), `${slug}.zip`)
    } catch (e) { alert('Erro ZIP: ' + e.message) }
    finally { setZipping(false) }
  }

  const imgCount = Object.keys(images).length
  const totalSlides = result?.slides?.length || 0

  // ── FORM ──────────────────────────────────────────────────────────────
  if (step === 'form') return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", background: '#0a0a0a', minHeight: '100vh', color: '#fff' }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700&display=swap'); @keyframes spin{to{transform:rotate(360deg)}} *{box-sizing:border-box} textarea::placeholder,input::placeholder{color:#222} select option{background:#111}`}</style>
      <div style={{ borderBottom: '1px solid #141414', padding: '15px 22px', background: '#080808', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 7, height: 7, borderRadius: '50%', background: c, boxShadow: `0 0 8px ${c}` }} />
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', color: '#3a3a3a', textTransform: 'uppercase' }}>Carrossel Studio</span>
        <span style={{ marginLeft: 'auto', fontSize: 10, color: '#222' }}>Anômalo Hub × F2 Sports</span>
      </div>
      <div style={{ maxWidth: 520, margin: '0 auto', padding: '32px 20px' }}>
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#333', textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 8 }}>Marca</div>
          <div style={{ display: 'flex', gap: 10 }}>
            {Object.entries(BRANDS).map(([k, bv]) => (
              <button key={k} onClick={() => setBrand(k)} style={{ flex: 1, padding: '12px 14px', borderRadius: 8, cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', border: brand === k ? `1.5px solid ${bv.color}` : '1.5px solid #161616', background: brand === k ? `${bv.color}0d` : '#0d0d0d', color: brand === k ? bv.color : '#333' }}>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{bv.name}</div>
                <div style={{ fontSize: 10, marginTop: 2, opacity: 0.55 }}>{bv.topics.slice(0, 3).join(' · ')}</div>
              </button>
            ))}
          </div>
        </div>
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#333', textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 8 }}>Tema do carrossel</div>
          <textarea value={theme} onChange={e => setTheme(e.target.value)} rows={3}
            placeholder={brand === 'anomalo' ? 'ex: por que 99% dos empreendedores desistem cedo demais' : 'ex: os hábitos que todo atleta de elite tem em comum'}
            style={{ width: '100%', padding: '12px 14px', borderRadius: 8, border: '1.5px solid #161616', background: '#0d0d0d', color: '#ddd', fontSize: 14, fontFamily: 'inherit', resize: 'none', outline: 'none', lineHeight: 1.5 }}
            onFocus={e => (e.target.style.borderColor = c)} onBlur={e => (e.target.style.borderColor = '#161616')} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 16, marginBottom: 24 }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#333', textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 8 }}>Slides</div>
            <div style={{ display: 'flex', gap: 6 }}>
              {[5, 7, 10].map(n => (
                <button key={n} onClick={() => setSlideCount(n)} style={{ padding: '9px 16px', borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit', border: slideCount === n ? `1.5px solid ${c}` : '1.5px solid #161616', background: slideCount === n ? `${c}10` : '#0d0d0d', color: slideCount === n ? c : '#333', fontSize: 13, fontWeight: 700 }}>{n}</button>
              ))}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#333', textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 8 }}>Template</div>
            <select value={template} onChange={e => setTemplate(e.target.value)} style={{ width: '100%', padding: '9px 11px', borderRadius: 6, border: '1.5px solid #161616', background: '#0d0d0d', color: '#aaa', fontSize: 12, fontFamily: 'inherit', outline: 'none' }}>
              {TEMPLATES.map(t => <option key={t} value={t}>{t.replace('TEMPLATE ', '')}</option>)}
            </select>
          </div>
        </div>
        {error && <div style={{ background: '#130707', border: '1px solid #ff3c3c28', borderRadius: 8, padding: '11px 14px', fontSize: 12, color: '#f55', marginBottom: 16 }}>{error}</div>}
        <button onClick={generate} disabled={loading || !theme.trim()} style={{ width: '100%', padding: 14, borderRadius: 8, border: 'none', background: !loading && theme.trim() ? c : '#161616', color: !loading && theme.trim() ? '#000' : '#2a2a2a', fontSize: 14, fontWeight: 700, fontFamily: 'inherit', cursor: !loading && theme.trim() ? 'pointer' : 'not-allowed', letterSpacing: '0.04em' }}>
          {loading ? 'Gerando...' : 'Gerar roteiro →'}
        </button>
        {loading && <div style={{ marginTop: 22, textAlign: 'center' }}>
          <div style={{ width: 26, height: 26, margin: '0 auto 10px', border: `2px solid #161616`, borderTop: `2px solid ${c}`, borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
          <div style={{ fontSize: 12, color: '#2e2e2e' }}>Selecionando personalidades e montando roteiro...</div>
        </div>}
      </div>
    </div>
  )

  // ── RESULT ────────────────────────────────────────────────────────────
  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", background: '#0a0a0a', minHeight: '100vh', color: '#fff' }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700&display=swap'); @keyframes spin{to{transform:rotate(360deg)}} *{box-sizing:border-box} input::placeholder{color:#1e1e1e} ::-webkit-scrollbar{width:3px} ::-webkit-scrollbar-thumb{background:#161616}`}</style>
      {/* Sticky header */}
      <div style={{ position: 'sticky', top: 0, zIndex: 100, background: 'rgba(7,7,7,0.97)', backdropFilter: 'blur(10px)', borderBottom: '1px solid #141414', padding: '10px 18px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={() => setStep('form')} style={{ padding: '6px 11px', borderRadius: 6, border: '1px solid #1c1c1c', background: 'transparent', color: '#444', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>← Voltar</button>
        <div style={{ flex: 1, fontSize: 12, fontWeight: 600, color: '#555', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{result.titulo_carrossel}</div>
        <div style={{ fontSize: 10, color: '#2a2a2a', flexShrink: 0 }}>{imgCount}/{totalSlides}</div>
        <button onClick={downloadJson} style={{ padding: '7px 13px', borderRadius: 6, border: `1px solid ${c}28`, background: `${c}0a`, color: c, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>JSON</button>
        <button onClick={downloadZip} disabled={zipping} style={{ padding: '7px 15px', borderRadius: 6, border: 'none', background: zipping ? '#161616' : c, color: zipping ? '#2a2a2a' : '#000', fontSize: 11, fontWeight: 700, cursor: zipping ? 'not-allowed' : 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>
          {zipping ? '...' : `↓ ZIP${imgCount > 0 ? ` (${imgCount})` : ''}`}
        </button>
      </div>

      <div style={{ maxWidth: 620, margin: '0 auto', padding: '16px 16px 60px' }}>
        {/* Meta card */}
        <div style={{ background: '#0d0d0d', border: '1px solid #161616', borderRadius: 10, padding: '15px 17px', marginBottom: 16 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: c, lineHeight: 1.3, marginBottom: 9 }}>{result.titulo_carrossel}</div>
          <div style={{ fontSize: 12, color: '#555', lineHeight: 1.6, borderTop: '1px solid #161616', paddingTop: 9 }}>
            <span style={{ fontSize: 9, color: '#2a2a2a', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Hook · </span>{result.hook}
          </div>
          {result.hashtags?.length > 0 && (
            <div style={{ borderTop: '1px solid #161616', paddingTop: 9, marginTop: 9, display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {result.hashtags.map((h, i) => <span key={i} style={{ fontSize: 10, padding: '2px 7px', borderRadius: 4, background: '#111', border: '1px solid #1c1c1c', color: '#444' }}>#{h.replace('#', '')}</span>)}
            </div>
          )}
        </div>

        {/* Template switcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 16 }}>
          <span style={{ fontSize: 9, color: '#2a2a2a', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Template:</span>
          {TEMPLATES.map(t => (
            <button key={t} onClick={() => setTemplate(t)} style={{ padding: '4px 10px', borderRadius: 4, fontFamily: 'inherit', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', border: template === t ? `1px solid ${c}` : '1px solid #161616', background: template === t ? `${c}0e` : '#0d0d0d', color: template === t ? c : '#2e2e2e', cursor: 'pointer' }}>
              {t.replace('TEMPLATE ', '')}
            </button>
          ))}
        </div>

        {/* Slides */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {result.slides?.map(slide => {
            const hl = slide.tipo === 'capa' || slide.tipo === 'cta'
            return (
              <div key={slide.numero} style={{ background: '#0d0d0d', border: '1px solid #161616', borderRadius: 10, overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: hl ? `${c}05` : 'transparent', borderBottom: '1px solid #111' }}>
                  <div style={{ width: 22, height: 22, borderRadius: 5, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: hl ? c : '#161616', color: hl ? '#000' : '#3a3a3a', fontSize: 9, fontWeight: 700 }}>{slide.numero}</div>
                  <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 3, background: '#111', color: '#2e2e2e', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{slide.tipo}</span>
                  {images[slide.numero] && <span style={{ fontSize: 9, color: c, marginLeft: 'auto' }}>✓ img</span>}
                </div>
                <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div>
                      <div style={{ fontSize: 9, color: '#252525', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Título <code style={{ color: c, fontSize: 9 }}>#titulo-{slide.numero}</code></div>
                      <input value={getVal(slide.numero, 'titulo', slide.titulo)} onChange={e => setEdit(slide.numero, 'titulo', e.target.value)}
                        style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid #1c1c1c', background: '#0f0f0f', color: '#ddd', fontSize: 13, fontFamily: 'inherit', fontWeight: 700, outline: 'none' }} />
                    </div>
                    <div>
                      <div style={{ fontSize: 9, color: '#252525', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Corpo <code style={{ color: '#282828', fontSize: 9 }}>#corpo-{slide.numero}</code></div>
                      <input value={getVal(slide.numero, 'subtitulo', slide.subtitulo)} onChange={e => setEdit(slide.numero, 'subtitulo', e.target.value)}
                        style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid #1c1c1c', background: '#0f0f0f', color: '#888', fontSize: 12, fontFamily: 'inherit', outline: 'none' }} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 9, alignItems: 'flex-start', padding: '8px 10px', borderRadius: 6, background: `${c}04`, border: `1px solid ${c}10` }}>
                    <div style={{ width: 26, height: 26, borderRadius: '50%', flexShrink: 0, background: `${c}10`, border: `1px solid ${c}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>👤</div>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: c }}>{slide.pessoa}</div>
                      <div style={{ fontSize: 10, color: '#444', lineHeight: 1.4, marginTop: 1 }}>{slide.motivo_pessoa}</div>
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 9, color: '#252525', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 5 }}>Imagem <code style={{ color: '#282828', fontSize: 9 }}>img-{slide.numero}</code></div>
                    <ImageZone slideNum={slide.numero} brandColor={c} person={slide.pessoa} query={slide.query_google || `${slide.pessoa} high resolution official photo`} onImageSet={handleImageSet} />
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Bottom export */}
        <div style={{ marginTop: 18, display: 'flex', gap: 9 }}>
          <button onClick={downloadJson} style={{ flex: 1, padding: 12, borderRadius: 8, border: `1px solid ${c}28`, background: `${c}08`, color: c, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Baixar JSON</button>
          <button onClick={downloadZip} disabled={zipping} style={{ flex: 2, padding: 12, borderRadius: 8, border: 'none', background: zipping ? '#161616' : c, color: zipping ? '#2a2a2a' : '#000', fontSize: 12, fontWeight: 700, cursor: zipping ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
            {zipping ? 'Gerando ZIP...' : `↓ ZIP completo${imgCount > 0 ? ` · ${imgCount} imagens` : ''}`}
          </button>
        </div>
        <div style={{ marginTop: 8, fontSize: 10, color: '#1e1e1e', textAlign: 'center' }}>
          ZIP contém roteiro.json + imagens img-N.jpg + instrucoes.txt
        </div>
      </div>
    </div>
  )
}
