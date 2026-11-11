// 일본어 진료 카드: 사용자가 고른 답을 정해진 일본어 문장으로 바꿉니다.
// 기계 번역을 쓰지 않고 미리 검수한 문장만 조합합니다. 입력값은 기기 밖으로 나가지 않습니다.

export const CONDITIONS = [
  { id: 'diabetes', ko: '당뇨병', ja: '糖尿病' },
  { id: 'pancreatitis', ko: '췌장염(과거 포함)', ja: '膵炎（過去も含む）' },
  { id: 'gallbladder', ko: '담석·담낭 질환', ja: '胆石・胆のうの病気' },
  { id: 'thyroid', ko: '갑상선 질환(가족의 갑상선 수질암 포함)', ja: '甲状腺の病気（家族の甲状腺髄様がんを含む）' },
  { id: 'gi', ko: '심한 위장 질환', ja: '重い胃腸の病気' },
];

export const PHRASES = [
  ['マンジャロの処方を希望します。', '만자로노 쇼호-오 키보-시마스', '마운자로 처방을 원해요.'],
  ['予約はしていません。今日診てもらえますか。', '요야쿠와 시테이마셍. 쿄- 미테 모라에마스카?', '예약은 안 했어요. 오늘 진료받을 수 있나요?'],
  ['日本の保険証はありません。自由診療でお願いします。', '니혼노 호켄쇼-와 아리마셍. 지유-신료-데 오네가이시마스', '일본 건강보험증이 없어요. 자유진료(전액 본인 부담)로 해 주세요.'],
  ['何本まで処方できますか。', '난봉마데 쇼호- 데키마스카?', '몇 펜까지 처방받을 수 있나요?'],
  ['注射の打ち方を教えてください。', '츄-샤노 우치카타오 오시에테 쿠다사이', '주사 놓는 법을 알려 주세요.'],
  ['領収書と明細書をください。', '료-슈-쇼토 메-사이쇼오 쿠다사이', '영수증과 명세서를 주세요.'],
  ['保冷バッグはありますか。', '호레- 박구와 아리마스카?', '보냉백 있나요?'],
  ['カードで払えますか。', '카-도데 하라에마스카?', '카드로 결제할 수 있나요?'],
  ['副作用が出たら、どうすればいいですか。', '후쿠사요-가 데타라, 도- 스레바 이-데스카?', '부작용이 생기면 어떻게 해야 하나요?'],
  ['もう一度ゆっくり言ってください。', '모- 이치도 윳쿠리 잇테 쿠다사이', '한 번 더 천천히 말해 주세요.'],
];

const num = v => { const n = Number(v); return Number.isFinite(n) && n > 0 ? n : null; };
const clean = v => String(v ?? '').replace(/[\r\n]+/g, ' ').trim().slice(0, 120);

export function bmi(heightCm, weightKg) {
  const h = num(heightCm), w = num(weightKg);
  if (!h || !w) return null;
  return Math.round((w / ((h / 100) ** 2)) * 10) / 10;
}

// answers → [{ ja, ko }] 줄 목록
export function buildCard(a = {}) {
  const lines = [];
  const add = (ja, ko) => lines.push({ ja, ko });
  add('韓国から来た旅行者です。体重を減らすために、マンジャロの処方を希望します。', '한국에서 온 여행자예요. 체중 감량을 위해 마운자로 처방을 원해요.');
  add('日本の健康保険証はありません。自由診療（全額自己負担）で大丈夫です。', '일본 건강보험증은 없어요. 자유진료(전액 본인 부담)로 괜찮아요.');
  const days = num(a.days);
  if (days) add(`日本には${days}日間滞在します。`, `일본에 ${days}일 머물러요.`);
  const age = num(a.age);
  if (age) add(`年齢は${age}歳です。`, `나이는 ${age}세예요.`);
  const h = num(a.height), w = num(a.weight), b = bmi(h, w);
  if (h && w) add(`身長${h}cm、体重${w}kgです（BMI ${b}）。`, `키 ${h}cm, 몸무게 ${w}kg이에요(BMI ${b}).`);
  if (a.experience === 'first') add('マンジャロを使うのは初めてです。', '마운자로는 처음 써요.');
  if (a.experience === 'mounjaro') add(`以前からマンジャロを使っています（最近の用量：${clean(a.prevDose) || '不明'}）。`, `예전부터 마운자로를 써 왔어요(최근 용량: ${clean(a.prevDose) || '모름'}).`);
  if (a.experience === 'other') add('ほかのGLP-1の薬（ウゴービ・サクセンダなど）を使ったことがあります。', '다른 GLP-1 약(위고비·삭센다 등)을 써 본 적이 있어요.');
  const conds = CONDITIONS.filter(c => (a.conditions ?? []).includes(c.id));
  if (conds.length) add(`次の病気があります（または、ありました）：${conds.map(c => c.ja).join('、')}。`, `다음 질환이 있어요(또는 있었어요): ${conds.map(c => c.ko).join(', ')}.`);
  else if (a.noConditions) add('上記の持病はありません。', '위의 지병은 없어요.');
  if (a.pregnancy === 'no') add('妊娠中・授乳中ではなく、妊娠の予定もありません。', '임신·수유 중이 아니고 임신 계획도 없어요.');
  if (a.pregnancy === 'yes') add('妊娠中、授乳中、または妊娠の予定があります。', '임신·수유 중이거나 임신 계획이 있어요.');
  const meds = clean(a.meds);
  add(meds ? `服用中の薬：${meds}` : '服用中の薬はありません。', meds ? `복용 중인 약: ${meds}` : '복용 중인 약은 없어요.');
  const allergy = clean(a.allergy);
  add(allergy ? `アレルギー：${allergy}` : '薬のアレルギーはありません。', allergy ? `알레르기: ${allergy}` : '약 알레르기는 없어요.');
  const pens = num(a.pens);
  if (a.dose && pens) add(`${a.dose}を${pens}本希望します。医師の判断に従います。`, `${a.dose} ${pens}펜을 원해요. 의사 판단에 따를게요.`);
  add('韓国に持ち帰るため、処方内容がわかる領収書と明細書をいただけますか。', '한국에 가져가야 해서 처방 내용이 적힌 영수증과 명세서를 받을 수 있을까요?');
  add('日本語が上手ではありません。ゆっくり話していただけると助かります。', '일본어를 잘 못해요. 천천히 말씀해 주시면 고맙겠어요.');
  return lines;
}

export function setupCard() {
  const $ = s => document.querySelector(s);
  const form = $('#card-form');
  if (!form) return;
  $('#card-conditions').innerHTML = CONDITIONS.map(c => `<label class="inline"><input type="checkbox" name="conditions" value="${c.id}"> ${c.ko}</label>`).join('')
    + '<label class="inline"><input type="checkbox" name="noConditions" value="1"> 해당 없음</label>';
  $('#phrases').innerHTML = PHRASES.map(([ja, read, ko]) => `<li><b lang="ja">${ja}</b><span class="read">${read}</span><span>${ko}</span></li>`).join('');
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  form.addEventListener('submit', e => {
    e.preventDefault();
    const d = new FormData(form);
    const answers = Object.fromEntries([...d.entries()].filter(([k]) => k !== 'conditions'));
    answers.conditions = d.getAll('conditions');
    const lines = buildCard(answers);
    $('#card-output').innerHTML = `<div class="ja-card" lang="ja"><p class="ja-card-head">医師・受付の方へ</p>${lines.map(l => `<p>${esc(l.ja)}</p>`).join('')}</div>
      <details><summary>한국어 뜻 보기</summary><ul class="small">${lines.map(l => `<li>${esc(l.ko)}</li>`).join('')}</ul></details>`;
    $('#card-output').hidden = false;
    window.sushijaroTrack?.('card_created');
    $('#card-output').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
}
