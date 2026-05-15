# Инструкция по сопровождению фронтенда Dokkee

Документ описывает регламент сопровождения фронтенд-приложения Dokkee: структура репозитория, тестирование, обновление зависимостей, диагностика типичных проблем, работа в связке с бэкендом `dokkee-backend`.

## Содержание

1. [Структура репозитория](#1-структура-репозитория)
2. [Связка с бэкендом](#2-связка-с-бэкендом)
3. [Регламент работы с ветками и коммитами](#3-регламент-работы-с-ветками-и-коммитами)
4. [Тестирование](#4-тестирование)
5. [Линтинг и стиль кода](#5-линтинг-и-стиль-кода)
6. [Обновление зависимостей](#6-обновление-зависимостей)
7. [Сборка и релиз](#7-сборка-и-релиз)
8. [Диагностика типичных проблем](#8-диагностика-типичных-проблем)
9. [Логирование и наблюдаемость](#9-логирование-и-наблюдаемость)

---

## 1. Структура репозитория

```
src/
  views/            Корневые страницы маршрутизации (MainPage, DocumentPage,
                    AnalysisPage, AccountPage, ServicePage).
  components/       Многоразовые компоненты UI: UploadDocuments, AnalysisResult,
                    AiAssistant, PromptSettingsModal, ServiceLayout, ServiceHeader.
  composables/      Composition API хуки: useAnalysisProgress, useStreamingText.
  services/         Бизнес-логика без UI: deepseek (HTTP-клиент), risks (парсинг
                    ответа модели), reportExport (markdown -> HTML -> PDF),
                    highlight (наложение цветных меток на текстовый слой).
  stores/           Pinia-сторы: documents.js хранит per-document состояние
                    (url, status, progress, extractedText, htmlPreview,
                    analysisResult, risks, pinnedRisk, chatHistory).
  router/           Vue Router (history mode).
  helpers/          Утилиты общего назначения.

tests/
  unit/             Vitest, юнит-тесты сервисов и сторов.
  e2e/              Playwright, end-to-end сценарии. Запросы к бэкенду мокаются
                    HAR-записями page.routeFromHAR().

docs/               Документация (этот файл, USER_GUIDE, DEPLOYMENT, ADMIN_GUIDE).
docker-compose.yml  Сервисы frontend, test-unit, test-lint, test-e2e.
Dockerfile          Multi-stage: deps -> dev / test / e2e.
```

Размер файлов держится в пределах 200-400 строк, функции — до 50 строк. При превышении модуль декомпозируется по фичам.

## 2. Связка с бэкендом

Фронтенд обращается к бэкенду по HTTP. Маршруты, которые используются интерфейсом:

| Метод  | Маршрут                       | Назначение                                   |
|--------|-------------------------------|----------------------------------------------|
| POST   | `/auth/sign-up`               | Регистрация нового пользователя.             |
| POST   | `/auth/sign-in`               | Аутентификация, возвращает JWT-токен.        |
| POST   | `/api/documents`              | Загрузка документа (multipart, поле `file`). |
| GET    | `/api/documents`              | Список документов пользователя.              |
| GET    | `/api/documents/:id`          | Метаданные документа.                        |
| GET    | `/api/documents/:id/result`   | Результат анализа.                           |
| GET    | `/api/profile`                | Профиль текущего пользователя.               |
| PATCH  | `/api/profile`                | Обновление профиля.                          |

Все маршруты под `/api/*` требуют заголовок `Authorization: Bearer <token>`. Токен фронтенд получает после успешного `/auth/sign-in` и сохраняет в памяти приложения. Базовый URL бэкенда задаётся переменной `VUE_APP_API_BASE_URL` на этапе сборки.

При изменении контракта со стороны бэкенда (`dokkee-backend/internal/handler/*.go`) изменения синхронизируются в `src/services/` фронтенда. Изменение схемы ответа `analysis_results.result_json` затрагивает парсер `src/services/risks.js`.

## 3. Регламент работы с ветками и коммитами

- `main` — production-ветка, прямые пуши запрещены.
- `issue/<номер>-<кратко>` — рабочая ветка под GitHub issue (например, `issue/19-pdf-canvas-restore`).
- `docs/<кратко>` — ветка под документацию.
- Pull Request обязателен. Merge только после прохождения тестов и code review.

Формат сообщений коммитов:

- Префикс с маленькой буквы: `fix:`, `feat:`, `refactor:`, `docs:`, `test:`, `chore:`, `style:`, `build:`, `ci:`, `perf:`.
- Scope опционален: `feat(scope): описание` либо `fix: описание`.
- Глагол в прошедшем времени совершенного вида: "добавил", "исправил", "вынес".
- Если ветка из issue — в конец первой строки добавляется `(#XXXX)`.

В репозиторий не коммитятся: `.env` с реальными ключами, `node_modules/`, `dist/`, `playwright-report/`, `test-results/`, `coverage/`, `CLAUDE.md`, `CLAUDE.local.md`, `.claude/`, `.superpowers/`.

## 4. Тестирование

### Локальный запуск

```bash
npm run lint              # eslint без авто-фикса
npm run lint:fix          # eslint с авто-фиксом
npm run test:unit         # vitest, одноразовый прогон
npm run test:unit:watch   # vitest в watch-режиме
npm run test:e2e          # playwright (нужен запущенный dev-сервер на BASE_URL)
```

После каждого изменения кода прогоняется релевантный набор тестов. Задача не закрывается без зелёных тестов.

### Запуск в Docker (watch-режим)

```bash
docker compose up -d test-unit test-lint test-e2e
docker compose logs -f test-unit
```

Сервис `test-e2e` зависит от `frontend` через `condition: service_healthy` и стартует после healthcheck dev-сервера. Аналогично, для интеграционных сценариев требуется поднятый `dokkee-backend` — иначе e2e идут только на мок-уровне.

### E2E-нюансы

- Локаторы — `getByRole`, `getByTestId`, `getByText`. CSS-селекторы — в последнюю очередь.
- Запросы к бэкенду мокаются HAR-записями (`page.routeFromHAR()`). HAR-файлы коммитятся, изменения проходят ревью.
- Обновление HAR — только по явному флагу `E2E_UPDATE_HAR=1` при поднятом бэкенде.
- Хардкод таймаутов запрещён, ожидание реализуется через `expect()` на конкретный элемент.

### Покрытие

```bash
npm run test:unit -- --coverage
```

Отчёт сохраняется в `coverage/`. Целевая планка — не ниже 70% по модулям `services/` и `stores/`.

## 5. Линтинг и стиль кода

- ESLint с конфигом `plugin:vue/vue3-essential` + `eslint:recommended`.
- Composition API + `<script setup>`.
- Props типизируются через `defineProps<T>()`.
- Composables именуются с префиксом `use`.
- Для внешних данных — `unknown` вместо `any`; sanitization через Zod, если данные приходят извне.
- Анимации — только `transform` и `opacity`.
- CSS-классы в kebab-case, компоненты в PascalCase.
- Без `console.log` в production-коде, для отладки — отдельный логгер.

Подробности — в правилах проекта `.claude/rules/typescript.md`, `.claude/rules/web.md`, `.claude/rules/architecture.md`.

## 6. Обновление зависимостей

### Регламент

- Раз в две недели: `npm outdated` + `npm audit`.
- Минорные и патч-обновления — пачкой одним PR.
- Мажорные обновления — отдельным PR с проверкой по списку критичных пакетов.
- При обновлении `@playwright/test` версия в `Dockerfile` (`mcr.microsoft.com/playwright:v<x>-jammy`) обновляется параллельно с `package.json` — версии должны совпадать.

### Критичные пакеты

| Пакет           | Что проверить после обновления                                            |
|-----------------|---------------------------------------------------------------------------|
| `pdfjs-dist`    | Подсветка рисков на PDF: TextLayer требует CSS-переменные `--total-scale-factor` и `--scale-round-x`. |
| `docx-preview`  | Вёрстка превью DOCX: `section.docx` (padding, поля).                      |
| `vue`, `pinia`  | Совместимость Composition API, реактивность сторов.                       |
| `vue-router`    | History mode, SPA-fallback в Nginx.                                       |
| `html2pdf.js`   | Корректность экспорта отчёта.                                             |
| `axios`         | Перехватчики (Authorization-заголовок).                                   |
| `@playwright/test` | Согласованность версии с Docker-образом.                               |

### Security-аудит

```bash
npm audit
npm audit fix --dry-run
npm audit fix
```

Уязвимости уровней `high` и `critical` устраняются вне очереди, отдельным PR с префиксом `fix(security):` в заголовке.

## 7. Сборка и релиз

Production-сборка собирается командой `npm run build`. Артефакты `dist/` копируются на сервер и подключаются к Nginx (см. `DEPLOYMENT.md`). Версионирование `package.json` ведётся по SemVer:

```bash
npm version patch    # 0.1.0 -> 0.1.1
git push --follow-tags
```

После релиза:

- Прогон smoke-набора e2e в production-окружении.
- Проверка healthcheck Nginx и бэкенда.
- Запись в `CHANGELOG.md`: дата релиза, перечень изменений.

## 8. Диагностика типичных проблем

### Запросы к бэкенду возвращают 401 Unauthorized

Причины и проверка:

- JWT-токен истёк. Решение: пользователь повторно входит, фронтенд получает новый токен.
- Заголовок `Authorization` не добавляется. Проверить интерсептор в `src/services/deepseek.js` (или соответствующем HTTP-клиенте).
- На стороне бэкенда сменился `sign_key` без обновления — токены старого пользователя становятся невалидными.

### Загрузка документа возвращает 400 unsupported file type

Бэкенд принимает MIME-типы:

- `application/pdf`
- `application/vnd.openxmlformats-officedocument.wordprocessingml.document` (DOCX)
- `text/plain`

Если файл `.doc` или иной формат — пользователь получает ошибку. Фронтенд предварительно проверяет тип файла на клиенте и блокирует загрузку.

### PDF загрузился, но текст не выделяется и не подсвечивается

`pdf.js` v5 требует CSS-переменные на текстовом слое. Проверить в DevTools, что у `.pdf-text-layer` заданы:

```css
--total-scale-factor: <число>;
--scale-round-x: 1px;
--scale-round-y: 1px;
```

Если переменных нет — это регрессия в `AnalysisResult.vue::renderPDF`.

### DOCX отображается с гигантскими полями

Word зашивает большие отступы в `section.docx`. В превью они перебиваются:

```css
.docx-preview :deep(section.docx) {
    padding: 10px !important;
}
```

Регрессия чаще всего связана с изменением scoped + `:deep()` в Vue.

### Риски не парсятся

Парсер `services/risks.js` поддерживает несколько форматов ответа модели: блоки маркеров `<!--RISKS--> ... <!--/RISKS-->`, ```json-блоки и голые JSON-массивы. Если ни одна стадия не отработала, в консоли появляется предупреждение с сырым ответом. Сохранить сырой ответ и приложить к задаче в трекере — это позволит расширить парсер.

### E2E падает по таймауту в Docker

Проверить healthcheck:

```bash
docker compose ps frontend
docker compose logs frontend | tail -50
```

При статусе `unhealthy` dev-сервер не успевает подняться. В `docker-compose.yml` увеличивается `start_period` healthcheck.

### Не получается войти

- Проверить, что бэкенд доступен: `curl -X POST $VUE_APP_API_BASE_URL/auth/sign-in -d '...'`.
- Проверить логи бэкенда: `docker logs dokkee-env-backend | tail -50`.
- Если в БД нет пользователя — выполнить регистрацию `POST /auth/sign-up`.

## 9. Логирование и наблюдаемость

Клиентских логов в production отдельно не собирается — ошибки отображаются пользователю в виде модальных уведомлений. Серверные логи бэкенда (формат JSON, `logrus`) доступны через:

```bash
docker compose -f ../dokkee-backend/docker-compose.yaml logs -f dokkee-backend
```

Метрики и события аудита фиксируются на бэкенде в таблице `audit_log` (тип события, хеш пользователя, хеш документа, IP, успех/ошибка, время). Анализ инцидентов выполняется по этой таблице.
