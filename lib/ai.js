// AI 요약/조언/사진 분석 모듈
// Provider: Google Gemini (GOOGLE_API_KEY) → 없으면 규칙 기반
// 모든 API Key 는 백엔드 환경변수로만 사용되며 프론트엔드에는 절대 노출되지 않는다.
//
// 외부 export 시그니처는 기존과 동일:
//   ruleBasedSummary, ruleBasedAdvice, generateSummary, generateAdvice,
//   scoreState, hasApiKey, analyzePhotos, lookupSpecies

const fs = require('fs');
const path = require('path');

// ========== 규칙 기반 점수/요약/조언 ==========

const LEAF_SCORE = { '싱싱함': 2, '보통': 1, '시들음': 0, '변색': 0 };
const SOIL_SCORE = { '적당함': 2, '건조함': 1, '매우 건조함': 0, '너무 촉촉함': 1 };
const SUN_SCORE = { '충분함': 2, '보통': 1, '부족함': 0 };

function scoreState(entry) {
  const leaf = LEAF_SCORE[entry.leafState] ?? 1;
  const soil = SOIL_SCORE[entry.soilState] ?? 1;
  const sun = SUN_SCORE[entry.sunState] ?? 1;
  const total = leaf + soil + sun;
  let grade;
  if (total >= 5) grade = '좋음';
  else if (total >= 3) grade = '보통';
  else grade = '주의';
  return { leaf, soil, sun, total, grade };
}

function ruleBasedSummary(entry) {
  const name = entry.plantName || '식물';
  const score = scoreState(entry);
  const parts = [];

  const tone = {
    '좋음': '전반적으로 건강한',
    '보통': '대체로 안정적인',
    '주의': '관리가 필요한',
  }[score.grade];
  parts.push(`오늘 ${name}은(는) ${tone} 상태입니다.`);

  if (entry.leafState) {
    if (score.leaf === 2) parts.push(`잎 상태가 ${entry.leafState}하여 생장 흐름이 양호합니다.`);
    else if (score.leaf === 1) parts.push(`잎 상태는 ${entry.leafState} 수준입니다.`);
    else parts.push(`잎 상태가 ${entry.leafState}으로 관찰되어 점검이 필요합니다.`);
  }

  if (entry.soilState) {
    if (score.soil === 2) parts.push(`흙 상태는 ${entry.soilState}으로 수분 균형이 좋습니다.`);
    else parts.push(`흙 상태가 ${entry.soilState}으로 확인되었습니다.`);
  }

  if (entry.sunState) {
    if (score.sun === 2) parts.push(`햇빛은 ${entry.sunState} 수준으로 광합성에 유리한 환경입니다.`);
    else if (score.sun === 1) parts.push(`햇빛은 ${entry.sunState} 정도입니다.`);
    else parts.push(`햇빛이 ${entry.sunState}으로 광 부족이 우려됩니다.`);
  }

  if (entry.watered) parts.push('오늘 물을 주었습니다.');
  if (entry.growthCm !== null && entry.growthCm !== undefined && !Number.isNaN(Number(entry.growthCm))) {
    parts.push(`측정된 키는 ${entry.growthCm}cm 입니다.`);
  }
  if (entry.memo) parts.push(`메모: ${entry.memo}`);

  return parts.join(' ');
}

function ruleBasedAdvice(entry) {
  const score = scoreState(entry);
  const actions = [];

  if (entry.soilState === '매우 건조함' && !entry.watered) {
    actions.push('흙이 매우 건조하고 물을 주지 않았습니다. 가능한 빨리 충분한 양의 물을 공급하세요.');
  } else if (entry.soilState === '건조함' && !entry.watered) {
    actions.push('흙이 건조한 상태이므로 1~2일 내에 물주기를 권장합니다.');
  } else if (entry.soilState === '너무 촉촉함') {
    actions.push('흙이 과습 상태입니다. 다음 물주기는 흙 표면이 마를 때까지 미루세요.');
  } else if (entry.watered) {
    actions.push('오늘 물주기를 완료했으므로, 다음 관찰 때 흙이 충분히 마를 때까지 추가 급수는 피합니다.');
  }

  if (entry.leafState === '시들음') {
    actions.push('잎이 시들었습니다. 물 부족, 광 부족, 뿌리 상태를 차례로 점검해 보세요.');
  } else if (entry.leafState === '변색') {
    actions.push('잎 변색은 광량 과다 또는 영양 불균형 신호일 수 있습니다. 위치와 비료 공급 주기를 점검하세요.');
  }

  if (entry.sunState === '부족함') {
    actions.push('햇빛이 부족합니다. 창가 쪽으로 위치를 옮기거나 보조 조명을 검토해 보세요.');
  }

  if (actions.length === 0) {
    actions.push('현재 상태는 안정적입니다. 기존 관리 루틴을 유지하세요.');
  }

  return { advice: `[관리 등급: ${score.grade}] ` + actions.join(' '), grade: score.grade, actions };
}

// ========== Provider 감지 ==========

function hasGoogleKey() { return !!process.env.GOOGLE_API_KEY; }
function hasApiKey() { return hasGoogleKey(); }
function currentProvider() {
  if (hasGoogleKey()) return 'google';
  return null;
}

// ========== 이미지 로드 (Gemini 입력용 base64) ==========

function loadImageAsBase64(photoUrl) {
  if (!photoUrl || typeof photoUrl !== 'string') return null;
  if (!photoUrl.startsWith('/uploads/')) return null;
  const filename = photoUrl.replace(/^\/uploads\//, '').replace(/[\\/]/g, '');
  const filePath = path.join(__dirname, '..', 'public', 'uploads', filename);
  if (!fs.existsSync(filePath)) return null;
  const ext = (path.extname(filename) || '.jpg').toLowerCase();
  const mediaMap = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.gif': 'image/gif' };
  const media_type = mediaMap[ext] || 'image/jpeg';
  const data = fs.readFileSync(filePath).toString('base64');
  return { media_type, data };
}

// ========== Gemini 호출 ==========

async function callGemini({ promptText, images = [], maxTokens = 600, jsonMode = false }) {
  const key = process.env.GOOGLE_API_KEY;
  const model = process.env.GOOGLE_MODEL || 'gemini-2.5-flash';
  const parts = [{ text: promptText }];
  for (const img of images) {
    parts.push({ inline_data: { mime_type: img.media_type, data: img.data } });
  }
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`;

  const generationConfig = { maxOutputTokens: maxTokens, temperature: 0.4 };
  if (jsonMode) {
    // 응답을 JSON 으로만 출력하도록 강제 (자연어 설명 혼입 방지)
    generationConfig.responseMimeType = 'application/json';
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts }],
      generationConfig,
    }),
  });
  if (!res.ok) {
    const detail = await res.text();
    return { ok: false, status: res.status, detail: detail.slice(0, 300) };
  }
  const data = await res.json();
  const cand = (data.candidates || [])[0];
  const text = ((cand && cand.content && cand.content.parts) || []).map(p => p.text || '').join('\n').trim();
  return { ok: true, text, model, provider: 'google' };
}

// 통합 호출 (Gemini 전용). opts.jsonMode 등도 그대로 전달됨.
async function callLLM(opts) {
  if (hasGoogleKey()) return await callGemini(opts);
  return { ok: false, status: 0, detail: 'NO_API_KEY' };
}

// ========== 응답 파싱 ==========

function extractJSON(text) {
  if (!text) return null;
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try { return JSON.parse(m[0]); } catch (e) { return null; }
}

function normalizeAnalyzeResult(parsed) {
  if (!parsed || typeof parsed !== 'object') return null;
  const allowedLeaf = ['싱싱함', '보통', '시들음', '변색'];
  const allowedSoil = ['적당함', '건조함', '매우 건조함', '너무 촉촉함'];
  const allowedSun = ['충분함', '보통', '부족함'];
  return {
    leafState: allowedLeaf.includes(parsed.leafState) ? parsed.leafState : '',
    soilState: allowedSoil.includes(parsed.soilState) ? parsed.soilState : '',
    sunState: allowedSun.includes(parsed.sunState) ? parsed.sunState : '',
    watered: parsed.watered === true,
    growthCm: typeof parsed.growthCm === 'number' && !Number.isNaN(parsed.growthCm) ? parsed.growthCm : null,
    memo: typeof parsed.memo === 'string' ? parsed.memo : '',
    species: typeof parsed.species === 'string' ? parsed.species : '',
    careInfo: parsed.careInfo && typeof parsed.careInfo === 'object' ? {
      light: String(parsed.careInfo.light || ''),
      humidity: String(parsed.careInfo.humidity || ''),
      watering: String(parsed.careInfo.watering || ''),
    } : null,
  };
}

function normalizeSpeciesResult(parsed) {
  if (!parsed || typeof parsed !== 'object') return null;
  return {
    species: typeof parsed.species === 'string' ? parsed.species : '',
    careInfo: parsed.careInfo && typeof parsed.careInfo === 'object' ? {
      light: String(parsed.careInfo.light || ''),
      humidity: String(parsed.careInfo.humidity || ''),
      watering: String(parsed.careInfo.watering || ''),
    } : null,
    note: typeof parsed.note === 'string' ? parsed.note : '',
  };
}

// ========== 외부 API: 텍스트 기반 요약/조언 ==========

async function callLLMForSummaryAdvice(entry) {
  if (!hasApiKey()) return null;
  const promptText = [
    '당신은 식물 관찰일지를 분석하는 다정한 가드닝 전문가입니다.',
    '아래 관찰일지 한 건을 바탕으로 두 영역을 한국어 줄글로 작성해 주세요.',
    '',
    '작성 규칙:',
    '- [요약] 영역: 잎/흙/햇빛/물주기/성장 수치를 종합해 식물의 현재 상태를 4~6문장의 자연스러운 줄글로 분석합니다. 항목별 나열식이 아니라 흐름이 있는 문단으로 적습니다.',
    '- [조언] 영역: 위 분석을 바탕으로 다음 1~2주의 관리 방향(물주기 주기, 일조량 조정, 통풍, 잎 점검 포인트 등)을 3~5문장 줄글로 제안합니다.',
    '- 양쪽 모두 따뜻하고 차분한 톤, 항목 기호(•, -, 1.) 없이 문장으로만 적습니다.',
    '- 머리표시는 정확히 [요약] 과 [조언] 두 줄만 사용합니다.',
    '- JSON·코드블록·메타 설명은 절대 넣지 않습니다.',
    '',
    '관찰일지 데이터:',
    `- 식물명: ${entry.plantName || '(미정)'}`,
    `- 관찰일자: ${entry.observedAt || '(미정)'}`,
    `- 잎 상태: ${entry.leafState || '(미입력)'}`,
    `- 흙 상태: ${entry.soilState || '(미입력)'}`,
    `- 햇빛 상태: ${entry.sunState || '(미입력)'}`,
    `- 물주기: ${entry.watered ? '물 줌' : '물 안 줌'}`,
    `- 키/성장 수치: ${entry.growthCm ?? '(미입력)'}cm`,
    `- 메모: ${entry.memo || '(없음)'}`,
    '',
    '출력 형식:',
    '[요약]',
    '...',
    '',
    '[조언]',
    '...',
  ].join('\n');

  // gemini-2.5 계열은 thinking 토큰까지 maxTokens 안에서 함께 소비하므로 여유 있게 2000
  const r = await callLLM({ promptText, maxTokens: 2000 });
  if (!r.ok || !r.text) return null;
  const text = r.text;
  const summaryMatch = text.match(/\[요약\]([\s\S]*?)(\[조언\]|$)/);
  const adviceMatch = text.match(/\[조언\]([\s\S]*)$/);
  const summary = summaryMatch ? summaryMatch[1].trim() : text;
  const advice = adviceMatch ? adviceMatch[1].trim() : '';
  return { summary, advice, source: r.provider };
}

async function generateSummary(entry) {
  const r = await callLLMForSummaryAdvice(entry);
  if (r && r.summary) return { summary: r.summary, source: r.source };
  return { summary: ruleBasedSummary(entry), source: 'rule' };
}

async function generateAdvice(entry) {
  const r = await callLLMForSummaryAdvice(entry);
  if (r && r.advice) {
    const score = scoreState(entry);
    return { advice: r.advice, grade: score.grade, source: r.source };
  }
  const rb = ruleBasedAdvice(entry);
  return { advice: rb.advice, grade: rb.grade, actions: rb.actions, source: 'rule' };
}

// ========== 외부 API: 사진 분석 ==========

async function analyzePhotos({ photoBeforeUrl, photoAfterUrl, plantName } = {}) {
  if (!hasApiKey()) {
    return { error: 'API_KEY_MISSING', message: 'GOOGLE_API_KEY 가 필요합니다.' };
  }
  const afterImg = loadImageAsBase64(photoAfterUrl);
  if (!afterImg) {
    return { error: 'PHOTO_MISSING', message: '이번 관찰 사진(after)이 필요합니다. 먼저 사진을 업로드해 주세요.' };
  }
  const beforeImg = loadImageAsBase64(photoBeforeUrl);

  const promptText = [
    '당신은 식물 관찰 전문가입니다. 첨부된 사진을 분석해 관찰일지 필드를 채워주세요.',
    beforeImg
      ? '- 첫 번째 사진: 이전 관찰\n- 두 번째 사진: 이번 관찰 (변화 비교)'
      : '- 첨부 사진: 이번 관찰 (1장)',
    plantName ? `사용자가 알려준 식물명: ${plantName}` : '식물명 정보 없음 (사진으로 추정해 주세요)',
    '',
    '아래 JSON 스키마에 정확히 맞춰 한국어로 응답하세요. 코드블록 없이 순수 JSON만 출력합니다.',
    '{',
    '  "leafState": "싱싱함|보통|시들음|변색",',
    '  "soilState": "적당함|건조함|매우 건조함|너무 촉촉함",',
    '  "sunState": "충분함|보통|부족함",',
    '  "watered": true|false,',
    '  "growthCm": 숫자 또는 null,',
    '  "memo": "관찰된 변화·특징을 1~2문장",',
    '  "species": "추정 학명 (예: Ocimum basilicum)",',
    '  "careInfo": {',
    '    "light": "적정 일조량 (간결한 한국어)",',
    '    "humidity": "적정 습도",',
    '    "watering": "권장 물주기 주기"',
    '  }',
    '}',
    '판단이 어렵거나 사진에서 확인 불가한 값은 가장 합리적인 추정을 사용하세요. JSON 외 다른 텍스트는 절대 출력하지 마세요.',
  ].join('\n');

  const images = [];
  if (beforeImg) images.push(beforeImg);
  images.push(afterImg);

  try {
    // jsonMode + maxTokens 여유: gemini-2.5 thinking 토큰까지 함께 소비되므로 2000
    const r = await callLLM({ promptText, images, maxTokens: 2000, jsonMode: true });
    if (!r.ok) {
      return { error: 'API_ERROR', message: `AI API 호출 실패 (status ${r.status})`, detail: r.detail };
    }
    if (!r.text) return { error: 'EMPTY_RESPONSE', message: '빈 응답을 받았습니다.' };
    const parsed = extractJSON(r.text);
    if (!parsed) return { error: 'PARSE_ERROR', message: 'JSON 응답을 찾지 못했습니다.', raw: r.text.slice(0, 300) };
    const normalized = normalizeAnalyzeResult(parsed);
    return { ...normalized, source: r.provider, model: r.model };
  } catch (err) {
    return { error: 'NETWORK_ERROR', message: err.message || String(err) };
  }
}

// ========== 외부 API: 식물 정보 조회 ==========

async function lookupSpecies({ plantName } = {}) {
  if (!hasApiKey()) {
    return { error: 'API_KEY_MISSING', message: 'GOOGLE_API_KEY 가 필요합니다.' };
  }
  if (!plantName || !String(plantName).trim()) {
    return { error: 'PLANT_NAME_REQUIRED', message: 'plantName 이 필요합니다.' };
  }
  const promptText = [
    `식물명 "${plantName}" 에 대한 일반 재배 정보를 알려주세요.`,
    '아래 JSON 스키마에만 맞춰 한국어로 응답하세요. 코드블록 없이 순수 JSON.',
    '{',
    '  "species": "학명 (예: Ocimum basilicum)",',
    '  "careInfo": {',
    '    "light": "적정 일조량",',
    '    "humidity": "적정 습도",',
    '    "watering": "권장 물주기 주기"',
    '  },',
    '  "note": "주의사항 한 줄"',
    '}',
  ].join('\n');

  try {
    const r = await callLLM({ promptText, maxTokens: 1500, jsonMode: true });
    if (!r.ok) {
      return { error: 'API_ERROR', message: `AI API 호출 실패 (status ${r.status})`, detail: r.detail };
    }
    const parsed = extractJSON(r.text);
    if (!parsed) return { error: 'PARSE_ERROR', message: 'JSON 응답을 찾지 못했습니다.', raw: (r.text || '').slice(0, 300) };
    const normalized = normalizeSpeciesResult(parsed);
    return { plantName, ...normalized, source: r.provider, model: r.model };
  } catch (err) {
    return { error: 'NETWORK_ERROR', message: err.message || String(err) };
  }
}

// ========== 외부 API: 식물 등록용 메모 자동 생성 ==========

async function generatePlantMemo({ name, species, location, startedAt } = {}) {
  if (!hasApiKey()) {
    return { error: 'API_KEY_MISSING', message: 'GOOGLE_API_KEY 가 필요합니다.' };
  }
  if (!name && !species) {
    return { error: 'INPUT_REQUIRED', message: '식물명 또는 종류 중 하나 이상은 입력해 주세요.' };
  }
  const promptText = [
    '당신은 식물 관찰일지를 돕는 다정한 가드닝 어시스턴트입니다.',
    '아래 식물 등록 정보를 바탕으로 한국어 메모 초안을 작성해 주세요.',
    '',
    '작성 규칙:',
    '- 총 3~5문장으로 자연스러운 문단을 구성합니다.',
    '- 식물의 일반적인 특성(생장 환경/꽃·잎의 특징 등)을 한두 문장 소개합니다.',
    '- 해당 장소·시작일을 자연스럽게 언급하며 키우기 시작한 사용자에게 격려를 더합니다.',
    '- 마지막 1~2문장은 이 식물·장소에 어울리는 실제 관리 팁(물주기 빈도, 일조량, 통풍, 분갈이 시기 등)을 짧게 안내합니다.',
    '- 톤은 따뜻하고 차분하며, 과장된 이모지·해시태그·머리표시(불릿) 없이 매끄러운 문장으로 적습니다.',
    '- 코드블록·JSON·메타 설명 없이 메모 본문만 출력합니다.',
    '',
    '식물 등록 정보:',
    `- 식물명: ${name || '(미정)'}`,
    `- 종류: ${species || '(미정)'}`,
    `- 장소: ${location || '(미정)'}`,
    `- 시작일: ${startedAt || '(미정)'}`,
  ].join('\n');

  try {
    // gemini-2.5 계열은 thinking 토큰까지 maxTokens 안에서 함께 소비하므로 여유 있게 1500
    const r = await callLLM({ promptText, maxTokens: 1500 });
    if (!r.ok) {
      return { error: 'API_ERROR', message: `AI API 호출 실패 (status ${r.status})`, detail: r.detail };
    }
    const memo = (r.text || '').trim();
    if (!memo) return { error: 'EMPTY_RESPONSE', message: '빈 응답을 받았습니다.' };
    return { memo, source: r.provider, model: r.model };
  } catch (err) {
    return { error: 'NETWORK_ERROR', message: err.message || String(err) };
  }
}

module.exports = {
  ruleBasedSummary,
  ruleBasedAdvice,
  generateSummary,
  generateAdvice,
  scoreState,
  hasApiKey,
  analyzePhotos,
  lookupSpecies,
  generatePlantMemo,
  currentProvider,
};
