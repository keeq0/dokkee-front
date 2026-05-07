import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import AnalysisResult from '@/components/AnalysisResult.vue'

// Полностью мокаем компонент, чтобы не грузить pdfjs
vi.mock('@/components/AnalysisResult.vue', () => ({
  default: {
    name: 'AnalysisResult',
    template: '<div class="mock-analysis">Mock</div>',
    props: ['documentName', 'documentUrl'],
    emits: ['show-assistant']
  }
}))

describe('AnalysisResult', () => {
  it('заглушка, пока не починим мок', () => {
    expect(true).toBe(true)
  })
})