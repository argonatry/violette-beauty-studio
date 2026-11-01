# Violette Beauty Studio

Одностраничный демо-сайт вымышленного салона маникюра и красы (язык сайта — украинский).
Чистые HTML/CSS/JS, без сборщиков. Анимации: GSAP 3 + ScrollTrigger + Flip, плавный скролл: Lenis (CDN).

## Структура

```
index.html          разметка всех 12 секций
css/style.css       стили, разбиты по секциям (оглавление в начале файла)
js/main.js          интерактив и анимации (модули описаны в шапке файла)
assets/images/      фото WebP, по два размера: name.webp и name-sm.webp
assets/videos/      hero.mp4 (1080p), hero-sm.mp4 (720p, для мобильных), care.mp4 + постеры
assets/icons/       favicon.svg / png, apple-touch-icon, og-image.jpg
CREDITS.md          источники и авторы всех фото и видео
```

## Запуск локально

Нужен любой статический сервер (открывать `index.html` двойным кликом не стоит: видео и шрифты могут не подгрузиться).

```bash
python -m http.server 8080
```

Открыть http://localhost:8080. Альтернатива с gzip, ближе к GitHub Pages:

```bash
npx serve .
```

## Деплой на GitHub Pages

1. Создай пустой репозиторий на GitHub, например `violette-beauty-studio`.
2. В папке проекта:

```bash
git init
git add .
git commit -m "Violette Beauty Studio: demo site"
git branch -M main
git remote add origin https://github.com/<твой-логин>/violette-beauty-studio.git
git push -u origin main
```

3. На GitHub: **Settings → Pages → Build and deployment → Source: Deploy from a branch**, ветка `main`, папка `/ (root)` → Save.
4. Через 1–2 минуты сайт будет на `https://<твой-логин>.github.io/violette-beauty-studio/`.

Все пути относительные, так что сайт работает и из подпапки репозитория. Файл `.nojekyll` отключает лишнюю обработку Jekyll.

### После деплоя

Open Graph требует абсолютных ссылок. Замени в `index.html`:

```html
<meta property="og:image" content="assets/icons/og-image.jpg">
```

на `https://<твой-логин>.github.io/violette-beauty-studio/assets/icons/og-image.jpg` и добавь `<meta property="og:url" content="https://<твой-логин>.github.io/violette-beauty-studio/">`.

## Что где настраивается

- **Цвета, шрифты, радиусы, тени** — CSS-переменные в `:root` (`css/style.css`, раздел 00).
- **Услуги и цены** — разметка в `index.html` (секция `#services`). Онлайн-запись берёт услуги прямо из прайса, отдельно их править не нужно.
- **Мастера** — секция `#masters` и шаг 2 формы записи.
- **Карта** — `iframe` в секции `#contacts` (параметр `q=`).
- **Telegram / Instagram / Viber** — сейчас это демо-ссылки с тостом (`data-demo-link`). Для реального салона поставь настоящие `href` и убери атрибут `data-demo-link`.

## Производительность и доступность

Lighthouse 12.8 (локально, сервер с gzip):

| | Performance | Accessibility | Best Practices | SEO |
|---|---|---|---|---|
| Mobile | 96 | 100 | 100 | 100 |
| Desktop | 99 | 100 | 100 | 100 |

- Прелоадер и появление hero сделаны на CSS-анимациях и не ждут загрузки JS с CDN.
- Hero-видео грузится после `load`, на экранах < 1024px берётся облегчённая версия. При `saveData` или 2G видео не грузится вовсе.
- `prefers-reduced-motion`: прелоадер, видео, Lenis, параллакс и все анимации отключаются, контент виден сразу.
- Магнитные кнопки включаются только на устройствах с мышью.

Форма записи — демо: данные никуда не отправляются.
