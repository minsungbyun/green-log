// 관찰일지 작성 페이지
const form = document.getElementById('journal-form');
const plantSelect = document.getElementById('plantSelect');

// 기존 (호환용)
const photoUrlInput = document.getElementById('photoUrl');
const plantNameHidden = document.getElementById('plantNameHidden');
const aiSummaryHidden = document.getElementById('aiSummary');
const aiAdviceHidden = document.getElementById('aiAdvice');
const btnAI = document.getElementById('btnAI');
const aiResult = document.getElementById('aiResult');
const aiSummaryText = document.getElementById('aiSummaryText');
const aiAdviceText = document.getElementById('aiAdviceText');
const aiSourceEl = document.getElementById('aiSource');

// 신규: 사진 전/후 + AI 자동 채움
const photoBeforeInput = document.getElementById('photoBeforeInput');
const photoBeforeStatus = document.getElementById('photoBeforeStatus');
const photoBeforeUrlHidden = document.getElementById('photoBeforeUrl');
const photoAfterInput = document.getElementById('photoAfterInput');
const photoAfterStatus = document.getElementById('photoAfterStatus');
const photoAfterUrlHidden = document.getElementById('photoAfterUrl');
const speciesHidden = document.getElementById('speciesHidden');
const careInfoHidden = document.getElementById('careInfoHidden');
const btnAutoFill = document.getElementById('btnAutoFill');
const autoFillBox = document.getElementById('autoFillBox');
const autoFillNotice = document.getElementById('autoFillNotice');
const speciesResult = document.getElementById('speciesResult');
const speciesText = document.getElementById('speciesText');
const careLightText = document.getElementById('careLightText');
const careHumidityText = document.getElementById('careHumidityText');
const careWateringText = document.getElementById('careWateringText');

// 사진 미리보기 요소
const photoBeforePreviewBox = document.getElementById('photoBeforePreviewBox');
const photoBeforePreview = document.getElementById('photoBeforePreview');
const photoAfterPreviewBox = document.getElementById('photoAfterPreviewBox');
const photoAfterPreview = document.getElementById('photoAfterPreview');

// 오늘 날짜 기본값
form.observedAt.value = new Date().toISOString().slice(0, 10);

async function loadPlants() {
  const plants = await API.get('/api/plants');
  if (!plants.length) {
    plantSelect.innerHTML = '<option value="">먼저 식물을 등록해 주세요</option>';
    return;
  }
  plantSelect.innerHTML = '<option value="">-- 식물 선택 --</option>' +
    plants.map(p => `<option value="${p.id}" data-name="${escapeHtml(p.name)}">${escapeHtml(p.name)}</option>`).join('');
}

plantSelect.addEventListener('change', () => {
  const opt = plantSelect.options[plantSelect.selectedIndex];
  plantNameHidden.value = opt ? (opt.dataset.name || '') : '';
});

// AI 상태 확인 → 자동 채움 버튼 가시성 결정
async function checkAIStatus() {
  try {
    const s = await API.get('/api/ai/status');
    if (s.available) {
      autoFillBox.hidden = false;
      autoFillNotice.hidden = true;
    } else {
      autoFillBox.hidden = true;
      autoFillNotice.hidden = false;
    }
  } catch (e) {
    autoFillBox.hidden = true;
    autoFillNotice.hidden = false;
  }
}

// 공통 사진 업로드 바인더
function bindPhotoUpload(input, statusEl, hiddenInput, label, syncLegacy, previewBox, previewImg) {
  input.addEventListener('change', async () => {
    const file = input.files[0];
    if (!file) return;

    // 1) 선택 즉시 로컬 미리보기 표시 (업로드 전이라도 빠르게)
    if (previewBox && previewImg) {
      try {
        const localUrl = URL.createObjectURL(file);
        previewImg.src = localUrl;
        previewBox.hidden = false;
      } catch (_) {}
    }

    statusEl.textContent = label + ' 업로드 중...';
    try {
      const res = await API.uploadPhoto(file);
      hiddenInput.value = res.url;
      statusEl.textContent = label + ' 업로드 완료';
      // 2) 업로드 완료 후 서버 URL 로 교체 (영구 경로)
      if (previewImg) previewImg.src = res.url;
      if (syncLegacy) photoUrlInput.value = res.url;
    } catch (e) {
      statusEl.textContent = label + ' 업로드 실패';
    }
  });
}
bindPhotoUpload(photoBeforeInput, photoBeforeStatus, photoBeforeUrlHidden, '이전 사진', false, photoBeforePreviewBox, photoBeforePreview);
bindPhotoUpload(photoAfterInput, photoAfterStatus, photoAfterUrlHidden, '이번 사진', true, photoAfterPreviewBox, photoAfterPreview);

function collectEntry() {
  const fd = new FormData(form);
  const o = Object.fromEntries(fd.entries());
  o.watered = o.watered === 'true';
  if (o.growthCm === '') o.growthCm = null;
  if (o.careInfo) {
    try { o.careInfo = JSON.parse(o.careInfo); } catch (e) { o.careInfo = null; }
  }
  return o;
}

// 사진으로 자동 채우기
if (btnAutoFill) {
  btnAutoFill.addEventListener('click', async () => {
    if (!photoAfterUrlHidden.value) {
      alert('먼저 "이번 관찰 사진"을 업로드해 주세요.');
      return;
    }
    btnAutoFill.disabled = true;
    const originalLabel = btnAutoFill.textContent;
    btnAutoFill.textContent = '🔍 분석 중...';
    try {
      const payload = {
        photoBeforeUrl: photoBeforeUrlHidden.value || '',
        photoAfterUrl: photoAfterUrlHidden.value,
        plantName: plantNameHidden.value || '',
      };
      const res = await API.post('/api/ai/analyze-photos', payload);

      // 셀렉트박스/입력 자동 채움
      if (res.leafState) form.leafState.value = res.leafState;
      if (res.soilState) form.soilState.value = res.soilState;
      if (res.sunState) form.sunState.value = res.sunState;
      form.watered.value = res.watered ? 'true' : 'false';
      if (res.growthCm !== null && res.growthCm !== undefined) form.growthCm.value = res.growthCm;
      if (res.memo) form.memo.value = res.memo;

      // 식물 정보
      let hasSpeciesInfo = false;
      if (res.species) {
        speciesHidden.value = res.species;
        speciesText.textContent = res.species;
        hasSpeciesInfo = true;
      } else {
        speciesText.textContent = '-';
      }
      if (res.careInfo) {
        careInfoHidden.value = JSON.stringify(res.careInfo);
        careLightText.textContent = res.careInfo.light || '-';
        careHumidityText.textContent = res.careInfo.humidity || '-';
        careWateringText.textContent = res.careInfo.watering || '-';
        hasSpeciesInfo = true;
      } else {
        careLightText.textContent = '-';
        careHumidityText.textContent = '-';
        careWateringText.textContent = '-';
      }
      speciesResult.hidden = !hasSpeciesInfo;
    } catch (e) {
      let msg = e.message || String(e);
      const m = msg.match(/\{[\s\S]*\}/);
      if (m) {
        try { msg = (JSON.parse(m[0]).message) || msg; } catch (_) {}
      }
      alert('자동 채움 실패: ' + msg);
    } finally {
      btnAutoFill.disabled = false;
      btnAutoFill.textContent = originalLabel;
    }
  });
}

btnAI.addEventListener('click', async () => {
  const entry = collectEntry();
  if (!entry.plantName) entry.plantName = plantNameHidden.value;
  btnAI.disabled = true;
  btnAI.textContent = '생성 중...';
  try {
    const [s, a] = await Promise.all([
      API.post('/api/ai/summary', entry),
      API.post('/api/ai/advice', entry),
    ]);
    aiSummaryText.textContent = s.summary || '';
    aiAdviceText.textContent = a.advice || '';
    aiSummaryHidden.value = s.summary || '';
    aiAdviceHidden.value = a.advice || '';
    aiSourceEl.textContent = `생성 소스: 요약=${s.source}, 조언=${a.source}`;
    aiResult.hidden = false;
  } catch (e) {
    alert('AI 생성 실패: ' + e.message);
  } finally {
    btnAI.disabled = false;
    btnAI.textContent = 'AI 요약/조언 생성';
  }
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const entry = collectEntry();
  if (!entry.plantId) {
    alert('식물을 선택하세요.');
    return;
  }
  try {
    await API.post('/api/journals', entry);
    alert('저장되었습니다.');
    location.href = '/list.html';
  } catch (err) {
    alert('저장 실패: ' + err.message);
  }
});

loadPlants();
checkAIStatus();
