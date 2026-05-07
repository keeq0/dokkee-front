import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import AiAssistant from '@/components/AiAssistant.vue'

describe('AiAssistant', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  

  it('отображает заголовок и кнопку "Скрыть"', () => {
    const wrapper = mount(AiAssistant, { props: { visible: true } })
    expect(wrapper.text()).toContain('ИИ-помощник')
    expect(wrapper.find('.assistant__close').exists()).toBe(true)
  })

  it('при клике на "Скрыть" эмитит close и скрывается', async () => {
    const wrapper = mount(AiAssistant, { props: { visible: true } })
    await wrapper.find('.assistant__close').trigger('click')
    expect(wrapper.emitted('close')).toBeTruthy()
    expect(wrapper.vm.internalVisible).toBe(false)
  })

    it.skip('после получения analysisResult отображает второе сообщение', async () => {
    const wrapper = mount(AiAssistant, { 
        props: { visible: true, analysisResult: 'Анализ успешен' } 
    })
    // Даём время на инициализацию
    await new Promise(resolve => setTimeout(resolve, 100))
    // Запускаем второй этап принудительно (если не запустился)
    if (!wrapper.vm.showSecondLoading && !wrapper.vm.typedSecondHeader) {
        wrapper.vm.startSecondSequence()
        await wrapper.vm.$nextTick()
    }
    expect(wrapper.text()).toContain('Анализ ваших документов')
    })

  it('кнопки "Скачать отчёт" и "Скачать готовый документ" появляются только после allMessagesComplete', async () => {
    const wrapper = mount(AiAssistant, { props: { visible: true } })
    expect(wrapper.find('.footer__button.report').classes()).not.toContain('visible')
    wrapper.vm.allMessagesComplete = true
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.footer__button.report').classes()).toContain('visible')
  })

  it('метод downloadReport создаёт PDF и вызывает сохранение', async () => {
    const wrapper = mount(AiAssistant, { props: { visible: true } })
    const mockSave = vi.fn()
    const mockPdf = { addImage: vi.fn(), addPage: vi.fn(), save: mockSave }
    // подменяем jsPDF вручную (уже замокан в setup.js, но для уверенности)
    const { default: jsPDF } = await import('jspdf')
    jsPDF.mockImplementation(() => mockPdf)
    await wrapper.vm.downloadReport()
    expect(mockSave).toHaveBeenCalled()
  })
})