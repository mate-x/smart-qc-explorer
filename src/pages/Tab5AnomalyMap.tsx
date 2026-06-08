import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getExperiments } from '../api/experimentsApi';
import { getBuildStatus, buildAnomalyMap, getJobStatus, getAnomalyImages } from '../api/anomalyMapApi';
import { useExperimentsStore } from '../store/experimentsStore';
import { useAnomalyMapStore } from '../store/anomalyMapStore';
import type { Experiment } from '../types/experiments';
import type { AnomalyMapImagesResponse, AnomalyMapStatus } from '../types/anomalyMap';
import ControlBar from '../components/tab5/ControlBar';
import ImageGrid from '../components/tab5/ImageGrid';
import ExportSection from '../components/tab5/ExportSection';

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

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedThreshold(threshold);
      storeThreshold(threshold);
    }, 300);
    return () => clearTimeout(t);
  }, [threshold, storeThreshold]);

  useEffect(() => {
    if (!selectedExperimentId) { setExpLoading(false); return; }
    setExpLoading(true);
    setExpError(null);
    getExperiments()
      .then(res => {
        const exp = res.data.find(e => e.experiment_id === selectedExperimentId) ?? null;
        setExperiment(exp);
        if (exp && storedThreshold == null) {
          const initTh = computeInitialThreshold(exp);
          setLocalThreshold(initTh);
          setDebouncedThreshold(initTh);
        }
      })
      .catch(e => setExpError(extractError(e)))
      .finally(() => setExpLoading(false));
  }, [selectedExperimentId]);

  useEffect(() => {
    if (!selectedExperimentId) return;
    getBuildStatus(selectedExperimentId)
      .then(res => setBuildStatus(res.data))
      .catch(() => setBuildStatus({ built: false, image_count: 0 }));
  }, [selectedExperimentId]);

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
    } catch (e: unknown) {
      setBuildError(extractError(e));
    } finally {
      setBuilding(false);
    }
  }

  // 실험 미선택 빈 상태
  if (!selectedExperimentId) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-10 flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-xl">🗺️</div>
        <div className="text-center">
          <p className="text-sm font-medium text-slate-700">실험을 먼저 선택해 주세요</p>
          <p className="text-xs text-slate-400 mt-1">실험 히스토리 탭에서 분석할 실험을 선택하면 Anomaly Map을 볼 수 있습니다.</p>
        </div>
        <button
          onClick={() => navigate('/experiments')}
          className="px-5 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-sm font-medium rounded-lg transition-colors cursor-pointer"
        >
          ← 실험 히스토리로
        </button>
      </div>
    );
  }

  if (expLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <span className="text-sm text-slate-400 animate-pulse">로딩 중...</span>
      </div>
    );
  }
  if (expError) {
    return <div className="bg-red-50 border border-red-200 rounded-2xl p-5 text-sm text-red-600">{expError}</div>;
  }

  return (
    <div className="flex flex-col gap-5">
      {/* 헤더 */}
      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={() => navigate('/experiments')}
          className="text-xs text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
        >
          ← 실험 히스토리
        </button>
        {experiment && (
          <span className="text-sm font-semibold text-slate-800">
            Anomaly Map — {experiment.name}
          </span>
        )}
      </div>

      {/* 빌드 섹션 */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <div className="flex items-center gap-4 flex-wrap">
          {buildStatus?.built ? (
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-sm font-medium text-slate-700">
                Anomaly Map 생성 완료
                <span className="ml-2 text-xs text-slate-400 font-normal">({buildStatus.image_count}개 이미지)</span>
              </span>
            </div>
          ) : (
            <span className="text-sm text-slate-500">Anomaly Map이 아직 생성되지 않았습니다.</span>
          )}
          <div className="flex-1" />
          <button
            onClick={handleBuild}
            disabled={building}
            className="px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white text-sm font-medium rounded-lg disabled:opacity-40 whitespace-nowrap transition-colors cursor-pointer"
          >
            {building ? '생성 중...' : buildStatus?.built ? '재생성' : 'Anomaly Map 생성'}
          </button>
          {building && (
            <span className="text-xs text-slate-400 animate-pulse">모델 추론 중, 잠시 기다려 주세요...</span>
          )}
        </div>
        {buildError && (
          <p className="mt-3 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{buildError}</p>
        )}
      </div>

      {/* 컨트롤 + 이미지 */}
      {buildStatus?.built && (
        <>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <ControlBar
              threshold={threshold}
              onThresholdChange={setLocalThreshold}
              defectClasses={defectClasses}
              selectedClass={selectedClass}
              onClassChange={setSelectedClass}
            />
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            {imagesLoading ? (
              <p className="text-sm text-slate-400 animate-pulse">이미지 로딩 중...</p>
            ) : imagesError ? (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{imagesError}</p>
            ) : imagesData ? (
              <ImageGrid
                imagesData={imagesData}
                expId={selectedExperimentId}
                page={page}
                onPageChange={setPage}
              />
            ) : null}
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <ExportSection
              expId={selectedExperimentId}
              threshold={debouncedThreshold}
              defectClass={selectedClass}
            />
          </div>
        </>
      )}
    </div>
  );
}
