# Third-party components

* libheif-js 1.23.2: https://github.com/catdad-experiments/libheif-js — LGPL-3.0. The unmodified ES module is distributed separately in `public/vendor/libheif.mjs`; users can replace it. License: `public/vendor/LICENSE-libheif`. Source and build scripts: https://github.com/catdad-experiments/libheif-js/tree/v1.23.2 . Upstream libheif: https://github.com/strukturag/libheif . The bundled module embeds its WASM runtime; no external CDN is used.
* HEIC interoperability fixture: https://github.com/strukturag/libheif/blob/master/examples/example.heic (downloaded 2026-09-09). Repository license is included in `tests/fixtures/LICENSE-libheif`. Used solely as an interoperability fixture, not a photographic quality reference.
* Vite and Playwright are development dependencies. Their upstream licenses are available in their packages. They are not shipped in the application payload.

MIT licensing of this project does not relicense third-party components.
