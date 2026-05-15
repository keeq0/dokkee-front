# Аудит листингов диплома (имитация интеграции с бэкендом)

Документ проверяет 11 листингов диплома (`РЕД_090302_22Т0854_Мякотных.docx`):
три в главе 3 (Листинг 3.1, 3.2, 3.3) и восемь в Приложении В (Листинг В.1-В.8).

Подход: для защиты диплома проект `dokkee-front` представлен как **единое целое с серверной частью `dokkee-backend`**. Соответственно листинги переписываются как **имитация интеграции** — код, который выглядит так, как если бы фронтенд и бэкенд работали в одном проекте, с реальным контрактом API из `dokkee-backend`.

По каждому листингу проверены:

1. **Подпись** — формат "Листинг N.M – Название".
2. **Ссылка из текста** — есть ли в основной части фраза "приведён в Листинге N.M" и ведёт ли она на нужный листинг по смыслу.
3. **Размер** — в основной части до 50 строк, в Приложении В без жёсткого лимита (рекомендуется до ~150).
4. **Соответствие имитации** — что должно быть в листинге, чтобы он отражал интеграцию фронта и бэка как единого решения.

---

## Контракт API из dokkee-backend

Маршруты, реально реализованные в бэкенде (`internal/handler/handler.go`):

| Метод | Маршрут | Что делает |
|-------|---------|-----------|
| POST  | `/auth/sign-up`             | Регистрация пользователя |
| POST  | `/auth/sign-in`             | Аутентификация, возвращает `{ token }` (JWT) |
| POST  | `/api/documents`            | Загрузка документа (multipart, поле `file`), возвращает `{ id }`. Анализ запускается на бэке автоматически в фоне |
| GET   | `/api/documents`            | Список документов пользователя |
| GET   | `/api/documents/:id`        | Метаданные документа |
| GET   | `/api/documents/:id/result` | Результат анализа (или `{ status, message }`, если ещё не готов) |
| GET   | `/api/profile`              | Профиль текущего пользователя |
| PATCH | `/api/profile`              | Обновление полей профиля |

Все маршруты под `/api/*` требуют заголовок `Authorization: Bearer <token>`. Статусы документа: `queued` -> `processing` -> `completed` либо `failed`.

**Эндпоинтов нет в бэке**: `/api/auth/refresh`, `/api/ai/chat`, `/api/analytics`, `/api/risks/:id`, `DELETE /api/documents/:id`, `PATCH /api/documents/:id`. В листингах и тексте диплома их использовать нельзя — далее в отчёте указано, чем заменять.

---

## Несоответствия в тексте диплома (требуют правки)

| Где (абз.) | Что в дипломе | Должно быть |
|------------|----------------|------------|
| абз. 671   | "Код загрузки приведён в Листинге В.4 (Приложение В)" | "приведён в Листинге В.3 (Приложение В)" — В.4 это nginx-CSP |
| абз. 671   | "POST-запросом на `/api/documents/upload`" | `POST /api/documents` |
| абз. 671   | "Сервер возвращает `taskId`, по которому клиент отслеживает статус" | "Сервер возвращает идентификатор документа (`id`), по которому клиент опрашивает статус" |
| абз. 671   | "polling: ... `GET /api/documents/result/{taskId}` ... сервер не вернёт статус 200 с JSON-объектом результатов" | `GET /api/documents/:id/result` возвращает 202 со статусом `processing`/`queued` или 200 с готовым JSON |
| абз. 41    | `POST /api/auth/login` | `POST /auth/sign-in` |
| абз. 41    | "обёртка `apiClient` автоматически запрашивает новый токен через `/api/auth/refresh`" | Бэк не реализует refresh. Либо: "при истечении токена пользователь повторно проходит вход", либо отдельный пункт "доработать бэк, чтобы добавить refresh" |
| абз. 44    | "Чат с ИИ-помощником использует эндпоинт `POST /api/ai/chat`. Тело запроса содержит documentId, question и опциональное selectedText. Сервер передаёт запрос в DeepSeek API и возвращает ответ клиенту." | Эндпоинта нет. Фактически фронт обращается напрямую к DeepSeek через `src/services/deepseek.js`. Либо переписать абзац под прямой вызов DeepSeek, либо запланировать добавление эндпоинта `POST /api/chat` |
| абз. 45    | "Работа с документами ... DELETE `/api/documents/:id`, PATCH `/api/documents/:id` (переименование)" | Этих маршрутов нет. Удаление/переименование выполняются только на стороне UI, либо запланировать в бэк |
| абз. 45    | "Аналитика запрашивается через `GET /api/analytics` с параметрами периода и фильтров" | Эндпоинта нет. Либо данные аналитики собираются на клиенте из `GET /api/documents` + `/api/documents/:id/result`, либо в бэк добавляется агрегирующий маршрут |
| абз. 718   | "Полный код — в Листинге В.5 (Приложение В)" (имеется в виду CSP) | "Полный код CSP — в Листинге В.4, функция экранирования — в Листинге В.5" |

---

## Сводная таблица

| № | Подпись | Ссылка | Размер (стр) | Что показывает |
|---|---------|--------|--------------|----------------|
| 3.1 | OK | OK (абз. 623) | 17 | Фрагмент компонента лендинга — отдельный проект |
| 3.2 | OK | OK (абз. 676) | 25 | Pinia-стор `useDocumentsStore` с `upload`/`fetchResult` — имитация интеграции |
| 3.3 | OK | OK (абз. 718, уточнить В.4/В.5) | 17 | CSP-заголовок + утилита `escapeHtml` |
| В.1 | OK | OK (абз. 623) | 41 | Полный компонент секции лендинга — отдельный проект |
| В.2 | OK | OK (абз. 663) | 56 | Компонент карточки риска |
| В.3 | OK | OK (абз. 676) | 61 | Полный Pinia-стор с интеграцией |
| В.4 | OK | Правка ссылки в абз. 671 | 41 | nginx-конфиг с CSP — инфраструктура |
| В.5 | OK | OK (абз. 710); уточнение в 718 | 17 | Функция `escapeHtml` |
| В.6 | OK | OK (абз. 711) | 28 | Обёртка над `localStorage` |
| В.7 | OK | OK (абз. 714) | 54 | Vue Router с lazy loading и auth-guard |
| В.8 | OK | OK (абз. 715) | 28 | Конфигурация сборщика для production |

---

## Детальный разбор

### Листинг 3.1 — Фрагмент Vue-компонента секции лендинга

**Подпись:** OK. **Ссылка (абз. 623):** OK. **Размер:** 17 строк — норма.

**Связь с проектом:** относится к отдельному репозиторию **лендинга**, который находится на другом ноутбуке и в `dokkee-front` не подключён. При объединении в единый проект — переносится из репозитория лендинга в `src/components/landing/`.

**Что должно быть в листинге:**

```vue
<!-- src/components/landing/HowItWorks.vue (Листинг 3.1) -->
<template>
  <section class="how-it-works" aria-labelledby="how-title">
    <h2 id="how-title">Как работает Dokkee</h2>
    <ul class="cards">
      <StepCard v-for="(s, i) in steps" :key="i" v-bind="s" />
    </ul>
  </section>
</template>
<script setup>
import { ref } from 'vue'
import StepCard from './StepCard.vue'
const steps = ref([
  { icon: 'upload',  title: 'Загрузите документ', text: 'PDF, DOCX или TXT.' },
  { icon: 'analyze', title: 'ИИ анализирует',     text: 'Поиск рисков и ошибок.' },
  { icon: 'report',  title: 'Получите отчёт',     text: 'Пояснения и заметки.' },
])
</script>
```

**Пометка:** код взят из отдельного проекта лендинга; в текущем `dokkee-front` отсутствует.

---

### Листинг 3.2 — Pinia-store для работы с анализом документов

**Подпись:** OK. **Ссылка (абз. 676):** OK. **Размер:** 25 строк — норма.

**Имитация интеграции:** стор обращается к реальным эндпоинтам бэка. После `POST /api/documents` бэк сам ставит документ в очередь анализа; клиент опрашивает `GET /api/documents/:id/result`, пока не вернётся 200.

**Что должно быть в листинге:**

```javascript
// src/stores/documents.js (Листинг 3.2)
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { api } from '@/api/client'

export const useDocumentsStore = defineStore('documents', () => {
  const list = ref([])
  const current = ref(null)
  const isLoading = ref(false)

  async function upload(file) {
    isLoading.value = true
    try {
      const form = new FormData()
      form.append('file', file)
      const { data } = await api.post('/api/documents', form)
      list.value.unshift(data)
      return data
    } finally {
      isLoading.value = false
    }
  }

  async function fetchResult(id) {
    const { data, status } = await api.get(`/api/documents/${id}/result`)
    if (status === 200 && current.value?.id === id) {
      current.value.risks = data.result_json.risks
    }
    return { status, data }
  }

  return { list, current, isLoading, upload, fetchResult }
})
```

**Изменения относительно текущей версии диплома:**
- `api.post('/documents', { file })` -> `api.post('/api/documents', form)` (multipart FormData, как реально принимает бэк).
- Метод `analyze(id)` убран — анализ инициируется бэкендом автоматически после загрузки.
- Добавлен `fetchResult(id)`, опрашивающий `/api/documents/:id/result`. Возвращает `status` ответа, чтобы клиент мог отличить "ещё не готово" (202) от "готово" (200).

---

### Листинг 3.3 — Настройка Content Security Policy и санитизация ввода

**Подпись:** OK. **Ссылка (абз. 718):** требует уточнения формулировки в тексте диплома: "Полный код CSP — в Листинге В.4, функция экранирования — в Листинге В.5".
**Размер:** 17 строк — норма.

**Что должно быть в листинге:**

```nginx
# /etc/nginx/conf.d/dokkee.conf (Листинг 3.3)
# Content Security Policy для production-домена

add_header Content-Security-Policy "
  default-src 'self';
  script-src  'self' 'nonce-$request_id';
  style-src   'self' 'unsafe-inline';
  img-src     'self' data: https://cdn.dokkee.ru;
  connect-src 'self' https://api.dokkee.ru;
  frame-ancestors 'none';
" always;
```

```javascript
// src/utils/escape.js (Листинг 3.3)
// Экранирование пользовательского ввода перед выводом в DOM
export function escapeHtml(str) {
  if (typeof str !== 'string') return ''
  return str
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}
```

**Изменение:** функция `escapeHtml` выносится в отдельный модуль `src/utils/escape.js` (сейчас в проекте дублируется в `AiAssistant.vue` и `reportExport.js` с разными реализациями).

---

### Листинг В.1 — Полный Vue-компонент секции "Как работает" лендинга

**Подпись:** OK. **Ссылка (абз. 623):** OK. **Размер:** 41 строка — норма.

**Связь с проектом:** относится к отдельному репозиторию лендинга. **Код переносится из проекта лендинга при объединении.**

**Что должно быть в листинге:**

```vue
<!-- src/components/landing/HowItWorks.vue (Листинг В.1) -->
<template>
  <section ref="sectionRef" class="how-it-works" :class="{ 'is-visible': isVisible }"
           aria-labelledby="how-title">
    <h2 id="how-title" class="how-it-works__title">Как работает Dokkee</h2>
    <ul class="how-it-works__cards">
      <StepCard v-for="(s, i) in steps" :key="i" v-bind="s"
                :class="`how-it-works__card how-it-works__card--${i}`" />
    </ul>
  </section>
</template>
<script setup>
import { ref, onMounted } from 'vue'
import StepCard from './StepCard.vue'
import { useIntersectionObserver } from '@vueuse/core'
const sectionRef = ref(null)
const isVisible = ref(false)
const steps = ref([
  { icon: 'upload',  title: 'Загрузите документ',
    text: 'Перетащите PDF, DOCX или TXT в область загрузки.' },
  { icon: 'analyze', title: 'ИИ анализирует',
    text: 'DeepSeek находит риски, противоречия и скрытые обязательства.' },
  { icon: 'report',  title: 'Получите отчёт',
    text: 'Пояснения к каждому риску, заметки, экспорт в PDF.' },
])
onMounted(() => {
  useIntersectionObserver(sectionRef, ([{ isIntersecting }]) => {
    if (isIntersecting) isVisible.value = true
  }, { threshold: 0.3 })
})
</script>
<style scoped>
.how-it-works { padding: 6rem 1.5rem; background: var(--color-bg-soft); }
.how-it-works__title { font-size: 2.25rem; text-align: center; margin-bottom: 3rem; }
.how-it-works__cards { display: grid; gap: 1.5rem;
                       grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); }
.how-it-works__card { opacity: 0; transform: translateY(24px);
                       transition: opacity 0.6s ease, transform 0.6s ease; }
.is-visible .how-it-works__card--0 { opacity: 1; transform: none; transition-delay: 0s; }
.is-visible .how-it-works__card--1 { opacity: 1; transform: none; transition-delay: 0.15s; }
.is-visible .how-it-works__card--2 { opacity: 1; transform: none; transition-delay: 0.3s; }
</style>
```

**Пометка:** код взят из отдельного проекта лендинга. При объединении репозиториев — `@vueuse/core` добавляется в `package.json` основного проекта.

---

### Листинг В.2 — Компонент карточки риска

**Подпись:** OK. **Ссылка (абз. 663):** OK. **Размер:** 56 строк — норма для приложения.

**Имитация интеграции:** карточка получает данные от бэка из поля `result_json.risks[]`. Структура объекта риска приходит в формате, который бэк сохраняет в `analysis_results.result_json` (поля `severity`, `title`, `quote`, `explanation`).

**Что должно быть в листинге:**

```vue
<!-- src/components/RiskCard.vue (Листинг В.2) -->
<template>
  <article :class="['risk-card', `risk-card--${risk.severity}`,
                    { 'risk-card--active': isActive }]"
           :aria-labelledby="`risk-${risk.id}-title`">
    <header class="risk-card__head">
      <Icon :name="icon" class="risk-card__icon" />
      <span class="risk-card__badge">{{ severityLabel }}</span>
      <button class="risk-card__link-btn"
              @click="$emit('scroll-to', risk.anchor)"
              aria-label="Перейти к фрагменту в документе">
        К фрагменту
      </button>
    </header>
    <h3 :id="`risk-${risk.id}-title`" class="risk-card__title">
      {{ risk.title }}
    </h3>
    <blockquote class="risk-card__quote">{{ risk.quote }}</blockquote>
    <p class="risk-card__explanation">{{ risk.explanation }}</p>
    <footer class="risk-card__footer">
      <StatusPicker :value="risk.status" @update="handleStatusChange" />
      <button @click="isNoteOpen = !isNoteOpen">
        {{ risk.note ? 'Изменить заметку' : 'Добавить заметку' }}
      </button>
    </footer>
    <NoteEditor v-if="isNoteOpen" :value="risk.note"
                @save="(n) => emit('save-note', risk.id, n)" />
  </article>
</template>
<script setup>
import { computed, ref } from 'vue'
import StatusPicker from './StatusPicker.vue'
import NoteEditor from './NoteEditor.vue'
const props = defineProps({
  risk:     { type: Object,  required: true },
  isActive: { type: Boolean, default: false },
})
const emit = defineEmits([
  'change-status', 'scroll-to', 'save-note',
])
const isNoteOpen = ref(false)
const SEVERITY_LABEL = {
  critical:   'Критический',
  suspicious: 'Сомнительный',
  info:       'Информация',
}
const SEVERITY_ICON = {
  critical:   'alert-triangle',
  suspicious: 'help-circle',
  info:       'info',
}
const severityLabel = computed(() => SEVERITY_LABEL[props.risk.severity])
const icon = computed(() => SEVERITY_ICON[props.risk.severity])
function handleStatusChange(status) {
  emit('change-status', props.risk.id, status)
}
</script>
```

**Изменения относительно текущей версии диплома:**
- Убран `'ask-ai'` из `defineEmits` (нет соответствующего эндпоинта; чат с ИИ работает на уровне страницы, а не карточки риска).
- Заменены ёлочки `»` на обычные двойные кавычки в `aria-label` (текущий вариант с `»` — синтаксическая ошибка Vue).
- Заменена стрелка-юникод "→" на текст "К фрагменту" (см. правила оформления в `.claude/rules/git.md` и стилистику диплома).
- Локализованные словари переименованы в `SCREAMING_SNAKE_CASE` (`SEVERITY_LABEL`, `SEVERITY_ICON`) — традиционное оформление констант в JS.

---

### Листинг В.3 — Pinia-store для работы с документами и анализом (полная версия)

**Подпись:** OK. **Ссылка (абз. 676):** OK. **Размер:** 61 строка — норма для приложения.

**Имитация интеграции:** полная версия стора с обращением к реальным эндпоинтам бэка, polling-стратегией для получения результата, локальной отменой смены статуса риска (бэк отдельного эндпоинта `/api/risks/:id` не имеет, поэтому смена статуса — клиентское состояние).

**Что должно быть в листинге:**

```javascript
// src/stores/documents.js (Листинг В.3)
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { api } from '@/api/client'
import { useToastStore } from './toast'

export const useDocumentsStore = defineStore('documents', () => {
  const list = ref([])
  const current = ref(null)
  const isLoading = ref(false)
  const analysisStatus = ref('idle')
  const toast = useToastStore()

  const criticalRisksCount = computed(() => {
    if (!current.value) return 0
    return current.value.risks.filter((r) => r.severity === 'critical').length
  })

  async function fetchList() {
    const { data } = await api.get('/api/documents')
    list.value = data.documents
  }

  async function upload(file) {
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Файл больше 10 МБ')
      return null
    }
    isLoading.value = true
    try {
      const form = new FormData()
      form.append('file', file)
      const { data } = await api.post('/api/documents', form)
      list.value.unshift(data)
      return data
    } catch (err) {
      toast.error('Не удалось загрузить файл')
      return null
    } finally {
      isLoading.value = false
    }
  }

  async function pollResult(id, intervalMs = 2000) {
    analysisStatus.value = 'running'
    while (true) {
      const { status, data } = await api.get(`/api/documents/${id}/result`)
      if (status === 200) {
        if (current.value?.id === id) {
          current.value.risks = data.result_json.risks
        }
        analysisStatus.value = 'done'
        return data
      }
      if (data.status === 'failed') {
        analysisStatus.value = 'error'
        toast.error('Анализ завершился ошибкой')
        return null
      }
      await new Promise((r) => setTimeout(r, intervalMs))
    }
  }

  function changeRiskStatus(riskId, status) {
    if (!current.value) return
    const risk = current.value.risks.find((r) => r.id === riskId)
    if (risk) risk.status = status
  }

  return {
    list, current, isLoading, analysisStatus, criticalRisksCount,
    fetchList, upload, pollResult, changeRiskStatus,
  }
})
```

**Изменения относительно текущей версии диплома:**
- `api.post('/documents', formData)` -> `api.post('/api/documents', form)`. URL приведён к реальному бэку, размер ограничен 10 МБ (как в бэке).
- `analyze(id)` заменён на `pollResult(id)` — анализ запускается бэком автоматически после загрузки, клиент опрашивает результат до получения 200.
- Метод `changeRiskStatus` стал синхронным и работает только локально: отдельного эндпоинта `/api/risks/:id` в бэке нет.

---

### Листинг В.4 — Настройка CSP, санитизация и защита от XSS

**Подпись:** OK. **Ссылка:** на В.4 есть в абзаце 671 ("Код загрузки приведён в Листинге В.4") — это ошибка, нужно заменить на В.3.
**Размер:** 41 строка — норма.

**Имитация интеграции:** nginx-конфиг для production-домена, перед которым стоит фронтенд и проксируются запросы на бэкенд по `/api/`.

**Что должно быть в листинге:**

```nginx
# /etc/nginx/conf.d/dokkee.conf (Листинг В.4)
# CSP + security headers + reverse proxy на dokkee-backend

server {
  listen 443 ssl http2;
  server_name dokkee.ru www.dokkee.ru;

  ssl_certificate     /etc/letsencrypt/live/dokkee.ru/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/dokkee.ru/privkey.pem;
  ssl_protocols TLSv1.2 TLSv1.3;

  add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
  add_header Content-Security-Policy "
    default-src 'self';
    script-src  'self' 'nonce-$request_id';
    style-src   'self' 'unsafe-inline';
    img-src     'self' data: https://cdn.dokkee.ru;
    connect-src 'self' https://api.dokkee.ru;
    font-src    'self' data:;
    frame-ancestors 'none';
    base-uri    'self';
  " always;
  add_header X-Content-Type-Options nosniff always;
  add_header X-Frame-Options DENY always;
  add_header Referrer-Policy strict-origin-when-cross-origin always;
  add_header Permissions-Policy "geolocation=(), camera=(), microphone=()" always;

  location / {
    root /var/www/dokkee-frontend;
    try_files $uri $uri/ /index.html;
    expires 1y;
    add_header Cache-Control "public, immutable";
  }
  location /index.html { add_header Cache-Control "no-store"; }

  location /api/ {
    proxy_pass http://dokkee-backend:8000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    client_max_body_size 12M;
  }
  location /auth/ {
    proxy_pass http://dokkee-backend:8000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
  }
}
```

**Изменения относительно текущей версии диплома:**
- Reverse proxy `/api/` направлен на `dokkee-backend:8000` (имя сервиса из `dokkee-backend/docker-compose.yaml`).
- Добавлен отдельный `location /auth/` — у бэка маршруты `sign-in/sign-up` лежат не под `/api/`, а под корневым `/auth/`.
- `client_max_body_size 12M` соответствует лимиту бэка в 10 МБ + накладные multipart.

---

### Листинг В.5 — Функция экранирования HTML

**Подпись:** OK. **Ссылка (абз. 710):** OK. **Размер:** 17 строк — норма.

**Имитация интеграции:** функция выносится в общий модуль `src/utils/escape.js` и используется во всех местах, где в DOM подставляется текст, пришедший от бэка (риски, цитаты, чат с ИИ).

**Что должно быть в листинге:**

```javascript
// src/utils/escape.js (Листинг В.5)
// Экранирование HTML для безопасного вывода данных от бэкенда и ИИ
const ESCAPE_MAP = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}

export function escapeHtml(str) {
  if (typeof str !== 'string') return ''
  return str.replace(/[&<>"']/g, (ch) => ESCAPE_MAP[ch] || ch)
}

export function stripTags(html) {
  if (typeof html !== 'string') return ''
  return html.replace(/<[^>]*>/g, '')
}
```

**Изменения относительно текущей версии:** код корректен. **Что нужно изменить в проекте:** удалить дублирующиеся `escapeHtml` из `src/components/AiAssistant.vue` и `src/services/reportExport.js`, импортировать единый вариант из `src/utils/escape.js`.

---

### Листинг В.6 — Типизированная обёртка над localStorage

**Подпись:** OK. **Ссылка (абз. 711):** OK. **Размер:** 28 строк — норма.

**Имитация интеграции:** обёртка используется для хранения JWT-токена, полученного из `POST /auth/sign-in`, и пользовательских настроек интерфейса.

**Что должно быть в листинге:**

```javascript
// src/utils/storage.js (Листинг В.6)
// Обёртка над localStorage с обработкой JSON и ошибок (приватный режим, квота)
const PREFIX = 'dokkee:'

export const storage = {
  get(key, defaultValue) {
    try {
      const raw = localStorage.getItem(PREFIX + key)
      return raw === null ? defaultValue : JSON.parse(raw)
    } catch (err) {
      return defaultValue
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(value))
    } catch (err) {
      console.warn('storage.set failed', err)
    }
  },
  remove(key) {
    localStorage.removeItem(PREFIX + key)
  },
  clear() {
    Object.keys(localStorage)
      .filter((k) => k.startsWith(PREFIX))
      .forEach((k) => localStorage.removeItem(k))
  },
}
```

**Изменения относительно диплома:** код корректен. Префикс изменён на `dokkee:` (под имя проекта `dokkee-front`/`dokkee-backend`, а не `dockee:`).
**Что нужно создать в проекте:** файла `src/utils/storage.js` сейчас нет; при имитации интеграции — добавить.

---

### Листинг В.7 — Ленивая загрузка маршрутов Vue Router

**Подпись:** OK. **Ссылка (абз. 714):** OK. **Размер:** 54 строки — норма для приложения.

**Имитация интеграции:** роутер защищает приватные страницы по JWT. Токен хранится в Pinia-сторе `useAuthStore`, получается из `POST /auth/sign-in`. Список маршрутов — приведён к реальной структуре `src/views/` (`MainPage`, `DocumentPage`, `AnalysisPage`, `AccountPage`) + лендинг + страницы входа/регистрации.

**Что должно быть в листинге:**

```javascript
// src/router/index.js (Листинг В.7)
import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const routes = [
  { path: '/landing', name: 'Landing',
    component: () => import('@/components/landing/LandingPage.vue') },
  { path: '/login',   name: 'Login',
    component: () => import('@/views/LoginPage.vue') },
  { path: '/signup',  name: 'Signup',
    component: () => import('@/views/SignupPage.vue') },
  {
    path: '/', name: 'MainPage',
    component: () => import('@/views/MainPage.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/documents', name: 'DocumentPage',
    component: () => import('@/views/DocumentPage.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/analysis', name: 'AnalysisPage',
    component: () => import('@/views/AnalysisPage.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/account', name: 'AccountPage',
    component: () => import('@/views/AccountPage.vue'),
    meta: { requiresAuth: true },
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 }),
})

router.beforeEach((to) => {
  const auth = useAuthStore()
  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return { path: '/login', query: { redirect: to.fullPath } }
  }
})

export default router
```

**Изменения относительно текущей версии диплома:**
- Убран блок `/admin` с `requiresRole` — у бэка ролей нет, только базовая аутентификация.
- Имена маршрутов и пути приведены к реальной структуре `src/views/` (`MainPage`, `DocumentPage`, `AnalysisPage`, `AccountPage`).
- Лендинг лежит под `/landing` и переносится из отдельного проекта лендинга при объединении.

**Что нужно изменить в проекте:** перевести `src/router/index.js` на динамические импорты, добавить стор `src/stores/auth.js`, реализовать `LoginPage.vue` и `SignupPage.vue`.

---

### Листинг В.8 — Конфигурация Vite для production-сборки

**Подпись:** OK. **Ссылка (абз. 715):** OK. **Размер:** 28 строк — норма.

**Имитация интеграции:** конфигурация Vite, в которой dev-сервер проксирует `/api/*` и `/auth/*` на dokkee-backend по адресу `http://localhost:8000`.

**Что должно быть в листинге:**

```javascript
// vite.config.js (Листинг В.8)
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig(({ mode }) => ({
  plugins: [vue()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  build: {
    target: 'es2020',
    sourcemap: mode === 'production' ? 'hidden' : true,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-vue': ['vue', 'vue-router', 'pinia'],
          'vendor-pdf': ['pdfjs-dist', 'docx-preview'],
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
    chunkSizeWarningLimit: 600,
  },
  server: {
    proxy: {
      '/api':  { target: 'http://localhost:8000', changeOrigin: true },
      '/auth': { target: 'http://localhost:8000', changeOrigin: true },
    },
  },
}))
```

**Изменения относительно текущей версии диплома:**
- Прокси теперь покрывает и `/api/`, и `/auth/` — оба маршрута dokkee-backend.
- Цель прокси — `http://localhost:8000` (порт по умолчанию бэка).
- В чанк `vendor-pdf` добавлен `docx-preview` (используется для превью DOCX).
- Удалён чанк `vendor-ui` с `@vueuse/core` — пока эта зависимость нужна только в лендинге (отдельный репозиторий).

**Что нужно изменить в проекте:** в текущем `dokkee-front` сборка через Vue CLI (webpack). Для имитации интеграции либо мигрировать на Vite, либо в дипломе заменить упоминание Vite на Vue CLI и привести `vue.config.js`.

---

## Итоговая сводка

### Количественные показатели

| Категория | Значение |
|-----------|----------|
| Всего листингов в дипломе | 11 |
| Корректные подписи | 11 / 11 |
| Корректные ссылки в тексте | 10 / 11 (1 ошибка: абз. 671 -> В.4 вместо В.3) |
| Размеры в норме | 11 / 11 |
| Листинги, требующие правки кода | 9 / 11 |
| Листинги, требующие пометки "из отдельного проекта" | 2 (3.1 и В.1 — лендинг) |

### Приоритетный список правок текста диплома

**Обязательные правки в основном тексте:**

1. **Абзац 671:** "приведён в Листинге В.4" -> "в Листинге В.3".
2. **Абзац 671:** `POST /api/documents/upload` -> `POST /api/documents`.
3. **Абзац 671:** `taskId` -> идентификатор документа (`id`), polling маршрут `/api/documents/result/{taskId}` -> `/api/documents/:id/result`.
4. **Абзац 41:** `POST /api/auth/login` -> `POST /auth/sign-in`. Упоминание refresh-токена и `/api/auth/refresh` либо убрать, либо переформулировать как доработку.
5. **Абзац 44:** `POST /api/ai/chat` — эндпоинта нет. Описать чат как прямой вызов DeepSeek через клиентский сервис `src/services/deepseek.js`.
6. **Абзац 45:** убрать упоминания `DELETE /api/documents/:id`, `PATCH /api/documents/:id` (переименование), `GET /api/analytics` — этих маршрутов нет в бэке. Либо переписать как локальные действия, либо запланировать на доработку бэка.
7. **Абзац 718:** "Полный код — в Листинге В.5" -> "Полный код CSP — в Листинге В.4, функция экранирования — в Листинге В.5".

### Список правок проекта `dokkee-front` (если идти по пути имитации)

| Файл / директория | Действие |
|-------------------|----------|
| `src/api/client.js` | Создать: обёртка над axios/fetch с автоматическим добавлением `Authorization: Bearer <token>` и базовым URL |
| `src/stores/auth.js` | Создать: хранение токена, методы `signIn`/`signUp`/`signOut`, `isAuthenticated`, `loadProfile` |
| `src/stores/documents.js` | Переписать: добавить методы `upload`, `fetchList`, `pollResult` под реальный контракт бэка |
| `src/views/LoginPage.vue`, `src/views/SignupPage.vue` | Создать: формы входа и регистрации |
| `src/router/index.js` | Перевести на динамические импорты, добавить `beforeEach` с проверкой токена |
| `src/utils/escape.js` | Создать; убрать дубли из `AiAssistant.vue` и `reportExport.js` |
| `src/utils/storage.js` | Создать: обёртка над localStorage с префиксом |
| `vite.config.js` | Опционально: миграция с Vue CLI на Vite — обновить package-скрипты, удалить `vue.config.js` |
| `src/components/landing/` | Перенести компоненты лендинга из отдельного репозитория |
| `src/components/RiskCard.vue` | Опционально: вынести карточку риска в отдельный компонент |

### Общая рекомендация

Самый защищаемый сценарий:

1. **Внести правки текста диплома** (пункты 1-7 выше) — снимает ошибки несоответствия эндпоинтов и одну неверную ссылку. Сделать **обязательно**.
2. **Указать в начале Приложения В**, что листинги показывают **целевую архитектуру единого сервиса** (фронтенд + бэкенд + лендинг). Это объясняет различия с автономным состоянием репозитория `dokkee-front`.
3. **Правки кода `dokkee-front`** делать опционально и постепенно — для защиты они не обязательны, если есть пометка из пункта 2.
