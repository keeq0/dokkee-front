import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import MainPage from '@/views/MainPage.vue'

vi.mock('@/components/AnalysisResult.vue', () => ({
  default: {
    name: 'AnalysisResult',
    template: '<div class="mock-analysis">Mock AnalysisResult</div>',
    props: ['documentUrl', 'documentName', 'expanded'],
    emits: ['analysis-complete', 'show-assistant']
  }
}))

describe('MainPage', () => {
  it('рендерит заголовок и кнопку "Скрыть меню"', () => {
    const wrapper = mount(MainPage)
    expect(wrapper.text()).toContain('Загрузка документов')
    expect(wrapper.find('.main-page__hide').text()).toBe('Скрыть меню')
  })

  it('по клику на "Скрыть меню" сворачивает UploadDocuments', async () => {
    const wrapper = mount(MainPage)
    const container = wrapper.find('.upload-documents-container')
    expect(container.classes()).not.toContain('collapsed')
    await wrapper.find('.main-page__hide').trigger('click')
    expect(wrapper.find('.upload-documents-container').classes()).toContain('collapsed')
  })
})