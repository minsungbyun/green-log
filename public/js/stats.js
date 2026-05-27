// 통계/요약 페이지
(async function () {
  const totalPlantsEl = document.getElementById('totalPlants');
  const totalJournalsEl = document.getElementById('totalJournals');
  const careCountEl = document.getElementById('careCount');
  const perPlantEl = document.getElementById('perPlant');

  try {
    const s = await API.get('/api/stats');
    totalPlantsEl.textContent = s.totalPlants;
    totalJournalsEl.textContent = s.totalJournals;
    const care = s.perPlant.filter(p => p.careNeeded).length;
    careCountEl.textContent = care;

    if (!s.perPlant.length) {
      perPlantEl.innerHTML = '<div class="hint">등록된 식물이 없습니다.</div>';
      return;
    }

    perPlantEl.innerHTML = s.perPlant.map(p => `
      <div class="plant-item">
        <h4>${escapeHtml(p.name)}${p.careNeeded ? ' <span class="tag warn">관리 필요</span>' : ''}</h4>
        <div class="meta">관찰 횟수: <strong>${p.count}</strong></div>
        <div class="meta">최근 물주기: ${escapeHtml(p.lastWateredAt || '-')}</div>
        <div class="meta">최근 키: ${p.latestHeight != null ? p.latestHeight + 'cm' : '-'}</div>
      </div>
    `).join('');
  } catch (e) {
    perPlantEl.innerHTML = '<div class="hint">불러오기 실패</div>';
  }
})();
