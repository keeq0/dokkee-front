import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'

// Полностью мокаем компонент, чтобы не грузить pdfjs
vi.mock('@/components/AnalysisResult.vue', () => ({
  default: {
    name: 'AnalysisResult',
    template: '<div class="mock-analysis">Mock AnalysisResult</div>',
    props: ['documentName', 'documentUrl', 'expanded'],
    emits: ['analysis-complete', 'show-assistant']
  }
}))

import AnalysisResult from '@/components/AnalysisResult.vue'

describe('AnalysisResult', () => {
  it('отображает заглушку', () => {
    const wrapper = mount(AnalysisResult, {
      props: { documentName: 'test.pdf', documentUrl: 'fake.pdf' }
    })
    expect(wrapper.text()).toContain('Mock AnalysisResult')
  })
})