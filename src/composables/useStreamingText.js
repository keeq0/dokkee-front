/**
 * Эмуляция стриминга текста: посимвольный вывод заранее полученной строки.
 *
 * Реального SSE/streaming от DeepSeek в этом проекте нет — после получения
 * ответа целиком мы дописываем его в видимое сообщение чанками с задержкой,
 * чтобы интерфейс выглядел как «модель печатает».
 */

const DEFAULT_CHUNK_SIZE = 3
const DEFAULT_DELAY_MS = 18

export function createTextStreamer({
  content = '',
  onUpdate,
  onDone,
  chunkSize = DEFAULT_CHUNK_SIZE,
  delay = DEFAULT_DELAY_MS
} = {}) {
  if (typeof onUpdate !== 'function') {
    throw new Error('createTextStreamer: onUpdate callback is required')
  }
  const total = String(content)
  let index = 0
  let timer = null
  let running = false

  function tick() {
    if (!running) return
    const next = Math.min(index + chunkSize, total.length)
    onUpdate(total.slice(0, next))
    index = next
    if (index >= total.length) {
      running = false
      timer = null
      if (typeof onDone === 'function') onDone()
      return
    }
    timer = setTimeout(tick, delay)
  }

  return {
    start() {
      if (running || total.length === 0) {
        if (total.length === 0 && typeof onDone === 'function') onDone()
        return
      }
      running = true
      index = 0
      onUpdate('')
      timer = setTimeout(tick, delay)
    },
    stop({ flush = false } = {}) {
      running = false
      if (timer) {
        clearTimeout(timer)
        timer = null
      }
      if (flush) {
        onUpdate(total)
        if (typeof onDone === 'function') onDone()
      }
    },
    isRunning() {
      return running
    }
  }
}
