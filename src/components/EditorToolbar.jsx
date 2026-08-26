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

export default function EditorToolbar({ editor, state }) {
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
      <input
        type="number"
        min="8"
        max="120"
        className="tool-size-input"
        placeholder="自定义"
        title="自定义字号（回车应用）"
        defaultValue=""
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            applyFontSize(Number(e.target.value))
            e.target.value = ''
          }
        }}
      />

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
      <ToolButton active={state.isItalic} title="斜体 (Ctrl+I)" onClick={() => editor.chain().focus().toggleItalic().run()}>
        <em>I</em>
      </ToolButton>
      <ToolButton active={state.isStrike} title="删除线" onClick={() => editor.chain().focus().toggleStrike().run()}>
        <s>S</s>
      </ToolButton>
      <ToolButton active={state.isCode} title="行内代码" onClick={() => editor.chain().focus().toggleCode().run()}>
        {'</>'}
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

      <Divider />

      <ToolButton title="清除格式" onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}>
        清除格式
      </ToolButton>
    </div>
  )
}
