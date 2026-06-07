import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getExperiments, deleteExperiment, saveExperiment } from '../api/experimentsApi';
import { useExperimentsStore } from '../store/experimentsStore';
import type { Experiment } from '../types/experiments';
import { paramSummary, fmt } from '../components/tab4/experimentUtils';
import ConfusionMatrixChart from '../components/tab4/ConfusionMatrixChart';
import RocCurveChart from '../components/tab4/RocCurveChart';
import ScoreDistChart from '../components/tab4/ScoreDistChart';
import ComparisonSection from '../components/tab4/ComparisonSection';
import BatchComparisonSection from '../components/tab4/BatchComparisonSection';

export default function Tab4Experiments() {
  const navigate = useNavigate();
  const { selectedExperimentId, setSelectedExperimentId } = useExperimentsStore();

  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [savePath, setSavePath] = useState('');
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveResult, setSaveResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const selected = experiments.find(e => e.experiment_id === selectedExperimentId) ?? null;
  const completed = experiments.filter(e => e.status === 'completed');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getExperiments();
      setExperiments(res.data);
    } catch (e: unknown) {
      setError((e as { message?: string })?.message ?? '실험 목록 로드 실패');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleDelete() {
    if (!selected) return;
    setDeleteError(null);
    try {
      await deleteExperiment(selected.experiment_id);
      setSelectedExperimentId(null);
      setConfirmDelete(false);
      load();
    } catch (e: unknown) {
      const detail = (e as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
      setDeleteError(
        typeof detail === 'string' ? detail : (e as { message?: string })?.message ?? '삭제 실패',
      );
    }
  }

  async function handleSave() {
    if (!selected || !savePath.trim()) return;
    setSaveLoading(true);
    setSaveResult(null);
    try {
      const res = await saveExperiment(selected.experiment_id, savePath.trim());
      const { saved_path, size_mb, warning } = res.data;
      setSaveResult({
        ok: true,
        msg: `저장 완료 — ${saved_path} (${size_mb} MB)${warning ? `\n⚠️ ${warning}` : ''}`,
      });
    } catch (e: unknown) {
      const detail = (e as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
      setSaveResult({
        ok: false,
        msg: typeof detail === 'string' ? detail : (e as { message?: string })?.message ?? '저장 실패',
      });
    } finally {
      setSaveLoading(false);
    }
  }

  useEffect(() => {
    if (selected?.model_path) setSavePath(selected.model_path);
    else if (selected) setSavePath(`./models/${selected.experiment_id}/`);
    setSaveResult(null);
  }, [selected?.experiment_id]);

  if (loading) return <div className="p-4 text-sm text-gray-500">로딩 중...</div>;
  if (error) return <div className="p-4 text-red-600 text-sm">{error}</div>;
  if (experiments.length === 0)
    return <div className="p-4 text-sm text-gray-500">실험 기록이 없습니다.</div>;

  return (
    <div className="p-4 flex flex-col gap-4 overflow-auto h-full">
      {/* ── 실험 목록 테이블 ── */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-gray-100">
              {['실험명','검사 제품','모델','파라미터 요약','Accuracy','Precision','Recall',
                'F1','F2','AUC','실행 시각','상태'].map(h => (
                <th
                  key={h}
                  className="border border-gray-200 px-2 py-1.5 text-left font-medium whitespace-nowrap"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {experiments.map(e => {
              const isSelected = e.experiment_id === selectedExperimentId;
              const isDimmed = e.status === '중단';
              const m = e.metrics;
              const isCompleted = e.status === 'completed';
              return (
                <tr
                  key={e.experiment_id}
                  onClick={() => setSelectedExperimentId(isSelected ? null : e.experiment_id)}
                  className={`cursor-pointer hover:bg-blue-50 ${isSelected ? 'bg-blue-100' : ''} ${isDimmed ? 'text-gray-400' : ''}`}
                >
                  <td className="border border-gray-200 px-2 py-1.5 whitespace-nowrap">{e.name}</td>
                  <td className="border border-gray-200 px-2 py-1.5">{e.product_name || '(없음)'}</td>
                  <td className="border border-gray-200 px-2 py-1.5">{e.model_type}</td>
                  <td className="border border-gray-200 px-2 py-1.5 whitespace-nowrap">{paramSummary(e)}</td>
                  <td className="border border-gray-200 px-2 py-1.5 text-right">{isCompleted ? fmt(m?.accuracy) : '—'}</td>
                  <td className="border border-gray-200 px-2 py-1.5 text-right">{isCompleted ? fmt(m?.precision) : '—'}</td>
                  <td className="border border-gray-200 px-2 py-1.5 text-right">{isCompleted ? fmt(m?.recall) : '—'}</td>
                  <td className="border border-gray-200 px-2 py-1.5 text-right">{isCompleted ? fmt(m?.f1_score) : '—'}</td>
                  <td className="border border-gray-200 px-2 py-1.5 text-right">{isCompleted ? fmt(m?.f2_score) : '—'}</td>
                  <td className="border border-gray-200 px-2 py-1.5 text-right font-semibold">{isCompleted ? fmt(m?.auc) : '—'}</td>
                  <td className="border border-gray-200 px-2 py-1.5 whitespace-nowrap">
                    {e.created_at.slice(0, 19).replace('T', ' ')}
                  </td>
                  <td className="border border-gray-200 px-2 py-1.5">{e.status}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── 삭제 버튼 ── */}
      <div>
        {confirmDelete && selected ? (
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm text-yellow-700">삭제 후 복구할 수 없습니다. 계속하시겠습니까?</p>
            <button
              onClick={handleDelete}
              className="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 cursor-pointer"
            >
              확인
            </button>
            <button
              onClick={() => { setConfirmDelete(false); setDeleteError(null); }}
              className="px-3 py-1 border border-gray-300 text-xs rounded hover:bg-gray-50 cursor-pointer"
            >
              취소
            </button>
            {deleteError && <p className="text-xs text-red-600">{deleteError}</p>}
          </div>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            disabled={!selected}
            className="px-3 py-1.5 border border-gray-300 text-sm rounded hover:bg-gray-50 disabled:opacity-40 cursor-pointer"
          >
            🗑 실험 삭제
          </button>
        )}
      </div>

      {/* ── 상세 결과 (completed 실험만) ── */}
      {selected?.status === 'completed' && selected.metrics && (
        <>
          <hr className="border-gray-200" />
          <div className="flex flex-col gap-4">
            <h3 className="text-sm font-semibold text-gray-700">상세 결과 — {selected.name}</h3>

            {/* 지표 카드 */}
            <div className="grid grid-cols-4 gap-3">
              {([
                { label: 'Accuracy', value: selected.metrics.accuracy },
                { label: 'Precision', value: selected.metrics.precision },
                { label: 'Recall', value: selected.metrics.recall },
                { label: 'F1', value: selected.metrics.f1_score },
              ] as const).map(({ label, value }) => (
                <div key={label} className="border border-gray-200 rounded p-3 text-center bg-white">
                  <p className="text-xs text-gray-500">{label}</p>
                  <p className="text-xl font-bold text-gray-800">
                    {value != null ? value.toFixed(4) : '—'}
                  </p>
                </div>
              ))}
            </div>

            {/* 3열 차트 */}
            <div className="grid grid-cols-3 gap-4">
              <ConfusionMatrixChart metrics={selected.metrics} />
              <RocCurveChart metrics={selected.metrics} />
              <ScoreDistChart metrics={selected.metrics} thresholdValue={selected.threshold_value} />
            </div>

            {/* Tab5 이동 버튼 */}
            <div>
              <button
                onClick={() => navigate('/anomaly-map')}
                className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 cursor-pointer"
              >
                이 실험으로 Anomaly Map 보기 →
              </button>
            </div>
          </div>

          {/* ── 모델 저장 ── */}
          <hr className="border-gray-200" />
          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold text-gray-700">모델 저장</h3>
            <div className="flex gap-2 items-center">
              <input
                type="text"
                value={savePath}
                onChange={e => setSavePath(e.target.value)}
                placeholder="저장 경로 (예: ./models/my_model/)"
                className="flex-1 border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-blue-400"
              />
              <button
                onClick={handleSave}
                disabled={saveLoading || !savePath.trim()}
                className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50 whitespace-nowrap cursor-pointer"
              >
                {saveLoading ? '저장 중...' : '💾 모델 저장'}
              </button>
            </div>
            {saveResult && (
              <p className={`text-xs whitespace-pre-wrap ${saveResult.ok ? 'text-green-700' : 'text-red-600'}`}>
                {saveResult.msg}
              </p>
            )}
          </div>
        </>
      )}

      {/* ── 다중 실험 비교 차트 ── */}
      {completed.length >= 2 && (
        <>
          <hr className="border-gray-200" />
          <ComparisonSection completed={completed} />
        </>
      )}

      {/* ── 배치 실험 비교 테이블 ── */}
      {experiments.some(e => e.set_id) && (
        <>
          <hr className="border-gray-200" />
          <BatchComparisonSection experiments={experiments} />
        </>
      )}
    </div>
  );
}
