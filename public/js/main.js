// 메인 페이지: 최근 관찰 5건 표시
(async function () {
  const container = document.getElementById('recent-list');
  try {
    const list = await API.get('/api/journals');
    if (!list.length) {
      container.innerHTML = '<div class="hint">아직 기록이 없습니다. <a href="/journal.html">첫 관찰을 작성</a>해 보세요.</div>';
      return;
    }
    container.innerHTML = list.slice(0, 5).map(j => `
      <div class="recent-item">
        <strong>${escapeHtml(j.plantName || '식물')}</strong>
        <span class="hint"> · ${fmtDate(j.observedAt)}</span>
        <div class="hint">${escapeHtml((j.aiSummary || j.memo || '').slice(0, 60))}</div>
      </div>
    `).join('');
  } catch (e) {
    container.innerHTML = '<div class="hint">기록을 불러오지 못했습니다.</div>';
  }
})();
