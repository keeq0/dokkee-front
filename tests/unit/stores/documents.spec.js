import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useDocumentsStore } from '@/stores/documents'

describe('documents store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('инициализируется пустым', () => {
    const store = useDocumentsStore()
    expect(store.items).toEqual([])
    expect(store.selectedId).toBeNull()
    expect(store.count).toBe(0)
    expect(store.selected).toBeNull()
  })

  it('add добавляет документ и пересчитывает count', () => {
    const store = useDocumentsStore()
    store.add({ id: 1, title: 'doc-1' })
    store.add({ id: 2, title: 'doc-2' })
    expect(store.items).toHaveLength(2)
    expect(store.count).toBe(2)
  })

  it('select выставляет selectedId, getter selected возвращает документ', () => {
    const store = useDocumentsStore()
    store.add({ id: 10, title: 'doc-10' })
    store.add({ id: 20, title: 'doc-20' })
    store.select(20)
    expect(store.selectedId).toBe(20)
    expect(store.selected).toEqual({ id: 20, title: 'doc-20' })
  })

  it('selected возвращает null, если выбранный id не существует', () => {
    const store = useDocumentsStore()
    store.add({ id: 1, title: 'doc-1' })
    store.select(999)
    expect(store.selected).toBeNull()
  })

  it('remove удаляет документ и сбрасывает selectedId, если удалён выбранный', () => {
    const store = useDocumentsStore()
    store.add({ id: 1, title: 'doc-1' })
    store.add({ id: 2, title: 'doc-2' })
    store.select(1)
    store.remove(1)
    expect(store.items).toHaveLength(1)
    expect(store.items[0].id).toBe(2)
    expect(store.selectedId).toBeNull()
  })

  it('remove не сбрасывает selectedId, если удалён другой документ', () => {
    const store = useDocumentsStore()
    store.add({ id: 1, title: 'doc-1' })
    store.add({ id: 2, title: 'doc-2' })
    store.select(2)
    store.remove(1)
    expect(store.selectedId).toBe(2)
    expect(store.selected).toEqual({ id: 2, title: 'doc-2' })
  })

  it('reset очищает всё', () => {
    const store = useDocumentsStore()
    store.add({ id: 1, title: 'doc-1' })
    store.select(1)
    store.reset()
    expect(store.items).toEqual([])
    expect(store.selectedId).toBeNull()
    expect(store.count).toBe(0)
  })
})
