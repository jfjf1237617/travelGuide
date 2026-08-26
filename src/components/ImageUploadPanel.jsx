import { useEffect, useRef, useState } from 'react'

/**
 * 图片上传面板
 * - 支持：拖入图片 / 点击选择文件（可多选）/ Ctrl+V 直接粘贴剪贴板图片
 * - onConfirm(files)：拿到图片文件后由父组件处理（压缩、插入）
 */
export default function ImageUploadPanel({ title = '插入图片', onConfirm, onClose }) {
  const fileRef = useRef(null)
  const [dragging, setDragging] = useState(false)

  // 粘贴图片（Ctrl+V）
  useEffect(() => {
    const onPaste = (e) => {
      const items = Array.from(e.clipboardData?.items || [])
      const files = items
        .filter((it) => it.kind === 'file' && it.type.startsWith('image/'))
        .map((it) => it.getAsFile())
        .filter(Boolean)
      if (!files.length) return
      e.preventDefault()
      onConfirm(files)
    }
    document.addEventListener('paste', onPaste)
    return () => document.removeEventListener('paste', onPaste)
  }, [onConfirm])

  // Esc 关闭
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation() // 不冒泡到编辑器自身的拖放
    setDragging(false)
    const files = Array.from(e.dataTransfer?.files || []).filter((f) => f.type.startsWith('image/'))
    if (files.length) onConfirm(files)
  }

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || [])
    e.target.value = ''
    if (files.length) onConfirm(files)
  }

  return (
    <div className="upload-overlay" onClick={onClose}>
      <div className="upload-panel" onClick={(e) => e.stopPropagation()}>
        <div className="upload-panel-header">
          <span>{title}</span>
          <button type="button" className="upload-close" title="关闭 (Esc)" onClick={onClose}>
            ×
          </button>
        </div>
        <div
          className={`upload-dropzone${dragging ? ' dragging' : ''}`}
          onDragOver={(e) => {
            e.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
        >
          <svg
            width="40"
            height="40"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="upload-icon"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          <p>将图片拖到这里</p>
          <p className="upload-sub">点击选择文件（可多选），或直接 Ctrl+V 粘贴图片</p>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
      </div>
    </div>
  )
}
