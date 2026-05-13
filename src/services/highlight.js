/**
 * Подсветка точного вхождения текста в произвольном DOM-узле, в т.ч. когда
 * вхождение пересекает границы дочерних тегов. Используется и для DOCX-превью
 * (mammoth-HTML), и для PDF text-layer (span'ы из pdf.js).
 */

const DEFAULT_TAG = 'mark'

function collectTextNodes(root) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null)
  const items = []
  let text = ''
  let node = walker.nextNode()
  while (node) {
    const value = node.nodeValue ?? ''
    if (value.length > 0) {
      items.push({ node, start: text.length, end: text.length + value.length })
      text += value
    }
    node = walker.nextNode()
  }
  return { text, items }
}

function applyDataset(el, dataset) {
  if (!dataset) return
  Object.entries(dataset).forEach(([key, value]) => {
    if (value === null || value === undefined) return
    el.dataset[key] = String(value)
  })
}

/**
 * Ищет первое вхождение query в текстовом содержимом root и подсвечивает его.
 *
 * mode='wrap' (по умолчанию): оборачивает фрагмент в элемент-обёртку через
 * Range.surroundContents либо Range.extractContents+insertNode для случая
 * пересечения границ тегов. Подходит для inline-HTML (например, DOCX от
 * mammoth).
 *
 * mode='overlay': создаёт абсолютно позиционированные элементы поверх
 * каждого client-rect фрагмента (Range.getClientRects). Сам DOM не меняется,
 * поэтому подходит для абсолютно позиционированных структур (PDF text-layer
 * от pdf.js).
 *
 * @param {Element} root
 * @param {string}  query
 * @param {Object}  opts
 * @param {string}  [opts.className]
 * @param {Object<string,string>} [opts.dataset]
 * @param {(event: MouseEvent) => void} [opts.onClick]
 * @param {string}  [opts.tag='mark']
 * @param {'wrap'|'overlay'} [opts.mode='wrap']
 * @returns {Element|Element[]|null}
 */
export function highlightTextInRoot(root, query, opts = {}) {
  if (!root || !query) return null
  const {
    className = '',
    dataset = null,
    onClick,
    tag = DEFAULT_TAG,
    mode = 'wrap'
  } = opts
  const needle = String(query)
  if (needle.length < 1) return null

  const { text, items } = collectTextNodes(root)
  const idx = text.indexOf(needle)
  if (idx < 0) return null
  const endIdx = idx + needle.length

  const startEntry = items.find((entry) => idx >= entry.start && idx < entry.end)
  const endEntry = items.find((entry) => endIdx > entry.start && endIdx <= entry.end)
  if (!startEntry || !endEntry) return null

  const startOffset = idx - startEntry.start
  const endOffset = endIdx - endEntry.start

  const range = document.createRange()
  try {
    range.setStart(startEntry.node, startOffset)
    range.setEnd(endEntry.node, endOffset)
  } catch (error) {
    return null
  }

  if (mode === 'overlay') {
    return createOverlayHighlights(root, range, { className, dataset, onClick })
  }

  const wrapper = document.createElement(tag)
  if (className) wrapper.className = className
  applyDataset(wrapper, dataset)
  if (typeof onClick === 'function') {
    wrapper.addEventListener('click', onClick)
  }

  try {
    if (startEntry.node === endEntry.node) {
      range.surroundContents(wrapper)
    } else {
      wrapper.appendChild(range.extractContents())
      range.insertNode(wrapper)
    }
  } catch (error) {
    return null
  }

  return wrapper
}

function createOverlayHighlights(root, range, { className, dataset, onClick }) {
  const rectList = typeof range.getClientRects === 'function' ? range.getClientRects() : []
  if (!rectList || rectList.length === 0) return null
  const rootRect = root.getBoundingClientRect()
  const scrollX = root.scrollLeft || 0
  const scrollY = root.scrollTop || 0
  const overlays = []
  for (const rect of Array.from(rectList)) {
    if (!rect.width || !rect.height) continue
    const overlay = document.createElement('span')
    if (className) overlay.className = className
    applyDataset(overlay, dataset)
    overlay.style.position = 'absolute'
    overlay.style.left = `${rect.left - rootRect.left + scrollX}px`
    overlay.style.top = `${rect.top - rootRect.top + scrollY}px`
    overlay.style.width = `${rect.width}px`
    overlay.style.height = `${rect.height}px`
    overlay.style.pointerEvents = 'auto'
    if (typeof onClick === 'function') {
      overlay.addEventListener('click', onClick)
    }
    root.appendChild(overlay)
    overlays.push(overlay)
  }
  return overlays.length > 0 ? overlays : null
}

/**
 * Разворачивает все элементы по селектору внутри root: их детей перемещает
 * к родителю и удаляет сам элемент. Восстанавливает соседние TextNode'ы.
 */
export function clearHighlights(root, selector) {
  if (!root || !selector) return
  root.querySelectorAll(selector).forEach((el) => {
    const parent = el.parentNode
    if (!parent) return
    while (el.firstChild) parent.insertBefore(el.firstChild, el)
    parent.removeChild(el)
    if (typeof parent.normalize === 'function') parent.normalize()
  })
}
