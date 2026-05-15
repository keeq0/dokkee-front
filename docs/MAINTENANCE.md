# Инструкция по сопровождению фронтенда Dokkee

Документ для разработчика и DevOps, которые отвечают за поддержку фронтенда: тесты, обновление зависимостей, диагностика типичных проблем, регламент релизов.

## Содержание

1. [Структура репозитория](#1-структура-репозитория)
2. [Регламент работы с ветками](#2-регламент-работы-с-ветками)
3. [Тесты и линт](#3-тесты-и-линт)
4. [Обновление зависимостей](#4-обновление-зависимостей)
5. [Релизы](#5-релизы)
6. [Диагностика типичных проблем](#6-диагностика-типичных-проблем)
7. [Логирование и наблюдаемость](#7-логирование-и-наблюдаемость)
8. [Контакты и эскалация](#8-контакты-и-эскалация)

---

## 1. Структура репозитория

```
src/
  views/            Корневые страницы (MainPage, DocumentPage, AnalysisPage, AccountPage)
  components/       Многоразовые компоненты (UploadDocuments, AnalysisResult, AiAssistant и пр.)
  composables/      Composition API хуки (useAnalysisProgress, useStreamingText)
  services/         Бизнес-логика без UI (deepseek, risks, reportExport, highlight)
  stores/           Pinia-сторы (documents.js хранит per-document state)
  router/           Vue Router конфиг
  helpers/          Утилиты общего назначения

tests/
  unit/             Vitest, юнит-тесты сервисов и сторов
  e2e/              Playwright, end-to-end сценарии (HAR-моки DeepSeek)

docs/               Документация (этот файл и соседние)
docker-compose.yml  Сервисы frontend/test-unit/test-lint/test-e2e
Dockerfile          Multi-stage: deps -> dev / test / e2e
```

Размер файлов держим в пределах 200-400 строк (макс. 800 — см. `.claude/rules/architecture.md`).

## 2. Регламент работы с ветками

- `main` — продакшен-ветка. Защищена, прямые пуши запрещены.
- `issue/<номер>-<кратко>` — рабочая ветка под GitHub issue (например, `issue/19-pdf-canvas-restore`).
- Коммиты — на русском, префикс `fix:` / `feat:` / `refactor:` / `chore:` и т.п., глагол в прошедшем времени. Если ветка из issue, в конец первой строки добавляется `(#XXXX)`. Подробнее — `.claude/rules/git.md`.
- PR создаётся из issue-ветки в `main`, ревью обязательно перед merge.
- После merge ветка удаляется (`gh pr merge --delete-branch`).

Запрещено коммитить:

- `.env` с реальными ключами
- `.claude/`, `.superpowers/`, `.playwright-mcp/`
- `node_modules/`, `dist/`, `playwright-report/`, `test-results/`
- `CLAUDE.md`, `CLAUDE.local.md`

## 3. Тесты и линт

### Локальный запуск

```bash
npm run lint              # eslint без авто-фикса
npm run lint:fix          # с авто-фиксом
npm run test:unit         # vitest (одноразовый прогон)
npm run test:unit:watch   # vitest в watch-режиме
npm run test:e2e          # playwright (нужен dev-сервер на BASE_URL)
```

После каждого изменения кода прогоняется релевантный набор тестов. Задача не закрывается без зелёных тестов (правило из `.claude/rules/workflow.md`).

### Запуск в Docker (watch-режим)

```bash
docker compose up -d test-unit test-lint test-e2e
docker compose logs -f test-unit       # смотреть прогон
```

`test-e2e` зависит от `frontend` через `condition: service_healthy` — поднимется только когда dev-сервер пройдёт healthcheck.

### E2E-нюансы

- Запросы к DeepSeek мокаются через **HAR-записи** (`page.routeFromHAR()`).
- HAR-файлы коммитятся в репозиторий, ревью diff'а — обязательно. Регенерация — только по явному флагу `E2E_UPDATE_HAR=1` с поднятым backend.
- Локаторы — `getByRole/getByTestId/getByText`. CSS-селекторы — только в крайнем случае.
- Внутренние Playwright-правила собраны в `.claude/rules/playwright.md`.

### Coverage

```bash
npm run test:unit -- --coverage
```

Отчёт собирается в `coverage/`. Минимальный порог не зафиксирован — рекомендуется поддерживать `>70%` на `services/` и `stores/`.

## 4. Обновление зависимостей

### Регламент

- Раз в 2 недели: `npm outdated` + `npm audit`.
- Минорные/патч-апдейты — пачкой, одним PR с прогоном всех тестов.
- Мажорные апдейты (особенно `vue`, `pinia`, `vue-router`, `pdfjs-dist`, `playwright`) — отдельным PR с release-notes в описании.
- При апдейте `playwright` версия в `Dockerfile` (`mcr.microsoft.com/playwright:v1.49.0-jammy`) **должна совпадать** с версией в `package.json`. Это два места — обновлять оба.

### Критичные пакеты

| Пакет | Риски при обновлении |
|-------|----------------------|
| `pdfjs-dist` | Меняется API TextLayer, требуются CSS-переменные `--total-scale-factor`, `--scale-round-x`. Проверять подсветку рисков на PDF. |
| `docx-preview` | Может измениться вёрстка `section.docx` — проверить padding (важно для DOCX-превью). |
| `vue` / `pinia` | Composition API совместимость. Проверять реактивность сторов. |
| `html2pdf.js` | Используется в экспорте отчёта. Проверять итоговый PDF на корректность. |
| `playwright` | Версия должна совпадать с Docker-образом. |

### Security-аудит

```bash
npm audit
npm audit fix --dry-run    # сначала посмотреть план
npm audit fix              # если безопасно
```

Критичные уязвимости — фиксить вне очереди, отдельный PR с пометкой `security:` в заголовке.

## 5. Релизы

Сейчас релиз = merge в `main` + публикация статики (см. [DEPLOYMENT.md](DEPLOYMENT.md)). Версионирование `package.json` не используется (`"version": "0.1.0"` зафиксирован). Когда понадобится — переход на SemVer и теги:

```bash
npm version patch          # 0.1.0 -> 0.1.1
git push --follow-tags
```

После релиза:

- Прогнать E2E в production-окружении (smoke-набор).
- Проверить healthcheck nginx-контейнера.
- Зафиксировать релиз в `CHANGELOG.md` (на старте не ведётся — стоит завести).

## 6. Диагностика типичных проблем

### "DeepSeek упал с 401 Unauthorized"

Проверить:

```bash
echo $VUE_APP_DEEPSEEK_KEY     # должен быть непустым в момент сборки
curl -H "Authorization: Bearer $KEY" https://api.deepseek.com/v1/models
```

Если ключ валиден, но 401 в браузере — пересобрать бандл: ключ запекается на этапе `npm run build`, старые чанки могут не содержать обновлённого значения.

### "PDF загрузился, но текст не выделяется"

Pdf.js v5 требует CSS-переменные на text-layer. Проверить в DevTools:

```css
.pdf-text-layer {
    --total-scale-factor: <число>;
    --scale-round-x: 1px;
    --scale-round-y: 1px;
}
```

Если переменные отсутствуют — регрессия в `AnalysisResult.vue::renderPDF`. См. историю коммита `5940fe0`.

### "DOCX отображается с гигантскими полями"

Word зашивает `padding: 56.7pt 42.5pt 56.7pt 56.7pt` в `section.docx`. Перебивается правилом:

```css
.docx-preview :deep(section.docx) {
    padding: 10px !important;
}
```

Если правило перестало работать — проверить, что не сломан scoped + `:deep()` (Vue 3.4+).

### "Не парсятся риски от DeepSeek"

Парсер `services/risks.js` идёт по трём стадиям: маркеры `<!--RISKS-->` -> код-блоки ` ```json ` -> голые JSON-массивы. Если ни одна не сработала, в консоли будет warn. Включите debug-лог:

```js
// в risks.js временно:
console.warn('[risks] all parsers failed, raw:', raw);
```

Скопируйте `raw` и приложите к issue — это сырой ответ модели.

### "E2E падает по таймауту в Docker"

Проверить healthcheck:

```bash
docker compose ps frontend
docker compose logs frontend | tail -50
```

Если frontend `unhealthy` — dev-сервер не успел подняться. Увеличить `start_period` в `healthcheck` (по умолчанию 30s).

## 7. Логирование и наблюдаемость

Серверного логирования нет (бэкенда нет). Клиентские ошибки можно собрать через Sentry / GlitchTip — **на текущий момент не подключено**, это задача на доработку:

```js
// src/main.js (рекомендация)
import * as Sentry from '@sentry/vue';

Sentry.init({
    app,
    dsn: process.env.VUE_APP_SENTRY_DSN,
    environment: process.env.NODE_ENV,
});
```

Дополнительно при подключении бэкенд-прокси (см. [DEPLOYMENT.md §5](DEPLOYMENT.md#5-production-сборка)) — собирать метрики на стороне прокси (latency запросов к DeepSeek, ошибки, токены).

## 8. Контакты и эскалация

- Issue tracker: GitHub Issues этого репозитория.
- Критические инциденты (production down) — эскалация на администратора, см. [ADMIN_GUIDE.md](ADMIN_GUIDE.md).
- Security-уязвимости — не публиковать в open issues. Приватный канал указывается администратором.
