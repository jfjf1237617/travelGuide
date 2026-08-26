import { useEffect, useRef, useState } from 'react'
import TipTapEditor from './components/TipTapEditor'

const STORAGE_KEY = 'travel-guide-content'

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
  .guide .guide-images-wall {
    display: flex; gap: 10px; overflow-x: auto; margin: 1em 0;
    padding: 8px 2px; scrollbar-width: thin;
  }
  .guide .guide-images-wall img {
    width: 200px; height: 150px; object-fit: cover; flex-shrink: 0;
  }
  @media (max-width: 600px) {
    .guide { padding: 24px 20px; }
  }
`

// 把编辑器里的图片节点（data-guide-images）转换为分享页的图片墙
function transformImagesForShare(content) {
  const doc = new DOMParser().parseFromString(content, 'text/html')
  doc.querySelectorAll('[data-guide-images]').forEach((el) => {
    let images = []
    try {
      const arr = JSON.parse(el.getAttribute('data-images') || '[]')
      if (Array.isArray(arr)) images = arr
    } catch {
      /* 忽略解析失败 */
    }
    if (!images.length) {
      el.replaceWith(el.textContent || '')
      return
    }
    const wall = document.createElement('div')
    wall.className = 'guide-images-wall'
    images.forEach((src) => {
      const img = document.createElement('img')
      img.src = src
      img.alt = '攻略图片'
      img.loading = 'lazy'
      wall.appendChild(img)
    })
    el.replaceWith(wall)
  })
  return doc.body.innerHTML
}

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
  <main class="guide">${transformImagesForShare(content)}</main>
</body>
</html>`
}

// 解析本地 HTML 文件，提取可编辑的正文内容
// 优先取本应用导出的 .guide 容器；其他文件取 <body> 内容
function parseHtmlContent(htmlText) {
  const doc = new DOMParser().parseFromString(htmlText, 'text/html')
  const guide = doc.querySelector('main.guide, .guide')
  const container = guide || doc.body
  if (!container) return ''
  // 清理脚本/样式等不适合进入编辑器的内容
  container.querySelectorAll('script, style, link, meta, iframe').forEach((el) => el.remove())
  return container.innerHTML.trim()
}

function App() {
  const [content, setContent] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) || ''
    } catch {
      return ''
    }
  })
  const [toast, setToast] = useState('')
  const [dirty, setDirty] = useState(false) // 是否有未保存的修改
  const timerRef = useRef(null)
  const editorRef = useRef(null)
  const fileInputRef = useRef(null)

  useEffect(() => {
    return () => clearTimeout(timerRef.current)
  }, [])

  // 内容与已保存的版本不一致时，标记为未保存
  useEffect(() => {
    let saved = ''
    try {
      saved = localStorage.getItem(STORAGE_KEY) || ''
    } catch {
      /* 忽略读取失败 */
    }
    setDirty(content !== saved)
  }, [content])

  // 刷新 / 关闭页面 / 退出前，有未保存修改时提示确认
  useEffect(() => {
    if (!dirty) return
    const onBeforeUnload = (e) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [dirty])

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

  // 下载独立的 .html 文件，可分享给他人直接打开
  // 文件名：第一行内容 + 日期
  const handleDownloadHtml = () => {
    const doc = new DOMParser().parseFromString(content, 'text/html')
    const firstLine = doc.body.firstElementChild?.textContent?.trim() || ''
    const safeName = firstLine.replace(/[\\/:*?"<>|]/g, '').slice(0, 30) || '旅游攻略'
    const now = new Date()
    const pad = (n) => String(n).padStart(2, '0')
    const dateTime =
      `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}` +
      `-${pad(now.getHours())}${pad(now.getMinutes())}`
    const blob = new Blob([buildShareHtml(content)], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${safeName}-${dateTime}.html`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    showToast('HTML 文件已下载')
  }

  // 选择本地 HTML 文件并导入到编辑器
  const handleImportHtml = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = '' // 允许重复选择同一个文件
    if (!file) return
    try {
      const text = await file.text()
      const parsed = parseHtmlContent(text)
      if (!parsed) {
        showToast('文件中没有可导入的内容')
        return
      }
      editorRef.current?.setContent(parsed)
      setContent(parsed)
      showToast('HTML 已导入')
    } catch {
      showToast('文件读取失败')
    }
  }

  // 在新窗口预览分享效果
  const handlePreview = () => {
    const blob = new Blob([buildShareHtml(content)], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    window.open(url, '_blank')
    setTimeout(() => URL.revokeObjectURL(url), 60_000)
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
            <button type="button" className="btn ghost" onClick={handlePreview}>
              预览
            </button>
            <button type="button" className="btn ghost" onClick={handleImportHtml}>
              导入 HTML
            </button>
            <button type="button" className="btn ghost" onClick={handleDownloadHtml}>
              下载 HTML
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".html,.htm,text/html"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
            <button type="button" className="btn primary" onClick={handleSave}>
              保存攻略
            </button>
          </div>
        </div>
      </header>

      <main className="app-main">
        <TipTapEditor ref={editorRef} initialContent={content} onChange={setContent} onNotify={showToast} />
        <p className="editor-hint">
          编辑内容默认仅保存在本页，退出前请点击「保存攻略」；「导入 HTML」可载入本地攻略文件，「预览 / 下载 HTML」可导出分享。
        </p>
      </main>

      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}

export default App
