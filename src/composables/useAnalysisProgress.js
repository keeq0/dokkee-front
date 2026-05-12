/**
 * Эмуляция стадий прогресса анализа документа.
 *
 * Реального бекенда нет: прогресс идёт по фиксированным стадиям 0 -> 10 -> 30 ->
 * 50 -> 70 -> 90 -> 99 со случайной задержкой между ними. Финальный переход на 100%
 * выполняется вызывающим кодом, когда DeepSeek вернёт ответ (через store.setAnalysisResult).
 */

export const DEFAULT_STAGES = Object.freeze([
  Object.freeze({ progress: 10, minDelay: 600, maxDelay: 1500 }),
  Object.freeze({ progress: 30, minDelay: 1000, maxDelay: 2500 }),
  Object.freeze({ progress: 50, minDelay: 1000, maxDelay: 2200 }),
  Object.freeze({ progress: 70, minDelay: 800, maxDelay: 2000 }),
  Object.freeze({ progress: 90, minDelay: 800, maxDelay: 1800 }),
  Object.freeze({ progress: 99, minDelay: 1500, maxDelay: 3000 })
])

const STATUS_BUCKETS = Object.freeze([
  { min: 100, text: 'Готово' },
  { min: 90, text: 'Заканчиваю…' },
  { min: 70, text: 'Почти готово…' },
  { min: 50, text: 'Структурирую…' },
  { min: 30, text: 'Ищу детали…' },
  { min: 10, text: 'Читаю…' },
  { min: 0, text: 'Начинаю…' }
])

export function getProgressStatusText(progress) {
  for (const bucket of STATUS_BUCKETS) {
    if (progress >= bucket.min) return bucket.text
  }
  return ''
}

export function randomBetween(min, max, random = Math.random) {
  return min + random() * (max - min)
}

/**
 * Создаёт эмулятор прогресса.
 * @param {Object} opts
 * @param {(progress: number) => void} opts.onProgress — колбэк при достижении новой стадии
 * @param {Array<{progress:number,minDelay:number,maxDelay:number}>} [opts.stages]
 * @param {() => number} [opts.random] — источник случайных чисел (для тестов)
 * @returns {{start: () => void, stop: () => void, isRunning: () => boolean}}
 */
export function createProgressEmulator({
  onProgress,
  stages = DEFAULT_STAGES,
  random = Math.random
} = {}) {
  if (typeof onProgress !== 'function') {
    throw new Error('createProgressEmulator: onProgress callback is required')
  }

  let timer = null
  let index = 0
  let running = false

  function scheduleNext() {
    if (!running || index >= stages.length) return
    const stage = stages[index]
    const delay = randomBetween(stage.minDelay, stage.maxDelay, random)
    timer = setTimeout(() => {
      if (!running) return
      onProgress(stage.progress)
      index += 1
      scheduleNext()
    }, delay)
  }

  return {
    start() {
      if (running) return
      running = true
      index = 0
      scheduleNext()
    },
    stop() {
      running = false
      if (timer) {
        clearTimeout(timer)
        timer = null
      }
    },
    isRunning() {
      return running
    }
  }
}
