import { useState, useEffect, useCallback, useMemo } from 'react';
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
  const [savePath, setSavePath] = useState('');
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveResult, setSaveResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const selected = experiments.find(e => e.experiment_id === selectedExperimentId) ?? null;
  const completed = experiments.filter(e => e.status === 'completed');

  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  function handleSort(col: string) {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('desc'); }
  }

  const sortedExperiments = useMemo(() => {
    if (!sortCol) return experiments;
    return [...experiments].sort((a, b) => {
      let av: unknown, bv: unknown;
      switch (sortCol) {
        case '실험명':    av = a.name;               bv = b.name;               break;
        case '제품':      av = a.product_name ?? ''; bv = b.product_name ?? ''; break;
        case '모델':      av = a.model_type;         bv = b.model_type;         break;
        case '파라미터':  av = paramSummary(a);      bv = paramSummary(b);      break;
        case 'Accuracy':  av = a.metrics?.accuracy;  bv = b.metrics?.accuracy;  break;
        case 'Precision': av = a.metrics?.precision; bv = b.metrics?.precision; break;
        case 'Recall':    av = a.metrics?.recall;    bv = b.metrics?.recall;    break;
        case 'F1':        av = a.metrics?.f1_score;  bv = b.metrics?.f1_score;  break;
        case 'F2':        av = a.metrics?.f2_score;  bv = b.metrics?.f2_score;  break;
        case 'AUC':       av = a.metrics?.auc;       bv = b.metrics?.auc;       break;
        case '실행 시각': av = a.created_at;         bv = b.created_at;         break;
        case '상태':      av = a.status;             bv = b.status;             break;
        default: return 0;
      }
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      const cmp = typeof av === 'number' && typeof bv === 'number'
        ? av - bv
        : String(av).localeCompare(String(bv));
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [experiments, sortCol, sortDir]);

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

  async function handleDeleteRow(expId: string) {
    try {
      await deleteExperiment(expId);
      if (selectedExperimentId === expId) setSelectedExperimentId(null);
      load();
    } catch { /* silent */ }
  }

  async function handleSave() {
    if (!selected || !savePath.trim()) return;
    setSaveLoading(true);
    setSaveResult(null);
    try {
      const res = await saveExperiment(selected.experiment_id, savePath.trim());
      const { saved_path, size_mb, warning } = res.data;
      setSaveResult({ ok: true, msg: `저장 완료 — ${saved_path} (${size_mb} MB)${warning ? `\n⚠️ ${warning}` : ''}` });
    } catch (e: unknown) {
      const detail = (e as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
      setSaveResult({ ok: false, msg: typeof detail === 'string' ? detail : (e as { message?: string })?.message ?? '저장 실패' });
    } finally {
      setSaveLoading(false);
    }
  }

  useEffect(() => {
    if (selected?.model_path) setSavePath(selected.model_path);
    else if (selected) setSavePath(`./models/${selected.experiment_id}/`);
    setSaveResult(null);
  }, [selected?.experiment_id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <span className="text-sm text-slate-400 animate-pulse">실험 목록 로딩 중...</span>
      </div>
    );
  }
  if (error) return <div className="bg-red-50 border border-red-200 rounded-2xl p-5 text-sm text-red-600">{error}</div>;
  if (experiments.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-10 flex flex-col items-center gap-3">
        <p className="text-sm font-medium text-slate-500">실험 기록이 없습니다</p>
        <p className="text-xs text-slate-400">학습 탭에서 학습을 실행하면 여기에 표시됩니다.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {/* 실험 목록 테이블 */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-800">실험 목록</h2>
        </div>
        <div className="overflow-x-auto overflow-y-auto max-h-[260px]">
          <table className="w-full text-xs">
            <thead className="sticky top-0 z-10">
              <tr className="bg-slate-50 border-b border-slate-200">
                {['제품', '실험명', '모델', '파라미터', 'Accuracy', 'Precision', 'Recall', 'F1', 'F2', 'AUC', '실행 시각', '상태'].map(h => (
                  <th key={h} onClick={() => handleSort(h)} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 whitespace-nowrap cursor-pointer select-none hover:text-slate-700">
                    {h}{sortCol === h && <span className="ml-1 text-sky-500">{sortDir === 'asc' ? '↑' : '↓'}</span>}
                  </th>
                ))}
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedExperiments.map(e => {
                const isSelected = e.experiment_id === selectedExperimentId;
                const isDimmed = e.status === '중단';
                const m = e.metrics;
                const isCompleted = e.status === 'completed';
                return (
                  <tr
                    key={e.experiment_id}
                    onClick={() => setSelectedExperimentId(isSelected ? null : e.experiment_id)}
                    className={`cursor-pointer transition-colors ${isSelected ? 'bg-sky-50' : 'hover:bg-slate-50'} ${isDimmed ? 'opacity-50' : ''}`}
                  >
                    <td className="px-4 py-3 text-slate-500">{e.product_name || '—'}</td>
                    <td className="px-4 py-3 font-medium text-slate-800 whitespace-nowrap">{e.name}</td>
                    <td className="px-4 py-3 text-slate-600">{e.model_type}</td>
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{paramSummary(e)}</td>
                    <td className="px-4 py-3 text-right font-mono text-slate-700">{isCompleted ? fmt(m?.accuracy) : '—'}</td>
                    <td className="px-4 py-3 text-right font-mono text-slate-700">{isCompleted ? fmt(m?.precision) : '—'}</td>
                    <td className="px-4 py-3 text-right font-mono text-slate-700">{isCompleted ? fmt(m?.recall) : '—'}</td>
                    <td className="px-4 py-3 text-right font-mono text-slate-700">{isCompleted ? fmt(m?.f1_score) : '—'}</td>
                    <td className="px-4 py-3 text-right font-mono text-slate-700">{isCompleted ? fmt(m?.f2_score) : '—'}</td>
                    <td className="px-4 py-3 text-right font-mono font-semibold text-slate-800">{isCompleted ? fmt(m?.auc) : '—'}</td>
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{e.created_at.slice(0, 19).replace('T', ' ')}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        e.status === 'completed' ? 'bg-emerald-100 text-emerald-700'
                        : e.status === '중단' ? 'bg-slate-100 text-slate-500'
                        : 'bg-slate-100 text-slate-500'
                      }`}>
                        {e.status === 'completed' ? (e.early_stopped ? '완료 (조기종료)' : '완료') : e.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={ev => { ev.stopPropagation(); handleDeleteRow(e.experiment_id); }}
                        className="text-slate-300 hover:text-red-400 cursor-pointer transition-colors"
                      >
                        삭제
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 상세 결과 */}
      {selected?.status === 'completed' && selected.metrics && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col gap-6">
          <h3 className="text-sm font-semibold text-slate-800">상세 결과 — {selected.name}</h3>

          {/* 지표 카드 */}
          <div className="grid grid-cols-4 gap-4">
            {([
              { label: 'Accuracy', value: selected.metrics.accuracy },
              { label: 'Precision', value: selected.metrics.precision },
              { label: 'Recall', value: selected.metrics.recall },
              { label: 'F1 Score', value: selected.metrics.f1_score },
            ] as const).map(({ label, value }) => (
              <div key={label} className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center">
                <p className="text-xs font-medium text-slate-500 mb-1">{label}</p>
                <p className="text-2xl font-bold text-slate-900">{value != null ? value.toFixed(4) : '—'}</p>
              </div>
            ))}
          </div>

          {/* 차트 3열 */}
          <div className="grid grid-cols-3 gap-4">
            <ConfusionMatrixChart metrics={selected.metrics} />
            <RocCurveChart metrics={selected.metrics} />
            <ScoreDistChart metrics={selected.metrics} thresholdValue={selected.threshold_value} />
          </div>

          {/* Tab5 이동 */}
          <div>
            <button
              onClick={() => navigate('/anomaly-map')}
              className="px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white text-sm font-medium rounded-lg transition-colors cursor-pointer"
            >
              이 실험으로 Anomaly Map 보기
            </button>
          </div>
        </div>
      )}

      {/* 모델 저장 */}
      {selected?.status === 'completed' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col gap-3">
          <h3 className="text-sm font-semibold text-slate-800">모델 저장</h3>
          <div className="flex gap-2">
            <input
              type="text"
              value={savePath}
              onChange={e => setSavePath(e.target.value)}
              placeholder="저장 경로 (예: ./models/my_model/)"
              className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-400 transition-shadow"
            />
            <button
              onClick={handleSave}
              disabled={saveLoading || !savePath.trim()}
              className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white text-sm font-medium rounded-lg disabled:opacity-40 whitespace-nowrap transition-colors cursor-pointer"
            >
              {saveLoading ? '저장 중...' : '모델 저장'}
            </button>
          </div>
          {saveResult && (
            <p className={`text-xs whitespace-pre-wrap px-3 py-2 rounded-lg border ${saveResult.ok ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-600'}`}>
              {saveResult.msg}
            </p>
          )}
        </div>
      )}

      {/* 다중 실험 비교 */}
      {completed.length >= 2 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <ComparisonSection completed={completed} />
        </div>
      )}

      {/* 배치 실험 비교 */}
      {experiments.some(e => e.set_id) && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <BatchComparisonSection experiments={experiments} />
        </div>
      )}
    </div>
  );
}
