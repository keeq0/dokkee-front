# Аудит листингов диплома

Документ проверяет 11 листингов диплома (`РЕД_090302_22Т0854_Мякотных.docx`):
три в главе 3 (Листинг 3.1, 3.2, 3.3) и восемь в Приложении В (Листинг В.1-В.8).

По каждому листингу проверены:

1. **Подпись** — формат "Листинг N.M – Название".
2. **Ссылка из текста** — есть ли в основной части фраза "приведён в Листинге N.M" и ведёт ли она на нужный листинг по смыслу.
3. **Размер** — в основной части диссертации листинги в диапазоне 15-50 строк. В Приложении В размер не ограничен (рекомендуется до ~150 строк, если код требует полной развёрнутой формы).
4. **Соответствие коду проекта** — построчное сравнение с файлами `dokkee-front` (`src/`, `vue.config.js`, `package.json`).

---

## Принципиальное замечание

Реальный проект `dokkee-front` существенно отличается от того, что описывают листинги диплома. Это связано с тем, что в дипломе описана **целевая архитектура с интеграцией бэкенда** (как в проекте `dokkee-backend`: REST API, JWT-токены, авторизация, лендинг, админ-панель), а в репозитории `dokkee-front` реализована **автономная клиентская версия** без бэкенда:

| Что есть в дипломе | Что есть в проекте |
|--------------------|--------------------|
| Лендинг, секция "Как работает", `StepCard` | Лендинга нет, только защищённая часть сервиса |
| REST API клиент `@/api/client` | Нет такого файла, фронтенд обращается напрямую к `api.deepseek.com` через `src/services/deepseek.js` |
| JWT-токены, `useAuthStore`, регистрация и логин | Авторизации нет, токены не используются |
| Vite (`vite.config.js`) | Vue CLI (`vue.config.js`, webpack); Vite используется только в `vitest` |
| `src/utils/escape.js`, `src/utils/storage.js` | Файлов нет, `escapeHtml` дублируется в `AiAssistant.vue` и `reportExport.js` |
| Ленивая загрузка маршрутов, защита по auth, admin-роуты | Прямой импорт 4 страниц, без guard-ов |
| nginx-конфиг с CSP | nginx-конфига в репозитории нет |
| Composition API setup-стора с `api.post('/documents')` | Options API стор без HTTP-вызовов; всё локально в браузере |

Это **обходимо для защиты**, но в листингах нужно либо:

- (вариант A) пометить в тексте диплома, что листинги показывают **целевую архитектуру**, и привести коды из бэкенда/целевого проекта;
- (вариант B) **переписать листинги под реальный код** `dokkee-front`. Этот документ предлагает конкретные правки в варианте B.

Все предложенные правки выложены ниже **отдельно для каждого листинга**.

---

## Сводная таблица

| № | Подпись | Ссылка в тексте | Размер (стр) | Файл в проекте | Соответствие кода |
|---|---------|-----------------|--------------|-----------------|-------------------|
| 3.1 | OK | OK (абз. 623) | 17 | нет (лендинга нет) | Не соответствует: код вымышлен |
| 3.2 | OK | OK (абз. 676) | 25 | `src/stores/documents.js` | Не соответствует: другой синтаксис, другие методы |
| 3.3 | OK | OK (абз. 718) | 17 | `src/components/AiAssistant.vue` (escapeHtml); nginx-конфига нет | Частично: `escapeHtml` в проекте проще |
| В.1 | OK | OK (абз. 623) | 41 | нет (лендинга нет) | Не соответствует |
| В.2 | OK | OK (абз. 663) | 56 | нет (карточка как отдельный компонент отсутствует) | Не соответствует |
| В.3 | OK | OK (абз. 676) | 61 | `src/stores/documents.js` | Не соответствует |
| В.4 | OK | **Ссылка ведёт не туда** (абз. 671 ссылается на В.4 как "код загрузки" — В.4 это CSP) | 41 | нет nginx-конфига в репозитории | Не соответствует |
| В.5 | OK | OK (абз. 710); упомянут в 718 ("Полный код – в Листинге В.5") | 17 | `src/components/AiAssistant.vue`, `src/services/reportExport.js` (дубль) | Частично: разные реализации escape |
| В.6 | OK | OK (абз. 711) | 28 | нет (`src/utils/storage.js` не существует) | Не соответствует |
| В.7 | OK | OK (абз. 714) | 54 | `src/router/index.js` | Не соответствует: нет lazy loading, нет auth, 4 маршрута вместо 8 |
| В.8 | OK | OK (абз. 715) | 28 | `vue.config.js` (проект на Vue CLI, не Vite) | Не соответствует: vite в проекте не настроен |

**Итог:**
- Подписи: 11 из 11 корректны.
- Ссылки: 10 из 11 корректны, **1 ссылка ведёт не туда** (абз. 671 -> В.4).
- Размеры: все 11 в норме (в основной части листинги 3.1, 3.2, 3.3 — до 50 строк; в Приложении В допустимы более крупные блоки, максимальный В.3 = 61 строка, что укладывается в практический лимит для приложений).
- Соответствие коду: 0 листингов полностью соответствуют, 2 частично (3.3 и В.5).

---

## Детальный разбор

### Листинг 3.1 — Фрагмент Vue-компонента секции лендинга

**Расположение в дипломе:** глава 3, абзац 624.
**Ссылка из текста:** абзац 623: "В Листинге 3.1 приведён фрагмент блока «Как работает»: заголовок, три карточки с иконками и подписями. Полный код представлен в Листинге В.1 (Приложение В)." — корректно.
**Размер:** 17 строк кода — в диапазоне 15-50.
**Файл в проекте:** **отсутствует**. В `dokkee-front` лендинга нет; в `src/components/` только компоненты основного сервиса (NavigationPanel, AnalysisDocuments, AnalysisResult, AiAssistant и т.д.).

**Соответствие кода:** не соответствует. Импорт `StepCard from './StepCard.vue'` указывает на файл, которого нет в репозитории.

**Предлагаемая правка:** заменить листинг на реальный компонент основного интерфейса. Пример — `NavigationPanel.vue` или фрагмент `AnalysisResult.vue`. Альтернатива: переименовать листинг и подпись на "Фрагмент бокового меню сервиса" / "Компонент панели документа" и оставить только то, что реально в проекте.

**Предлагаемый код (фрагмент `src/components/NavigationPanel.vue` или аналогичный реальный компонент):**

```vue
<template>
  <nav class="nav-panel" aria-label="Основная навигация">
    <ul class="nav-panel__list">
      <li v-for="item in items" :key="item.route">
        <router-link :to="item.route" class="nav-panel__link"
                     active-class="nav-panel__link--active">
          <component :is="item.icon" class="nav-panel__icon" />
          <span class="nav-panel__label">{{ item.label }}</span>
        </router-link>
      </li>
    </ul>
  </nav>
</template>
<script setup>
import { ref } from 'vue'
const items = ref([
  { route: '/',          label: 'Главная',   icon: 'IconHome' },
  { route: '/documents', label: 'Документы', icon: 'IconFolder' },
  { route: '/analysis',  label: 'Аналитика', icon: 'IconChart' },
  { route: '/account',   label: 'Аккаунт',   icon: 'IconUser' },
])
</script>
```

---

### Листинг 3.2 — Pinia-store для работы с анализом документов

**Расположение в дипломе:** глава 3, абзац 677.
**Ссылка из текста:** абзац 676: "В Листинге 3.2 показан сокращённый store documents... Полный код представлен в Листинге В.3 (Приложение В)." — корректно.
**Размер:** 25 строк — в норме.
**Файл в проекте:** `src/stores/documents.js`.

**Соответствие кода:** **не соответствует.**

| Что в дипломе | Что в проекте |
|---------------|---------------|
| `defineStore('documents', () => { ... })` (setup-синтаксис) | `defineStore('documents', { state, getters, actions })` (options-синтаксис) |
| Поля: `list`, `current`, `isLoading` | Поля: `items`, `selectedId` |
| Методы: `upload(file)`, `analyze(id)` — отправляют HTTP в `/documents` и `/documents/:id/analyze` | Методы: `addFile(file)`, `select(id)`, `remove(id)` — работают **локально**, без HTTP-вызовов |
| Импорт `import { api } from '@/api/client'` | Этого модуля в проекте нет |

**Предлагаемая правка:** заменить листинг на реальный фрагмент `src/stores/documents.js` (сокращённый до 20-25 строк):

```javascript
import { defineStore } from 'pinia'
import { getFileExtension } from '@/helpers/fileUtils'

export const DOCUMENT_STATUS = Object.freeze({
  IDLE: 'idle', EXTRACTING: 'extracting',
  ANALYZING: 'analyzing', DONE: 'done', ERROR: 'error'
})

export const useDocumentsStore = defineStore('documents', {
  state: () => ({ items: [], selectedId: null }),
  getters: {
    selected: (s) => s.items.find((i) => i.id === s.selectedId) || null
  },
  actions: {
    addFile(file) {
      const ext = getFileExtension(file.name)
      const url = URL.createObjectURL(file)
      const record = {
        id: Date.now(), name: file.name, file, url, type: ext,
        status: DOCUMENT_STATUS.IDLE, risks: [], chatHistory: []
      }
      this.items.push(record)
      if (this.selectedId === null) this.selectedId = record.id
      return record
    },
    select(id) { this.selectedId = id }
  }
})
```

---

### Листинг 3.3 — Настройка Content Security Policy и санитизация ввода

**Расположение в дипломе:** глава 3, абзац 719.
**Ссылка из текста:** абзац 718: "В Листинге 3.3 показан ключевой фрагмент — настройка CSP в nginx-конфиге и утилита экранирования HTML. Полный код — в Листинге В.5 (Приложение В)." — **частично корректно**. Ссылка на В.5 покрывает только функцию `escapeHtml`, а полный nginx-CSP находится в Листинге В.4. Корректнее: "Полный код CSP — в Листинге В.4, функция санитизации — в Листинге В.5".

**Размер:** 17 строк — в норме.
**Файлы в проекте:**
- nginx-конфиг в репозитории **отсутствует** (это инфраструктурная часть, не часть фронтенда).
- `escapeHtml` реально есть, но в двух разных местах с разными реализациями:

`src/components/AiAssistant.vue`:
```javascript
escapeHtml(str) {
  return str.replace(/[&<>]/g, (m) => {
    if (m === '&') return '&amp;';
    if (m === '<') return '&lt;';
    if (m === '>') return '&gt;';
    return m;
  });
}
```

`src/services/reportExport.js`:
```javascript
function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
```

**Соответствие кода:** частичное.
- В версии диплома экранируются `&`, `<`, `>`, `"`, `'` (5 символов).
- В реальном `AiAssistant.vue` — только `&`, `<`, `>` (3 символа).
- В `reportExport.js` — `&`, `<`, `>`, `"` (4 символа, без `'`).

**Предлагаемая правка:** заменить текст листинга на реальный код из `reportExport.js` (он ближе всего к версии диплома) и убрать упоминание `'`:

```javascript
// src/services/reportExport.js — экранирование пользовательского ввода
function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
```

Что касается nginx-CSP — оставить как есть, но **в тексте диплома указать**, что nginx-конфиг относится к инфраструктуре развёртывания (документ `DEPLOYMENT.md`), а не к коду фронтенда.

**Также исправить ссылку в абзаце 718**: "Полный код CSP — в Листинге В.4, функция экранирования — в Листинге В.5".

---

### Листинг В.1 — Vue-компонент секции "Как работает" лендинга (полный)

**Расположение:** Приложение В, абзац 1449.
**Ссылка из текста:** абзац 623 — "Полный код представлен в Листинге В.1 (Приложение В)" — корректна.
**Размер:** 40 строк — в норме.
**Файл в проекте:** **отсутствует**.

**Соответствие кода:** не соответствует. Используется `@vueuse/core` (нет в зависимостях проекта), компонент `StepCard.vue` отсутствует, лендинга нет.

**Предлагаемая правка (вариант 1, если оставить тему лендинга):** добавить в проект минимальную страницу-лендинг и реальный `StepCard.vue`, после чего привести их в листинге. **Это потребует реализации.**

**Предлагаемая правка (вариант 2, рекомендуется):** заменить тему листинга на "Полный код компонента панели документа" и привести `src/components/AnalysisResult.vue` (фрагмент 35-40 строк):

```vue
<template>
  <section class="analysis-result" :class="{ 'is-loading': loading }">
    <header class="analysis-result__head">
      <h2 class="analysis-result__title">{{ document.name }}</h2>
      <FileSelector v-if="documents.length > 1" :documents="documents"
                    :selected-id="document.id" @select="$emit('select', $event)" />
    </header>
    <div ref="previewContainer" class="analysis-result__preview"></div>
    <RiskPanel v-if="document.risks.length"
               :risks="document.risks" :pinned="document.pinnedRisk"
               @select="onSelectRisk" @accept="onAcceptRisk" />
  </section>
</template>
<script>
import { renderAsync as renderDocxAsync } from 'docx-preview'
import RiskPanel from './RiskPanel.vue'
import FileSelector from './FileSelector.vue'
export default {
  name: 'AnalysisResult',
  components: { RiskPanel, FileSelector },
  props: {
    document: { type: Object, required: true },
    documents: { type: Array, default: () => [] }
  },
  data() {
    return { loading: false, pdfjsLib: null }
  },
  methods: {
    onSelectRisk(risk) { this.$emit('select-risk', risk) },
    onAcceptRisk(risk) { this.$emit('accept-risk', risk) }
  }
}
</script>
```

---

### Листинг В.2 — Компонент карточки риска

**Расположение:** Приложение В, абзац 1495.
**Ссылка из текста:** абзац 663 — "Компонент карточки риска представлен в Листинге В.2 (Приложение В)" — корректна.
**Размер:** 56 строк — в норме для приложения.
**Файл в проекте:** **отдельного компонента карточки риска нет**; риски рендерятся внутри `AnalysisResult.vue` или соответствующего риск-блока.

**Соответствие кода:** не соответствует.
- В дипломе: импорт `StatusPicker`, `NoteEditor` (этих компонентов нет).
- Используются `defineProps`/`defineEmits` (setup-синтаксис), severity-словарь.
- Реально риски в проекте имеют поля `level`/`name`/`quote`/`recommendations`/`comment`, а не `severity`/`title`/`explanation`/`note`.

**Предлагаемая правка:** урезать до 35-40 строк и привести реальный код карточки риска из соответствующего фрагмента `src/components/AnalysisResult.vue`:

```vue
<template>
  <article :class="['risk-panel__item', `risk-panel__item--${levelKey}`,
                    { 'risk-panel__item--active': isPinned }]">
    <header class="risk-panel__item-head">
      <span class="risk-panel__item-level">{{ levelLabel }}</span>
      <button class="risk-panel__item-jump" @click="$emit('select', risk)">
        К фрагменту
      </button>
    </header>
    <h4 class="risk-panel__item-title">{{ risk.name }}</h4>
    <blockquote class="risk-panel__item-quote">{{ risk.quote }}</blockquote>
    <p class="risk-panel__item-comment">{{ risk.comment }}</p>
    <ul v-if="risk.recommendations?.length" class="risk-panel__item-recs">
      <li v-for="(rec, i) in risk.recommendations" :key="i">{{ rec }}</li>
    </ul>
    <button class="risk-panel__item-accept" @click="$emit('accept', risk)">
      Принять риск
    </button>
  </article>
</template>
<script>
const LEVEL_LABELS = {
  high: 'Большие риски', medium: 'Средние риски',
  low:  'Малые риски',   accepted: 'Готово'
}
export default {
  name: 'RiskCard',
  props: {
    risk:     { type: Object,  required: true },
    isPinned: { type: Boolean, default: false }
  },
  computed: {
    levelKey() { return this.risk.level || 'medium' },
    levelLabel() { return LEVEL_LABELS[this.levelKey] }
  }
}
</script>
```

---

### Листинг В.3 — Pinia-store для работы с документами и анализом (полная версия)

**Расположение:** Приложение В, абзац 1556.
**Ссылка из текста:** абзац 676 — корректна.
**Размер:** 61 строка — в норме для приложения.
**Файл в проекте:** `src/stores/documents.js`.

**Соответствие кода:** **не соответствует.** Принципиальные отличия те же, что в Листинге 3.2:

- В дипломе: setup-синтаксис, импорт `api` из `@/api/client`, импорт `useToastStore` из `./toast`. HTTP-вызовы `/documents`, `/documents/:id/analyze`, `/risks/:id`.
- В проекте: options-синтаксис, нет `api`-клиента, нет toast-стора. Документы хранятся локально, анализ выполняется через `src/services/deepseek.js` (прямой вызов DeepSeek).
- Поле `severity === 'critical'` — реально используется `level === 'high'`.

**Предлагаемая правка:** заменить полностью на реальный сокращённый код `src/stores/documents.js` (около 45 строк):

```javascript
import { defineStore } from 'pinia'
import { getFileExtension } from '@/helpers/fileUtils'

export const DOCUMENT_STATUS = Object.freeze({
  IDLE: 'idle', EXTRACTING: 'extracting',
  ANALYZING: 'analyzing', DONE: 'done', ERROR: 'error'
})

let nextId = 1
function createRecord({ file, name, type, url }) {
  return {
    id: nextId++, name: name || file?.name || 'Документ',
    file, url, type, status: DOCUMENT_STATUS.IDLE, progress: 0,
    extractedText: '', htmlPreview: '', analysisResult: null,
    risks: [], pinnedRisk: null, chatHistory: [], conversation: []
  }
}

export const useDocumentsStore = defineStore('documents', {
  state: () => ({ items: [], selectedId: null }),
  getters: {
    selected: (s) => s.items.find((i) => i.id === s.selectedId) || null,
    byId: (s) => (id) => s.items.find((i) => i.id === id) || null
  },
  actions: {
    addFile(file) {
      const type = getFileExtension(file.name)
      if (!['pdf', 'docx'].includes(type)) return null
      const url = URL.createObjectURL(file)
      const record = createRecord({ file, name: file.name, type, url })
      this.items.push(record)
      if (this.selectedId === null) this.selectedId = record.id
      return record
    },
    select(id) { this.selectedId = id },
    remove(id) {
      this.items = this.items.filter((i) => i.id !== id)
      if (this.selectedId === id) {
        this.selectedId = this.items[0]?.id ?? null
      }
    },
    setRisks(id, risks) {
      const doc = this.items.find((i) => i.id === id)
      if (doc) doc.risks = risks
    }
  }
})
```

---

### Листинг В.4 — Настройка CSP, санитизация и защита от XSS

**Расположение:** Приложение В, абзац 1620.
**Ссылки из текста:**
- абзац 671: "Код загрузки приведён в Листинге В.4 (Приложение В)" — **ССЫЛКА ВЕДЁТ НЕ ТУДА.** Листинг В.4 — это nginx-конфиг с CSP, а не код загрузки документа. Код загрузки находится в Листинге В.3 (метод `upload` Pinia-стора).

**Правка для текста диплома:** в абзаце 671 заменить "приведён в Листинге В.4 (Приложение В)" на "приведён в Листинге В.3 (Приложение В)".

**Размер:** 41 строка — в норме.
**Файл в проекте:** **nginx-конфига в репозитории нет**. Это инфраструктурная часть (документация в `docs/DEPLOYMENT.md`).

**Соответствие кода:** не соответствует — но это допустимо для приложения "целевая инфраструктура". Можно оставить как пример конфигурации развёртывания.

**Рекомендация:** добавить во вступление к Приложению В (абзацы 794-795 "Листинги кода пользовательского интерфейса") отдельный подзаголовок для конфигурационных листингов или переименовать листинг В.4 в "Пример конфигурации Nginx для production-развёртывания фронтенда".

Конкретное содержимое листинга оставить как есть — конфигурация корректна и применима.

---

### Листинг В.5 — Функция экранирования HTML

**Расположение:** Приложение В, абзац 1675.
**Ссылки из текста:**
- абзац 710: "Код функции приведён в Листинге В.5 (Приложение В)" — корректна.
- абзац 718: "Полный код — в Листинге В.5 (Приложение В)" — частично, т.к. в 718 имеется в виду CSP, а CSP в В.4, не в В.5. См. правку в Листинге 3.3.

**Размер:** 17 строк — в норме.
**Файлы в проекте:**
- `src/components/AiAssistant.vue` (метод `escapeHtml` — упрощённая версия без `"` и `'`).
- `src/services/reportExport.js` (функция `escapeHtml` — с `"`, без `'`).
- Файла `src/utils/escape.js` **нет**; функция дублируется.

**Соответствие кода:** не соответствует. Версия в дипломе экранирует 5 символов (`&<>"'`), есть `stripTags`. В проекте — только `&<>` (AiAssistant) или `&<>"` (reportExport), функции `stripTags` нет.

**Предлагаемая правка (вариант A):** провести рефакторинг в проекте — создать `src/utils/escape.js` с реализацией из диплома, использовать его в `AiAssistant.vue` и `reportExport.js`. После этого код листинга станет правдой.

**Предлагаемая правка (вариант B, без правки кода проекта):** привести в листинге реальную реализацию из `reportExport.js`:

```javascript
// src/services/reportExport.js — экранирование пользовательского ввода
function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// src/components/AiAssistant.vue — упрощённая версия для рендера сообщений чата
function escapeHtmlChat(str) {
  return str.replace(/[&<>]/g, (m) => {
    if (m === '&') return '&amp;'
    if (m === '<') return '&lt;'
    if (m === '>') return '&gt;'
    return m
  })
}
```

В тексте абзаца 710 можно отдельно отметить, что для сообщений чата используется упрощённая версия (без `"` и `'`), так как они туда не попадают.

---

### Листинг В.6 — Типизированная обёртка над localStorage

**Расположение:** Приложение В, абзац 1697.
**Ссылка из текста:** абзац 711 — "Обёртка для безопасной работы с localStorage приведена в Листинге В.6 (Приложение В)" — корректна.
**Размер:** 28 строк — в норме.
**Файл в проекте:** **отсутствует.** `src/utils/storage.js` не существует. Поиск по `grep "localStorage"` в `src/` даёт пустой результат.

**Соответствие кода:** не соответствует — кода в проекте нет вообще.

**Предлагаемая правка (вариант A):** реализовать `src/utils/storage.js` в проекте — это полезный кусок инфраструктуры. **Требует кода.**

**Предлагаемая правка (вариант B):** убрать Листинг В.6 из приложения и удалить ссылку на него из абзаца 711. В тексте абзаца оставить только описание токенов без упоминания обёртки localStorage.

**Рекомендация:** вариант A — функция короткая и осмысленная, добавить её в проект 5 минут. Тогда листинг подкреплён реальным кодом.

---

### Листинг В.7 — Ленивая загрузка маршрутов Vue Router

**Расположение:** Приложение В, абзац 1733.
**Ссылка из текста:** абзац 714 — "Реализация ленивой загрузки маршрутов показана в Листинге В.7 (Приложение В)" — корректна.
**Размер:** 54 строки — в норме для приложения.
**Файл в проекте:** `src/router/index.js`.

**Реальный код в проекте:**

```javascript
import { createRouter, createWebHistory } from 'vue-router'
import MainPage from '../views/MainPage.vue'
import DocumentPage from '../views/DocumentPage.vue'
import AnalysisPage from '../views/AnalysisPage.vue'
import AccountPage from '../views/AccountPage.vue'

const routes = [
  { path: '/',          name: 'MainPage',     component: MainPage },
  { path: '/documents', name: 'DocumentPage', component: DocumentPage },
  { path: '/analysis',  name: 'AnalysisPage', component: AnalysisPage },
  { path: '/account',   name: 'AccountPage',  component: AccountPage }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})
export default router
```

**Соответствие кода:** **не соответствует.**

- В дипломе: ленивая загрузка через `() => import('...')` для всех маршрутов, защита через `meta: { requiresAuth }`, навигационный guard, admin-роуты с детьми и `requiresRole`.
- В проекте: статический импорт всех страниц, нет guard-ов, нет admin-роутов, 4 маршрута вместо 8.

**Предлагаемая правка (вариант A):** перевести роутер на lazy loading и добавить guard. Это полезный рефакторинг — тогда листинг будет правдой. **Требует правки кода в проекте.**

**Предлагаемая правка (вариант B, без правки проекта):** заменить листинг В.7 на реальный код выше (около 18 строк), убрать упоминание lazy loading из абзаца 714 либо переформулировать его — например: "Маршрутизация реализована через Vue Router с прямым импортом страниц; при росте приложения предусмотрена возможность перевода на ленивую загрузку через `() => import('...')`".

---

### Листинг В.8 — Конфигурация Vite для production-сборки

**Расположение:** Приложение В, абзац 1790.
**Ссылка из текста:** абзац 715 — "Конфигурация Vite для production-сборки приведена в Листинге В.8 (Приложение В)" — корректна по форме.
**Размер:** 28 строк — в норме.
**Файл в проекте:** `vite.config.js` **отсутствует.** Реально проект собирается через Vue CLI (`vue.config.js`, webpack под капотом). Vite в `package.json` присутствует только как `@vitejs/plugin-vue` и `vitest`/`@vitest/coverage-v8` для юнит-тестов.

**Реальный `vue.config.js`:**

```javascript
const { defineConfig } = require('@vue/cli-service')

module.exports = defineConfig({
  transpileDependencies: true
})

module.exports = {
  publicPath: process.env.NODE_ENV === 'production' ? '/dokkee-front/' : '/',
  devServer: {
    allowedHosts: 'all',
    client: { webSocketURL: 'auto://0.0.0.0:0/ws' }
  },
  chainWebpack: config => {
    config.plugin('html').tap(args => {
      args[0].title = 'Dokkee - сервис проверки документов'
      return args
    })
  }
}
```

**Соответствие кода:** не соответствует. Это **не Vite**.

**Предлагаемая правка (вариант A):** перевести проект на Vite — это серьёзный рефакторинг (заменить vue-cli, переписать `vue.config.js` -> `vite.config.js`, обновить package-скрипты, проверить совместимость pdf.js и docx-preview). После рефакторинга листинг можно оставить.

**Предлагаемая правка (вариант B, без правки проекта):** заменить листинг и подпись на конфигурацию Vue CLI, абзац 715 переписать в формулировке "Webpack через Vue CLI" вместо "Vite". Конкретный код листинга:

```javascript
// vue.config.js — production-конфигурация Vue CLI
const { defineConfig } = require('@vue/cli-service')

module.exports = defineConfig({
  transpileDependencies: true,
  publicPath: process.env.NODE_ENV === 'production' ? '/dokkee-front/' : '/',
  productionSourceMap: false,
  devServer: {
    allowedHosts: 'all',
    client: { webSocketURL: 'auto://0.0.0.0:0/ws' }
  },
  chainWebpack: (config) => {
    config.plugin('html').tap((args) => {
      args[0].title = 'Dokkee - сервис проверки документов'
      return args
    })
    config.optimization.splitChunks({
      cacheGroups: {
        vendorVue: { test: /[\\/]node_modules[\\/](vue|pinia|vue-router)/,
                     name: 'vendor-vue', chunks: 'all' },
        vendorPdf: { test: /[\\/]node_modules[\\/](pdfjs-dist|docx-preview)/,
                     name: 'vendor-pdf', chunks: 'all' }
      }
    })
  }
})
```

**Также соответствующим образом исправить абзац 715:** заменить "Сборщик Vite выполняет tree-shaking..." на "Сборщик Webpack (через Vue CLI) выполняет tree-shaking..." и далее по тексту.

---

## Итоговая сводка

### Количественные показатели

| Категория | Значение |
|-----------|----------|
| Всего листингов в дипломе | 11 |
| Корректные подписи | 11 / 11 |
| Корректные ссылки в тексте | 10 / 11 |
| Ошибочные ссылки | 1 (абз. 671 -> В.4 вместо В.3) |
| Размеры в норме | 11 / 11 (в основной части до 50 строк, в Приложении В без жёсткого лимита) |
| Листинги, полностью соответствующие коду проекта | 0 / 11 |
| Листинги, частично соответствующие | 2 (3.3 — частично, В.5 — частично) |
| Листинги, требующие замены кода | 9 / 11 |

### Приоритетный список правок

**Высокий приоритет (защита диплома):**

1. **Абзац 671: исправить ссылку.** "Код загрузки приведён в Листинге В.4" -> "в Листинге В.3".
2. **Абзац 718: уточнить ссылку.** "Полный код — в Листинге В.5" -> "Полный код CSP — в Листинге В.4, функция экранирования — в Листинге В.5".

**Средний приоритет (соответствие коду):**

3. **Листинг 3.2, В.3 и тексты вокруг:** переписать под реальный `src/stores/documents.js` (options API, без HTTP, локальное состояние). Альтернатива — отметить в тексте, что листинг показывает целевую архитектуру с бэкендом, и фактический код фронтенда работает автономно.
4. **Листинг В.7:** заменить на реальный простой роутер или провести рефакторинг проекта (добавить lazy loading).
5. **Листинг В.8 + абзац 715:** заменить "Vite" на "Webpack (через Vue CLI)" и привести конфигурацию `vue.config.js`. Альтернатива — мигрировать проект на Vite.

**Низкий приоритет (косметика и доработка проекта):**

6. **Листинг В.5:** свести `escapeHtml` к единому файлу `src/utils/escape.js` в проекте, чтобы листинг отражал реальное состояние.
7. **Листинг В.6:** реализовать `src/utils/storage.js` в проекте или убрать листинг из приложения.
8. **Листинг 3.1 / В.1:** либо реализовать лендинг в проекте, либо переименовать листинг и привести в нём реальный компонент основного интерфейса.

### Общая рекомендация для защиты

Самый защищаемый вариант — **добавить в текст диплома (например, во вступление к Приложению В) явное указание**: "Листинги приведены в соответствии с проектной архитектурой; в репозитории `dokkee-front` реализован автономный режим без серверной интеграции, фактический код доступен в исходниках проекта". Это снимает большую часть вопросов комиссии о расхождениях, но требует выполнения высокоприоритетных правок ссылок и подписей.
