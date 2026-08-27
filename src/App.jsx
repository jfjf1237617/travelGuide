import { useEffect, useRef, useState } from 'react'
import TipTapEditor from './components/TipTapEditor'

const STORAGE_KEY = 'travel-guide-content'

// 分享页排版样式（自包含，不依赖任何外部资源）
const SHARE_STYLES = `
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    padding: 0;
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
    padding: 20px 16px;
    background: #fff;
  }
  .guide ul,
  .guide ol {
    padding-left: 1.5em;
    margin: 0.6em 0;
  }
  .guide li {
    margin: 0.2em 0;
  }
  .guide li > ul,
  .guide li > ol {
    margin: 0.2em 0;
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
  .guide .guide-images-link {
    color: #ea580c; cursor: pointer;
    user-select: none; -webkit-touch-callout: none;
  }
  .guide .guide-images-link:hover { background: #fff7ed; }
  @media (max-width: 600px) {
    .guide { padding: 24px 20px; }
  }
  /* 小预览弹窗：点击橙色文本弹出，展示该组图片缩略图 */
  .lb-popup {
    display: none; position: fixed; left: 50%; top: 50%;
    transform: translate(-50%, -50%); z-index: 9998;
    width: min(300px, calc(100vw - 40px));
    max-height: 75vh; overflow: auto;
    background: #fff; border-radius: 12px;
    box-shadow: 0 12px 40px rgba(15, 23, 42, 0.25);
    padding: 12px;
  }
  .lb-popup.open { display: block; }
  .lb-popup-list { display: flex; gap: 8px; overflow-x: auto; align-items: flex-start; }
  .lb-popup-list img {
    height: 240px; width: auto; max-width: 72vw; flex-shrink: 0;
    display: block; cursor: zoom-in;
    border-radius: 8px; object-fit: contain;
    background: #f1f5f9;
  }
  .lb-popup-close {
    position: absolute; top: 6px; right: 6px;
    display: flex; align-items: center; justify-content: center;
    width: 28px; height: 28px; padding: 0;
    border: none; border-radius: 50%;
    background: #f1f5f9; color: #475569;
    font-size: 16px; line-height: 1; cursor: pointer;
  }
  /* 全屏灯箱：点击小弹窗中的图片打开，支持切换与缩放 */
  .lightbox {
    display: none; position: fixed; inset: 0; z-index: 9999;
    background: rgba(15, 23, 42, 0.92);
    align-items: center; justify-content: center;
    touch-action: none; user-select: none; -webkit-user-drag: none;
  }
  .lightbox.open { display: flex; }
  /* 控件置于图片之上：图片的 transform 会创建独立堆叠上下文 */
  .lightbox .lb-btn,
  .lightbox .lb-close,
  .lightbox .lb-count { z-index: 10; }
  .lightbox .lb-stage img {
    max-width: 92vw; max-height: 86vh; object-fit: contain;
    border-radius: 8px; box-shadow: 0 10px 40px rgba(0, 0, 0, 0.4);
    transform-origin: center center;
    transition: transform 0.12s ease;
  }
  .lightbox .lb-btn {
    position: absolute; top: 50%; transform: translateY(-50%);
    display: flex; align-items: center; justify-content: center;
    width: 44px; height: 44px; padding: 0; border: none; border-radius: 50%;
    background: rgba(255, 255, 255, 0.15); color: #fff;
    line-height: 0; cursor: pointer;
  }
  .lightbox .lb-btn:hover { background: rgba(255, 255, 255, 0.3); }
  .lightbox .lb-prev { left: 16px; }
  .lightbox .lb-next { right: 16px; }
  .lightbox .lb-close {
    position: absolute; top: 16px; right: 16px;
    display: flex; align-items: center; justify-content: center;
    width: 40px; height: 40px; padding: 0; border: none; border-radius: 50%;
    background: rgba(255, 255, 255, 0.15); color: #fff;
    font-size: 20px; line-height: 1; cursor: pointer;
  }
  .lightbox .lb-close:hover { background: rgba(255, 255, 255, 0.3); }
  .lightbox .lb-count {
    position: absolute; bottom: 20px; left: 50%; transform: translateX(-50%);
    color: rgba(255, 255, 255, 0.85); font-size: 14px; letter-spacing: 1px;
    background: rgba(0, 0, 0, 0.4); padding: 4px 12px; border-radius: 999px;
    white-space: nowrap;
  }
`

// 把编辑器里的图片节点（data-guide-images）转换为可点击的橙色文本（与编辑器行为一致）
// 图片以 base64 存进 data-images 属性，点击文本时由灯箱脚本弹窗展示
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
    const label = el.textContent || '查看图片'
    if (!images.length) {
      el.replaceWith(document.createTextNode(label))
      return
    }
    const link = document.createElement('span')
    link.className = 'guide-images-link'
    // 保留编辑器识别标记，导入时可还原为图片节点
    link.setAttribute('data-guide-images', '')
    link.setAttribute('data-images', JSON.stringify(images))
    link.textContent = label
    el.replaceWith(link)
  })
  return doc.body.innerHTML
}

// 将编辑内容包装为可直接打开/分享的完整 HTML 文档（单文件、自包含）
// 图片以 base64 内联；内置原生 JS 实现「点击图片 → 灯箱放大预览」
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
  <div class="lb-popup" id="lbPopup">
    <button type="button" class="lb-popup-close" aria-label="关闭">×</button>
    <div class="lb-popup-list"></div>
  </div>
  <div class="lightbox" id="lightbox">
    <button type="button" class="lb-close" aria-label="关闭">×</button>
    <button type="button" class="lb-btn lb-prev" aria-label="上一张">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
    </button>
    <div class="lb-stage"><img alt="攻略图片" /></div>
    <button type="button" class="lb-btn lb-next" aria-label="下一张">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
    </button>
    <div class="lb-count"></div>
  </div>
  <script>
    (function () {
      var links = Array.prototype.slice.call(document.querySelectorAll('.guide-images-link'))
      var box = document.getElementById('lightbox')
      var popup = document.getElementById('lbPopup')
      if (!box || !popup || !links.length) return
      var stageImg = box.querySelector('.lb-stage img')
      var count = box.querySelector('.lb-count')
      var prevBtn = box.querySelector('.lb-prev')
      var nextBtn = box.querySelector('.lb-next')
      var popupList = popup.querySelector('.lb-popup-list')
      var images = []
      var idx = 0
      var scale = 1

      function setScale(s) {
        scale = Math.max(1, Math.min(4, s))
        stageImg.style.transform = 'scale(' + scale + ')'
      }

      function show(i) {
        idx = (i + images.length) % images.length
        stageImg.src = images[idx]
        count.textContent = (idx + 1) + ' / ' + images.length
        setScale(1)
      }

      function openLightbox(list, i) {
        images = list
        var single = list.length < 2
        prevBtn.style.display = single ? 'none' : ''
        nextBtn.style.display = single ? 'none' : ''
        closePopup()
        show(i)
        box.classList.add('open')
      }
      function closeLightbox() {
        box.classList.remove('open')
        setScale(1)
      }

      function openPopup(list) {
        popupList.innerHTML = ''
        list.forEach(function (src, i) {
          var img = document.createElement('img')
          img.src = src
          img.alt = '攻略图片'
          img.addEventListener('click', function () { openLightbox(list, i) })
          popupList.appendChild(img)
        })
        popup.classList.add('open')
      }
      function closePopup() { popup.classList.remove('open') }

      links.forEach(function (link) {
        link.addEventListener('click', function () {
          var list = []
          try { list = JSON.parse(link.getAttribute('data-images') || '[]') } catch (e) {}
          if (list.length) openPopup(list)
        })
      })

      popup.querySelector('.lb-popup-close').addEventListener('click', function (e) {
        e.stopPropagation()
        closePopup()
      })
      document.addEventListener('click', function (e) {
        if (!popup.classList.contains('open')) return
        if (e.target.closest && e.target.closest('.guide-images-link, .lb-popup')) return
        closePopup()
      })

      box.querySelector('.lb-close').addEventListener('click', closeLightbox)
      box.querySelector('.lb-prev').addEventListener('click', function (e) { e.stopPropagation(); show(idx - 1) })
      box.querySelector('.lb-next').addEventListener('click', function (e) { e.stopPropagation(); show(idx + 1) })
      box.addEventListener('click', function (e) { if (e.target === box) closeLightbox() })

      document.addEventListener('keydown', function (e) {
        if (box.classList.contains('open')) {
          if (e.key === 'Escape') closeLightbox()
          if (e.key === 'ArrowLeft') show(idx - 1)
          if (e.key === 'ArrowRight') show(idx + 1)
        } else if (popup.classList.contains('open') && e.key === 'Escape') {
          closePopup()
        }
      })

      /* 触摸：单指左右滑动切换，双指捏合缩放 */
      var startX = null
      var pinchDist = 0
      var baseScale = 1
      box.addEventListener('touchstart', function (e) {
        if (e.touches.length === 2) {
          startX = null
          pinchDist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY)
          baseScale = scale
        } else if (e.touches.length === 1) {
          startX = e.touches[0].clientX
        }
      }, { passive: true })
      box.addEventListener('touchmove', function (e) {
        if (e.touches.length === 2 && pinchDist > 0) {
          var d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY)
          setScale(baseScale * (d / pinchDist))
        }
      }, { passive: true })
      box.addEventListener('touchend', function (e) {
        if (e.changedTouches && startX !== null && pinchDist === 0) {
          var dx = e.changedTouches[0].clientX - startX
          if (Math.abs(dx) > 40) { dx > 0 ? show(idx - 1) : show(idx + 1) }
        }
        startX = null
        pinchDist = 0
      })

      /* 桌面：滚轮缩放，双击放大/还原 */
      box.addEventListener('wheel', function (e) {
        if (!box.classList.contains('open')) return
        e.preventDefault()
        setScale(scale + (e.deltaY < 0 ? 0.15 : -0.15))
      }, { passive: false })
      stageImg.addEventListener('dblclick', function (e) {
        e.stopPropagation()
        setScale(scale > 1 ? 1 : 2)
      })
    })();
  <\/script>
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
  // 兼容旧版导出的 HTML：图片标记只有 class/data-images、缺 data-guide-images 时补上，
  // 否则编辑器无法识别为图片节点，导入后图片会丢失
  container.querySelectorAll('span.guide-images-link[data-images]').forEach((el) => {
    if (!el.hasAttribute('data-guide-images')) el.setAttribute('data-guide-images', '')
  })
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
          编辑内容默认仅保存在本页，退出前请点击「保存攻略」；「导入 HTML」可载入本地攻略文件，「下载 HTML」可导出单个文件（图片绑定在文本上，点击文本可预览）。
        </p>
      </main>

      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}

export default App
