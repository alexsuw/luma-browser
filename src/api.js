const terminal = new Set(["completed", "failed", "cancelled"]);
export class ImageEnhancer extends EventTarget {
  constructor({ timeout = 30000, maxJobs = 8 } = {}) {
    super();
    if (
      !Number.isFinite(timeout) ||
      timeout <= 0 ||
      timeout > 30000 ||
      !Number.isInteger(maxJobs) ||
      maxJobs < 1
    )
      throw new TypeError("Invalid configuration");
    this.timeout = timeout;
    this.maxJobs = maxJobs;
    this.jobs = new Map();
    this.queue = [];
    this.active = null;
    this.closed = false;
  }
  submit(input, { type = "image/png", quality = 0.92, strength = 1 } = {}) {
    if (this.closed) throw new Error("API disposed");
    if (this.jobs.size >= this.maxJobs)
      throw new Error("Удалите старые задачи через release()");
    if (
      !(input instanceof Blob) &&
      !(input instanceof ArrayBuffer) &&
      typeof input !== "string"
    )
      throw new TypeError("Ожидается Blob, File, ArrayBuffer или URL");
    if (
      !["image/png", "image/jpeg"].includes(type) ||
      !Number.isFinite(quality) ||
      quality < 0 ||
      quality > 1 ||
      !Number.isFinite(strength) ||
      strength < 0 ||
      strength > 1
    )
      throw new TypeError("Недопустимые параметры");
    const id = crypto.randomUUID(),
      job = {
        id,
        status: "queued",
        progress: 0,
        input,
        options: { type, quality, strength },
        createdAt: Date.now(),
      };
    this.jobs.set(id, job);
    this.queue.push(id);
    queueMicrotask(() => {
      if (this.jobs.has(id)) this.emit(job);
      this.pump();
    });
    return id;
  }
  getStatus(id) {
    const j = this.get(id);
    return {
      id: j.id,
      status: j.status,
      progress: j.progress,
      error: j.error,
      parameters: j.parameters,
      width: j.width,
      height: j.height,
      elapsedMs: (j.endedAt || Date.now()) - (j.startedAt || j.createdAt),
    };
  }
  get(id) {
    const j = this.jobs.get(id);
    if (!j) throw new Error("Неизвестная задача");
    return j;
  }
  getOriginalPreview(id) {
    return this.get(id).originalPreview;
  }
  getResult(id) {
    const j = this.get(id);
    if (j.status !== "completed") throw new Error("Результат ещё не готов");
    return j.result;
  }
  emit(j) {
    this.dispatchEvent(
      new CustomEvent("statuschange", { detail: this.getStatus(j.id) }),
    );
  }
  finish(j, patch) {
    if (!this.jobs.has(j.id) || terminal.has(j.status)) return;
    Object.assign(j, patch, { endedAt: Date.now(), input: null });
    clearTimeout(j.timer);
    if (j.worker) {
      j.worker.onmessage = null;
      j.worker.onerror = null;
      j.worker.terminate();
    }
    j.worker = null;
    if (this.active === j.id) this.active = null;
    this.emit(j);
    queueMicrotask(() => this.pump());
  }
  cancel(id) {
    const j = this.get(id);
    if (terminal.has(j.status)) return false;
    this.queue = this.queue.filter((v) => v !== id);
    this.finish(j, { status: "cancelled" });
    return true;
  }
  release(id) {
    const j = this.get(id);
    if (!terminal.has(j.status)) this.cancel(id);
    this.jobs.delete(id);
  }
  dispose() {
    this.closed = true;
    for (const id of [...this.jobs.keys()]) this.release(id);
  }
  pump() {
    if (this.active || this.closed) return;
    const id = this.queue.shift();
    if (!id) return;
    const j = this.jobs.get(id);
    if (!j || terminal.has(j.status)) {
      this.pump();
      return;
    }
    this.active = id;
    j.startedAt = Date.now();
    try {
      j.worker = new Worker(new URL("./worker.js", import.meta.url), {
        type: "module",
      });
      j.timer = setTimeout(
        () =>
          this.finish(j, {
            status: "failed",
            error: `Превышено время обработки (${this.timeout / 1000} с)`,
          }),
        this.timeout,
      );
      j.worker.onerror = () =>
        this.finish(j, { status: "failed", error: "Ошибка Web Worker" });
      j.worker.onmessage = ({ data }) => {
        if (!this.jobs.has(id) || terminal.has(j.status)) return;
        if (terminal.has(data.status)) this.finish(j, data);
        else {
          Object.assign(j, data);
          this.emit(j);
        }
      };
      j.worker.postMessage({
        input: j.input,
        options: j.options,
        decoderURL: new URL(
          `${import.meta.env.BASE_URL}vendor/libheif.mjs`,
          location.href,
        ).href,
      });
    } catch (e) {
      this.finish(j, { status: "failed", error: e.message });
    }
  }
}
