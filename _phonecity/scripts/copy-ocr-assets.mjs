// OCR 엔진·언어 데이터를 public/ocr 로 복사한다. 외부 CDN 없이 이 서버에서만 불러오기 위함.
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const nm = join(root, 'node_modules');
const out = join(root, 'public', 'ocr');
const files = [
  ['tesseract.js/dist/worker.min.js', 'worker.min.js'],
  ['tesseract.js-core/tesseract-core-lstm.wasm.js', 'core/tesseract-core-lstm.wasm.js'],
  ['tesseract.js-core/tesseract-core-simd-lstm.wasm.js', 'core/tesseract-core-simd-lstm.wasm.js'],
  ['tesseract.js-core/tesseract-core-relaxedsimd-lstm.wasm.js', 'core/tesseract-core-relaxedsimd-lstm.wasm.js'],
  ['@tesseract.js-data/kor/4.0.0_best_int/kor.traineddata.gz', 'lang/kor.traineddata.gz'],
  ['@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz', 'lang/eng.traineddata.gz'],
];
for (const [from, to] of files) {
  const src = join(nm, from);
  const dst = join(out, to);
  if (!existsSync(src)) { console.warn(`[ocr] 없음: ${from} (npm install 필요)`); continue; }
  mkdirSync(dirname(dst), { recursive: true });
  copyFileSync(src, dst);
}
console.log('[ocr] public/ocr 준비 완료');
