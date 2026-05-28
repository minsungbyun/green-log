# 06. MCP 활용 설계

## 1) 적용 목적
본 서비스는 단순한 웹앱이 아니라, **AI 에이전트가 표준화된 방식으로 사용자 식물 데이터에 접근**할 수 있도록 MCP(Model Context Protocol) 기반 확장 구조를 함께 설계한다.

이번 MVP에서는 MCP를 **핵심 기능으로 무리하게 구현하지 않고**, "향후 확장 가능한 구조 + 간단한 샘플 서버"로 제시한다.

## 2) 공유 비즈니스 로직 구조
```
                ┌──────────────────────┐
                │   lib/tools.js       │  ← 핵심 비즈니스 로직 (공유)
                │  - getPlantLogs      │
                │  - analyzeGrowthTrend│
                │  - suggestCarePlan   │
                │  - exportJournalData │
                └──────────┬───────────┘
                           │
        ┌──────────────────┼──────────────────┐
        ▼                                     ▼
┌──────────────┐                    ┌────────────────────┐
│ REST API     │                    │ MCP Server (stdio) │
│ server.js    │                    │ mcp-server/        │
│ /api/...     │                    │ JSON-RPC tools/call│
└──────────────┘                    └────────────────────┘
        │                                     │
        ▼                                     ▼
   브라우저 사용자                       AI 에이전트
```

REST 핸들러와 MCP Tool 핸들러가 동일한 함수를 호출하므로, **구현 한 번으로 두 채널을 모두 지원**한다.

## 3) Tool 명세

### getPlantLogs
- **역할**: 특정 식물의 관찰일지 목록을 조회
- **입력**: `plantName?`, `plantId?`, `from?`, `to?`
- **출력**: `Journal[]`
- **자연어 예**: "내 바질 최근 기록 보여줘."

### analyzeGrowthTrend
- **역할**: 키/잎/물주기 기록을 기반으로 성장 추이 분석
- **입력**: `plantName?`, `plantId?`
- **출력**: `{ count, firstObservedAt, lastObservedAt, heights, growthDelta, wateredCount, summary }`
- **자연어 예**: "내 바질 성장 상태 어때?"

### suggestCarePlan
- **역할**: 최근 상태를 바탕으로 관리 조언 생성 (`lib/ai.js`의 generateAdvice 호출)
- **입력**: `plantName?`, `leafState?`, `soilState?`, `sunState?`, `watered?`, `memo?`
- **출력**: `{ advice, grade, actions?, source }`
- **자연어 예**: "오늘 몬스테라 상태 보고 어떻게 관리할지 알려줘."

### exportJournalData
- **역할**: 관찰일지를 CSV 또는 JSON 으로 내보내기
- **입력**: `format ("csv"|"json")`, `plantName?`, `plantId?`, `from?`, `to?`
- **출력**: `{ mime, filename, body }`
- **자연어 예**: "내 식물관찰일지 CSV로 내보내줘."

## 4) MCP 서버 샘플 (stdio JSON-RPC)
`mcp-server/server.js` — 의존성 없는 minimal 구현
- `initialize` → 서버 정보
- `tools/list` → 4개 Tool 명세 반환
- `tools/call` → `lib/tools.js` 의 해당 함수 실행 후 결과 반환

수동 테스트:
```bash
node mcp-server/server.js
```
이후 stdin 에 한 줄씩 JSON 입력:
```jsonc
{"jsonrpc":"2.0","id":1,"method":"initialize"}
{"jsonrpc":"2.0","id":2,"method":"tools/list"}
{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"getPlantLogs","arguments":{"plantName":"바질"}}}
```

## 5) 과금 / 비용
- MCP 자체는 **과금되는 서비스가 아님** — AI와 외부 도구 연결을 위한 표준 프로토콜
- 실제 비용 발생 지점:
  - AI API 호출 (선택, Google Gemini API)
  - 서버 / 저장소 사용량 (본 프로젝트는 Render 무료 플랜 사용)
- 기본 모드는 **규칙 기반 = 0원**

## 6) 향후 확장 방향
- 공식 `@modelcontextprotocol/sdk` 적용
- `lookupSpeciesInfo` Tool: 외부 식물 정보 API 연동
- `scheduleWateringReminder` Tool: Google Calendar 알림
- `analyzePlantPhoto` Tool: 이미지 기반 잎/병해충 분류
