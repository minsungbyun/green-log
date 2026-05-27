// 관찰일지 목록 페이지
const cardsEl = document.getElementById('journal-cards');
const filterName = document.getElementById('filterName');
const filterFrom = document.getElementById('filterFrom');
const filterTo = document.getElementById('filterTo');
const filterQ = document.getElementById('filterQ');
const btnSearch = document.getElementById('btnSearch');
const btnReset = document.getElementById('btnReset');
const btnExportCsv = document.getElementById('btnExportCsv');
const btnExportJson = document.getElementById('btnExportJson');
const btnExportXlsx = document.getElementById('btnExportXlsx');

const modal = document.getElementById('modal');
const modalClose = document.getElementById('modalClose');
const editForm = document.getElementById('edit-form');

function buildQuery() {
  const p = new URLSearchParams();
  if (filterName.value.trim()) p.set('plantName', filterName.value.trim());
  if (filterFrom.value) p.set('from', filterFrom.value);
  if (filterTo.value) p.set('to', filterTo.value);
  if (filterQ.value.trim()) p.set('q', filterQ.value.trim());
  return p.toString();
}

function stateTag(j) {
  const tags = [];
  if (j.leafState) tags.push(`<span class="tag ${['시들음','변색'].includes(j.leafState) ? 'warn' : ''}">잎: ${escapeHtml(j.leafState)}</span>`);
  if (j.soilState) tags.push(`<span class="tag ${j.soilState === '매우 건조함' ? 'warn' : ''}">흙: ${escapeHtml(j.soilState)}</span>`);
  if (j.sunState) tags.push(`<span class="tag">햇빛: ${escapeHtml(j.sunState)}</span>`);
  if (j.watered) tags.push('<span class="tag">물 줌</span>');
  return tags.join('');
}

async function load() {
  cardsEl.innerHTML = '<div class="hint">불러오는 중...</div>';
  try {
    const q = buildQuery();
    const list = await API.get('/api/journals' + (q ? '?' + q : ''));
    if (!list.length) {
      cardsEl.innerHTML = '<div class="hint">검색 결과가 없습니다.</div>';
      return;
    }
    cardsEl.innerHTML = list.map(j => `
      <article class="journal-card" data-id="${j.id}">
        <div class="photo">
          ${j.photoUrl ? `<img src="${escapeHtml(j.photoUrl)}" alt="" />` : '🌿'}
        </div>
        <div class="body">
          <h4>${escapeHtml(j.plantName || '')}</h4>
          <div class="date">${fmtDate(j.observedAt)}${j.growthCm != null ? ` · ${j.growthCm}cm` : ''}</div>
          <div>${stateTag(j)}</div>
          <div class="summary">${escapeHtml(j.aiSummary || j.memo || '')}</div>
        </div>
        <div class="card-actions">
          <button class="icon-btn" data-act="edit">수정</button>
          <button class="icon-btn danger" data-act="del">삭제</button>
        </div>
      </article>
    `).join('');
  } catch (e) {
    cardsEl.innerHTML = '<div class="hint">불러오기 실패</div>';
  }
}

btnSearch.addEventListener('click', load);
btnReset.addEventListener('click', () => {
  filterName.value = '';
  filterFrom.value = '';
  filterTo.value = '';
  filterQ.value = '';
  load();
});

btnExportCsv.addEventListener('click', () => {
  const q = buildQuery();
  location.href = '/api/export?format=csv' + (q ? '&' + q : '');
});
btnExportJson.addEventListener('click', () => {
  const q = buildQuery();
  location.href = '/api/export?format=json' + (q ? '&' + q : '');
});
btnExportXlsx.addEventListener('click', () => {
  const q = buildQuery();
  location.href = '/api/export?format=xlsx' + (q ? '&' + q : '');
});

cardsEl.addEventListener('click', async (e) => {
  const btn = e.target.closest('button[data-act]');
  if (!btn) return;
  const card = btn.closest('.journal-card');
  const id = card.dataset.id;
  const act = btn.dataset.act;
  if (act === 'del') {
    if (!confirm('이 관찰일지를 삭제하시겠습니까?')) return;
    await API.del('/api/journals/' + id);
    await load();
  } else if (act === 'edit') {
    const j = await API.get('/api/journals/' + id);
    editForm.id.value = j.id;
    editForm.observedAt.value = fmtDate(j.observedAt);
    editForm.leafState.value = j.leafState || '';
    editForm.soilState.value = j.soilState || '';
    editForm.sunState.value = j.sunState || '';
    editForm.watered.value = j.watered ? 'true' : 'false';
    editForm.growthCm.value = j.growthCm ?? '';
    editForm.memo.value = j.memo || '';
    modal.hidden = false;
  }
});

modalClose.addEventListener('click', () => { modal.hidden = true; });
modal.addEventListener('click', (e) => { if (e.target === modal) modal.hidden = true; });

editForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(editForm);
  const data = Object.fromEntries(fd.entries());
  data.watered = data.watered === 'true';
  if (data.growthCm === '') data.growthCm = null;
  const id = data.id;
  delete data.id;
  await API.put('/api/journals/' + id, data);
  modal.hidden = true;
  await load();
});

load();
