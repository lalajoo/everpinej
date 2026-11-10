/**
 * 스크린타임 캡처 글자 인식. 전부 이 브라우저 안에서 실행된다.
 * - 엔진·언어 데이터는 이 앱 서버의 /ocr 에서만 불러온다(외부 CDN 없음).
 * - 이미지는 어디에도 업로드·저장하지 않는다.
 */
const BASE = `${import.meta.env.BASE_URL}ocr`;

/** 어두운 모드 캡처는 반전, 확대 + 이진화로 연한 글씨까지 인식률을 높인다. */
async function preprocess(file: Blob): Promise<HTMLCanvasElement> {
  const bmp = await createImageBitmap(file);
  // 작은 회색 글씨도 읽히도록 가로 약 1800px로 키운다
  const scale = Math.max(1, Math.min(2.5, 1800 / bmp.width));
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * scale);
  c.height = Math.round(bmp.height * scale);
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(bmp, 0, 0, c.width, c.height);
  bmp.close();
  const img = ctx.getImageData(0, 0, c.width, c.height);
  const d = img.data;
  let sum = 0;
  for (let i = 0; i < d.length; i += 4) sum += 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
  const dark = sum / (d.length / 4) < 110;
  // 이진화: iOS의 연한 회색 시간 글씨(밝기 ~175)·파란/주황 글씨는 검정으로, 배경·막대(~230)는 흰색으로
  for (let i = 0; i < d.length; i += 4) {
    let y = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    if (dark) y = 255 - y;
    const v = y < 205 ? 0 : 255;
    d[i] = d[i + 1] = d[i + 2] = v;
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

export async function recognizeScreenTime(file: Blob, onProgress?: (p: number) => void): Promise<string> {
  const canvas = await preprocess(file);
  const { createWorker } = await import('tesseract.js');
  const worker = await createWorker(['kor', 'eng'], 1, {
    workerPath: `${BASE}/worker.min.js`,
    corePath: `${BASE}/core`,
    langPath: `${BASE}/lang`,
    logger: (m: { status: string; progress: number }) => {
      // 엔진 준비 0~40%, 인식 40~100%
      if (m.status === 'recognizing text') onProgress?.(0.4 + m.progress * 0.6);
      else onProgress?.(Math.min(0.4, m.progress * 0.4));
    },
  });
  try {
    const { data } = await worker.recognize(canvas);
    return data.text;
  } finally {
    await worker.terminate();
  }
}
