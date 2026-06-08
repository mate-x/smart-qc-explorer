# smart-qc-explorer

이상 탐지 모델 학습 및 분석을 위한 React 프론트엔드 대시보드

---

## 개요

| 항목 | 내용 |
|------|------|
| 프론트엔드 | Vite 8 + React 19 + TypeScript (포트 `5173`) |
| 백엔드 | FastAPI — `smart-qc-dashboard` 레포 (포트 `8000`) |
| 상태 관리 | Zustand v5 |
| 차트 | Recharts v2 |
| 라우팅 | react-router-dom v7 |
| 스타일 | Tailwind CSS v4 |

---

## 화면 구성

| 경로 | 탭 | 기능 |
|------|----|------|
| `/` | 데이터 폴더 | 데이터셋 경로 검증, 클래스별 이미지 수 및 대표 이미지 표시 |
| `/config` | 전처리 및 모델 설정 | 전처리 방법·모델 파라미터 설정, 배치 학습 큐 관리 |
| `/training` | 학습 | 실시간 학습 모니터링, Loss 차트, 체크포인트 관리 |
| `/experiments` | 실험 히스토리 | 완료 실험 목록·메트릭·차트, 다중 실험 비교, 모델 저장 |
| `/anomaly-map` | 이상 영역 시각화 | Anomaly Map 생성, Threshold 조정, TP/FP/TN/FN 이미지 그리드 |

---

## 시작하기

### 사전 조건

- Node.js 18 이상
- `smart-qc-dashboard` 의 FastAPI 서버가 먼저 실행되어 있어야 함

### 백엔드 서버 실행

```bash
# smart-qc-dashboard 레포 루트에서
uvicorn api.main:app --reload --port 8000
```

### 프론트엔드 설치 및 실행

```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm run dev
```

브라우저에서 `http://localhost:5173` 접속

### 빌드

```bash
npm run build
```

---

## 주요 기능

### 탭1 — 데이터 폴더

- **데이터셋 경로 검증**: MVTec AD 형식 및 OK/NG 이진 형식 자동 감지
- **제품명 설정**: 실험 기록에 사용할 검사 제품명 지정
- **메타 정보 표시**: 폴더 트리, 그레이스케일 감지, 배경 분리 이미지(`background_clean/`) 존재 여부
- **클래스 대표 이미지**: MVTec AD는 3열, OK/NG는 2열 썸네일 그리드
- **클래스별 이미지 수 테이블**: 학습(train), 테스트(test), GT 마스크 수 + 합계

### 탭2 — 전처리 및 모델 설정

- **전처리 설정**: 방법(none / homomorphic / he / clahe), 배경 제거(none / sam2), 이미지 크기
- **모델 설정**: 모델 타입(EfficientAD / PatchCore), 배치 크기, Threshold 방법(percentile / absolute)
- **모델별 파라미터**: EfficientAD(사이즈·학습 스텝·옵티마이저), PatchCore(백본·패치 비율)
- **디바이스 정보**: CUDA / CPU 자동 감지 및 표시
- **배치 학습 큐**: 여러 설정 조합을 큐에 추가하여 순차적으로 학습

### 탭3 — 학습

- **실시간 모니터링**: WebSocket으로 학습 상태·진행률·로그를 서버 Push 방식으로 수신
- **Loss 차트**: Recharts LineChart (실시간 갱신)
- **학습 제어**: 일시정지 / 재개 / 중단
- **진행률 표시**: 현재 Step / 전체 Step, 소요 시간
- **체크포인트 관리**: 중단 지점에서 재개 가능
- **배치 학습**: 큐에 등록된 설정을 순차 실행, 개별 항목 건너뛰기 지원
- **학습 단계 표시**: 현재 단계명 표시 (Feature Extractor 학습, Memory Bank 구축 등)

### 탭4 — 실험 히스토리

- **실험 목록 테이블**: 실험명, 모델, 파라미터 요약, Accuracy/Precision/Recall/F1/F2/AUC, 실행 시각, 상태
- **상세 결과** (completed 실험만):
  - 메트릭 카드 4종
  - 혼동 행렬(Confusion Matrix) 2×2 시각화
  - ROC 곡선 차트 (JS trapezoidal AUC 계산)
  - Anomaly Score 분포 히스토그램 (Min-Max 정규화)
- **다중 실험 비교**: 체크박스 선택 후 막대 차트 또는 레이더 차트 비교
- **배치 실험 비교**: set_id 기준 그룹화 테이블, 정렬 지표 선택
- **모델 저장**: 저장 경로 지정 후 모델 파일 저장 (`POST /api/experiments/{id}/save`)
- **실험 삭제**: 확인 단계 포함

### 탭5 — 이상 영역 시각화

- **Anomaly Map 생성**: 선택된 실험의 테스트셋 전체 재추론 (비동기 job + 1초 폴링)
  - 캐시 존재 시 즉시 완료, 없으면 모델 로드 후 추론
  - 빌드 완료 여부는 `GET /api/anomaly-map/{expId}/status`로 확인
- **Threshold 슬라이더**: 0~1.2 범위, step 0.01, 300ms debounce
  - 초기값: `threshold_method` / `threshold_value` 기반 raw threshold → Min-Max 정규화 자동 계산
- **결함 유형 필터**: 전체 이미지 로드 후 unique `defect_class` 추출 → 드롭다운
- **이미지 그리드**: 4열 20개/페이지, Triplet 이미지(원본/GT마스크/Heatmap) 인라인 표시
  - 분류 배지: TP(초록), FP(빨강), TN(파랑), FN(주황)
  - 통계 바: 전체 수, TP/FP/TN/FN 개수, Max/Avg Score
- **결과 내보내기**: CSV 직접 다운로드, ZIP(Triplet 이미지 묶음) 비동기 생성 후 다운로드

---

## 탭 간 상태 흐름

```
탭1 데이터셋 경로 확인
  ↓ datasetStore (datasetPath, productName, datasetMeta)
탭2 전처리 + 모델 설정
  ↓ configStore (preprocessingConfig, modelConfig, deviceInfo)
탭3 학습 실행 (WebSocket 실시간 업데이트)
  ↓ trainingStore (status, progress, lossHistory, logs)
탭4 실험 선택
  ↓ experimentsStore (selectedExperimentId)
탭5 Anomaly Map 생성 및 분석
    anomalyMapStore (threshold)
```

- 탭1에서 경로 변경 시 `configStore`의 설정이 자동 초기화
- `selectedExperimentId`는 탭4 → 탭5 이동의 연결고리

---

## 프로젝트 구조

```
src/
├── main.tsx                        # React 진입점 + BrowserRouter
├── App.tsx                         # TabBar + Route 출력
│
├── pages/
│   ├── Tab1Dataset.tsx             # 데이터셋 검증
│   ├── Tab2Config.tsx              # 전처리·모델 설정 + 큐
│   ├── Tab3Training.tsx            # 학습 모니터링
│   ├── Tab4Experiments.tsx         # 실험 히스토리
│   └── Tab5AnomalyMap.tsx          # 이상 영역 시각화
│
├── components/
│   ├── layout/
│   │   ├── TabBar.tsx              # 탭 네비게이션
│   │   └── Sidebar.tsx             # 사이드바 (전체 상태 요약)
│   ├── tab1/
│   │   ├── ThumbnailGrid.tsx       # 클래스별 대표 이미지 그리드
│   │   └── ClassCountTable.tsx     # 클래스별 이미지 수 테이블
│   ├── config/
│   │   ├── PreprocessingForm.tsx   # 전처리 설정 폼
│   │   ├── ModelConfigForm.tsx     # 모델 설정 폼
│   │   ├── EfficientAdParams.tsx   # EfficientAD 전용 파라미터
│   │   ├── PatchCoreParams.tsx     # PatchCore 전용 파라미터
│   │   └── QueueSection.tsx        # 배치 학습 큐 관리
│   ├── training/
│   │   ├── StageIndicator.tsx      # 현재 학습 단계 표시
│   │   ├── ProgressSection.tsx     # 진행률·차트·제어 버튼·로그
│   │   ├── IdleSection.tsx         # 학습 대기 중 UI
│   │   └── QueuePanel.tsx          # 배치 큐 진행 상황
│   ├── tab4/
│   │   ├── ConfusionMatrixChart.tsx   # 혼동 행렬 2×2 (div 구현)
│   │   ├── RocCurveChart.tsx          # ROC 곡선 (JS AUC 계산)
│   │   ├── ScoreDistChart.tsx         # 점수 분포 히스토그램
│   │   ├── ComparisonSection.tsx      # 다중 실험 비교 (막대/레이더)
│   │   ├── BatchComparisonSection.tsx # 배치 실험 비교 테이블
│   │   └── experimentUtils.ts         # paramSummary, fmt 유틸
│   └── tab5/
│       ├── BuildSection.tsx           # Anomaly Map 생성/재생성
│       ├── ControlBar.tsx             # Threshold 슬라이더 + 필터
│       ├── ImageGrid.tsx              # 이미지 그리드 + 페이지네이션
│       └── ExportSection.tsx          # CSV·ZIP 다운로드
│
├── hooks/
│   └── useTrainingWs.ts            # WebSocket 연결 + 메시지 디스패치
│
├── api/
│   ├── client.ts                   # Axios 인스턴스 (baseURL: localhost:8000, timeout: 30s)
│   ├── datasetApi.ts               # 데이터셋 API
│   ├── configApi.ts                # 설정·큐 API
│   ├── trainingApi.ts              # 학습 제어 API
│   ├── experimentsApi.ts           # 실험 목록·저장·삭제 API
│   └── anomalyMapApi.ts            # Anomaly Map 빌드·이미지·내보내기 API
│
├── store/
│   ├── datasetStore.ts             # 데이터셋 경로·메타 정보
│   ├── configStore.ts              # 전처리·모델 설정·디바이스 정보
│   ├── trainingStore.ts            # 학습 상태·진행·로그·Loss 히스토리
│   ├── experimentsStore.ts         # 선택된 실험 ID
│   └── anomalyMapStore.ts          # Anomaly Map Threshold
│
└── types/
    ├── dataset.ts                  # DatasetValidateResponse
    ├── config.ts                   # PreprocessingConfig, ModelConfig, QueueItem
    ├── training.ts                 # TrainingStatus, TrainingProgress, WsMessage
    ├── experiments.ts              # Experiment, ExperimentMetrics, ConfusionMatrix
    └── anomalyMap.ts               # AnomalyImage, AnomalyMapImagesResponse, AnomalyMapStatus
```

---

## API 연동

백엔드 서버 주소: `http://localhost:8000`

### 탭1 — 데이터셋

| 메서드 | 엔드포인트 | 설명 |
|--------|-----------|------|
| POST | `/api/dataset/validate` | 경로 검증 및 메타 정보 반환 |
| GET | `/api/dataset/thumbnail/{class_name}` | 클래스 대표 이미지 |

### 탭2 — 설정 및 큐

| 메서드 | 엔드포인트 | 설명 |
|--------|-----------|------|
| GET | `/api/config` | 현재 설정 및 디바이스 정보 조회 |
| POST | `/api/config` | 전처리·모델 설정 저장 |
| POST | `/api/config/preview` | Threshold 미리보기 (정상/결함 비율) |
| GET | `/api/queue` | 큐 목록 조회 |
| POST | `/api/queue` | 큐 항목 추가 |
| DELETE | `/api/queue/{id}` | 큐 항목 삭제 |

### 탭3 — 학습

| 메서드 | 엔드포인트 | 설명 |
|--------|-----------|------|
| POST | `/api/training/start` | 학습 시작 |
| POST | `/api/training/resume` | 체크포인트에서 재개 |
| POST | `/api/training/pause` | 일시정지 |
| POST | `/api/training/unpause` | 재개 |
| POST | `/api/training/stop` | 학습 중단 |
| GET | `/api/training/checkpoints` | 체크포인트 목록 |
| POST | `/api/training/batch/start` | 배치 학습 시작 |
| POST | `/api/training/batch/skip` | 현재 항목 건너뜀 |
| WS | `/ws/training` | 실시간 학습 상태 Push |

### 탭4 — 실험 히스토리

| 메서드 | 엔드포인트 | 설명 |
|--------|-----------|------|
| GET | `/api/experiments` | 전체 실험 목록 |
| POST | `/api/experiments/{id}/save` | 모델 파일 저장 |
| DELETE | `/api/experiments/{id}` | 실험 삭제 |

### 탭5 — Anomaly Map

| 메서드 | 엔드포인트 | 설명 |
|--------|-----------|------|
| GET | `/api/anomaly-map/{expId}/status` | 빌드 완료 여부 및 이미지 수 |
| POST | `/api/anomaly-map/{expId}/build` | Anomaly Map 생성 job 시작 |
| GET | `/api/anomaly-map/job/{jobId}` | job 상태 폴링 |
| GET | `/api/anomaly-map/{expId}/images` | 이미지 목록 + TP/FP/TN/FN 통계 |
| GET | `/api/anomaly-map/{expId}/image/{path}/triplet` | Triplet PNG (원본/GT마스크/Heatmap) |
| GET | `/api/anomaly-map/{expId}/export/csv` | CSV 다운로드 |
| POST | `/api/anomaly-map/{expId}/export/zip` | ZIP 생성 job 시작 |
| GET | `/api/anomaly-map/zip/{jobId}` | ZIP 다운로드 |

---

## 관련 레포지토리

- **백엔드**: `smart-qc-dashboard` — FastAPI 서버, 모델 학습/추론 로직
- **실시간 검사**: `smart-qc-vision` — 양산 검사용 React 프론트엔드
