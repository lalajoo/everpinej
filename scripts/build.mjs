import { cp, mkdir, rm, readFile } from 'node:fs/promises';
const manifest = JSON.parse(await readFile(new URL('../penuri/data/manifest.json', import.meta.url)));
if (!manifest.count) throw new Error('공식 약국 데이터가 없습니다. 먼저 data:import를 실행하세요.');
await rm(new URL('../dist', import.meta.url), { recursive: true, force: true });
await mkdir(new URL('../dist', import.meta.url), { recursive: true });
await cp(new URL('../penuri', import.meta.url), new URL('../dist/penuri', import.meta.url), { recursive: true });
console.log(`빌드 완료: dist/penuri (${manifest.count}개 약국). 기존 사이트의 penuri 폴더로 배포하세요.`);
