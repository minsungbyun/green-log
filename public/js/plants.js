// 식물 등록 페이지
const CATALOG = window.PLANT_CATALOG || [];
const LOCATION_CATALOG = window.LOCATION_CATALOG || [];

const form = document.getElementById('plant-form');
const listEl = document.getElementById('plant-list');
const plantPhotoInput = document.getElementById('plantPhotoInput');
const plantPhotoStatus = document.getElementById('plantPhotoStatus');
const plantPhotoUrl = document.getElementById('plantPhotoUrl');
const plantPhotoPreviewBox = document.getElementById('plantPhotoPreviewBox');
const plantPhotoPreview = document.getElementById('plantPhotoPreview');

// 등록 폼: 셀렉트/입력
const speciesSelect = document.getElementById('speciesSelect');
const nameSelect = document.getElementById('nameSelect');
const customSpeciesBox = document.getElementById('customSpeciesBox');
const customSpeciesInput = document.getElementById('customSpeciesInput');
const customNameBox = document.getElementById('customNameBox');
const customNameInput = document.getElementById('customNameInput');
const locationSelect = document.getElementById('locationSelect');
const customLocationBox = document.getElementById('customLocationBox');
const customLocationInput = document.getElementById('customLocationInput');
const plantNameHidden = document.getElementById('plantName');
const plantSpeciesHidden = document.getElementById('plantSpecies');
const plantLocationHidden = document.getElementById('plantLocation');
const memoTextarea = document.getElementById('memoTextarea');
const memoAIBox = document.getElementById('memoAIBox');
const memoAINotice = document.getElementById('memoAINotice');
const btnGenMemo = document.getElementById('btnGenMemo');

// 수정 모달
const editModal = document.getElementById('plantEditModal');
const modalClose = document.getElementById('plantModalClose');
const editForm = document.getElementById('plant-edit-form');
const editSpeciesSelect = document.getElementById('editSpeciesSelect');
const editNameSelect = document.getElementById('editNameSelect');
const editCustomSpeciesBox = document.getElementById('editCustomSpeciesBox');
const editCustomSpeciesInput = document.getElementById('editCustomSpeciesInput');
const editCustomNameBox = document.getElementById('editCustomNameBox');
const editCustomNameInput = document.getElementById('editCustomNameInput');
const editLocationSelect = document.getElementById('editLocationSelect');
const editCustomLocationBox = document.getElementById('editCustomLocationBox');
const editCustomLocationInput = document.getElementById('editCustomLocationInput');
const editPlantNameHidden = document.getElementById('editPlantName');
const editPlantSpeciesHidden = document.getElementById('editPlantSpecies');
const editPlantLocationHidden = document.getElementById('editPlantLocation');
const editMemoTextarea = document.getElementById('editMemoTextarea');
const editMemoAIBox = document.getElementById('editMemoAIBox');
const btnEditGenMemo = document.getElementById('btnEditGenMemo');
const editPhotoInput = document.getElementById('plantEditPhotoInput');
const editPhotoStatus = document.getElementById('plantEditPhotoStatus');
const editPhotoUrl = document.getElementById('plantEditPhotoUrl');
const editPhotoPreviewBox = document.getElementById('plantEditPhotoPreviewBox');
const editPhotoPreview = document.getElementById('plantEditPhotoPreview');

// ============ 셀렉트 옵션 채우기 ============

function fillSpeciesOptions(selectEl) {
  const options = ['<option value="">-- 종류 선택 --</option>'];
  for (const c of CATALOG) {
    options.push(`<option value="${escapeHtml(c.category)}">${escapeHtml(c.category)}</option>`);
  }
  selectEl.innerHTML = options.join('');
}

function fillNameOptions(selectEl, category) {
  if (!category) {
    selectEl.innerHTML = '<option value="">먼저 종류를 선택하세요</option>';
    selectEl.disabled = true;
    return;
  }
  const c = CATALOG.find(c => c.category === category);
  const items = c ? c.items : [];
  selectEl.disabled = false;
  const options = ['<option value="">-- 식물명 선택 --</option>'];
  for (const name of items) {
    options.push(`<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`);
  }
  selectEl.innerHTML = options.join('');
}

function fillLocationOptions(selectEl) {
  const groups = ['<option value="">-- 장소 선택 --</option>'];
  for (const g of LOCATION_CATALOG) {
    groups.push(`<optgroup label="${escapeHtml(g.group)}">`);
    for (const item of g.items) {
      groups.push(`<option value="${escapeHtml(item)}">${escapeHtml(item)}</option>`);
    }
    groups.push('</optgroup>');
  }
  selectEl.innerHTML = groups.join('');
}

// ============ 직접 입력 표시 토글 (셀렉트가 비어있을 때 표시) ============

function syncCustomBox(selectEl, box, input) {
  if (selectEl.value === '') {
    box.hidden = false;
  } else {
    box.hidden = true;
    input.value = '';
  }
}

// ============ cascading 이벤트 ============

function wirePlantSelects(refs) {
  const { speciesSel, nameSel, csb, csi, cnb, cni } = refs;

  speciesSel.addEventListener('change', () => {
    const v = speciesSel.value;
    if (v === '') {
      // 종류 비어있음 → 종류 직접 입력 활성, 식물명 셀렉트는 잠금 + 식물명 직접 입력도 표시
      csb.hidden = false;
      nameSel.innerHTML = '<option value="">먼저 종류를 선택하세요</option>';
      nameSel.disabled = true;
      cnb.hidden = false;
    } else {
      csb.hidden = true;
      csi.value = '';
      fillNameOptions(nameSel, v);
      // 식물명 셀렉트는 다시 비어있게 시작 → 식물명 직접 입력 표시
      cnb.hidden = false;
    }
  });

  nameSel.addEventListener('change', () => {
    syncCustomBox(nameSel, cnb, cni);
  });
}

function wireLocationSelect(refs) {
  const { locSel, box, input } = refs;
  locSel.addEventListener('change', () => {
    syncCustomBox(locSel, box, input);
  });
}

// ============ 최종 값 계산 (셀렉트 값 우선, 없으면 직접 입력) ============

function resolvePlantValues(refs) {
  const { speciesSel, nameSel, csi, cni } = refs;
  const species = speciesSel.value || (csi.value || '').trim();
  const name = nameSel.value || (cni.value || '').trim();
  return { species, name };
}

function resolveLocation(refs) {
  const { locSel, input } = refs;
  return locSel.value || (input.value || '').trim();
}

// ============ 기존 식물 데이터로 셀렉트 초기화 (수정 모달용) ============

function applyExistingToSelects(plant, refs) {
  const { speciesSel, nameSel, csb, csi, cnb, cni, locSel, lbox, linput } = refs;

  // species
  const species = plant.species || '';
  const matchedCategory = CATALOG.find(c => c.category === species);
  if (matchedCategory) {
    speciesSel.value = species;
    csb.hidden = true;
    csi.value = '';
    fillNameOptions(nameSel, matchedCategory.category);
  } else {
    // 카탈로그에 없는 종류 → 셀렉트는 비우고 직접 입력에 기존값
    speciesSel.value = '';
    csb.hidden = false;
    csi.value = species;
    nameSel.innerHTML = '<option value="">먼저 종류를 선택하세요</option>';
    nameSel.disabled = true;
  }

  // name
  const name = plant.name || '';
  if (matchedCategory && matchedCategory.items.includes(name)) {
    nameSel.value = name;
    cnb.hidden = true;
    cni.value = '';
  } else {
    if (nameSel.options.length > 0) nameSel.value = '';
    cnb.hidden = false;
    cni.value = name;
  }

  // location
  const loc = plant.location || '';
  let locMatched = false;
  for (const g of LOCATION_CATALOG) {
    if (g.items.includes(loc)) { locMatched = true; break; }
  }
  if (locMatched) {
    locSel.value = loc;
    lbox.hidden = true;
    linput.value = '';
  } else {
    locSel.value = '';
    lbox.hidden = !loc; // 값이 있을 때만 직접 입력 박스 펼쳐서 보여줌
    linput.value = loc;
    // 단, 셀렉트가 빈 상태이면 항상 직접 입력 활성화하는 정책과 일관성 위해 항상 표시
    lbox.hidden = false;
  }
}

// ============ 초기 세팅 ============

fillSpeciesOptions(speciesSelect);
fillSpeciesOptions(editSpeciesSelect);
fillLocationOptions(locationSelect);
fillLocationOptions(editLocationSelect);

const addRefs = {
  speciesSel: speciesSelect,
  nameSel: nameSelect,
  csb: customSpeciesBox, csi: customSpeciesInput,
  cnb: customNameBox, cni: customNameInput,
};
const editRefs = {
  speciesSel: editSpeciesSelect,
  nameSel: editNameSelect,
  csb: editCustomSpeciesBox, csi: editCustomSpeciesInput,
  cnb: editCustomNameBox, cni: editCustomNameInput,
  locSel: editLocationSelect,
  lbox: editCustomLocationBox, linput: editCustomLocationInput,
};
const addLocRefs = { locSel: locationSelect, box: customLocationBox, input: customLocationInput };
const editLocRefs = { locSel: editLocationSelect, box: editCustomLocationBox, input: editCustomLocationInput };

wirePlantSelects(addRefs);
wirePlantSelects(editRefs);
wireLocationSelect(addLocRefs);
wireLocationSelect(editLocRefs);

// 초기 상태: 셀렉트가 비어 있으므로 직접 입력 박스를 펼친 상태로 시작
customSpeciesBox.hidden = false;
customNameBox.hidden = false;
customLocationBox.hidden = false;

// ============ AI 상태에 따라 메모 버튼 표시 ============

async function checkAIStatus() {
  try {
    const s = await API.get('/api/ai/status');
    if (s.available) {
      memoAIBox.hidden = false;
      memoAINotice.hidden = true;
      editMemoAIBox.hidden = false;
    } else {
      memoAIBox.hidden = true;
      memoAINotice.hidden = false;
      editMemoAIBox.hidden = true;
    }
  } catch (e) {
    memoAIBox.hidden = true;
    memoAINotice.hidden = false;
    editMemoAIBox.hidden = true;
  }
}

// ============ AI 메모 생성 호출 ============

async function callGenerateMemo({ species, name, location, startedAt }, btn, textareaEl) {
  if (!name && !species) {
    alert('식물명 또는 종류 중 하나는 선택/입력해 주세요.');
    return;
  }
  btn.disabled = true;
  const label = btn.textContent;
  btn.textContent = '🔍 생성 중...';
  try {
    const r = await API.post('/api/ai/plant-memo', { species, name, location, startedAt });
    if (r && r.memo) {
      textareaEl.value = r.memo;
    } else {
      alert('메모 생성에 실패했습니다.');
    }
  } catch (e) {
    let msg = e.message || String(e);
    const m = msg.match(/\{[\s\S]*\}/);
    if (m) { try { msg = (JSON.parse(m[0]).message) || msg; } catch (_) {} }
    alert('메모 생성 실패: ' + msg);
  } finally {
    btn.disabled = false;
    btn.textContent = label;
  }
}

btnGenMemo.addEventListener('click', () => {
  const { species, name } = resolvePlantValues(addRefs);
  const location = resolveLocation(addLocRefs);
  const startedAt = form.startedAt.value || '';
  callGenerateMemo({ species, name, location, startedAt }, btnGenMemo, memoTextarea);
});

btnEditGenMemo.addEventListener('click', () => {
  const { species, name } = resolvePlantValues(editRefs);
  const location = resolveLocation(editLocRefs);
  const startedAt = editForm.startedAt.value || '';
  callGenerateMemo({ species, name, location, startedAt }, btnEditGenMemo, editMemoTextarea);
});

// ============ 리스트 ============

async function loadPlants() {
  try {
    const plants = await API.get('/api/plants');
    if (!plants.length) {
      listEl.innerHTML = '<div class="hint">등록된 식물이 없습니다.</div>';
      return;
    }
    listEl.innerHTML = plants.map(p => `
      <div class="plant-item" data-id="${p.id}">
        <div class="photo">
          ${p.photoUrl ? `<img src="${escapeHtml(p.photoUrl)}" alt="${escapeHtml(p.name)}" />` : '🌱'}
        </div>
        <h4>${escapeHtml(p.name)}</h4>
        <div class="meta">${escapeHtml(p.species || '')} ${p.location ? '· ' + escapeHtml(p.location) : ''}</div>
        <div class="meta">시작: ${escapeHtml(p.startedAt || '-')}</div>
        ${p.memo ? `<div class="meta">${escapeHtml(p.memo)}</div>` : ''}
        <div class="actions">
          <button class="icon-btn" data-act="edit">수정</button>
          <button class="icon-btn danger" data-act="del">삭제</button>
        </div>
      </div>
    `).join('');
  } catch (e) {
    listEl.innerHTML = '<div class="hint">불러오기 실패</div>';
  }
}

// ============ 등록 폼 ============

plantPhotoInput.addEventListener('change', async () => {
  const file = plantPhotoInput.files[0];
  if (!file) return;

  // 1) 선택 즉시 로컬 미리보기 표시
  try {
    const localUrl = URL.createObjectURL(file);
    plantPhotoPreview.src = localUrl;
    plantPhotoPreviewBox.hidden = false;
  } catch (_) {}

  plantPhotoStatus.textContent = '업로드 중...';
  try {
    const res = await API.uploadPhoto(file);
    plantPhotoUrl.value = res.url;
    plantPhotoStatus.textContent = '업로드 완료';
    // 2) 업로드 완료 후 서버 URL 로 교체 (영구 경로)
    plantPhotoPreview.src = res.url;
  } catch (e) {
    plantPhotoStatus.textContent = '업로드 실패';
  }
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const { species, name } = resolvePlantValues(addRefs);
  const location = resolveLocation(addLocRefs);
  if (!name) {
    alert('식물명을 선택하거나 직접 입력해 주세요.');
    return;
  }
  if (!species) {
    alert('식물 종류를 선택하거나 직접 입력해 주세요.');
    return;
  }
  plantNameHidden.value = name;
  plantSpeciesHidden.value = species;
  plantLocationHidden.value = location;

  const fd = new FormData(form);
  const data = Object.fromEntries(fd.entries());
  try {
    await API.post('/api/plants', data);
    form.reset();
    plantPhotoUrl.value = '';
    plantPhotoStatus.textContent = '';
    plantPhotoPreviewBox.hidden = true;
    plantPhotoPreview.src = '';
    // 셀렉트 상태 초기화
    speciesSelect.value = '';
    nameSelect.innerHTML = '<option value="">먼저 종류를 선택하세요</option>';
    nameSelect.disabled = true;
    locationSelect.value = '';
    customSpeciesBox.hidden = false;
    customSpeciesInput.value = '';
    customNameBox.hidden = false;
    customNameInput.value = '';
    customLocationBox.hidden = false;
    customLocationInput.value = '';
    memoTextarea.value = '';
    await loadPlants();
  } catch (err) {
    alert('등록 실패: ' + err.message);
  }
});

// ============ 수정 모달 ============

editPhotoInput.addEventListener('change', async () => {
  const file = editPhotoInput.files[0];
  if (!file) return;
  editPhotoStatus.textContent = '업로드 중...';
  try {
    const res = await API.uploadPhoto(file);
    editPhotoUrl.value = res.url;
    editPhotoStatus.textContent = '업로드 완료';
    editPhotoPreview.src = res.url;
    editPhotoPreviewBox.hidden = false;
  } catch (e) {
    editPhotoStatus.textContent = '업로드 실패';
  }
});

function openEditModal(plant) {
  editForm.id.value = plant.id;
  editForm.startedAt.value = plant.startedAt || '';
  editMemoTextarea.value = plant.memo || '';
  editPhotoUrl.value = plant.photoUrl || '';
  editPhotoStatus.textContent = '';
  if (plant.photoUrl) {
    editPhotoPreview.src = plant.photoUrl;
    editPhotoPreviewBox.hidden = false;
  } else {
    editPhotoPreviewBox.hidden = true;
  }
  applyExistingToSelects(plant, editRefs);
  editModal.hidden = false;
}

modalClose.addEventListener('click', () => { editModal.hidden = true; });
editModal.addEventListener('click', (e) => { if (e.target === editModal) editModal.hidden = true; });

editForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const { species, name } = resolvePlantValues(editRefs);
  const location = resolveLocation(editLocRefs);
  if (!name) {
    alert('식물명을 선택하거나 직접 입력해 주세요.');
    return;
  }
  if (!species) {
    alert('식물 종류를 선택하거나 직접 입력해 주세요.');
    return;
  }
  editPlantNameHidden.value = name;
  editPlantSpeciesHidden.value = species;
  editPlantLocationHidden.value = location;

  const fd = new FormData(editForm);
  const data = Object.fromEntries(fd.entries());
  const id = data.id;
  delete data.id;
  try {
    await API.put('/api/plants/' + id, data);
    editModal.hidden = true;
    await loadPlants();
  } catch (err) {
    alert('수정 실패: ' + err.message);
  }
});

// ============ 리스트 액션 ============

listEl.addEventListener('click', async (e) => {
  const btn = e.target.closest('button[data-act]');
  if (!btn) return;
  const item = btn.closest('.plant-item');
  const id = item.dataset.id;
  const act = btn.dataset.act;
  if (act === 'del') {
    if (!confirm('이 식물을 삭제하시겠습니까? 관련 관찰일지도 함께 삭제됩니다.')) return;
    await API.del('/api/plants/' + id);
    await loadPlants();
  } else if (act === 'edit') {
    const plant = await API.get('/api/plants/' + id);
    openEditModal(plant);
  }
});

loadPlants();
checkAIStatus();
