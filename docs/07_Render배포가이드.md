# 07. Render 배포 가이드

## 전제
- GitHub 계정
- Render 계정 (무료)
- 본 프로젝트가 GitHub 저장소에 push 되어 있을 것

## 1단계: GitHub 에 push
```bash
git init
git add .
git commit -m "feat: AI 식물관찰일지 초기 버전"
git branch -M main
git remote add origin https://github.com/<your-username>/ai-plant-journal.git
git push -u origin main
```

## 2단계: Render 에서 Web Service 생성
1. https://dashboard.render.com → **New +** → **Web Service**
2. **Connect a repository** 에서 위 저장소 선택
3. 설정값:
   - **Name**: `ai-plant-journal` (또는 임의의 이름)
   - **Region**: 기본값 (Singapore 권장)
   - **Branch**: `main`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: `Free`
4. **Create Web Service** 클릭

> 저장소 루트의 `render.yaml` 이 자동으로 인식되면 위 단계가 더 간단해집니다.

## 3단계: 환경변수 (선택)
실제 AI API 를 사용하려면:
- Render 대시보드 → 해당 서비스 → **Environment**
- `GOOGLE_API_KEY` 추가 (값은 본인 키, https://aistudio.google.com/apikey 에서 무료 발급)
- `GOOGLE_MODEL` (선택, 기본 `gemini-2.5-flash`)

> 이 키는 **서버 환경변수로만 사용되며 프론트엔드에 노출되지 않습니다.**
> 입력하지 않으면 자동으로 규칙 기반 요약/조언 모드로 동작합니다.

## 4단계: 공개 URL 확인
배포 완료 후 상단에 다음과 같은 URL 이 표시됩니다.
```
https://ai-plant-journal.onrender.com
```

## 무료 플랜 주의사항
- 일정 시간 미사용 시 인스턴스가 잠들고, 첫 접속 시 30~60초 콜드 스타트 발생 가능
- 디스크가 영구 보장되지 않을 수 있어 `data/journal.json` 및 `public/uploads/` 가 재시작 시 초기화될 수 있음
- 위 한계는 **시연영상 제출**로 보완 (구글 드라이브 제출자료에 포함)

## 변경 통제
- 본 배포 방식(Render Web Service + render.yaml)은 사용자가 명시적으로 변경 요청하기 전까지 유지합니다.
