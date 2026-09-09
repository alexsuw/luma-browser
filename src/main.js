import "./style.css";
import { ImageEnhancer } from "./api.js";
const api = new ImageEnhancer();
window.enhancer = api;
document.querySelector("#app").innerHTML =
  `<header><a class="brand" href="./">◐ <b>luma</b></a><span>Изображения остаются на устройстве <i></i></span></header><main><section class="intro"><span class="eyebrow">ЛОКАЛЬНАЯ КОРРЕКЦИЯ / 01</span><h1>Больше света.<br><em>Естественный цвет.</em></h1><p>Нейросеть подберёт яркость, контраст и насыщенность вашей фотографии.</p></section><section class="workspace"><div class="viewer" id="drop"><div id="empty"><div class="aperture">◉</div><h2>Ваша фотография — здесь</h2><p>Перетащите файл или выберите его на устройстве</p><label class="button" for="file">Выбрать фотографию <span>↗</span></label><p class="hint">JPG · PNG · HEIC · BMP / до 15 Мп</p></div><div id="comparison" hidden><img id="preview" alt="Предпросмотр фотографии"><span class="image-label" id="image-label">Оригинал</span></div></div><aside><div class="aside-head"><span class="eyebrow">НАСТРОЙКИ</span><span>✦</span></div><h2>Автоматическое улучшение</h2><label for="strength">Интенсивность <output id="amount">100%</output></label><input id="strength" type="range" min="0" max="100" value="100"><p class="note">Мягкая коррекция без изменения размера изображения.</p><label for="format">Формат результата</label><select id="format"><option value="image/png">PNG · без потерь</option><option value="image/jpeg">JPEG · компактнее</option></select><button id="run" class="button" disabled>Улучшить фотографию <span>✦</span></button><button id="cancel" hidden>Прервать обработку</button><div class="status" role="status" aria-live="polite"><span id="status">Выберите изображение</span><span id="percent"></span></div><progress max="100" value="0" aria-label="Прогресс обработки"></progress><div id="params"></div><a id="download" class="button secondary" hidden>Скачать результат ↓</a><button id="toggle" hidden>Показать оригинал</button></aside></section><footer><span id="filename">Одно изображение. Три точные настройки.</span><label for="file" class="replace">Выбрать другой файл ↗</label></footer><input id="file" type="file" accept=".jpg,.jpeg,.png,.heic,.heif,.bmp" hidden></main>`;
const $ = (s) => document.querySelector(s);
let file,
  id,
  originalURL,
  resultURL,
  showResult = true;
const names = {
  queued: "В очереди",
  loading: "Чтение файла",
  decoding: "Декодирование",
  analyzing: "Анализ нейросетью",
  processing: "Коррекция изображения",
  encoding: "Сохранение",
  completed: "Готово",
  cancelled: "Обработка прервана",
  failed: "Ошибка",
};
function select(f) {
  if (!f) return;
  if (id) {
    api.release(id);
    id = null;
  }
  for (const u of [originalURL, resultURL]) if (u) URL.revokeObjectURL(u);
  resultURL = null;
  file = f;
  originalURL = URL.createObjectURL(f);
  $("#preview").src = originalURL;
  $("#preview").onerror = () => {
    $("#preview").removeAttribute("src");
    $("#image-label").textContent = "Предпросмотр появится после обработки";
  };
  $("#empty").hidden = true;
  $("#comparison").hidden = false;
  $("#run").disabled = false;
  $("#download").hidden = true;
  $("#toggle").hidden = true;
  $("#cancel").hidden = true;
  $("#params").textContent = "";
  $("#filename").textContent = `${f.name} · ${(f.size / 1e6).toFixed(2)} МБ`;
  $("#status").textContent = "Готово к обработке";
  $("#percent").textContent = "";
  $("progress").value = 0;
  $("#image-label").textContent = "Оригинал";
}
$("#file").onchange = (e) => select(e.target.files[0]);
$("#drop").ondragover = (e) => {
  e.preventDefault();
};
$("#drop").ondrop = (e) => {
  e.preventDefault();
  select(e.dataTransfer.files[0]);
};
$("#strength").oninput = (e) =>
  ($("#amount").textContent = `${e.target.value}%`);
$("#run").onclick = () => {
  try {
    if (id) api.release(id);
    $("#download").hidden = true;
    $("#toggle").hidden = true;
    id = api.submit(file, {
      type: $("#format").value,
      strength: Number($("#strength").value) / 100,
    });
    $("#run").disabled = true;
    $("#cancel").hidden = false;
  } catch (e) {
    $("#status").textContent = e.message;
  }
};
$("#cancel").onclick = () => api.cancel(id);
api.addEventListener("statuschange", ({ detail: j }) => {
  if (j.id !== id) return;
  $("#status").textContent = j.error || names[j.status];
  $("#percent").textContent = `${j.progress}%`;
  $("progress").value = j.progress;
  if (["completed", "failed", "cancelled"].includes(j.status)) {
    $("#cancel").hidden = true;
    $("#run").disabled = false;
  }
  if (j.status === "completed") {
    if (resultURL) URL.revokeObjectURL(resultURL);
    const original = api.getOriginalPreview(id);
    if (original) {
      URL.revokeObjectURL(originalURL);
      originalURL = URL.createObjectURL(original);
    }
    const blob = api.getResult(id);
    resultURL = URL.createObjectURL(blob);
    $("#preview").src = resultURL;
    showResult = true;
    $("#image-label").textContent = "После коррекции";
    $("#toggle").hidden = false;
    $("#toggle").textContent = "Показать оригинал";
    $("#download").href = resultURL;
    $("#download").download =
      `${file.name.replace(/\.[^.]+$/, "")}-enhanced.${blob.type === "image/png" ? "png" : "jpg"}`;
    $("#download").hidden = false;
    $("#params").textContent =
      `${j.width} × ${j.height} · ${(j.elapsedMs / 1000).toFixed(2)} с\nЯркость ${j.parameters.brightness.toFixed(2)} / Контраст ${j.parameters.contrast.toFixed(2)} / Цвет ${j.parameters.saturation.toFixed(2)}`;
  }
});
$("#toggle").onclick = () => {
  showResult = !showResult;
  $("#preview").src = showResult ? resultURL : originalURL;
  $("#image-label").textContent = showResult ? "После коррекции" : "Оригинал";
  $("#toggle").textContent = showResult
    ? "Показать оригинал"
    : "Показать результат";
};
window.addEventListener("pagehide", () => api.dispose());
