import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  createProgressEmulator,
  getProgressStatusText,
  randomBetween,
  DEFAULT_STAGES
} from '@/composables/useAnalysisProgress'

describe('getProgressStatusText', () => {
  it.each([
    [0, 'Начинаю…'],
    [5, 'Начинаю…'],
    [10, 'Читаю…'],
    [29, 'Читаю…'],
    [30, 'Ищу детали…'],
    [49, 'Ищу детали…'],
    [50, 'Структурирую…'],
    [69, 'Структурирую…'],
    [70, 'Почти готово…'],
    [89, 'Почти готово…'],
    [90, 'Заканчиваю…'],
    [99, 'Заканчиваю…'],
    [100, 'Готово']
  ])('progress=%s -> "%s"', (progress, expected) => {
    expect(getProgressStatusText(progress)).toBe(expected)
  })
})

describe('randomBetween', () => {
  it('возвращает значение в диапазоне [min, max)', () => {
    expect(randomBetween(0, 100, () => 0)).toBe(0)
    expect(randomBetween(0, 100, () => 0.5)).toBe(50)
    expect(randomBetween(10, 20, () => 0.999)).toBeCloseTo(19.99)
  })
})

describe('createProgressEmulator', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('бросает ошибку, если onProgress не передан', () => {
    expect(() => createProgressEmulator()).toThrow(/onProgress/)
  })

  it('проходит все стадии по очереди', () => {
    const onProgress = vi.fn()
    const emulator = createProgressEmulator({ onProgress, random: () => 0 })
    emulator.start()

    // Каждая стадия — это setTimeout. Прокручиваем все.
    vi.runAllTimers()

    const calls = onProgress.mock.calls.map((c) => c[0])
    expect(calls).toEqual(DEFAULT_STAGES.map((s) => s.progress))
    expect(emulator.isRunning()).toBe(true) // stop вручную после реального завершения
  })

  it('stop останавливает дальнейшие переходы', () => {
    const onProgress = vi.fn()
    const emulator = createProgressEmulator({
      onProgress,
      stages: [
        { progress: 10, minDelay: 100, maxDelay: 100 },
        { progress: 20, minDelay: 100, maxDelay: 100 },
        { progress: 30, minDelay: 100, maxDelay: 100 }
      ],
      random: () => 0
    })
    emulator.start()
    vi.advanceTimersByTime(100)
    expect(onProgress).toHaveBeenCalledWith(10)
    emulator.stop()
    vi.advanceTimersByTime(1000)
    expect(onProgress).toHaveBeenCalledTimes(1)
    expect(emulator.isRunning()).toBe(false)
  })

  it('повторный start без stop игнорируется', () => {
    const onProgress = vi.fn()
    const emulator = createProgressEmulator({
      onProgress,
      stages: [{ progress: 50, minDelay: 100, maxDelay: 100 }],
      random: () => 0
    })
    emulator.start()
    emulator.start()
    vi.advanceTimersByTime(100)
    expect(onProgress).toHaveBeenCalledTimes(1)
  })

  it('задержка первой стадии = minDelay при random=0', () => {
    const onProgress = vi.fn()
    const emulator = createProgressEmulator({
      onProgress,
      stages: [{ progress: 10, minDelay: 1000, maxDelay: 2000 }],
      random: () => 0
    })
    emulator.start()
    vi.advanceTimersByTime(999)
    expect(onProgress).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(onProgress).toHaveBeenCalledWith(10)
  })

  it('задержка первой стадии = maxDelay при random=1', () => {
    const onProgress = vi.fn()
    const emulator = createProgressEmulator({
      onProgress,
      stages: [{ progress: 10, minDelay: 1000, maxDelay: 2000 }],
      random: () => 1
    })
    emulator.start()
    vi.advanceTimersByTime(1999)
    expect(onProgress).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(onProgress).toHaveBeenCalledWith(10)
  })
})
