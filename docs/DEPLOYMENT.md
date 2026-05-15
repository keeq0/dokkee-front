# Инструкция по развертыванию фронтенда Dokkee

Документ описывает развертывание фронтенд-приложения Dokkee. Фронтенд связан с бэкендом `dokkee-backend`, который реализует REST API на Go (порт 8000 по умолчанию). При развертывании настраивается адрес API, после чего фронтенд получает доступ к аутентификации, загрузке документов, получению результатов анализа и пользовательскому профилю.

## Содержание

1. [Архитектура развертывания](#1-архитектура-развертывания)
2. [Требования к окружению](#2-требования-к-окружению)
3. [Переменные окружения](#3-переменные-окружения)
4. [Запуск в режиме разработки](#4-запуск-в-режиме-разработки)
5. [Запуск через Docker](#5-запуск-через-docker)
6. [Сборка production-бандла](#6-сборка-production-бандла)
7. [Раздача статики через Nginx](#7-раздача-статики-через-nginx)
8. [Проверка после развертывания](#8-проверка-после-развертывания)

---

## 1. Архитектура развертывания

Минимальная схема развертывания:

```
Браузер
   |
   v
Nginx (фронтенд: статика + reverse proxy /api -> backend)
   |
   +--> /var/www/dokkee/dist                  (статический бандл фронтенда)
   +--> http://dokkee-backend:8000            (REST API на Go)
                |
                +--> PostgreSQL 18            (пользователи, документы, результаты, аудит)
                +--> MinIO (S3-совместимый)   (исходные файлы документов)
                +--> Внешний AI-провайдер     (анализ обезличенного текста)
```

Фронтенд развёртывается отдельно от бэкенда: один проект собирается в статические файлы и раздаётся веб-сервером, второй запускается в Docker-сети вместе с базой данных и объектным хранилищем. Связь между ними — HTTP/HTTPS, маршрут `/api/*` (и `/auth/*` для входа/регистрации) проксируется на бэкенд.

## 2. Требования к окружению

| Компонент      | Версия            | Назначение                              |
|----------------|-------------------|-----------------------------------------|
| Node.js        | 20.x LTS          | Сборка и dev-сервер                     |
| npm            | 10.x              | Менеджер пакетов                        |
| Docker         | 24+               | Контейнерный запуск                     |
| Docker Compose | v2                | Оркестрация сервисов                    |
| Nginx          | 1.24+             | Раздача статики и reverse proxy         |
| dokkee-backend | актуальная версия | Серверная часть приложения              |
| Браузер        | Chromium 120+, Firefox 120+, Safari 17+ | Поддержка ESM, pdf.js v5 |

## 3. Переменные окружения

Файл `.env.example` содержит шаблон. Скопировать и заполнить:

```bash
cp .env.example .env
```

| Переменная             | Назначение                                                        |
|------------------------|-------------------------------------------------------------------|
| `VUE_APP_API_BASE_URL` | Базовый URL бэкенда (например, `https://dokkee.example.com/api`). |
| `VUE_APP_DEEPSEEK_KEY` | Используется в режиме автономной работы без бэкенда.              |
| `CHOKIDAR_USEPOLLING`  | `true` для отслеживания файлов в Docker-volume.                   |
| `HOST`                 | Адрес bind dev-сервера.                                           |
| `PORT`                 | Порт dev-сервера (по умолчанию 8080).                             |
| `BASE_URL`             | Базовый URL для Playwright E2E.                                   |

В production-режиме при наличии `VUE_APP_API_BASE_URL` фронтенд обращается к бэкенду; ключ внешнего AI хранится на стороне бэкенда (`AI_API_KEY`) и в бандл фронтенда не попадает.

Файл `.env` находится в `.gitignore` и в репозиторий не коммитится.

## 4. Запуск в режиме разработки

```bash
git clone <repo-url> dokkee-front
cd dokkee-front
cp .env.example .env
# отредактировать .env: проставить VUE_APP_API_BASE_URL
npm install
npm run serve
```

Dev-сервер слушает `http://localhost:8080` с hot reload. Параллельно необходимо поднять `dokkee-backend` — инструкция в его README, минимальный набор команд:

```bash
cd ../dokkee-backend
make env-up           # PostgreSQL
make migrate-up       # миграции
make backend-build    # сборка образа бэкенда
make backend-up       # запуск контейнера на :8000
```

После старта обоих приложений фронтенд при логине будет обращаться к `http://localhost:8000/auth/sign-in`.

## 5. Запуск через Docker

Фронтенд имеет собственный `docker-compose.yml`, который поднимает dev-сервер и сервисы непрерывных тестов (unit, lint, e2e). Команды:

```bash
cp .env.example .env
docker compose up -d frontend
```

Контейнер `dokkee-frontend` слушает порт 8080 и имеет healthcheck (`wget http://127.0.0.1:8080`). Дождаться статуса `healthy`:

```bash
docker compose ps frontend
```

При параллельной разработке бэкенда удобно объединить оба `docker-compose` в общую сеть. В `docker-compose.yml` фронтенда добавляется `external` сеть:

```yaml
networks:
  dokkee:
    external: true

services:
  frontend:
    networks:
      - dokkee
```

После этого в `VUE_APP_API_BASE_URL` указывается имя сервиса бэкенда: `http://dokkee-backend:8000`.

## 6. Сборка production-бандла

```bash
VUE_APP_API_BASE_URL="https://dokkee.example.com/api" npm run build
```

Артефакты появятся в каталоге `dist/`: `index.html`, JS- и CSS-чанки, ассеты. Артефакты — статический сайт, не требующий Node.js для отдачи.

Сборку можно выполнить и в Docker через профиль `build` из `docker-compose.yml`:

```bash
docker compose --profile build run --rm build-check
```

## 7. Раздача статики через Nginx

Минимальная конфигурация для production-домена:

```nginx
upstream dokkee_backend {
    server dokkee-backend:8000;
}

server {
    listen 443 ssl http2;
    server_name dokkee.example.com;

    ssl_certificate     /etc/letsencrypt/live/dokkee.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/dokkee.example.com/privkey.pem;

    root /var/www/dokkee/dist;
    index index.html;

    gzip on;
    gzip_types text/plain text/css application/javascript application/json image/svg+xml;
    gzip_min_length 1024;

    # SPA fallback: vue-router (history mode) требует отдавать index.html на любые пути.
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Прокси на бэкенд для аутентификации и API.
    location /auth/ {
        proxy_pass http://dokkee_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /api/ {
        proxy_pass http://dokkee_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        client_max_body_size 12M;  # лимит upload-а: 10 МБ + накладные.
    }

    location ~* \.(js|css|woff2|svg|png|jpg)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    add_header X-Frame-Options "DENY";
    add_header X-Content-Type-Options "nosniff";
    add_header Referrer-Policy "strict-origin-when-cross-origin";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
}

server {
    listen 80;
    server_name dokkee.example.com;
    return 301 https://$host$request_uri;
}
```

Деплой бандла:

```bash
rsync -av --delete dist/ deploy@server:/var/www/dokkee/dist/
ssh deploy@server "sudo nginx -t && sudo systemctl reload nginx"
```

## 8. Проверка после развертывания

Чек-лист после деплоя:

- `https://<domain>/` отдаёт страницу входа (HTTP 200).
- В DevTools (вкладка Network) бандл `app.<hash>.js` загружается без ошибок CORS/MIME.
- Регистрация нового пользователя: запрос на `POST /auth/sign-up` возвращает `200` с `id`.
- Вход существующего пользователя: запрос на `POST /auth/sign-in` возвращает `token`.
- Загрузка PDF: `POST /api/documents` принимает файл, возвращает идентификатор, статус документа меняется через `queued -> processing -> completed`.
- Запрос результата: `GET /api/documents/:id/result` возвращает JSON с рисками после завершения анализа.
- Фронтенд отображает подсветку рисков на превью документа.

Откат к предыдущей версии бандла — заменой содержимого `/var/www/dokkee/dist/` на предыдущий релиз. При схеме с симлинком на каталог релиза `releases/<timestamp>/` откат сводится к переключению ссылки и `nginx -s reload`.
