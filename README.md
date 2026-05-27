# 🌱 AI 식물관찰일지

> 일상에서 키우는 식물의 상태를 손쉽게 기록하면, AI 가 관찰 요약문과 관리 조언을 자동으로 생성해 주는 웹서비스입니다.

- **배포 URL (예시)**: `https://ai-plant-journal.onrender.com`
- **카테고리**: 일상생활 / 라이프로그
- **기술 스택**: Node.js + Express, Vanilla HTML/CSS/JS
- **데이터 저장**: 서버 JSON 파일 (`data/journal.json`)
- **AI 모드**: 규칙 기반(기본) / Anthropic Claude API(환경변수 설정 시 자동 전환)
- **MCP**: 표준화된 4개 Tool 을 통해 AI 에이전트와 연결 가능한 확장 구조 포함

---

## ✨ 주요 기능
1. 식물 등록 / 수정 / 삭제
2. 관찰일지 작성 (잎/흙/햇빛/물주기/키/사진/메모)
3. **AI 관찰 요약 생성** (`/api/ai/summary`)
4. **AI 관리 조언 생성** (`/api/ai/advice`)
5. 카드형 목록 + 검색/필터
6. CSV / JSON 내보내기
7. 통계 / 관리 필요 식물 표시
8. MCP 기반 확장 구조 (`mcp-server/`, `/api/mcp/tools`)

## 🗂️ 디렉터리 구조
```
ai-plant-journal/
├─ server.js                # Express 서버 (REST API + 정적 파일)
├─ package.json
├─ render.yaml              # Render 배포 설정
├─ .env.example             # 환경변수 예시
├─ lib/
│  ├─ storage.js            # JSON 파일 저장소
│  ├─ ai.js                 # 규칙 기반 + Claude API 자동 전환
│  └─ tools.js              # MCP Tool 과 REST 가 공유하는 비즈니스 로직
├─ public/                  # 프론트엔드 (정적 서빙)
│  ├─ index.html · plants.html · journal.html · list.html · stats.html · mcp.html
│  ├─ css/style.css
│  └─ js/api.js · main.js · plants.js · journal.js · list.js · stats.js
├─ mcp-server/              # MCP 서버 예시 (stdio JSON-RPC)
│  ├─ server.js
│  └─ README.md
├─ data/                    # journal.json 자동 생성
├─ public/uploads/          # 사진 업로드 폴더
└─ docs/                    # 기획서/화면/기능/데이터/API/MCP/배포/제출/사용설명서
```

## 🚀 로컬 실행
```bash
npm install
npm start
```
브라우저에서 `http://localhost:3000` 접속

## 🔑 환경변수 (선택)
실제 AI API 호출을 활성화하려면 `.env` 또는 Render 환경변수에 입력합니다.
```
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-haiku-4-5-20251001
```
- 미설정 시: **규칙 기반 요약/조언으로 자동 동작 (무료)**
- 설정 시: 동일 인터페이스로 Anthropic Claude API 호출
- **API Key 는 서버 환경변수로만 사용되며, 프론트엔드에 절대 노출되지 않습니다.**

## ☁️ Render 배포 (요약)
1. GitHub 에 push
2. Render → **New Web Service** → 저장소 선택
3. Runtime `Node`, Build `npm install`, Start `npm start`, Plan `Free`
4. (선택) Environment 에 `ANTHROPIC_API_KEY` 추가
5. 배포 후 `https://<서비스명>.onrender.com` 으로 접속

> 자세한 단계: [docs/07_Render배포가이드.md](docs/07_Render배포가이드.md)

### 무료 플랜 한계
- 일정 시간 미사용 시 콜드 스타트 (첫 접속 30~60초 지연 가능)
- 디스크가 영구 보장이 아니므로 `data/journal.json`, `public/uploads/` 가 재시작 시 초기화될 수 있음
- 위 한계를 보완하기 위해 **시연영상**을 구글 드라이브 제출자료에 함께 첨부합니다.

## 🧩 MCP (Model Context Protocol)
본 서비스는 단순 웹앱이 아니라, **AI 에이전트가 표준화된 방식으로 사용자 식물 데이터에 접근**할 수 있도록 MCP 기반 확장 구조를 함께 설계했습니다.

| Tool | 설명 |
| --- | --- |
| `getPlantLogs` | 특정 식물의 관찰일지 목록 조회 |
| `analyzeGrowthTrend` | 키/잎/물주기 기록을 기반으로 성장 추이 분석 |
| `suggestCarePlan` | 최근 상태를 바탕으로 관리 조언 생성 |
| `exportJournalData` | 관찰일지를 CSV/JSON 으로 내보내기 |

- REST API 핸들러와 MCP Tool 이 **같은 함수 (`lib/tools.js`)** 를 호출합니다.
- Tool 메타정보: `GET /api/mcp/tools`
- stdio 서버 샘플: `node mcp-server/server.js`
- 과금: MCP 자체는 무료. 실제 비용은 AI API/서버 사용량.

자세한 내용: [docs/06_MCP설계.md](docs/06_MCP설계.md), [mcp-server/README.md](mcp-server/README.md)

## 📚 API 한눈에 보기
| 메서드 | 경로 | 설명 |
| --- | --- | --- |
| GET | `/api/health` | 헬스체크 |
| GET / POST | `/api/plants` | 식물 목록/등록 |
| PUT / DELETE | `/api/plants/:id` | 식물 수정/삭제 |
| GET / POST | `/api/journals` | 관찰일지 목록/등록 |
| GET / PUT / DELETE | `/api/journals/:id` | 관찰일지 상세/수정/삭제 |
| POST | `/api/ai/summary` | 관찰 요약 생성 |
| POST | `/api/ai/advice` | 관리 조언 생성 |
| POST | `/api/upload` | 사진 업로드 (multipart) |
| GET | `/api/export` | CSV/JSON 내보내기 |
| GET | `/api/stats` | 통계 |
| GET | `/api/mcp/tools` | MCP Tool 메타정보 |

자세한 스키마: [docs/05_API설계.md](docs/05_API설계.md)

## 📦 구글 드라이브 제출 (경진대회용)
```
AI_식물관찰일지_제출자료/
 ├─ 01_서비스_접속링크.txt
 ├─ 02_사용설명서.pdf
 ├─ 03_시연영상.mp4
 ├─ 04_소스코드.zip
 ├─ 05_기획요약서.pdf
 └─ 06_샘플데이터/sample_journal.json
```
- 공유 설정: **링크가 있는 모든 사용자 / 뷰어**
- 자세한 구성: [docs/08_구글드라이브제출구성.md](docs/08_구글드라이브제출구성.md)

## 📄 문서
| 파일 | 내용 |
| --- | --- |
| [docs/01_프로젝트기획서.md](docs/01_프로젝트기획서.md) | 서비스 개요 / 문제 / 해결 / 마일스톤 |
| [docs/02_화면구성안.md](docs/02_화면구성안.md) | 6개 화면 구성 및 디자인 가이드 |
| [docs/03_기능목록.md](docs/03_기능목록.md) | F1~F13 기능 정의 |
| [docs/04_데이터구조.md](docs/04_데이터구조.md) | Plant / Journal 스키마 |
| [docs/05_API설계.md](docs/05_API설계.md) | REST 엔드포인트 |
| [docs/06_MCP설계.md](docs/06_MCP설계.md) | MCP Tool 명세 / 확장 구조 |
| [docs/07_Render배포가이드.md](docs/07_Render배포가이드.md) | Render 배포 단계 |
| [docs/08_구글드라이브제출구성.md](docs/08_구글드라이브제출구성.md) | 제출 폴더 구성 / 시연영상 구성안 |
| [docs/사용설명서.md](docs/사용설명서.md) | 사용자용 단계별 설명 |

## 🛡️ 변경 통제 원칙
본 프로젝트는 사용자의 명시적 요청에 따라 단계적으로 개발합니다.
- 사용자가 요청한 범위 외의 코드는 임의로 수정하지 않습니다.
- 기존 코드, 폴더 구조, API/데이터 구조, 네이밍은 명시 요청이 없는 한 변경하지 않습니다.
- 수정이 필요하면 먼저 대상/이유를 설명하고 확인을 받습니다.

## 📜 라이선스
MIT
