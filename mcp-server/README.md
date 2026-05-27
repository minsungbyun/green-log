# AI 식물관찰일지 MCP 서버 (예시)

## 목적
AI 에이전트가 표준화된 방식으로 본 서비스의 관찰일지 데이터에 접근할 수 있도록 하기 위한 **MCP (Model Context Protocol) 서버 샘플**입니다.

> 이번 MVP는 핵심 비즈니스 로직(`lib/tools.js`)을 REST API와 MCP 서버가 함께 공유하는 구조로 설계되었습니다.
> 이를 통해 추후 공식 `@modelcontextprotocol/sdk` 로 교체해도 도구 로직은 그대로 재사용할 수 있습니다.

## Tool 목록
| Tool | 설명 |
| --- | --- |
| `getPlantLogs` | 특정 식물의 관찰일지 목록 조회 |
| `analyzeGrowthTrend` | 키/잎/물주기 기록을 기반으로 성장 추이 분석 |
| `suggestCarePlan` | 최근 상태를 바탕으로 관리 조언 생성 |
| `exportJournalData` | 관찰일지를 CSV/JSON 으로 내보내기 |

## 실행
```bash
node mcp-server/server.js
```

## 수동 테스트
서버가 표준 입력을 통해 JSON-RPC 메시지를 받습니다.

```jsonc
{"jsonrpc":"2.0","id":1,"method":"initialize"}
{"jsonrpc":"2.0","id":2,"method":"tools/list"}
{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"getPlantLogs","arguments":{"plantName":"바질"}}}
```

## 향후 확장
- 공식 `@modelcontextprotocol/sdk` 적용
- 외부 식물 정보 API 연동 Tool 추가 (예: `lookupSpeciesInfo`)
- Google Calendar 알림 등록 Tool 추가 (예: `scheduleWateringReminder`)
