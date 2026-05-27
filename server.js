// AI 식물관찰일지 - Express 서버
// 정적 파일(public/)과 REST API(/api/*)를 같은 포트에서 서비스한다.

// .env 파일 자동 로드 (있을 때만 적용, 없으면 무시)
require('dotenv').config();

const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const storage = require('./lib/storage');
const ai = require('./lib/ai');
const tools = require('./lib/tools');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// ---------- 사진 업로드 (multer) ----------
const UPLOAD_DIR = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOAD_DIR),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname) || '.jpg';
      const safe = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`;
      cb(null, safe);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

app.post('/api/upload', upload.single('photo'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'no file' });
  res.json({ url: `/uploads/${req.file.filename}` });
});

// ---------- 헬스체크 ----------
app.get('/api/health', (req, res) => {
  res.json({ ok: true, ts: new Date().toISOString() });
});

// ---------- 식물 API ----------
app.get('/api/plants', (req, res) => {
  res.json(storage.listPlants());
});

app.post('/api/plants', (req, res) => {
  const { name } = req.body || {};
  if (!name || !String(name).trim()) {
    return res.status(400).json({ error: '식물명은 필수입니다.' });
  }
  const plant = storage.createPlant(req.body);
  res.status(201).json(plant);
});

app.get('/api/plants/:id', (req, res) => {
  const p = storage.getPlant(req.params.id);
  if (!p) return res.status(404).json({ error: 'not found' });
  res.json(p);
});

app.put('/api/plants/:id', (req, res) => {
  const updated = storage.updatePlant(req.params.id, req.body || {});
  if (!updated) return res.status(404).json({ error: 'not found' });
  res.json(updated);
});

app.delete('/api/plants/:id', (req, res) => {
  const ok = storage.deletePlant(req.params.id);
  if (!ok) return res.status(404).json({ error: 'not found' });
  res.json({ ok: true });
});

// ---------- 관찰일지 API ----------
app.get('/api/journals', (req, res) => {
  const { plantId, plantName, from, to, q } = req.query;
  res.json(storage.listJournals({ plantId, plantName, from, to, q }));
});

app.post('/api/journals', (req, res) => {
  const body = req.body || {};
  if (!body.plantName && !body.plantId) {
    return res.status(400).json({ error: '식물명 또는 식물ID가 필요합니다.' });
  }
  if (!body.observedAt) {
    return res.status(400).json({ error: '관찰일자가 필요합니다.' });
  }
  const j = storage.createJournal(body);
  res.status(201).json(j);
});

app.get('/api/journals/:id', (req, res) => {
  const j = storage.getJournal(req.params.id);
  if (!j) return res.status(404).json({ error: 'not found' });
  res.json(j);
});

app.put('/api/journals/:id', (req, res) => {
  const updated = storage.updateJournal(req.params.id, req.body || {});
  if (!updated) return res.status(404).json({ error: 'not found' });
  res.json(updated);
});

app.delete('/api/journals/:id', (req, res) => {
  const ok = storage.deleteJournal(req.params.id);
  if (!ok) return res.status(404).json({ error: 'not found' });
  res.json({ ok: true });
});

// ---------- AI 상태 ----------
app.get('/api/ai/status', (req, res) => {
  res.json({
    available: ai.hasApiKey(),
    provider: ai.currentProvider(),
    model: process.env.GOOGLE_MODEL || 'gemini-1.5-flash',
  });
});

// ---------- 식물 등록용 AI 메모 자동 생성 ----------
app.post('/api/ai/plant-memo', async (req, res) => {
  try {
    const result = await ai.generatePlantMemo(req.body || {});
    if (result && result.error) {
      const status = result.error === 'API_KEY_MISSING' ? 503
        : result.error === 'INPUT_REQUIRED' ? 400
        : 500;
      return res.status(status).json(result);
    }
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: 'INTERNAL', message: e.message || String(e) });
  }
});

// ---------- 사진 자동 분석 (Claude Vision) ----------
app.post('/api/ai/analyze-photos', async (req, res) => {
  try {
    const result = await ai.analyzePhotos(req.body || {});
    if (result && result.error) {
      const status = result.error === 'API_KEY_MISSING' ? 503
        : result.error === 'PHOTO_MISSING' ? 400
        : 500;
      return res.status(status).json(result);
    }
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: 'INTERNAL', message: e.message || String(e) });
  }
});

// ---------- AI API ----------
app.post('/api/ai/summary', async (req, res) => {
  try {
    const out = await ai.generateSummary(req.body || {});
    res.json(out);
  } catch (e) {
    res.status(500).json({ error: 'AI 요약 생성 실패' });
  }
});

app.post('/api/ai/advice', async (req, res) => {
  try {
    const out = await ai.generateAdvice(req.body || {});
    res.json(out);
  } catch (e) {
    res.status(500).json({ error: 'AI 조언 생성 실패' });
  }
});

// ---------- 통계 ----------
app.get('/api/stats', (req, res) => {
  res.json(tools.computeStats());
});

// ---------- 내보내기 (MCP exportJournalData 와 동일 로직) ----------
app.get('/api/export', (req, res) => {
  const { format = 'json', plantName, plantId, from, to } = req.query;
  const out = tools.exportJournalData({ format, plantName, plantId, from, to });
  res.setHeader('Content-Type', out.mime);
  res.setHeader('Content-Disposition', `attachment; filename="${out.filename}"`);
  res.send(out.body);
});

// ---------- MCP Tool 메타정보 노출 (확장 구조 데모용) ----------
app.get('/api/mcp/tools', (req, res) => {
  res.json([
    {
      name: 'getPlantLogs',
      description: '특정 식물의 관찰일지 목록을 조회합니다.',
      inputSchema: {
        type: 'object',
        properties: {
          plantName: { type: 'string' },
          plantId: { type: 'string' },
          from: { type: 'string', description: 'YYYY-MM-DD' },
          to: { type: 'string', description: 'YYYY-MM-DD' },
        },
      },
    },
    {
      name: 'analyzeGrowthTrend',
      description: '키/잎/물주기 기록을 기반으로 성장 추이를 분석합니다.',
      inputSchema: {
        type: 'object',
        properties: {
          plantName: { type: 'string' },
          plantId: { type: 'string' },
        },
      },
    },
    {
      name: 'suggestCarePlan',
      description: '최근 상태(잎/흙/햇빛/물주기)를 바탕으로 관리 조언을 생성합니다.',
      inputSchema: {
        type: 'object',
        properties: {
          plantName: { type: 'string' },
          leafState: { type: 'string' },
          soilState: { type: 'string' },
          sunState: { type: 'string' },
          watered: { type: 'boolean' },
          memo: { type: 'string' },
        },
      },
    },
    {
      name: 'exportJournalData',
      description: '관찰일지를 CSV 또는 JSON 형식으로 내보냅니다.',
      inputSchema: {
        type: 'object',
        properties: {
          format: { type: 'string', enum: ['csv', 'json'] },
          plantName: { type: 'string' },
          plantId: { type: 'string' },
          from: { type: 'string' },
          to: { type: 'string' },
        },
      },
    },
    {
      name: 'analyzePlantPhotos',
      description: '사진(전/후)을 분석해 관찰일지 필드를 자동으로 추론합니다. ANTHROPIC_API_KEY 필요.',
      inputSchema: {
        type: 'object',
        properties: {
          photoBeforeUrl: { type: 'string' },
          photoAfterUrl: { type: 'string' },
          plantName: { type: 'string' },
        },
        required: ['photoAfterUrl'],
      },
    },
    {
      name: 'lookupSpeciesInfo',
      description: '식물명으로 학명, 적정 일조량, 습도, 물주기 주기를 조회합니다. ANTHROPIC_API_KEY 필요.',
      inputSchema: {
        type: 'object',
        properties: {
          plantName: { type: 'string' },
        },
        required: ['plantName'],
      },
    },
  ]);
});

// ---------- 시작 ----------
app.listen(PORT, () => {
  console.log(`AI 식물관찰일지 서버 실행 중: http://localhost:${PORT}`);
  console.log(`AI 모드: ${process.env.ANTHROPIC_API_KEY ? 'Anthropic Claude API 사용' : '규칙 기반(무료)'}`);
});
