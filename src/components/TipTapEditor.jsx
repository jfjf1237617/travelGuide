import { useEditor, EditorContent } from '@tiptap/react'
import { useEditorState } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import TextStyle from '@tiptap/extension-text-style'
import Color from '@tiptap/extension-color'
import Placeholder from '@tiptap/extension-placeholder'
import FontSize from '../extensions/FontSize'
import EditorToolbar from './EditorToolbar'

export default function TipTapEditor({ initialContent = '', onChange }) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      TextStyle,
      FontSize,
      Color.configure({ types: ['textStyle'] }),
      Placeholder.configure({
        placeholder: '开始撰写你的旅游攻略，比如景点、行程、美食、住宿、预算……',
      }),
    ],
    content: initialContent,
    onUpdate: ({ editor }) => onChange?.(editor.getHTML()),
  })

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
        isItalic: editor.isActive('italic'),
        isStrike: editor.isActive('strike'),
        isCode: editor.isActive('code'),
        isBulletList: editor.isActive('bulletList'),
        isOrderedList: editor.isActive('orderedList'),
        isBlockquote: editor.isActive('blockquote'),
        isHorizontalRule: editor.isActive('horizontalRule'),
      }
    },
  })

  return (
    <div className="editor-wrap">
      <EditorToolbar editor={editor} state={state} />
      <EditorContent editor={editor} className="editor-content" />
    </div>
  )
}
