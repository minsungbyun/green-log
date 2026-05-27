// 데이터 저장소: data/journal.json 파일을 읽고 쓰는 단일 책임 모듈
// 다른 코드에서는 이 파일의 함수만 호출하고, 직접 파일 시스템에 접근하지 않는다.

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'journal.json');

const EMPTY_DB = { plants: [], journals: [] };

function ensureFile() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(EMPTY_DB, null, 2), 'utf-8');
  }
}

function readDB() {
  ensureFile();
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    return {
      plants: Array.isArray(parsed.plants) ? parsed.plants : [],
      journals: Array.isArray(parsed.journals) ? parsed.journals : [],
    };
  } catch (err) {
    return { ...EMPTY_DB };
  }
}

function writeDB(db) {
  ensureFile();
  fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2), 'utf-8');
}

function genId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// 식물 CRUD
function listPlants() {
  return readDB().plants;
}

function getPlant(id) {
  return readDB().plants.find(p => p.id === id) || null;
}

function createPlant(input) {
  const db = readDB();
  const plant = {
    id: genId('plant'),
    name: input.name,
    species: input.species || '',
    location: input.location || '',
    startedAt: input.startedAt || '',
    photoUrl: input.photoUrl || '',
    memo: input.memo || '',
    createdAt: new Date().toISOString(),
  };
  db.plants.push(plant);
  writeDB(db);
  return plant;
}

function updatePlant(id, patch) {
  const db = readDB();
  const idx = db.plants.findIndex(p => p.id === id);
  if (idx === -1) return null;
  db.plants[idx] = { ...db.plants[idx], ...patch, id: db.plants[idx].id };
  writeDB(db);
  return db.plants[idx];
}

function deletePlant(id) {
  const db = readDB();
  const before = db.plants.length;
  db.plants = db.plants.filter(p => p.id !== id);
  // 해당 식물의 관찰일지도 함께 삭제
  db.journals = db.journals.filter(j => j.plantId !== id);
  writeDB(db);
  return db.plants.length < before;
}

// 관찰일지 CRUD
function listJournals(filter = {}) {
  let arr = readDB().journals.slice();
  if (filter.plantId) arr = arr.filter(j => j.plantId === filter.plantId);
  if (filter.plantName) arr = arr.filter(j => (j.plantName || '').includes(filter.plantName));
  if (filter.from) arr = arr.filter(j => j.observedAt >= filter.from);
  if (filter.to) arr = arr.filter(j => j.observedAt <= filter.to);
  if (filter.q) {
    const q = filter.q.toLowerCase();
    arr = arr.filter(j =>
      (j.plantName || '').toLowerCase().includes(q) ||
      (j.memo || '').toLowerCase().includes(q) ||
      (j.aiSummary || '').toLowerCase().includes(q)
    );
  }
  arr.sort((a, b) => (b.observedAt || '').localeCompare(a.observedAt || ''));
  return arr;
}

function getJournal(id) {
  return readDB().journals.find(j => j.id === id) || null;
}

function createJournal(input) {
  const db = readDB();
  const plant = db.plants.find(p => p.id === input.plantId);
  const journal = {
    id: genId('jrn'),
    plantId: input.plantId || '',
    plantName: input.plantName || (plant ? plant.name : ''),
    observedAt: input.observedAt || new Date().toISOString().slice(0, 10),
    leafState: input.leafState || '',
    soilState: input.soilState || '',
    sunState: input.sunState || '',
    watered: !!input.watered,
    growthCm: input.growthCm === '' || input.growthCm === undefined || input.growthCm === null ? null : Number(input.growthCm),
    photoUrl: input.photoUrl || '',
    photoBeforeUrl: input.photoBeforeUrl || '',
    photoAfterUrl: input.photoAfterUrl || '',
    species: input.species || '',
    careInfo: input.careInfo && typeof input.careInfo === 'object' ? input.careInfo : null,
    memo: input.memo || '',
    aiSummary: input.aiSummary || '',
    aiAdvice: input.aiAdvice || '',
    createdAt: new Date().toISOString(),
  };
  db.journals.push(journal);
  writeDB(db);
  return journal;
}

function updateJournal(id, patch) {
  const db = readDB();
  const idx = db.journals.findIndex(j => j.id === id);
  if (idx === -1) return null;
  const merged = { ...db.journals[idx], ...patch, id: db.journals[idx].id };
  if (patch.growthCm !== undefined) {
    merged.growthCm = patch.growthCm === '' || patch.growthCm === null ? null : Number(patch.growthCm);
  }
  db.journals[idx] = merged;
  writeDB(db);
  return merged;
}

function deleteJournal(id) {
  const db = readDB();
  const before = db.journals.length;
  db.journals = db.journals.filter(j => j.id !== id);
  writeDB(db);
  return db.journals.length < before;
}

module.exports = {
  readDB,
  writeDB,
  listPlants,
  getPlant,
  createPlant,
  updatePlant,
  deletePlant,
  listJournals,
  getJournal,
  createJournal,
  updateJournal,
  deleteJournal,
};
