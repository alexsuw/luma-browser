import { copyFileSync, mkdirSync } from 'node:fs';
mkdirSync('public/vendor',{recursive:true});
copyFileSync('node_modules/libheif-js/libheif-wasm/libheif-bundle.mjs','public/vendor/libheif.mjs');
copyFileSync('node_modules/libheif-js/LICENSE','public/vendor/LICENSE-libheif');
