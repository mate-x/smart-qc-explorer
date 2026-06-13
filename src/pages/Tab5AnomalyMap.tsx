import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getExperiments } from '../api/experimentsApi';
import { getBuildStatus, getAnomalyImages } from '../api/anomalyMapApi';
import { useExperimentsStore } from '../store/experimentsStore';
import { useAnomalyMapStore } from '../store/anomalyMapStore';
import type { Experiment } from '../types/experiments';
import type { AnomalyMapImagesResponse, AnomalyMapStatus } from '../types/anomalyMap';
import { computeInitialThreshold } from '../utils/thresholdUtils';
import ImageGrid from '../components/tab5/ImageGrid';
import ExportSection from '../components/tab5/ExportSection';

function extractError(e: unknown): string {
  const detail = (e as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
  if (typeof detail === 'string') return detail;
  return (e as { message?: string })?.message ?? '오류가 발생했습니다.';
}

export default function Tab5AnomalyMap() {
  const navigate = useNavigate();
  const { selectedExperimentId } = useExperimentsStore();
  const { threshold: storedThreshold } = useAnomalyMapStore();

  const [experiment, setExperiment] = useState<Experiment | null>(null);
  const [expLoading, setExpLoading] = useState(true);
  const [expError, setExpError] = useState<string | null>(null);

  const [buildStatus, setBuildStatus] = useState<AnomalyMapStatus | null>(null);

  const [selectedClass, setSelectedClass] = useState('전체');
  const [defectClasses, setDefectClasses] = useState<string[]>([]);

  const [imagesData, setImagesData] = useState<AnomalyMapImagesResponse | null>(null);
  const [imagesLoading, setImagesLoading] = useState(false);
  const [imagesError, setImagesError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  // threshold: Tab4에서 store에 저장한 값 우선, 없으면 experiment 기반 계산
  const threshold = storedThreshold ?? (experiment ? computeInitialThreshold(experiment) : 0.5);

  useEffect(() => {
    if (!selectedExperimentId) { setExpLoading(false); return; }
    setExpLoading(true);
    setExpError(null);
    getExperiments()
      .then(res => {
        const exp = res.data.find(e => e.experiment_id === selectedExperimentId) ?? null;
        setExperiment(exp);
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
      threshold,
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
    // threshold는 Tab4 navigate 시점에 고정 — deps에서 제외
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedExperimentId, buildStatus?.built, selectedClass]);

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
        {experiment && (
          <span className="text-xs text-slate-400 font-mono">
            threshold: {threshold.toFixed(4)}
          </span>
        )}
      </div>

      {/* Anomaly Map 미생성 안내 */}
      {buildStatus && !buildStatus.built && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-10 flex flex-col items-center gap-4">
          <p className="text-sm text-slate-500">Anomaly Map이 생성되지 않았습니다.</p>
          <button
            onClick={() => navigate('/experiments')}
            className="px-5 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-sm font-medium rounded-lg transition-colors cursor-pointer"
          >
            ← 실험 히스토리에서 생성하기
          </button>
        </div>
      )}

      {/* 결함 유형 필터 + 이미지 그리드 (단일 카드) */}
      {buildStatus?.built && (
        <>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col gap-4">
            {defectClasses.length > 0 && (
              <div className="flex items-center gap-2">
                <label className="text-xs font-medium text-gray-600 whitespace-nowrap">결함 유형</label>
                <select
                  value={selectedClass}
                  onChange={e => setSelectedClass(e.target.value)}
                  className="border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none"
                >
                  <option value="전체">전체</option>
                  {defectClasses.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            )}

            {imagesLoading ? (
              <p className="text-sm text-slate-400 animate-pulse">이미지 로딩 중...</p>
            ) : imagesError ? (
              <div className="flex flex-col items-start gap-3">
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3 w-full">{imagesError}</p>
                <button
                  onClick={() => navigate('/experiments')}
                  className="px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-sm font-medium rounded-lg transition-colors cursor-pointer"
                >
                  ← 실험 히스토리에서 재생성하기
                </button>
              </div>
            ) : imagesData ? (
              <ImageGrid
                imagesData={imagesData}
                expId={selectedExperimentId}
                threshold={threshold}
                page={page}
                onPageChange={setPage}
              />
            ) : null}
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <ExportSection
              expId={selectedExperimentId}
              threshold={threshold}
              defectClass={selectedClass}
            />
          </div>
        </>
      )}
    </div>
  );
}
