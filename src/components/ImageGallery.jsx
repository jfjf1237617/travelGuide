import { useEffect, useRef, useState } from 'react'

/**
 * 图片弹窗 + 全屏预览
 * - position：视口坐标（来自编辑器 coordsAtPos）
 * - 点击弹窗外部任意位置关闭
 * - 图片横向排列、可横向滚动；点击缩略图全屏预览
 * - manage=true 时为管理模式：每张图可删除，底部「添加图片」按钮可追加图片
 * - 全屏支持左右箭头、键盘方向键、触摸滑动切换上一张/下一张
 */
export default function ImageGallery({ images, position, onClose, onDelete, onAdd, manage = false }) {
  const [fsIndex, setFsIndex] = useState(null)
  const popupRef = useRef(null)
  const fsOverlayRef = useRef(null)
  const dragStartX = useRef(null) // 拖拽起始横坐标
  const dragMoved = useRef(false) // 是否发生了滑动切换（抑制随后的 click 关闭）

  // 点击弹窗外部 → 关闭（全屏预览区域内部不触发，避免点箭头时误关）
  useEffect(() => {
    if (!position) return
    const onPointerDown = (e) => {
      if (fsOverlayRef.current?.contains(e.target)) return
      if (popupRef.current && !popupRef.current.contains(e.target)) onClose()
    }
    document.addEventListener('pointerdown', onPointerDown, true)
    return () => document.removeEventListener('pointerdown', onPointerDown, true)
  }, [position, onClose])

  useEffect(() => {
    if (fsIndex === null) return
    const onKey = (e) => {
      if (e.key === 'ArrowLeft') setFsIndex((i) => (i > 0 ? i - 1 : images.length - 1))
      else if (e.key === 'ArrowRight') setFsIndex((i) => (i < images.length - 1 ? i + 1 : 0))
      else if (e.key === 'Escape') setFsIndex(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [fsIndex, images.length])

  // 图片列表变短时校正全屏索引，防止越界显示裂图
  useEffect(() => {
    if (fsIndex !== null && fsIndex >= images.length) {
      setFsIndex(images.length ? images.length - 1 : null)
    }
  }, [images.length, fsIndex])

  const prev = () => setFsIndex((i) => (i > 0 ? i - 1 : images.length - 1))
  const next = () => setFsIndex((i) => (i < images.length - 1 ? i + 1 : 0))

  // 渲染用安全索引：images 为空则关闭全屏
  const safeIndex = fsIndex !== null && fsIndex < images.length ? fsIndex : null

  // 全屏内左右滑动（触摸 / 鼠标拖拽）切换上一张下一张
  const handleFsPointerDown = (e) => {
    dragStartX.current = e.clientX
    dragMoved.current = false
  }

  const handleFsPointerUp = (e) => {
    if (dragStartX.current == null) return
    const dx = e.clientX - dragStartX.current
    dragStartX.current = null
    if (Math.abs(dx) < 30) return // 位移过小视为点击，交给 onClick
    dragMoved.current = true // 标记已滑动，抑制随后的 click
    if (dx < 0) next()
    else prev()
  }

  const handleFsClick = (e) => {
    if (dragMoved.current) {
      dragMoved.current = false
      return
    }
    setFsIndex(null)
  }

  return (
    <>
      {position && (
        <div
          className={`image-popup ${manage ? 'manage' : 'view'}`}
          ref={popupRef}
          style={{ left: position.left, top: position.top }}
        >
          <div className={`image-popup-scroll ${manage ? 'manage' : 'view'}`}>
            {images.map((src, i) => (
              <div key={i} className="image-popup-thumb">
                <img src={src} alt={`图片 ${i + 1}`} onClick={() => setFsIndex(i)} />
                {manage && (
                  <button
                    type="button"
                    className="thumb-del"
                    title="删除图片"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={(e) => {
                      e.stopPropagation()
                      onDelete?.(i)
                    }}
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
            {images.length === 0 && <div className="image-popup-empty">还没有图片</div>}
          </div>
          {manage && (
            <div className="image-popup-actions">
              <button type="button" className="image-popup-add" onClick={onAdd}>
                ＋ 添加图片
              </button>
            </div>
          )}
        </div>
      )}

      {safeIndex !== null && (
        <div
          className="fs-overlay"
          ref={fsOverlayRef}
          onClick={handleFsClick}
          onPointerDown={handleFsPointerDown}
          onPointerUp={handleFsPointerUp}
        >
          <img
            key={safeIndex}
            src={images[safeIndex]}
            alt={`图片 ${safeIndex + 1}`}
            onClick={(e) => e.stopPropagation()}
            draggable={false}
          />
          {images.length > 1 && (
            <>
              <button
                type="button"
                className="fs-btn fs-prev"
                title="上一张 (←)"
                onClick={(e) => {
                  e.stopPropagation()
                  prev()
                }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
              <button
                type="button"
                className="fs-btn fs-next"
                title="下一张 (→)"
                onClick={(e) => {
                  e.stopPropagation()
                  next()
                }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
              <div className="fs-counter">
                {safeIndex + 1} / {images.length}
              </div>
            </>
          )}
          <button
            type="button"
            className="fs-close"
            title="关闭 (Esc)"
            onClick={(e) => {
              e.stopPropagation()
              setFsIndex(null)
            }}
          >
            ×
          </button>
        </div>
      )}
    </>
  )
}
