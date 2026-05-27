// MCP Tool 명세에 대응되는 핵심 비즈니스 로직.
// REST API 핸들러와 MCP 서버가 동일한 함수를 호출하므로,
// "MCP 확장 구조" 가 단순한 문서가 아니라 실제 코드로 연결되어 있다.

const storage = require('./storage');
const ai = require('./ai');

// 1. getPlantLogs : 특정 식물의 관찰일지 목록을 조회
function getPlantLogs({ plantName, plantId, from, to } = {}) {
  const filter = {};
  if (plantId) filter.plantId = plantId;
  if (plantName) filter.plantName = plantName;
  if (from) filter.from = from;
  if (to) filter.to = to;
  return storage.listJournals(filter);
}

// 2. analyzeGrowthTrend : 키/잎/물주기 흐름 분석
function analyzeGrowthTrend({ plantName, plantId } = {}) {
  const logs = getPlantLogs({ plantName, plantId }).slice().reverse(); // 오래된 -> 최근
  if (logs.length === 0) {
    return { count: 0, summary: '아직 기록된 관찰일지가 없습니다.' };
  }
  const heights = logs
    .map(l => (typeof l.growthCm === 'number' ? l.growthCm : null))
    .filter(v => v !== null);
  const wateredCount = logs.filter(l => l.watered).length;

  let growthDelta = null;
  if (heights.length >= 2) {
    growthDelta = +(heights[heights.length - 1] - heights[0]).toFixed(2);
  }

  const first = logs[0];
  const last = logs[logs.length - 1];
  const summaryParts = [`총 ${logs.length}건의 기록을 분석했습니다.`];
  if (heights.length >= 2) {
    summaryParts.push(`키 변화: ${heights[0]}cm → ${heights[heights.length - 1]}cm (${growthDelta >= 0 ? '+' : ''}${growthDelta}cm)`);
  } else if (heights.length === 1) {
    summaryParts.push(`현재 키: ${heights[0]}cm`);
  }
  summaryParts.push(`물주기 횟수: ${wateredCount}회`);
  summaryParts.push(`기간: ${first.observedAt} ~ ${last.observedAt}`);

  return {
    count: logs.length,
    firstObservedAt: first.observedAt,
    lastObservedAt: last.observedAt,
    heights,
    growthDelta,
    wateredCount,
    summary: summaryParts.join(' / '),
  };
}

// 3. suggestCarePlan : 최근 상태 기반 관리 조언
async function suggestCarePlan(entry) {
  return ai.generateAdvice(entry);
}

// 4. exportJournalData : CSV / JSON / XLSX 으로 변환
function exportJournalData({ format = 'json', plantName, plantId, from, to } = {}) {
  const logs = getPlantLogs({ plantName, plantId, from, to });
  const headers = [
    'id', 'plantId', 'plantName', 'observedAt',
    'leafState', 'soilState', 'sunState', 'watered',
    'growthCm', 'photoUrl', 'memo', 'aiSummary', 'aiAdvice', 'createdAt'
  ];

  if (format === 'csv') {
    const escape = v => {
      if (v === null || v === undefined) return '';
      const s = String(v).replace(/"/g, '""').replace(/\r?\n/g, ' ');
      return /[",]/.test(s) ? `"${s}"` : s;
    };
    const rows = logs.map(j => headers.map(h => escape(j[h])).join(','));
    return {
      mime: 'text/csv; charset=utf-8',
      filename: `plant_journal_${Date.now()}.csv`,
      body: '﻿' + [headers.join(','), ...rows].join('\n'),
    };
  }

  if (format === 'xlsx') {
    // SheetJS: 메모리 안전을 위해 함수 호출 시점에만 로드
    const XLSX = require('xlsx');
    const aoa = [
      headers,
      ...logs.map(j => headers.map(h => {
        const v = j[h];
        if (v === null || v === undefined) return '';
        if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
        return v;
      })),
    ];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    // 컬럼 폭 자동 (대략)
    ws['!cols'] = headers.map(h => ({ wch: Math.max(10, h.length + 2) }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '관찰일지');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    return {
      mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      filename: `plant_journal_${Date.now()}.xlsx`,
      body: buffer,
    };
  }

  return {
    mime: 'application/json; charset=utf-8',
    filename: `plant_journal_${Date.now()}.json`,
    body: JSON.stringify(logs, null, 2),
  };
}

// 통계용 헬퍼 (REST 전용)
function computeStats() {
  const plants = storage.listPlants();
  const journals = storage.listJournals();
  const perPlant = plants.map(p => {
    const logs = journals.filter(j => j.plantId === p.id);
    const lastWater = logs.find(j => j.watered);
    const heights = logs.map(j => j.growthCm).filter(v => typeof v === 'number');
    let careNeeded = false;
    if (logs[0]) {
      const last = logs[0];
      if (last.leafState === '시들음' || last.leafState === '변색') careNeeded = true;
      if (last.soilState === '매우 건조함') careNeeded = true;
    }
    return {
      id: p.id,
      name: p.name,
      count: logs.length,
      lastWateredAt: lastWater ? lastWater.observedAt : null,
      latestHeight: heights.length ? heights[0] : null,
      careNeeded,
    };
  });
  return {
    totalPlants: plants.length,
    totalJournals: journals.length,
    perPlant,
  };
}

// 5. analyzePlantPhotos : 사진 전/후를 받아 관찰일지 필드를 자동 추론
async function analyzePlantPhotos(args = {}) {
  return await ai.analyzePhotos(args);
}

// 6. lookupSpeciesInfo : 식물명 → 학명/적정 일조량/습도/물주기 조회
async function lookupSpeciesInfo(args = {}) {
  return await ai.lookupSpecies(args);
}

module.exports = {
  getPlantLogs,
  analyzeGrowthTrend,
  suggestCarePlan,
  exportJournalData,
  computeStats,
  analyzePlantPhotos,
  lookupSpeciesInfo,
};
