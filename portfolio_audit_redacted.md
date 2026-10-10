# CHART VISION AI Repository Audit for Portfolio

## 1. 핵심 요약

CHART VISION AI는 사용자가 업로드한 주식 차트 이미지를 AI Vision 모델로 분석하고, 한국어 기술적 분석 리포트를 제공하는 웹 서비스입니다. 코드 기준 핵심 제품 목적은 “이미지 기반 차트 분석 → 구조화된 매매 판단 리포트 → 사용량/플랜 기반 접근 제어 → 피드백 수집”입니다.

주요 사용자 흐름은 다음과 같습니다.

- 게스트 또는 로그인 사용자가 홈 화면에서 차트 이미지를 업로드합니다.
- 현재 플랜에 맞는 분석 모드가 선택됩니다.
- Next.js API Route가 FastAPI 백엔드로 요청을 프록시합니다.
- FastAPI가 이미지 검증, 리사이즈/크롭, OpenAI Vision 구조화 JSON 분석, 기술지표 보강, 매매 리포트 생성을 수행합니다.
- 프론트엔드는 `ReportDecision` 기반 ViewModel로 Hero/전략/점수/가격대/시나리오 UI를 렌더링합니다.
- 로그인 사용자는 분석 결과에 피드백을 남길 수 있습니다.

확인된 페이지/라우트는 다음과 같습니다.

- 프론트 페이지: `frontend/app/page.tsx`, `frontend/app/login/page.tsx`, `frontend/app/auth/page.tsx`, `frontend/app/auth/callback/page.tsx`, `frontend/app/auth/v1/callback/page.tsx`, `frontend/app/callback/page.tsx`, `frontend/app/not-found.tsx`
- 프론트 API: `frontend/app/api/analyze-chart/route.ts`, `frontend/app/api/analyze/route.ts`, `frontend/app/api/usage-status/route.ts`, `frontend/app/api/feedback/route.ts`, `frontend/app/api/[...path]/route.ts`
- 백엔드 API: `backend/main.py`의 `/analyze-chart`, `/usage-status`, `/analysis-logs`, `/analysis-logs/{analysis_id}`, `/feedback`, `/admin/set-plan`, `/health`, `/health/openai`

포트폴리오 관점에서 가장 강한 기술 포인트는 “LLM 출력 불안정성을 프론트/백엔드 양쪽의 구조화 정규화 계층으로 안정화한 AI 제품 구현”입니다.

## 2. 실제 기술 스택

### Frontend

- Next.js App Router, React, TypeScript
  - 근거: `frontend/package.json`, `frontend/app/page.tsx`, `frontend/app/layout.tsx`
- React 19, Next.js 15 계열
  - 근거: `frontend/package.json`
- Tailwind CSS
  - 근거: `frontend/tailwind.config.ts`, `frontend/app/globals.css`, `frontend/components/AnalysisReportDashboard.tsx`
- Supabase JS client
  - 근거: `frontend/lib/supabase.ts`, `frontend/context/AuthContext.tsx`, `frontend/lib/auth.ts`

### Backend

- FastAPI
  - 근거: `backend/main.py`
- Python 이미지 처리
  - 근거: `backend/image_processing.py`, `backend/requirements.txt`
- OpenAI Python SDK
  - 근거: `backend/ai_analysis.py`, `backend/requirements.txt`
- yfinance 기반 OHLCV 보강 가능성
  - 근거: `backend/market_data.py`, `backend/technical_analysis.py`, `backend/main.py`

### API Layer

- Next.js Route Handler가 FastAPI를 프록시합니다.
  - 근거: `frontend/app/api/analyze-chart/route.ts`, `frontend/lib/apiProxy.ts`
- 실제 AI 분석은 FastAPI `/analyze-chart`에서 처리됩니다.
  - 근거: `backend/main.py`, `backend/ai_analysis.py`

### Database

- Supabase Postgres
  - 근거: `backend/supabase_schema.sql`, `backend/supabase_usage_limits_migration.sql`, `backend/supabase_client.py`
- SQLite 로컬/백업 저장소
  - 근거: `backend/database.py`, `backend/app.db`

### Authentication

- Supabase Auth + Google OAuth
  - 근거: `frontend/lib/auth.ts`, `frontend/context/AuthContext.tsx`, `frontend/app/login/page.tsx`
- 백엔드 Bearer token 검증
  - 근거: `backend/billing.py`, `backend/auth.py`, `backend/supabase_client.py`

### AI / LLM Integration

- OpenAI Responses API + Vision image input + strict JSON schema
  - 근거: `backend/ai_analysis.py`
- 플랜별 모델 선택 로직
  - 근거: `backend/ai_analysis.py`의 `get_model_for_plan`
- 이미지 최적화/크롭 후 모델에 전달
  - 근거: `backend/image_processing.py`, `backend/ai_analysis.py`

### Deployment

- Frontend: Vercel
  - 근거: `frontend/vercel.json`, `DEPLOYMENT_CHECKLIST.md`
- Backend: Railway 사용 흔적 및 기본 백엔드 URL 상수
  - 근거: `frontend/lib/apiProxy.ts`, `backend/main.py`, `DEPLOYMENT_CHECKLIST.md`
- Railway 전용 설정 파일은 별도로 확인되지 않았습니다.

### Styling / UI

- Tailwind 기반 카드형 대시보드
  - 근거: `frontend/components/AnalysisReportDashboard.tsx`
- 한글 웹폰트 fallback 스택
  - 근거: `frontend/app/globals.css`

### SEO / Metadata

- Next.js metadata, Open Graph, Twitter metadata
  - 근거: `frontend/app/layout.tsx`
- JSON-LD Organization schema
  - 근거: `frontend/app/layout.tsx`
- robots.txt, sitemap.xml
  - 근거: `frontend/public/robots.txt`, `frontend/public/sitemap.xml`
- Search Console / Naver verification metadata 존재
  - 근거: `frontend/app/layout.tsx`; 값은 보고서에 포함하지 않음
- ads.txt 및 AdSense script 존재
  - 근거: `frontend/public/ads.txt`, `frontend/app/layout.tsx`; publisher 값은 보고서에 포함하지 않음

### Analytics / Logging

- 분석 결과 로그: `analysis_logs`
  - 근거: `backend/analysis_repository.py`, `backend/supabase_schema.sql`
- 사용량 로그: `usage_logs`
  - 근거: `backend/billing.py`, `backend/supabase_usage_limits_migration.sql`
- 피드백 로그: `feedback_logs`
  - 근거: `backend/feedback_repository.py`, `backend/supabase_schema.sql`
- 성능 타이밍 로그/옵션
  - 근거: `backend/performance.py`, `backend/main.py`

## 3. 실제 시스템 구조

이 저장소는 프론트엔드와 백엔드가 같은 루트에 있는 실질적 모노레포 구조입니다.

- 프론트엔드 위치: `frontend/`
- 백엔드 위치: `backend/`
- 보조 스크립트: `scripts/`
- 배포/보안 문서: `DEPLOYMENT_CHECKLIST.md`, `SECURITY_CHECKLIST.md`

백엔드는 “Both” 구조입니다.

- Next.js API Routes / Route Handlers: 브라우저 요청을 받아 FastAPI로 프록시
  - `frontend/app/api/analyze-chart/route.ts`
  - `frontend/app/api/usage-status/route.ts`
  - `frontend/app/api/feedback/route.ts`
  - `frontend/app/api/[...path]/route.ts`
  - `frontend/lib/apiProxy.ts`
- FastAPI: 실제 분석, 사용량 제한, AI 호출, DB 기록 처리
  - `backend/main.py`

AI 분석 요청 처리 위치:

- 업로드 진입: `frontend/lib/api.ts`의 `analyzeChartImage`
- 프론트 프록시: `frontend/lib/apiProxy.ts`의 `proxyAnalyzeChart`
- 실제 백엔드 엔드포인트: `backend/main.py`의 `analyze_chart`

이미지 처리 위치:

- 프론트 1차 검증: `frontend/lib/apiProxy.ts`
- 백엔드 파일 확장자/MIME/크기 검증: `backend/main.py`
- 이미지 리사이즈/크롭/압축: `backend/image_processing.py`

API 응답 생성 위치:

- 기본 응답 payload 구성: `backend/main.py`의 `_build_result_payload`
- 런타임 필드 추가: `backend/main.py`의 `_attach_runtime_fields`

Railway 사용 여부:

- 실제 Railway 백엔드 URL을 기본값으로 갖는 프론트 프록시가 있습니다.
- FastAPI CORS도 Railway production 환경 변수를 고려합니다.
- 다만 `railway.toml` 같은 명시적 Railway 설정 파일은 확인되지 않았습니다.

## 4. AI 분석 파이프라인

### OpenAI 호출 위치

- `backend/ai_analysis.py`의 `analyze_chart_image_with_ai`
- OpenAI Responses API를 사용하며, `model`, system prompt, user prompt, 이미지 입력, strict JSON schema를 전달합니다.

### 모델 입력

- 전체 이미지: `fullImage`
- 오른쪽 가격축/최근 캔들 크롭: `rightCropImage`
- 하단 보조지표 크롭: `bottomCropImage`
- 중앙 차트 크롭: `centerChartImage`

분석 모드별 이미지 구성:

- `fast`: 전체 이미지 + 오른쪽 크롭
- `standard`: 하단 보조지표 크롭 포함
- `precision`: 중앙 차트 크롭까지 포함

근거:

- `backend/image_processing.py`의 `IMAGE_ANALYSIS_MODE_CONFIG`
- `backend/ai_analysis.py`의 `_normalize_image_inputs`

### 이미지 최적화

- PIL 기반 이미지 로드
- RGB 변환
- JPEG 압축
- 긴 변 기준 리사이즈
- 오른쪽/하단/중앙 영역 크롭
- SHA-256 기반 이미지 해시 생성

근거:

- `backend/image_processing.py`
- `backend/main.py`의 `_get_input_image_hash`
- `backend/analysis_repository.py`의 `build_cache_key`

### OHLCV / 기술지표 계산

코드 기반 보강이 존재합니다.

- 심볼 감지 결과를 기준으로 yfinance 후보 생성
  - `backend/market_data.py`
- OHLCV 데이터 검증
  - `backend/main.py`의 `_try_build_technical_and_patterns`
- RSI, MACD, 이동평균, Bollinger, 거래량, 지지/저항 계산
  - `backend/technical_analysis.py`
- OHLCV 기반 패턴 후보 감지
  - `backend/pattern_analysis.py`

단, 이미지에서 보조지표가 보이는 경우에는 AI가 `indicatorReadings`도 반환합니다. 따라서 RSI/MACD/이동평균/거래량 해석은 “AI 시각 판독 + 코드 기반 OHLCV 보강”이 혼합된 구조입니다.

### 프롬프트 구조

전체 프롬프트 전문은 포트폴리오 보고서에 포함하지 않습니다.

확인된 목적과 구조:

- 한국어로 차트 이미지를 분석하도록 지시
- 종목/시장/시간축/패턴/지지저항/가격축/보조지표/위험요인을 구조화해 반환
- 이미지 기반 추정의 한계를 명시하도록 설계
- 공격적/확정적 투자 조언을 줄이고 조건부 대응을 유도
- strict JSON schema 기반 응답을 요구

근거:

- `backend/ai_analysis.py`의 `SYSTEM_PROMPT`, `USER_PROMPT`, `AI_ANALYSIS_RESPONSE_SCHEMA`
- `backend/schemas.py`의 `AIAnalysis`

### 응답 형식

- 자유 텍스트가 아니라 구조화 JSON입니다.
- Pydantic 모델로 검증합니다.
- 실패 시 JSON 파싱/검증 예외를 발생시킵니다.

근거:

- `backend/ai_analysis.py`의 `AI_ANALYSIS_RESPONSE_SCHEMA`
- `backend/schemas.py`

## 5. 리포트 출력 스키마

### AIAnalysis 계층

근거:

- `backend/schemas.py`의 `AIAnalysis`
- `frontend/types/analysis.ts`의 `AIAnalysis`

주요 필드:

- 종목 식별: `symbolDetection.detectedTicker`, `symbolDetection.detectedName`, `detectedMarket`
- 시간축: `timeframeEstimate`
- 시각적 가격 정보: `priceAxisObservations.currentPriceEstimate`, support/resistance levels
- 패턴 후보: `patternCandidates`
- 보조지표: `indicatorReadings.rsi`, `macd`, `bollingerBands`, `movingAverages`, `volume`, `ichimoku`
- 데이터 신뢰도: `dataConfidenceFactors`
- 시나리오 근거: `entryScenarioEvidence`
- 위험 메모: `riskNotes`

생성 방식:

- 대부분 AI 생성
- 일부는 이후 코드에서 OHLCV 기반으로 보강

### TradingReport 계층

근거:

- `backend/trading_report.py`의 `generate_trading_report`
- `frontend/types/analysis.ts`의 `TradingReport`
- `frontend/lib/tradingReportViewModel.ts`의 `normalizeTradingReport`

주요 필드:

- 최종 요약: `finalSummary.finalAction`, `title`, `oneLineConclusion`, `reason`
- 점수: `scoreSummary.totalScore`, `buyScore`, `holdScore`, `riskScore`, `entryScores`
- 가격 역할: `priceRoles.current`, `pivot`, `pullbackEntry`, `breakoutEntry`, `stopLoss`, `targets`
- 사용자 대응: `userActionGuide.nonHolder`, `holder`, `shortTermTrader`, `addBuyer`, `stopLoss`
- 매매 계획: `tradePlan.entry`, `stopLoss`, `stopLossByEntry`, `targets`, `riskReward`, `riskRewardByEntry`, `transitionLevel`
- 핵심 가격대: `keyLevels.supports`, `keyLevels.resistances`
- 시나리오: `scenarios.bullish`, `neutral`, `bearish`
- 패턴 분석: `patternAnalysis.primaryPattern`, `secondaryPattern`
- 지표 분석: `indicatorAnalysis.confirmed`, `unavailable`
- 근거: `evidence.positive`, `negative`, `riskFactors`

생성 방식:

- AI 결과, 시각적 trade signal, OHLCV 기술 분석, 코드 기반 점수/정규화가 혼합됩니다.

### ReportDecision / Institutional ViewModel 계층

근거:

- `frontend/lib/institutionalReportViewModel.ts`
- `frontend/components/AnalysisReportDashboard.tsx`

주요 필드:

- `reportDecision.chartRegime`
- `reportDecision.finalActionState`
- `reportDecision.finalActionLabel`
- `reportDecision.finalActionTone`
- `reportDecision.primaryStrategy`
- `reportDecision.priceRoles`
- `reportDecision.entryStrategies.current/pullback/breakout`
- `reportDecision.displayedEntrySignal`
- `reportDecision.signalSummary`
- `reportDecision.consistencyWarnings`
- `reportDecision.newEntryDecision`
- `reportDecision.holderDecision`

생성 방식:

- 프론트 표시용 계산/정규화 계층입니다.
- backend raw report를 다시 해석하되, UI가 직접 매매 판단을 만들지 않도록 canonical decision object를 제공합니다.

### 렌더링 위치

- Hero/대시보드 전체: `frontend/components/AnalysisReportDashboard.tsx`
- 구형/상세 리포트 섹션: `frontend/components/TradingReportSections.tsx`
- 피드백 영역: `frontend/components/AnalysisResult.tsx`

## 6. DB / 인증 / 사용량 제한 구조

### Supabase Auth

Supabase Auth가 사용됩니다.

- 프론트 Supabase client: `frontend/lib/supabase.ts`
- Auth provider context: `frontend/context/AuthContext.tsx`
- Google OAuth sign-in: `frontend/lib/auth.ts`
- Callback 처리: `frontend/app/auth/callback/page.tsx`
- 백엔드 access token 검증: `backend/supabase_client.py`, `backend/billing.py`, `backend/auth.py`

### 사용 테이블

Supabase SQL 기준:

- `users`
- `profiles`
- `usage_logs`
- `subscriptions`
- `analysis_logs`
- `feedback_logs`

근거:

- `backend/supabase_schema.sql`
- `backend/supabase_usage_limits_migration.sql`
- `backend/supabase_rls_policies_migration.sql`

SQLite fallback/local 기준:

- `users`
- `usage_logs`
- `subscriptions`
- `analysis_logs`
- `feedback_logs`

근거:

- `backend/database.py`

확인되지 않은 테이블:

- `payments`: repository 내 현재 schema에서는 확인되지 않음
- `user_plan`: repository 내 현재 schema에서는 확인되지 않음

### 사용량 제한

플랜과 제한:

- guest: 일 1회, 월 3회
- free: 일 3회, 월 10회
- plus: 일 20회, 월 100회
- pro: 일 50회, 월 300회

근거:

- `backend/billing.py`의 `PLAN_LIMITS`
- `frontend/lib/planLimits.ts`

제한 처리 흐름:

- 요청 identity 확인: `backend/billing.py`의 `resolve_request_identity`
- 사용량 조회: `count_usage`, `get_usage_status`
- 분석 가능 여부 확인: `assert_can_analyze`
- 성공/오류/제한 도달 로그 기록: `record_usage`
- 초과 시 403 또는 429 응답과 `usageStatus` 반환

프론트 반응:

- `frontend/app/page.tsx`에서 제한 에러 메시지 생성
- 제한 도달 시 Pricing Modal을 열 수 있음

### 플랜 구조

확인된 플랜:

- `guest`
- `free`
- `plus`
- `pro`

근거:

- `backend/billing.py`
- `frontend/types/billing.ts`
- `frontend/lib/planLimits.ts`
- `frontend/components/PricingModal.tsx`

결제 구현 상태:

- Pricing UI는 존재하지만 Plus/Pro는 disabled 상태로 보입니다.
- PayApp/Stripe/Toss 결제 route나 `payments` 테이블은 현재 repository에서 확인되지 않았습니다.

## 7. UI/UX 구성

### 메인 랜딩 / 업로드

구성:

- 브랜드/서비스 설명 Hero
- 사용량 카드
- 이미지 업로드 컴포넌트
- 분석 모드 선택
- 분석 시작 버튼
- 로그인 유도/요금제 모달

근거:

- `frontend/app/page.tsx`
- `frontend/components/ImageUploader.tsx`
- `frontend/components/UsageStatusCard.tsx`
- `frontend/components/PricingModal.tsx`

포트폴리오 설명 포인트:

- 게스트도 체험 가능하지만 사용량 제한을 둔 freemium UX
- 플랜별 분석 모드 제한
- 파일 업로드 전후 상태와 로딩 단계 표시

### 리포트 Hero / 대시보드

구성:

- 종목 요약 카드
- 매매 전략 카드
- 최종 신호/위험 카드
- 진입 시나리오
- 시그널 요약
- 핵심 가격대
- 메타데이터 행

근거:

- `frontend/components/AnalysisReportDashboard.tsx`의 `SummaryHero`

포트폴리오 설명 포인트:

- 복잡한 AI 결과를 Hero에서 “현재 해야 할 행동” 중심으로 요약
- `ReportDecision`을 source of truth로 두어 UI 재해석을 줄임
- 모바일 order와 grid 비율을 조정해 정보 밀도 균형화

### 상세 리포트 섹션

구성:

- AI 시장 요약
- AI 시그널 점수
- 진입 방식별 판단
- 핵심 가격대 테이블
- 지표 요약
- 시나리오 분석
- 패턴 탐지
- 인사이트/리스크 노트

근거:

- `frontend/components/AnalysisReportDashboard.tsx`
- `frontend/components/TradingReportSections.tsx`

### 피드백 폼

구성:

- 분석 결과에 대한 별점
- 사용자 판단 신호
- 사용자가 본 패턴
- 코멘트

근거:

- `frontend/components/AnalysisResult.tsx`
- `frontend/app/api/feedback/route.ts`
- `backend/feedback_repository.py`

### 반응형 처리

근거:

- Tailwind responsive class 사용: `frontend/components/AnalysisReportDashboard.tsx`, `frontend/app/page.tsx`
- 텍스트 overflow 방지: `word-break: keep-all`, `overflow-wrap: break-word`, `min-w-0` 패턴

## 8. SEO / 배포 / 운영 구조

### SEO

확인된 요소:

- `metadataBase`
- title/description/keywords
- icons
- Open Graph
- Twitter metadata
- Google/Naver verification metadata
- JSON-LD Organization schema
- robots.txt
- sitemap.xml
- ads.txt
- AdSense script

근거:

- `frontend/app/layout.tsx`
- `frontend/public/robots.txt`
- `frontend/public/sitemap.xml`
- `frontend/public/ads.txt`

보안 주의:

- Search Console / Naver verification 값은 보고서에 포함하지 않았습니다.
- AdSense publisher 값도 보고서에 포함하지 않았습니다.

### Deployment / Operations

프론트:

- Vercel 설정 존재
  - `frontend/vercel.json`
- API route maxDuration 설정
- 보안 헤더 설정

백엔드:

- Railway 사용 흔적
  - `backend/main.py`의 Railway production 환경 판단
  - `frontend/lib/apiProxy.ts`의 기본 FastAPI backend URL 상수
  - `DEPLOYMENT_CHECKLIST.md`
- 명시적 Railway 설정 파일은 확인되지 않았습니다.

환경변수 이름만 확인:

- `BACKEND_API_URL=[REDACTED]`
- `NEXT_PUBLIC_API_URL=[REDACTED]`
- `NEXT_PUBLIC_SITE_URL=[REDACTED]`
- `NEXT_PUBLIC_SUPABASE_URL=[REDACTED]`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY=[REDACTED]`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=[REDACTED]`
- `VITE_SUPABASE_URL=[REDACTED]`
- `VITE_SUPABASE_ANON_KEY=[REDACTED]`
- `OPENAI_API_KEY=[REDACTED]`
- `OPENAI_MODEL=[REDACTED]`
- `OPENAI_MODEL_FREE=[REDACTED]`
- `OPENAI_MODEL_PLUS=[REDACTED]`
- `OPENAI_MODEL_PRO=[REDACTED]`
- `OPENAI_TIMEOUT_SECONDS=[REDACTED]`
- `OPENAI_MAX_RETRIES=[REDACTED]`
- `SUPABASE_URL=[REDACTED]`
- `SUPABASE_SERVICE_ROLE_KEY=[REDACTED]`
- `CORS_ALLOWED_ORIGINS=[REDACTED]`
- `GUEST_TOKEN_SECRET=[REDACTED]`
- `ADMIN_API_SECRET=[REDACTED]`
- `MAX_UPLOAD_MB=[REDACTED]`
- `RAILWAY_ENVIRONMENT=[REDACTED]`
- `ENVIRONMENT=[REDACTED]`
- `ALLOW_SQLITE_USAGE_FALLBACK=[REDACTED]`
- `ENABLE_PERFORMANCE_DEBUG=[REDACTED]`

## 9. 문제 해결 사례

### A. AI 출력이 너무 일반적이거나 AI-like하게 느껴지는 문제

- Problem: 이미지 분석 결과가 추상적 문구에 머물면 사용자가 실제 행동 기준을 잡기 어려움
- Likely cause: Vision 모델이 이미지 설명을 잘해도 매매 실행 기준을 일관되게 분리하지 못할 수 있음
- Implemented solution found in code:
  - backend prompt가 간결한 한국어 행동 중심 관찰을 지향
  - `backend/trading_report.py`의 `_guard_user_facing_text`
  - `frontend/lib/institutionalReportViewModel.ts`의 `guardUserFacingWording`, `buildReportDecision`
  - Hero는 `ReportDecision.primaryStrategy`를 렌더링
- Portfolio-ready explanation: “LLM 원문을 그대로 노출하지 않고, 투자자 행동 관점의 구조화된 Decision ViewModel로 변환해 실사용 UX 품질을 개선했습니다.”
- Evidence path:
  - `backend/ai_analysis.py`
  - `backend/trading_report.py`
  - `frontend/lib/institutionalReportViewModel.ts`
  - `frontend/components/AnalysisReportDashboard.tsx`

### B. 분석 결과가 충분히 구조화되지 않았던 문제

- Problem: 차트 분석은 가격/지표/전략/리스크가 섞여 있어 자유 텍스트만으로는 UI와 검증이 어려움
- Likely cause: AI 응답을 카드 UI와 회귀 테스트에 연결하려면 명확한 schema가 필요
- Implemented solution found in code:
  - OpenAI strict JSON schema 사용
  - Pydantic `AIAnalysis`
  - TypeScript `TradingReport`, `ReportDecision`
  - ViewModel normalization
- Portfolio-ready explanation: “AI 응답을 strict schema로 제한하고, 백엔드/프론트 양쪽에서 단계적으로 정규화해 UI와 테스트가 가능한 리포트 데이터 모델을 만들었습니다.”
- Evidence path:
  - `backend/ai_analysis.py`
  - `backend/schemas.py`
  - `frontend/types/analysis.ts`
  - `frontend/lib/tradingReportViewModel.ts`
  - `frontend/lib/institutionalReportViewModel.ts`

### C. 한국어 텍스트 또는 PDF/font encoding 이슈

- Problem: 한국어 UI/리포트는 인코딩 깨짐과 폰트 fallback 문제가 발생하기 쉬움
- Likely cause: 한글 문자열, Windows 콘솔, UTF-8 파일, 웹폰트 fallback이 혼재
- Implemented solution found in code:
  - UTF-8/깨짐 의심 패턴 검사 스크립트
  - 한글 font-family fallback
  - 대시보드 텍스트 overflow/word-break 처리
- Portfolio-ready explanation: “한국어 서비스 특성상 인코딩과 줄바꿈 안정성을 별도 체크 스크립트와 CSS fallback으로 관리했습니다.”
- Evidence path:
  - `scripts/check-encoding.js`
  - `frontend/app/globals.css`
  - `frontend/components/AnalysisReportDashboard.tsx`
- Not found in repository:
  - PDF 생성/다운로드 기능 또는 PDF 폰트 임베딩 구현은 확인되지 않음

### D. 티커/회사명 표시 문제

- Problem: Hero title에 회사명/한국명/긴 이름이 표시되면 종목 식별성이 떨어지고 줄바꿈/말줄임 문제가 발생
- Likely cause: AI가 ticker와 company name을 일관되게 분리하지 못함
- Implemented solution found in code:
  - `DisplayIdentity`
  - ticker-first display
  - alias map
  - Korean numeric code handling
  - unknown fallback
  - 회귀 테스트 fixture
- Portfolio-ready explanation: “AI가 반환한 종목명과 티커를 DisplayIdentity 계층에서 정규화하여, Hero의 대형 타이틀은 항상 신뢰 가능한 ticker/code 중심으로 표시되게 했습니다.”
- Evidence path:
  - `frontend/lib/institutionalReportViewModel.ts`
  - `scripts/check-trading-report-decisions.js`
  - `frontend/components/AnalysisReportDashboard.tsx`

### E. 점수 로직이 너무 극단적이거나 불균형한 문제

- Problem: final action은 주의인데 entry score가 매수 우세처럼 보이는 모순 가능성
- Likely cause: AI 원문, backend score, frontend display score가 서로 다른 계층에서 생성됨
- Implemented solution found in code:
  - backend score consistency layer
  - frontend ReportDecision validation
  - score cap/warning
  - support breakdown, resistance test, overheated breakout 등 시나리오별 fixture
- Portfolio-ready explanation: “매매 신호 점수와 리포트 신뢰도를 분리하고, 위험 상태에서는 entry score와 wording을 자동으로 보수화하는 표시용 decision pipeline을 구축했습니다.”
- Evidence path:
  - `backend/trading_report.py`
  - `frontend/lib/institutionalReportViewModel.ts`
  - `scripts/check-trading-report-decisions.js`

### F. 가격대가 겹치거나 역할이 불명확한 문제

- Problem: 현재가, 저항, 돌파 기준, 목표가, 손절가가 같은 가격대로 표시되면 매매 계획이 왜곡됨
- Likely cause: 이미지 기반 가격 추정과 AI 출력이 zone 개념을 충분히 분리하지 못함
- Implemented solution found in code:
  - `samePriceZone`
  - `normalizeDecisionPriceRoles`
  - warning code: `PRICE_ROLE_COLLAPSE`, `TARGET_TOO_CLOSE`, `BREAKOUT_TARGET_OVERLAP`, `SUPPORT_STOP_OVERLAP`
  - 테스트 fixture
- Portfolio-ready explanation: “가격을 단일 숫자가 아니라 zone으로 취급하고, 역할 중복을 감지해 대체 목표나 안전 fallback으로 표시하는 Price Role 정규화 계층을 만들었습니다.”
- Evidence path:
  - `frontend/lib/tradingReportViewModel.ts`
  - `frontend/lib/institutionalReportViewModel.ts`
  - `backend/trading_report.py`
  - `scripts/check-trading-report-decisions.js`

### G. Deployment/API/CORS/environment variable 문제

- Problem: 프론트와 백엔드가 분리 배포되면 API URL, CORS, 토큰 전달, env scope 문제가 빈번함
- Likely cause: Vercel frontend와 Railway/FastAPI backend가 서로 다른 origin에서 동작
- Implemented solution found in code:
  - Next.js API proxy
  - backend CORS origin 설정
  - 환경변수 체크리스트
  - security checklist
  - 서버 전용 env와 public env 분리
- Portfolio-ready explanation: “Vercel Route Handler를 API gateway로 사용해 브라우저와 FastAPI 사이의 인증 헤더, guest id, timeout, 파일 검증을 일관되게 처리했습니다.”
- Evidence path:
  - `frontend/lib/apiProxy.ts`
  - `frontend/vercel.json`
  - `backend/main.py`
  - `DEPLOYMENT_CHECKLIST.md`
  - `SECURITY_CHECKLIST.md`

### H. 이미지/모델 호출 비용 최적화

- Problem: Vision 모델 호출 비용과 응답 시간이 이미지 크기/입력 개수에 민감함
- Likely cause: 원본 이미지를 그대로 전송하면 비용과 지연이 증가
- Implemented solution found in code:
  - 이미지 리사이즈/압축
  - 분석 모드별 크롭 개수 차등
  - 이미지 hash 기반 cache key
  - OpenAI timeout/retry 설정
  - 플랜별 모델 선택
- Portfolio-ready explanation: “fast/standard/precision 모드별로 이미지 입력량을 조절하고, 해시 기반 캐싱과 플랜별 모델 라우팅으로 비용과 응답 시간을 관리했습니다.”
- Evidence path:
  - `backend/image_processing.py`
  - `backend/analysis_repository.py`
  - `backend/ai_analysis.py`
  - `backend/main.py`

## 10. 포트폴리오에 추가하면 좋은 내용

### 가장 강한 기술 포인트

- AI Vision 이미지 분석을 strict JSON schema로 구조화
- AI 원문을 그대로 노출하지 않고, `TradingReport`와 `ReportDecision`으로 단계적 정규화
- 가격 역할 중복, 점수 모순, 티커 표시 문제를 테스트 가능한 invariant로 관리
- Supabase Auth + 사용량 제한 + 분석 로그/피드백 로그 구조
- Vercel frontend와 FastAPI backend 분리 배포 구조
- 이미지 최적화와 캐시 기반 비용 관리

### 약하거나 모호한 부분

- 결제 기능은 현재 UI상 “준비 중”으로 보이며, 실제 payment table/route는 확인되지 않음
- Railway 설정 파일은 없고 문서/코드상 흔적만 있음
- PDF 출력 기능은 확인되지 않음
- 실제 운영 지표는 코드만으로 확인 불가

### 추가하면 좋은 스크린샷

- 업로드 전 랜딩 화면
- 이미지 업로드 후 로딩 단계
- Hero 리포트 대시보드
- 진입 시나리오/핵심 가격대/지표 테이블
- 사용량 제한 도달 시 Pricing Modal
- 로그인 후 피드백 폼

### 추가하면 좋은 다이어그램

- 사용자 요청 흐름: Browser → Next.js API Route → FastAPI → OpenAI → TradingReport → ReportDecision → Dashboard
- 데이터 모델 흐름: AIAnalysis → TradingReport → ReportDecision → ViewModel
- 사용량 제한 흐름: identity → plan limits → usage_logs → allow/block
- 이미지 처리 흐름: upload → validation → resize/crop → model input

### 수집하면 좋은 정량 지표

- 평균 분석 소요 시간
- 이미지 최적화 전후 용량 감소율
- cache hit rate
- 분석 성공률/실패율
- 사용량 제한 도달 사용자 비율
- 피드백 평균 별점
- ticker 표시 오류 감소 사례
- 가격 역할 warning 발생률

### 수동으로 답해야 할 질문

- 실제 배포 URL과 Railway 서비스명은 무엇인가?
- 현재 운영 중인 OpenAI 모델별 월 비용은 어느 정도인가?
- 피드백을 기반으로 분석 품질이 얼마나 개선되었는가?
- 사용자가 가장 많이 업로드하는 차트 유형은 무엇인가?
- 결제 기능은 실제로 운영할 계획인가, 아니면 포트폴리오에서는 freemium prototype으로 설명할 것인가?

## 11. 확인이 필요한 질문

- 포트폴리오에 “결제 연동”을 넣어야 하는가? 현재 repository evidence 기준으로는 실제 PayApp/Stripe/Toss route가 확인되지 않습니다.
- `profiles.plan`이 운영상 최종 plan source인지, 추후 `user_plan` 같은 별도 entitlement 테이블로 바꿀 계획인지 확인이 필요합니다.
- PDF 리포트 다운로드 기능이 별도 브랜치나 외부 파일에 있는지 확인이 필요합니다.
- 실제 SEO 색인 결과, Search Console/Naver Search Advisor 상태는 코드만으로 확인할 수 없습니다.
- 실제 Railway 설정은 대시보드/환경변수에서 확인해야 합니다.
- 운영 중인 Supabase RLS policy가 SQL 파일과 동일하게 적용되어 있는지 확인이 필요합니다.

## 12. 안전성 점검

- Secrets exposed: No
- Secret values included in report: No
- Files modified: No source files modified. Only `portfolio_audit_redacted.md` was created.
- `.env` 또는 실제 환경변수 값은 읽거나 포함하지 않았습니다.
- 확인된 secret-related variable names는 모두 `[REDACTED]`로 표기했습니다.
- Search verification 값, AdSense publisher 값, Supabase key, OpenAI key, service role key, OAuth/payment key 값은 포함하지 않았습니다.
- 프롬프트 전문은 포함하지 않았고 목적/구조만 요약했습니다.
