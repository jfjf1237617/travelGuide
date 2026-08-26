import { Node, mergeAttributes } from '@tiptap/core'

/**
 * 攻略图片节点：内联节点，把一段文本与一组 base64 图片绑定。
 * 点击该段文本会在其位置弹出图片悬浮窗。
 */
const GuideImages = Node.create({
  name: 'guideImages',

  group: 'inline',
  inline: true,
  content: 'text*',
  selectable: true,

  addAttributes() {
    return {
      images: {
        default: [],
        parseHTML: (element) => {
          const raw = element.getAttribute('data-images')
          try {
            const arr = raw ? JSON.parse(raw) : []
            return Array.isArray(arr) ? arr : []
          } catch {
            return []
          }
        },
        renderHTML: (attributes) => {
          const list = Array.isArray(attributes.images) ? attributes.images : []
          return { 'data-images': JSON.stringify(list) }
        },
      },
    }
  },

  parseHTML() {
    return [{ tag: 'span[data-guide-images]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        'data-guide-images': '',
        class: 'guide-images',
        title: '右键或长按可查看/管理图片',
      }),
      0,
    ]
  },

  addCommands() {
    return {
      // 用一组图片替换当前选中的文本（文本保留并绑定图片）
      insertGuideImages:
        (images) =>
        ({ state, commands }) => {
          const { selection } = state
          const { from, to, empty } = selection
          if (empty) return false
          const text = state.doc.textBetween(from, to, ' ')
          const node = {
            type: 'guideImages',
            attrs: { images },
            content: text ? [{ type: 'text', text }] : undefined,
          }
          return commands.insertContentAt({ from, to }, node)
        },
    }
  },
})

export default GuideImages
