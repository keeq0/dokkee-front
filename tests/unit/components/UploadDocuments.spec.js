// Мокаем картинки до импорта компонента
vi.mock('@/assets/pdf.png', () => ({ default: 'mock-pdf.png' }))
vi.mock('@/assets/doc.png', () => ({ default: 'mock-doc.png' }))

import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import UploadDocuments from '@/components/UploadDocuments.vue'

describe('UploadDocuments', () => {
  it('рендерит описание и кнопку "Мои документы"', () => {
    const wrapper = mount(UploadDocuments)
    expect(wrapper.text()).toContain('Убедитесь, что ваши документы')
    expect(wrapper.find('.upload-documents__button').text()).toBe('Мои документы')
  })

  it('при клике на "Мои документы" открывает список файлов', async () => {
    const wrapper = mount(UploadDocuments)
    await wrapper.find('.upload-documents__button').trigger('click')
    expect(wrapper.vm.showFileList).toBe(true)
    expect(wrapper.find('.file-list').exists()).toBe(true)
  })

  it('добавляет файл через метод onFilesAdded', () => {
    const wrapper = mount(UploadDocuments)
    const file = new File(['dummy'], 'test.pdf', { type: 'application/pdf' })
    wrapper.vm.onFilesAdded([file])
    expect(wrapper.vm.files).toHaveLength(1)
    expect(wrapper.vm.files[0].name).toBe('test.pdf')
  })

  it('эмитит "processing-started" при старте обработки', async () => {
    const wrapper = mount(UploadDocuments)
    wrapper.vm.agreed = true
    wrapper.vm.onFilesAdded([new File(['dummy'], 'doc.pdf', { type: 'application/pdf' })])
    await wrapper.vm.startProcessing()
    expect(wrapper.emitted('processing-started')).toBeTruthy()
  })
})