import { useEffect, useRef, useState } from 'react'

const HEADINGS = [
  { label: '正文', level: 0 },
  { label: '标题 1', level: 1 },
  { label: '标题 2', level: 2 },
  { label: '标题 3', level: 3 },
]

const FONT_SIZES = [12, 14, 16, 18, 20, 24, 28, 32, 36, 48]

const PRESET_COLORS = [
  '#000000', '#374151', '#6b7280', '#9ca3af',
  '#c0392b', '#e74c3c', '#e67e22', '#f39c12',
  '#16a085', '#27ae60', '#2ecc71', '#1abc9c',
  '#2980b9', '#3498db', '#8e44ad', '#9b59b6',
  '#f8f9fa', '#ffffff',
]

function ToolButton({ active = false, disabled = false, onClick, title, children, className = '' }) {
  return (
    <button
      type="button"
      className={`tool-btn${active ? ' active' : ''} ${className}`}
      disabled={disabled}
      title={title}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
    >
      {children}
    </button>
  )
}

function Divider() {
  return <span className="tool-divider" />
}

export default function EditorToolbar({ editor, state, onInsertImages, paintMode = false, onFormatPaint }) {
  const [showColorPanel, setShowColorPanel] = useState(false)
  const colorPanelRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (colorPanelRef.current && !colorPanelRef.current.contains(e.target)) {
        setShowColorPanel(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  if (!editor) return null

  const setHeading = (level) => {
    if (!level) {
      editor.chain().focus().setParagraph().run()
    } else {
      editor.chain().focus().toggleHeading({ level }).run()
    }
  }

  const applyFontSize = (size) => {
    if (!size) {
      editor.chain().focus().unsetFontSize().run()
    } else {
      editor.chain().focus().setFontSize(`${size}px`).run()
    }
  }

  const applyColor = (color) => {
    editor.chain().focus().setColor(color).run()
    setShowColorPanel(false)
  }

  const clearColor = () => {
    editor.chain().focus().unsetColor().run()
    setShowColorPanel(false)
  }

  const currentFontSize = parseInt(state.fontSize, 10) || 0
  const showCustomSize = currentFontSize && !FONT_SIZES.includes(currentFontSize)

  return (
    <div className="toolbar">
      {/* 标题 */}
      <select
        className="tool-select"
        value={state.heading}
        onChange={(e) => setHeading(Number(e.target.value))}
        title="标题样式"
      >
        {HEADINGS.map((h) => (
          <option key={h.level} value={h.level}>
            {h.label}
          </option>
        ))}
      </select>

      {/* 字号 */}
      <select
        className="tool-select"
        value={showCustomSize ? 'custom' : currentFontSize}
        onChange={(e) => {
          const v = e.target.value
          if (v === 'custom') return
          applyFontSize(Number(v))
        }}
        title="字号"
      >
        {FONT_SIZES.map((s) => (
          <option key={s} value={s}>
            {s}px
          </option>
        ))}
        {showCustomSize && <option value="custom">{state.fontSize}</option>}
      </select>

      <Divider />

      {/* 颜色 */}
      <div className="color-picker" ref={colorPanelRef}>
        <ToolButton
          title="文字颜色"
          className={showColorPanel ? 'active' : ''}
          onClick={() => setShowColorPanel((v) => !v)}
        >
          <span className="color-swatch" style={{ background: state.color || '#000000' }} />
          <span className="color-caret">▾</span>
        </ToolButton>
        {showColorPanel && (
          <div className="color-panel">
            <div className="color-panel-title">文字颜色</div>
            <div className="color-grid">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`color-cell${state.color === c ? ' selected' : ''}`}
                  style={{ background: c }}
                  title={c}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => applyColor(c)}
                />
              ))}
            </div>
            <div className="color-custom-row">
              <input
                type="color"
                defaultValue="#e74c3c"
                onMouseDown={(e) => e.preventDefault()}
                onChange={(e) => applyColor(e.target.value)}
              />
              <button type="button" className="tool-btn clear-color" onClick={clearColor}>
                清除颜色
              </button>
            </div>
          </div>
        )}
      </div>

      <Divider />

      {/* 基础格式 */}
      <ToolButton active={state.isBold} title="加粗 (Ctrl+B)" onClick={() => editor.chain().focus().toggleBold().run()}>
        <strong>B</strong>
      </ToolButton>

      {/* 格式刷 */}
      <ToolButton
        active={paintMode}
        className={paintMode ? 'paint-mode' : ''}
        title={paintMode ? '应用格式到选中文本（Esc 退出）' : '格式刷：复制选中文本的格式'}
        onClick={onFormatPaint}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
        </svg>
      </ToolButton>

      <Divider />

      {/* 段落结构 */}
      <ToolButton active={state.isBulletList} title="无序列表" onClick={() => editor.chain().focus().toggleBulletList().run()}>
        •≡
      </ToolButton>
      <ToolButton active={state.isOrderedList} title="有序列表" onClick={() => editor.chain().focus().toggleOrderedList().run()}>
        1≡
      </ToolButton>
      <ToolButton active={state.isBlockquote} title="引用" onClick={() => editor.chain().focus().toggleBlockquote().run()}>
        ❝
      </ToolButton>
      <ToolButton title="分割线" onClick={() => editor.chain().focus().setHorizontalRule().run()}>
        ―
      </ToolButton>
      <ToolButton
        disabled={!state.hasSelection}
        title={state.hasSelection ? '插入图片（可多选/拖拽）' : '请先选中要插入图片的文本'}
        onClick={onInsertImages}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <polyline points="21 15 16 10 5 21" />
        </svg>
      </ToolButton>

      <Divider />

      {/* 撤销 / 重做 */}
      <ToolButton disabled={!state.canUndo} title="撤销 (Ctrl+Z)" onClick={() => editor.chain().focus().undo().run()}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 14 4 9l5-5" />
          <path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
        </svg>
      </ToolButton>
      <ToolButton disabled={!state.canRedo} title="重做 (Ctrl+Y / Ctrl+Shift+Z)" onClick={() => editor.chain().focus().redo().run()}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m15 14 5-5-5-5" />
          <path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13" />
        </svg>
      </ToolButton>
    </div>
  )
}
