// AI 식물관찰일지 MCP 서버 (예시 / 학습용 minimal 구현)
//
// 표준 MCP SDK 대신, 핵심 동작 흐름을 보여주기 위한 stdio JSON-RPC 형식의
// 경량 구현입니다. 동일 비즈니스 로직 (lib/tools.js) 을 웹 서버와 공유하므로,
// 향후 공식 @modelcontextprotocol/sdk 로 교체해도 핸들러 코드는 그대로 사용할 수 있습니다.
//
// 사용:
//   node mcp-server/server.js
//
// 호출 예 (stdin):
//   {"jsonrpc":"2.0","id":1,"method":"tools/list"}
//   {"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"getPlantLogs","arguments":{"plantName":"바질"}}}

const readline = require('readline');
const path = require('path');

const tools = require(path.join(__dirname, '..', 'lib', 'tools'));

const TOOLS = [
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
    description: '관찰일지 데이터를 CSV 또는 JSON 형태로 내보냅니다.',
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
    description: '사진(전/후)을 분석해 잎/흙/햇빛/물주기/키/메모/학명/적정조건을 자동으로 추론합니다. GOOGLE_API_KEY 필요.',
    inputSchema: {
      type: 'object',
      properties: {
        photoBeforeUrl: { type: 'string', description: '/uploads/xxx 형식 (선택)' },
        photoAfterUrl: { type: 'string', description: '/uploads/xxx 형식 (필수)' },
        plantName: { type: 'string' },
      },
      required: ['photoAfterUrl'],
    },
  },
  {
    name: 'lookupSpeciesInfo',
    description: '식물명으로 학명, 적정 일조량, 적정 습도, 권장 물주기 주기를 조회합니다. GOOGLE_API_KEY 필요.',
    inputSchema: {
      type: 'object',
      properties: {
        plantName: { type: 'string' },
      },
      required: ['plantName'],
    },
  },
];

async function callTool(name, args = {}) {
  switch (name) {
    case 'getPlantLogs':
      return tools.getPlantLogs(args);
    case 'analyzeGrowthTrend':
      return tools.analyzeGrowthTrend(args);
    case 'suggestCarePlan':
      return await tools.suggestCarePlan(args);
    case 'exportJournalData':
      return tools.exportJournalData(args);
    case 'analyzePlantPhotos':
      return await tools.analyzePlantPhotos(args);
    case 'lookupSpeciesInfo':
      return await tools.lookupSpeciesInfo(args);
    default:
      throw new Error('Unknown tool: ' + name);
  }
}

function write(obj) {
  process.stdout.write(JSON.stringify(obj) + '\n');
}

function ok(id, result) {
  write({ jsonrpc: '2.0', id, result });
}

function err(id, code, message) {
  write({ jsonrpc: '2.0', id, error: { code, message } });
}

async function handle(msg) {
  const { id, method, params } = msg;
  try {
    switch (method) {
      case 'initialize':
        return ok(id, {
          protocolVersion: '2024-11-05',
          serverInfo: { name: 'ai-plant-journal-mcp', version: '1.0.0' },
          capabilities: { tools: {} },
        });
      case 'tools/list':
        return ok(id, { tools: TOOLS });
      case 'tools/call': {
        const name = params?.name;
        const args = params?.arguments || {};
        const result = await callTool(name, args);
        return ok(id, {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        });
      }
      default:
        return err(id, -32601, 'Method not found: ' + method);
    }
  } catch (e) {
    err(id, -32000, e.message || String(e));
  }
}

const rl = readline.createInterface({ input: process.stdin });
rl.on('line', (line) => {
  const trimmed = line.trim();
  if (!trimmed) return;
  try {
    const msg = JSON.parse(trimmed);
    handle(msg);
  } catch (e) {
    err(null, -32700, 'Parse error');
  }
});

process.stderr.write('AI 식물관찰일지 MCP 서버가 stdio로 대기 중입니다.\n');
