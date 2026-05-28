# 05. API 설계

모든 응답은 JSON. 에러 시 `{ "error": "..." }`.
파일 업로드만 `multipart/form-data`, 나머지는 `application/json`.

## 헬스체크
```
GET /api/health
→ { ok: true, ts: "..." }
```

## 식물
```
GET    /api/plants               → Plant[]
POST   /api/plants               { name, species?, location?, startedAt?, memo? } → Plant
GET    /api/plants/:id           → Plant
PUT    /api/plants/:id           { ...patch } → Plant
DELETE /api/plants/:id           → { ok: true }
```

## 관찰일지
```
GET    /api/journals?plantId=&plantName=&from=&to=&q=     → Journal[]
POST   /api/journals                                       Journal payload → Journal
GET    /api/journals/:id                                   → Journal
PUT    /api/journals/:id                                   patch → Journal
DELETE /api/journals/:id                                   → { ok: true }
```

### 관찰일지 생성 payload 예시
```json
{
  "plantId": "plant_demo",
  "plantName": "바질",
  "observedAt": "2026-05-24",
  "leafState": "싱싱함",
  "soilState": "건조함",
  "sunState": "보통",
  "watered": true,
  "growthCm": 12,
  "photoUrl": "/uploads/123.jpg",
  "memo": "새 잎 2장",
  "aiSummary": "...",
  "aiAdvice": "..."
}
```

## AI
```
POST /api/ai/summary  Journal-like payload → { summary, source: "rule"|"google" }
POST /api/ai/advice   Journal-like payload → { advice, grade, actions?, source }
```

## 사진 업로드
```
POST /api/upload   (multipart, 필드명 "photo")
→ { url: "/uploads/123.jpg" }
```

## 내보내기
```
GET /api/export?format=csv|json&plantName=&plantId=&from=&to=
→ 첨부파일 다운로드 (text/csv 또는 application/json)
```

## 통계
```
GET /api/stats
→ {
  totalPlants, totalJournals,
  perPlant: [ { id, name, count, lastWateredAt, latestHeight, careNeeded } ]
}
```

## MCP Tool 메타정보 (확장 데모)
```
GET /api/mcp/tools
→ [ { name, description, inputSchema } ]
```

## 입력 검증 정책 (MVP)
- 식물 등록: `name` 필수
- 관찰일지 등록: `plantId` 또는 `plantName` 중 하나, `observedAt` 필수
- 사진 업로드: 최대 5MB, 모든 이미지 MIME
- 그 외 필드는 모두 선택값, 누락 시 기본값 또는 빈 문자열
