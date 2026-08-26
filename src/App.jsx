import { useEffect, useRef, useState } from 'react'
import TipTapEditor from './components/TipTapEditor'

const STORAGE_KEY = 'travel-guide-content'

const DEFAULT_CONTENT = `
<h1>京都 · 三日深度游攻略</h1>
<p>京都是日本最具古韵的城市，千年古刹、四季风物与慢节奏的街巷生活交织在一起。这份攻略适合第一次去京都、想深度体验关西文化的旅行者。</p>
<h2>行程安排</h2>
<ul>
  <li><strong>Day 1</strong>：伏见稻荷大社 → 清水寺 → 三年坂二年坂 → 祇园花见小路</li>
  <li><strong>Day 2</strong>：金阁寺 → 龙安寺 → 岚山竹林 → 天龙寺</li>
  <li><strong>Day 3</strong>：二条城 → 京都御所 → 锦市场 → 鸭川</li>
</ul>
<h2>美食推荐</h2>
<blockquote>不要错过锦市场的小吃，以及祇园附近的汤豆腐料理。</blockquote>
<p>推荐尝一尝<span style="color: #e74c3c">抹茶冰淇淋</span>，岚山的汤豆腐和鸭川旁的怀石料理也值得一试。</p>
<h2>出行贴士</h2>
<ol>
  <li>购买京都巴士一日券，大部分景点都能覆盖。</li>
  <li>寺社大多下午 17:00 关闭，注意安排时间。</li>
  <li>春秋季游客最多，建议错峰或提前预订住宿。</li>
</ol>
<p>祝旅途愉快！</p>
`

// 分享页排版样式（自包含，不依赖任何外部资源）
const SHARE_STYLES = `
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    padding: 32px 16px;
    background: #f1f5f9;
    color: #0f172a;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC',
      'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
    line-height: 1.75;
    font-size: 16px;
  }
  .guide {
    max-width: 820px;
    margin: 0 auto;
    padding: 40px 48px;
    background: #fff;
    border-radius: 14px;
    box-shadow: 0 8px 32px rgba(15, 23, 42, 0.08);
  }
  .guide h1 { font-size: 1.9em; margin: 0.6em 0 0.5em; line-height: 1.3; }
  .guide h2 {
    font-size: 1.45em; margin: 1.2em 0 0.5em; padding-left: 12px;
    border-left: 4px solid #0ea5e9; line-height: 1.4;
  }
  .guide h3 { font-size: 1.2em; margin: 1em 0 0.4em; }
  .guide p { margin: 0.6em 0; }
  .guide blockquote {
    margin: 1em 0; padding: 10px 18px;
    border-left: 4px solid #0ea5e9; border-radius: 0 8px 8px 0;
    background: #f0f9ff; color: #475569;
  }
  .guide code {
    background: #f1f5f9; padding: 2px 6px; border-radius: 4px;
    font-size: 0.9em; font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  }
  .guide hr { border: none; border-top: 1px solid #e2e8f0; margin: 1.6em 0; }
  .guide ul, .guide ol { padding-left: 1.6em; margin: 0.6em 0; }
  .guide li { margin: 0.3em 0; }
  .guide a { color: #0284c7; }
  .guide img { max-width: 100%; height: auto; border-radius: 8px; }
  @media (max-width: 600px) {
    .guide { padding: 24px 20px; }
  }
`

// 将编辑内容包装为可直接打开/分享的完整 HTML 文档
function buildShareHtml(content) {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>旅游攻略</title>
  <style>${SHARE_STYLES}</style>
</head>
<body>
  <main class="guide">${content}</main>
</body>
</html>`
}

function App() {
  const [content, setContent] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) || DEFAULT_CONTENT
    } catch {
      return DEFAULT_CONTENT
    }
  })
  const [toast, setToast] = useState('')
  const timerRef = useRef(null)

  useEffect(() => {
    return () => clearTimeout(timerRef.current)
  }, [])

  const showToast = (msg) => {
    setToast(msg)
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setToast(''), 2200)
  }

  const handleSave = () => {
    try {
      localStorage.setItem(STORAGE_KEY, content)
      showToast('已保存到本地')
    } catch {
      showToast('保存失败')
    }
  }

  // 复制完整 HTML（含样式）到剪贴板
  const handleCopyHtml = async () => {
    try {
      await navigator.clipboard.writeText(buildShareHtml(content))
      showToast('完整 HTML 已复制到剪贴板')
    } catch {
      showToast('复制失败，请手动复制')
    }
  }

  // 下载独立的 .html 文件，可分享给他人直接打开
  const handleDownloadHtml = () => {
    const blob = new Blob([buildShareHtml(content)], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `travel-guide-${new Date().toISOString().slice(0, 10)}.html`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    showToast('HTML 文件已下载')
  }

  // 在新窗口预览分享效果
  const handlePreview = () => {
    const blob = new Blob([buildShareHtml(content)], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    window.open(url, '_blank')
    setTimeout(() => URL.revokeObjectURL(url), 60_000)
  }

  const handleReset = () => {
    if (!window.confirm('确定恢复为默认攻略内容吗？当前内容将被覆盖。')) return
    setContent(DEFAULT_CONTENT)
    localStorage.removeItem(STORAGE_KEY)
    showToast('已恢复默认内容')
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-header-inner">
          <div className="brand">
            <span className="brand-logo">✈</span>
            <span className="brand-name">TravelGuide</span>
            <span className="brand-sub">旅游攻略编辑器</span>
          </div>
          <div className="header-actions">
            <button type="button" className="btn ghost" onClick={handleReset}>
              重置
            </button>
            <button type="button" className="btn ghost" onClick={handlePreview}>
              预览
            </button>
            <button type="button" className="btn ghost" onClick={handleCopyHtml}>
              复制 HTML
            </button>
            <button type="button" className="btn ghost" onClick={handleDownloadHtml}>
              下载 HTML
            </button>
            <button type="button" className="btn primary" onClick={handleSave}>
              保存攻略
            </button>
          </div>
        </div>
      </header>

      <main className="app-main">
        <TipTapEditor initialContent={content} onChange={setContent} />
        <p className="editor-hint">
          内容自动保存在浏览器本地；「预览 / 复制 HTML / 下载 HTML」可生成带完整样式的分享文件。
        </p>
      </main>

      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}

export default App
