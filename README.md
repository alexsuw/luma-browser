# Luma Browser

[Открыть демо](https://alexsuw.github.io/luma-browser/) · [Результаты проверок](docs/VALIDATION.md)

Локальная коррекция яркости, контрастности и цветности изображений. Компактная MLP-нейросеть подбирает параметры, а алгоритм обработки применяет их к полному разрешению в Web Worker. Фотографии не отправляются на сервер.

## Запуск

Node.js 22.12+.

```sh
npm ci
npm run build
npm run dev
```

Откройте адрес, напечатанный Vite. Сборка для любого статического HTTPS-хостинга находится в `dist/`. Для production не используйте `file://`: ES-модулям и Worker нужен HTTP(S).

## API

```js
import { ImageEnhancer } from './src/api.js';
const enhancer = new ImageEnhancer();
enhancer.addEventListener('statuschange', ({ detail }) => {
  console.log(detail.id, detail.status, detail.progress);
  if (detail.status === 'completed') {
    const blob = enhancer.getResult(detail.id);
    // URL.createObjectURL(blob), download or send to the application's API.
  }
});
const id = enhancer.submit(file, { type: 'image/png', strength: 1 });
const status = enhancer.getStatus(id);
// enhancer.cancel(id);   // true when cancellation changed the state
// enhancer.release(id);  // remove task and release the retained result
// enhancer.dispose();    // cancel all tasks and release all results
```

`submit` принимает File/Blob, ArrayBuffer или HTTP(S)/blob URL. URL должен разрешать CORS. Возвращает UUID синхронно; события начинаются в следующей микрозадаче. `getResult` возвращает Blob только после `completed`, иначе выбрасывает ошибку. Неизвестный ID вызывает ошибку. Параметры: `type` PNG/JPEG, `quality` 0–1, `strength` 0–1. JPEG заполняет прозрачность белым.

Состояния: `queued → loading → decoding → analyzing → processing → encoding → completed`; альтернативные терминальные состояния `failed` и `cancelled`. Прогресс отражает этапы и обработанные строки, не является прогнозом оставшегося времени. `elapsedMs` отсчитывается от старта обработки; ожидание очереди отдельно не входит в лимит 30 с.

Обрабатывается одна задача, хранится до 8 задач, включая результаты. После скачивания вызовите `release`. Worker прекращается при отмене, ошибке, завершении или таймауте 30 с. Приложение не гарантирует успешное завершение на произвольно медленном устройстве: превышение бюджета времени возвращает `failed`.

## Проверки

```sh
npm test
npx playwright install chromium firefox webkit
npm run test:browser
npm run train
```

Техническое задание: [docs/SPEC.md](docs/SPEC.md). Методика обучения и ограничения: [docs/MODEL.md](docs/MODEL.md). Результаты проверок: [docs/VALIDATION.md](docs/VALIDATION.md). Лицензии: [THIRD_PARTY.md](THIRD_PARTY.md).

## GitHub Actions

Готовый workflow: `docs/ci.yml`. Для активации переместите его в `.github/workflows/ci.yml`; при публикации через OAuth нужен scope `workflow`. В текущей поставке тесты трёх движков выполнены локально через браузерный harness.
