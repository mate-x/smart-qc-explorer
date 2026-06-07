import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getExperiments } from '../api/experimentsApi';
import { getBuildStatus, buildAnomalyMap, getJobStatus, getAnomalyImages } from '../api/anomalyMapApi';
import { useExperimentsStore } from '../store/experimentsStore';
import { useAnomalyMapStore } from '../store/anomalyMapStore';
import type { Experiment } from '../types/experiments';
import type { AnomalyMapImagesResponse, AnomalyMapStatus } from '../types/anomalyMap';
import BuildSection from '../components/tab5/BuildSection';
import ControlBar from '../components/tab5/ControlBar';
import ImageGrid from '../components/tab5/ImageGrid';
import ExportSection from '../components/tab5/ExportSection';

// Streamlit Tab5와 동일한 초기 threshold 계산:
// threshold_method/threshold_value → raw threshold → min-max 정규화 → 슬라이더 초기값
function sortedPercentile(sorted: number[], p: number): number {
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (idx - lo) * (sorted[hi] - sorted[lo]);
}

function computeInitialThreshold(exp: Experiment): number {
  const scores = exp.metrics?.anomaly_scores ?? [];
  const labels = exp.metrics?.image_labels ?? [];
  if (scores.length === 0) return 0.5;

  const sMin = Math.min(...scores);
  const sMax = Math.max(...scores);
  if (sMax <= sMin) return 0.5;

  const method = exp.threshold_method ?? 'percentile';
  const value = exp.threshold_value ?? 95.0;

  let rawThr: number;
  if (method === 'absolute') {
    rawThr = value;
  } else {
    const normalSorted = scores.filter((_, i) => labels[i] === 0).sort((a, b) => a - b);
    rawThr = normalSorted.length > 0 ? sortedPercentile(normalSorted, value) : value;
  }

  return Math.round(Math.max(0, Math.min(1, (rawThr - sMin) / (sMax - sMin))) * 10000) / 10000;
}

function extractError(e: unknown): string {
  const detail = (e as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
  if (typeof detail === 'string') return detail;
  return (e as { message?: string })?.message ?? '오류가 발생했습니다.';
}

export default function Tab5AnomalyMap() {
  const navigate = useNavigate();
  const { selectedExperimentId } = useExperimentsStore();
  const { threshold: storedThreshold, setThreshold: storeThreshold } = useAnomalyMapStore();

  const [experiment, setExperiment] = useState<Experiment | null>(null);
  const [expLoading, setExpLoading] = useState(true);
  const [expError, setExpError] = useState<string | null>(null);

  const [buildStatus, setBuildStatus] = useState<AnomalyMapStatus | null>(null);
  const [building, setBuilding] = useState(false);
  const [buildError, setBuildError] = useState<string | null>(null);

  const [threshold, setLocalThreshold] = useState(storedThreshold ?? 0.5);
  const [debouncedThreshold, setDebouncedThreshold] = useState(storedThreshold ?? 0.5);
  const [selectedClass, setSelectedClass] = useState('전체');
  const [defectClasses, setDefectClasses] = useState<string[]>([]);

  const [imagesData, setImagesData] = useState<AnomalyMapImagesResponse | null>(null);
  const [imagesLoading, setImagesLoading] = useState(false);
  const [imagesError, setImagesError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  // threshold 변경 → 300ms debounce + store 동기화
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedThreshold(threshold);
      storeThreshold(threshold);
    }, 300);
    return () => clearTimeout(t);
  }, [threshold, storeThreshold]);

  // 실험 정보 로드 (selectedExperimentId가 없으면 early exit)
  useEffect(() => {
    if (!selectedExperimentId) { setExpLoading(false); return; }
    setExpLoading(true);
    setExpError(null);
    getExperiments()
      .then(res => {
        const exp = res.data.find(e => e.experiment_id === selectedExperimentId) ?? null;
        setExperiment(exp);
        // storedThreshold가 없을 때만 실험 기반 초기값 계산
        if (exp && storedThreshold == null) {
          const initTh = computeInitialThreshold(exp);
          setLocalThreshold(initTh);
          setDebouncedThreshold(initTh);
        }
      })
      .catch(e => setExpError(extractError(e)))
      .finally(() => setExpLoading(false));
  }, [selectedExperimentId]);

  // 빌드 상태 조회
  useEffect(() => {
    if (!selectedExperimentId) return;
    getBuildStatus(selectedExperimentId)
      .then(res => setBuildStatus(res.data))
      .catch(() => setBuildStatus({ built: false, image_count: 0 }));
  }, [selectedExperimentId]);

  // 이미지 로드 (빌드 완료 + threshold/class 변경 시)
  useEffect(() => {
    if (!selectedExperimentId || !buildStatus?.built) return;
    setImagesLoading(true);
    setImagesError(null);
    getAnomalyImages(
      selectedExperimentId,
      debouncedThreshold,
      selectedClass !== '전체' ? selectedClass : undefined,
    )
      .then(res => {
        setImagesData(res.data);
        setPage(1);
        if (selectedClass === '전체') {
          const unique = [...new Set(res.data.images.map(img => img.defect_class))].sort();
          setDefectClasses(unique);
        }
      })
      .catch(e => setImagesError(extractError(e)))
      .finally(() => setImagesLoading(false));
  }, [selectedExperimentId, buildStatus?.built, debouncedThreshold, selectedClass]);

  // 빌드 실행 + 완료까지 폴링
  async function handleBuild() {
    if (!selectedExperimentId) return;
    setBuilding(true);
    setBuildError(null);
    try {
      const res = await buildAnomalyMap(selectedExperimentId);
      const jobId = res.data.job_id;
      let done = false;
      while (!done) {
        await new Promise(r => setTimeout(r, 1000));
        const statusRes = await getJobStatus(jobId);
        if (statusRes.data.status === 'completed') done = true;
        else if (statusRes.data.status === 'failed')
          throw new Error(statusRes.data.error ?? '빌드 실패');
      }
      const newStatus = await getBuildStatus(selectedExperimentId);
      setBuildStatus(newStatus.data);
      // 이미지 로드는 buildStatus 변경 useEffect가 자동 처리
    } catch (e: unknown) {
      setBuildError(extractError(e));
    } finally {
      setBuilding(false);
    }
  }

  // ── 가드 및 로딩 상태 ──────────────────────────────────────────────────────

  if (!selectedExperimentId) {
    return (
      <div className="p-4 flex flex-col gap-3">
        <p className="text-sm text-gray-500">Tab4에서 실험을 선택한 후 이 탭을 사용하세요.</p>
        <button
          onClick={() => navigate('/experiments')}
          className="px-3 py-1.5 border border-gray-300 text-sm rounded hover:bg-gray-50 w-fit cursor-pointer"
        >
          ← 실험 목록으로
        </button>
      </div>
    );
  }

  if (expLoading) return <div className="p-4 text-sm text-gray-500">로딩 중...</div>;
  if (expError) return <div className="p-4 text-sm text-red-600">{expError}</div>;

  return (
    <div className="p-4 flex flex-col gap-4 overflow-auto h-full">
      {/* 헤더 */}
      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={() => navigate('/experiments')}
          className="text-xs text-blue-600 hover:underline cursor-pointer"
        >
          ← Tab4 실험 목록
        </button>
        {experiment && (
          <h2 className="text-sm font-semibold text-gray-700">
            Anomaly Map — {experiment.name}
          </h2>
        )}
      </div>

      {/* 빌드 섹션 */}
      <BuildSection
        built={buildStatus?.built ?? false}
        imageCount={buildStatus?.image_count ?? 0}
        building={building}
        buildError={buildError}
        onBuild={handleBuild}
      />

      {/* 컨트롤 + 이미지 (빌드 완료 시만) */}
      {buildStatus?.built && (
        <>
          <hr className="border-gray-200" />
          <ControlBar
            threshold={threshold}
            onThresholdChange={setLocalThreshold}
            defectClasses={defectClasses}
            selectedClass={selectedClass}
            onClassChange={setSelectedClass}
          />

          {imagesLoading ? (
            <p className="text-sm text-gray-400 animate-pulse">이미지 로딩 중...</p>
          ) : imagesError ? (
            <p className="text-sm text-red-600">{imagesError}</p>
          ) : imagesData ? (
            <>
              <ImageGrid
                imagesData={imagesData}
                expId={selectedExperimentId}
                page={page}
                onPageChange={setPage}
              />
              <hr className="border-gray-200" />
              <ExportSection
                expId={selectedExperimentId}
                threshold={debouncedThreshold}
                defectClass={selectedClass}
              />
            </>
          ) : null}
        </>
      )}
    </div>
  );
}
