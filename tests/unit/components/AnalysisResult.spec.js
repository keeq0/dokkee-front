import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'

vi.mock('@/services/deepseek', () => ({
  chatCompletion: vi.fn(),
  DEEPSEEK_MODELS: { CHAT: 'deepseek-chat', REASONER: 'deepseek-reasoner' }
}))

import AnalysisResult from '@/components/AnalysisResult.vue'

describe('AnalysisResult — начальное состояние', () => {
  it('рендерится без documentUrl и показывает плейсхолдер', () => {
    const wrapper = mount(AnalysisResult)
    expect(wrapper.find('.analysis').exists()).toBe(true)
    expect(wrapper.find('.progress__status').text()).toBe('Загрузите документ(-ы) для начала работы')
  })

  it('progress-bar показывает 0% и нулевую ширину заливки', () => {
    const wrapper = mount(AnalysisResult)
    expect(wrapper.find('.bar__percentage').text()).toBe('0%')
    expect(wrapper.find('.bar__fill').attributes('style')).toContain('width: 0%')
  })

  it('кнопки ИИ-помощник, Сохранить и Скачать отчёт заблокированы без анализа', () => {
    const wrapper = mount(AnalysisResult)
    const buttons = wrapper.findAll('.panel__button')
    expect(buttons.length).toBe(3)
    buttons.forEach(btn => {
      expect(btn.attributes('disabled')).toBeDefined()
    })
  })

  it('клик по disabled ИИ-помощнику не эмитит show-assistant', async () => {
    const wrapper = mount(AnalysisResult)
    await wrapper.find('.ai-assistant').trigger('click')
    expect(wrapper.emitted('show-assistant')).toBeFalsy()
  })

  it('после успешного анализа кнопки становятся активными и progress = 100', async () => {
    const wrapper = mount(AnalysisResult)
    await wrapper.setData({ analysisResult: '## Отчёт', analysisInProgress: false, analysisError: false })

    expect(wrapper.find('.bar__percentage').text()).toBe('100%')
    expect(wrapper.find('.progress__status').text()).toBe('Анализ завершён')
    wrapper.findAll('.panel__button').forEach(btn => {
      expect(btn.attributes('disabled')).toBeUndefined()
    })
  })
})
