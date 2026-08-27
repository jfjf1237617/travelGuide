import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { useEditor, EditorContent, useEditorState } from '@tiptap/react'
import { liftListItem } from '@tiptap/pm/schema-list'
import { Selection, TextSelection } from '@tiptap/pm/state'
import StarterKit from '@tiptap/starter-kit'
import TextStyle from '@tiptap/extension-text-style'
import Color from '@tiptap/extension-color'
import Placeholder from '@tiptap/extension-placeholder'
import FontSize from '../extensions/FontSize'
import GuideImages from '../extensions/GuideImages'
import EditorToolbar from './EditorToolbar'
import ImageGallery from './ImageGallery'
import ImageUploadPanel from './ImageUploadPanel'

// 文件 → base64
const fileToDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })

// 压缩图片（限制宽度，转 jpeg/png），避免 base64 撑爆 localStorage（约 5MB）
const compressImage = (dataUrl, maxWidth = 1280) =>
  new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      try {
        const scale = Math.min(1, maxWidth / img.width)
        const w = Math.max(1, Math.round(img.width * scale))
        const h = Math.max(1, Math.round(img.height * scale))
        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        canvas.getContext('2d').drawImage(img, 0, 0, w, h)
        const isPng = dataUrl.startsWith('data:image/png')
        resolve(canvas.toDataURL(isPng ? 'image/png' : 'image/jpeg', 0.85))
      } catch {
        resolve(dataUrl)
      }
    }
    img.onerror = () => resolve(dataUrl)
    img.src = dataUrl
  })

const TipTapEditor = forwardRef(function TipTapEditor({ initialContent = '', onChange, onNotify }, ref) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      TextStyle,
      FontSize,
      Color.configure({ types: ['textStyle'] }),
      GuideImages,
      Placeholder.configure({
        placeholder: '开始撰写你的旅游攻略，比如景点、行程、美食、住宿、预算……',
      }),
    ],
    content: initialContent,
    onUpdate: ({ editor }) => onChange?.(editor.getHTML()),
    editorProps: {
      // 优化列表 Backspace 体验：
      // 1. 空列表项按 Backspace → 仅脱离列表（变空段落），光标停在行首，不删除该项
      // 2. 刚脱离列表产生的空段落再按 Backspace → 不删除该行（默认行为会删掉整行合并到上一段）
      handleKeyDown: (view, event) => {
        if (event.key !== 'Backspace' || event.metaKey || event.ctrlKey || event.altKey) return false
        const { state, dispatch } = view
        const { $from } = state.selection
        if (!state.selection.empty || $from.parentOffset !== 0) return false

        const parent = $from.parent
        // 空列表项：liftListItem 脱离列表，并显式把光标定位到新段落行首
        if (parent.type.name === 'listItem' && parent.content.size === 0) {
          const cursorPos = $from.pos
          const lifted = liftListItem('listItem')({
            state,
            dispatch: (tr) => {
              const mapped = tr.mapping.map(cursorPos)
              const $m = tr.doc.resolve(mapped)
              // 找到光标所在（或最近的）文本块，定位到其内容开头（行首）
              let startPos = null
              for (let d = $m.depth; d >= 0; d--) {
                if ($m.node(d).isTextblock) {
                  startPos = $m.before(d) + 1
                  break
                }
              }
              if (startPos == null) {
                startPos = Selection.near($m, 1).$from.pos
              }
              tr.setSelection(TextSelection.create(tr.doc, startPos))
              dispatch(tr.scrollIntoView())
            },
          })
          if (lifted) return true
        }
        // 空段落，且前面紧邻的是列表项（刚脱离列表产生的空行）→ 不再删除
        if (parent.type.name === 'paragraph' && parent.content.size === 0 && $from.depth >= 1) {
          const gp = $from.node($from.depth - 1)
          const idx = $from.index($from.depth - 1)
          const prev = idx > 0 ? gp.child(idx - 1) : null
          if (prev && prev.type.name === 'listItem') return true
        }
        return false
      },
    },
  })

  // 图片管理弹窗状态（含节点位置，用于增删图片；mode: view=预览 / manage=管理）
  const [popup, setPopup] = useState(null)
  // 上传面板状态：{ mode: 'insert'（插入到选中文本）| 'add'（追加到当前节点）}
  const [uploadPanel, setUploadPanel] = useState(null)
  // 格式刷：true 表示已复制格式、待应用到新选区
  const [paintMode, setPaintMode] = useState(false)
  const paintRef = useRef(null) // 格式快照
  const wrapRef = useRef(null) // 编辑器外层容器（原生事件监听）
  const longPressRef = useRef(null) // 长按计时器
  const suppressClickRef = useRef(false) // 长按后抑制本次 click

  // 订阅编辑器状态，用于工具栏高亮与回显
  const state = useEditorState({
    editor,
    selector: ({ editor }) => {
      if (!editor) return {}
      const heading = editor.isActive('heading') ? editor.getAttributes('heading').level : 0
      const textStyle = editor.getAttributes('textStyle')
      return {
        heading,
        fontSize: textStyle?.fontSize || '',
        color: textStyle?.color || '',
        isBold: editor.isActive('bold'),
        isBulletList: editor.isActive('bulletList'),
        isOrderedList: editor.isActive('orderedList'),
        isBlockquote: editor.isActive('blockquote'),
        isHorizontalRule: editor.isActive('horizontalRule'),
        hasSelection: !editor.state.selection.empty,
        canUndo: editor.can().undo(),
        canRedo: editor.can().redo(),
      }
    },
  })

  // 用原生事件监听（而非 React 合成事件），避免与 ProseMirror 事件处理冲突导致弹窗打不开
  useEffect(() => {
    if (!editor) return
    const wrap = wrapRef.current
    if (!wrap) return

    // 从视口坐标解析出被点击的 guideImages 节点及其文档位置
    const resolveGuideImages = (clientX, clientY) => {
      const doc = editor.state.doc
      const result = editor.view.posAtCoords({ left: clientX, top: clientY })
      if (!result) return null
      // 位置正好落在节点起始处
      const direct = doc.nodeAt(result.pos)
      if (direct?.type.name === 'guideImages') return { node: direct, pos: result.pos }
      // 位置落在节点内部（如文本子节点）：沿祖先链向上找
      const resolved = doc.resolve(result.pos)
      for (let d = resolved.depth; d >= 0; d--) {
        const node = resolved.node(d)
        if (node.type.name === 'guideImages') return { node, pos: resolved.before(d) }
      }
      return null
    }

    const openPopup = (info, mode) => {
      if (!info) return
      const coords = editor.view.coordsAtPos(info.pos)
      setPopup({
        left: Math.max(8, coords.left),
        top: coords.bottom + 10,
        nodePos: info.pos,
        images: info.node.attrs.images || [],
        mode,
      })
    }

    // 左键点击 → 预览
    const onClick = (e) => {
      if (suppressClickRef.current) {
        suppressClickRef.current = false
        return
      }
      openPopup(resolveGuideImages(e.clientX, e.clientY), 'view')
    }

    // 右键 → 管理
    const onContextMenu = (e) => {
      const info = resolveGuideImages(e.clientX, e.clientY)
      if (!info) return
      e.preventDefault()
      openPopup(info, 'manage')
    }

    // 手机端长按 → 管理
    const onTouchStart = (e) => {
      const touch = e.touches[0]
      if (!touch) return
      const info = resolveGuideImages(touch.clientX, touch.clientY)
      if (!info) return
      longPressRef.current = setTimeout(() => {
        longPressRef.current = null
        suppressClickRef.current = true
        openPopup(info, 'manage')
      }, 500)
    }

    wrap.addEventListener('click', onClick)
    wrap.addEventListener('contextmenu', onContextMenu)
    wrap.addEventListener('touchstart', onTouchStart, { passive: true })
    return () => {
      wrap.removeEventListener('click', onClick)
      wrap.removeEventListener('contextmenu', onContextMenu)
      wrap.removeEventListener('touchstart', onTouchStart)
    }
  }, [editor])

  const clearLongPress = useCallback(() => {
    if (longPressRef.current) {
      clearTimeout(longPressRef.current)
      longPressRef.current = null
    }
  }, [])

  useEffect(() => clearLongPress, [clearLongPress])

  // 更新弹窗对应节点上的图片数组；删空时移除节点仅保留文本
  const updateNodeImages = useCallback(
    (newImages) => {
      if (!editor || !popup) return
      const pos = popup.nodePos
      const { state } = editor
      const node = state.doc.nodeAt(pos)
      if (!node || node.type.name !== 'guideImages') {
        setPopup(null)
        return
      }
      if (!newImages.length) {
        const text = node.textContent
        const tr = state.tr
        tr.replaceWith(pos, pos + node.nodeSize, text ? state.schema.text(text) : [])
        editor.view.dispatch(tr)
        setPopup(null)
        return
      }
      const tr = state.tr
      tr.setNodeMarkup(pos, undefined, { images: newImages })
      editor.view.dispatch(tr)
      setPopup((p) => (p ? { ...p, images: newImages } : p))
    },
    [editor, popup],
  )

  // 删除弹窗中的某张图片
  const handleDeleteImage = useCallback(
    (index) => {
      if (!popup) return
      updateNodeImages(popup.images.filter((_, i) => i !== index))
    },
    [popup, updateNodeImages],
  )

  // 弹窗内新增图片（追加到当前节点）
  const handleAddImages = useCallback(
    async (files) => {
      if (!popup) return
      const images = []
      for (const f of files) {
        try {
          images.push(await compressImage(await fileToDataUrl(f)))
        } catch {
          /* 跳过无法读取的文件 */
        }
      }
      if (!images.length) {
        onNotify?.('图片读取失败，请重试')
        return
      }
      updateNodeImages([...(popup.images || []), ...images])
    },
    [popup, onNotify, updateNodeImages],
  )

  // 把文件列表插入当前选中的文本
  const insertImagesToSelection = useCallback(
    async (files) => {
      if (!editor) return
      const images = []
      for (const f of files) {
        try {
          images.push(await compressImage(await fileToDataUrl(f)))
        } catch {
          /* 跳过无法读取的文件 */
        }
      }
      if (!images.length) {
        onNotify?.('图片读取失败，请重试')
        return
      }
      const { state } = editor
      const { from, to, empty } = state.selection
      if (empty) {
        onNotify?.('请先选中要插入图片的文本')
        return
      }
      const text = state.doc.textBetween(from, to, ' ')
      const node = {
        type: 'guideImages',
        attrs: { images },
        content: text ? [{ type: 'text', text }] : undefined,
      }
      editor.chain().focus().insertContentAt({ from, to }, node).setTextSelection({ from, to }).run()
    },
    [editor, onNotify],
  )

  // —— 格式刷 ——
  // 复制当前选区的格式（字符格式 + 标题级别）
  const copyFormat = useCallback(() => {
    if (!editor) return
    if (editor.state.selection.empty) {
      onNotify?.('请先选中要复制格式的文本')
      return
    }
    const textStyle = editor.getAttributes('textStyle')
    paintRef.current = {
      bold: editor.isActive('bold'),
      italic: editor.isActive('italic'),
      strike: editor.isActive('strike'),
      color: textStyle?.color || null,
      fontSize: textStyle?.fontSize || null,
      heading: editor.isActive('heading') ? editor.getAttributes('heading').level : 0,
    }
    setPaintMode(true)
    onNotify?.('已复制格式，请选中目标文本后再次点击格式刷')
  }, [editor, onNotify])

  // 把已复制的格式应用到当前选区，然后退出格式刷模式
  const applyFormat = useCallback(() => {
    if (!editor || !paintRef.current) return
    if (editor.state.selection.empty) {
      onNotify?.('请先选中要应用格式的文本')
      return
    }
    const fmt = paintRef.current
    let chain = editor.chain().focus()
    chain = fmt.bold ? chain.setBold() : chain.unsetBold()
    chain = fmt.italic ? chain.setItalic() : chain.unsetItalic()
    chain = fmt.strike ? chain.setStrike() : chain.unsetStrike()
    chain = fmt.color ? chain.setColor(fmt.color) : chain.unsetColor()
    // 目标是标题时字号交给标题 CSS，不再套用内联 fontSize，保证标题大小统一
    chain = fmt.fontSize && !fmt.heading ? chain.setFontSize(fmt.fontSize) : chain.unsetFontSize()
    chain = fmt.heading ? chain.setHeading({ level: fmt.heading }) : chain.setParagraph()
    chain.run()
    setPaintMode(false)
    paintRef.current = null
    onNotify?.('已应用格式')
  }, [editor, onNotify])

  // 格式刷按钮：模式中 → 应用；否则 → 复制
  const handleFormatPaint = useCallback(() => {
    if (paintMode) applyFormat()
    else copyFormat()
  }, [paintMode, applyFormat, copyFormat])

  // Esc 退出格式刷模式
  useEffect(() => {
    if (!paintMode) return
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setPaintMode(false)
        paintRef.current = null
        onNotify?.('已退出格式刷')
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [paintMode, onNotify])

  // 点击工具栏「插入图片」→ 打开上传面板
  const handlePickImages = () => setUploadPanel({ mode: 'insert' })

  // 上传面板确认：根据模式分发到「插入选中文本」或「追加到当前节点」
  const handleUploadConfirm = useCallback(
    (files) => {
      const mode = uploadPanel?.mode
      setUploadPanel(null)
      if (mode === 'add') handleAddImages(files)
      else insertImagesToSelection(files)
    },
    [uploadPanel, handleAddImages, insertImagesToSelection],
  )

  // 拖拽图片到编辑器：需先选中文本
  const handleDragOver = (e) => {
    e.preventDefault()
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy'
  }

  const handleDrop = async (e) => {
    e.preventDefault()
    const files = Array.from(e.dataTransfer?.files || []).filter((f) => f.type.startsWith('image/'))
    if (!files.length) return
    await insertImagesToSelection(files)
  }

  // 暴露给父组件的命令
  useImperativeHandle(
    ref,
    () => ({
      setContent: (html) => {
        if (!editor) return
        editor.commands.setContent(html, true)
      },
    }),
    [editor],
  )

  return (
    <div
      className="editor-wrap"
      ref={wrapRef}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onTouchEnd={clearLongPress}
      onTouchMove={clearLongPress}
      onTouchCancel={clearLongPress}
    >
      <EditorToolbar
        editor={editor}
        state={state}
        onInsertImages={handlePickImages}
        paintMode={paintMode}
        onFormatPaint={handleFormatPaint}
      />
      <EditorContent editor={editor} className="editor-content" />
      <ImageGallery
        images={popup?.images || []}
        position={popup}
        manage={popup?.mode === 'manage'}
        onClose={() => setPopup(null)}
        onDelete={handleDeleteImage}
        onAdd={() => setUploadPanel({ mode: 'add' })}
      />
      {uploadPanel && (
        <ImageUploadPanel
          title={uploadPanel.mode === 'add' ? '添加图片' : '插入图片'}
          onConfirm={handleUploadConfirm}
          onClose={() => setUploadPanel(null)}
        />
      )}
    </div>
  )
})

export default TipTapEditor
