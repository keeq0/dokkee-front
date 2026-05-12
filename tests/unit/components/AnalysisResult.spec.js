import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import { useDocumentsStore, createDocumentRecord, DOCUMENT_STATUS } from '@/stores/documents'

vi.mock('@/services/deepseek', () => ({
  chatCompletion: vi.fn(),
  DEEPSEEK_MODELS: { CHAT: 'deepseek-chat', REASONER: 'deepseek-reasoner' }
}))

vi.mock('mammoth', () => ({
  default: { convertToHtml: vi.fn().mockResolvedValue({ value: '<p>mock</p>' }) }
}))

import AnalysisResult from '@/components/AnalysisResult.vue'

function mountAnalysis(setup) {
  const pinia = createTestingPinia({ stubActions: false })
  const wrapper = mount(AnalysisResult, { global: { plugins: [pinia] } })
  const store = useDocumentsStore()
  if (setup) setup(store)
  return { wrapper, store }
}

describe('AnalysisResult — начальное состояние', () => {
  it('рендерится без документов и показывает плейсхолдер', () => {
    const { wrapper } = mountAnalysis()
    expect(wrapper.find('.analysis').exists()).toBe(true)
    expect(wrapper.find('.progress__status').text()).toBe('Загрузите документ(-ы) для начала работы')
  })

  it('progress-bar показывает 0% и нулевую ширину заливки', () => {
    const { wrapper } = mountAnalysis()
    expect(wrapper.find('.bar__percentage').text()).toBe('0%')
    expect(wrapper.find('.bar__fill').attributes('style')).toContain('width: 0%')
  })

  it('кнопки заблокированы без анализа', () => {
    const { wrapper } = mountAnalysis()
    const buttons = wrapper.findAll('.panel__button')
    expect(buttons.length).toBe(3)
    buttons.forEach((btn) => {
      expect(btn.attributes('disabled')).toBeDefined()
    })
  })

  it('клик по disabled ИИ-помощнику не эмитит show-assistant', async () => {
    const { wrapper } = mountAnalysis()
    await wrapper.find('.ai-assistant').trigger('click')
    expect(wrapper.emitted('show-assistant')).toBeFalsy()
  })

  it('file-selector скрыт от взаимодействия, когда нет документов', () => {
    const { wrapper } = mountAnalysis()
    expect(wrapper.find('.file-selector--disabled').exists()).toBe(true)
  })
})

describe('AnalysisResult — состояние с документами', () => {
  it('после успешного анализа выбранного документа кнопки активны и progress = 100', async () => {
    const { wrapper, store } = mountAnalysis((s) => {
      const rec = createDocumentRecord({ name: 'a.pdf', type: 'pdf' })
      s.add(rec)
      s.select(rec.id)
      s.setAnalysisResult(rec.id, '## report')
    })
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.bar__percentage').text()).toBe('100%')
    expect(wrapper.find('.progress__status').text()).toBe('Анализ завершён')
    wrapper.findAll('.panel__button').forEach((btn) => {
      expect(btn.attributes('disabled')).toBeUndefined()
    })
    expect(store.selected.status).toBe(DOCUMENT_STATUS.DONE)
  })

  it('file-selector dropdown открывается по клику и показывает все документы', async () => {
    const { wrapper } = mountAnalysis((s) => {
      const a = createDocumentRecord({ name: 'a.pdf', type: 'pdf' })
      const b = createDocumentRecord({ name: 'b.docx', type: 'docx' })
      s.add(a)
      s.add(b)
      s.select(a.id)
    })
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.file-selector__dropdown').exists()).toBe(false)
    await wrapper.find('.file-selector').trigger('click')
    const items = wrapper.findAll('.file-selector__item')
    expect(items.length).toBe(2)
    expect(items[0].classes()).toContain('file-selector__item--active')
  })

  it('клик по элементу dropdown переключает выбранный документ', async () => {
    const { wrapper, store } = mountAnalysis((s) => {
      const a = createDocumentRecord({ name: 'a.pdf', type: 'pdf' })
      const b = createDocumentRecord({ name: 'b.docx', type: 'docx' })
      s.add(a)
      s.add(b)
      s.select(a.id)
    })
    await wrapper.vm.$nextTick()

    await wrapper.find('.file-selector').trigger('click')
    const second = wrapper.findAll('.file-selector__item')[1]
    await second.trigger('click')
    expect(store.selectedId).toBe(store.items[1].id)
  })

  it('progressStatusText показывает "Ошибка анализа" при analysisError', async () => {
    const { wrapper } = mountAnalysis((s) => {
      const rec = createDocumentRecord({ name: 'a.pdf', type: 'pdf' })
      s.add(rec)
      s.select(rec.id)
      s.setAnalysisError(rec.id)
    })
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.progress__status').text()).toBe('Ошибка анализа')
  })
})
