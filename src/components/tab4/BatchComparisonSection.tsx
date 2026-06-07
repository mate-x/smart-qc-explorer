import { useState } from 'react';
import type { Experiment, ExperimentMetrics } from '../../types/experiments';
import { paramSummary, fmt } from './experimentUtils';

const BATCH_SORT_METRICS = ['AUC', 'F1', 'F2', 'Recall', 'Precision', 'Accuracy'] as const;
type SortMetric = (typeof BATCH_SORT_METRICS)[number];

const BATCH_METRIC_KEYS: Record<SortMetric, keyof ExperimentMetrics> = {
  AUC: 'auc',
  F1: 'f1_score',
  F2: 'f2_score',
  Recall: 'recall',
  Precision: 'precision',
  Accuracy: 'accuracy',
};

export default function BatchComparisonSection({ experiments }: { experiments: Experiment[] }) {
  const batch = experiments.filter(e => e.set_id);
  if (batch.length === 0) return null;

  const [filterSetId, setFilterSetId] = useState('__all__');
  const [sortBy, setSortBy] = useState<SortMetric>('AUC');

  const setMeta: Record<string, { count: number; date: string }> = {};
  for (const e of batch) {
    const sid = e.set_id!;
    if (!setMeta[sid]) setMeta[sid] = { count: 0, date: e.created_at.slice(0, 16) };
    setMeta[sid].count++;
  }
  const setIds = Object.keys(setMeta);

  const filtered =
    filterSetId === '__all__' ? batch : batch.filter(e => e.set_id === filterSetId);
  const completed = [...filtered.filter(e => e.status === 'completed')].sort((a, b) => {
    const mk = BATCH_METRIC_KEYS[sortBy];
    return (b.metrics?.[mk] ?? 0) > (a.metrics?.[mk] ?? 0) ? 1 : -1;
  });

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-sm font-semibold text-gray-700">배치 실험 비교</h3>
      <div className="flex gap-3 flex-wrap items-center">
        <div>
          <label className="text-xs text-gray-500 mr-1">실험 세트</label>
          <select
            value={filterSetId}
            onChange={e => setFilterSetId(e.target.value)}
            className="border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none"
          >
            <option value="__all__">(전체 배치 실험)</option>
            {setIds.map(sid => (
              <option key={sid} value={sid}>
                {sid} ({setMeta[sid].count}개, {setMeta[sid].date})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500 mr-1">정렬 기준</label>
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as SortMetric)}
            className="border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none"
          >
            {BATCH_SORT_METRICS.map(m => <option key={m}>{m}</option>)}
          </select>
        </div>
      </div>

      {completed.length === 0 ? (
        <p className="text-xs text-blue-600">
          완료된 배치 실험이 없습니다. (미완료/실패:{' '}
          {filtered.filter(e => e.status !== 'completed').length}개)
        </p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="text-xs border-collapse min-w-full">
              <thead>
                <tr className="bg-gray-100">
                  {['실험명','세트ID','모델','전처리','이미지크기','파라미터요약',
                    'Th방식','Th값','Accuracy','Precision','Recall','F1','F2','AUC','실행시각'].map(h => (
                    <th
                      key={h}
                      className="border border-gray-200 px-2 py-1.5 text-left whitespace-nowrap font-medium"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {completed.map(e => (
                  <tr key={e.experiment_id} className="hover:bg-gray-50">
                    <td className="border border-gray-200 px-2 py-1.5 whitespace-nowrap">{e.name}</td>
                    <td className="border border-gray-200 px-2 py-1.5 whitespace-nowrap">{e.set_id ?? ''}</td>
                    <td className="border border-gray-200 px-2 py-1.5">{e.model_type}</td>
                    <td className="border border-gray-200 px-2 py-1.5">{e.preprocessing_method ?? ''}</td>
                    <td className="border border-gray-200 px-2 py-1.5 text-right">{e.image_size ?? ''}</td>
                    <td className="border border-gray-200 px-2 py-1.5">{paramSummary(e)}</td>
                    <td className="border border-gray-200 px-2 py-1.5">{e.threshold_method ?? ''}</td>
                    <td className="border border-gray-200 px-2 py-1.5 text-right">{e.threshold_value ?? ''}</td>
                    <td className="border border-gray-200 px-2 py-1.5 text-right">{fmt(e.metrics?.accuracy)}</td>
                    <td className="border border-gray-200 px-2 py-1.5 text-right">{fmt(e.metrics?.precision)}</td>
                    <td className="border border-gray-200 px-2 py-1.5 text-right">{fmt(e.metrics?.recall)}</td>
                    <td className="border border-gray-200 px-2 py-1.5 text-right">{fmt(e.metrics?.f1_score)}</td>
                    <td className="border border-gray-200 px-2 py-1.5 text-right">{fmt(e.metrics?.f2_score)}</td>
                    <td className="border border-gray-200 px-2 py-1.5 text-right font-semibold">{fmt(e.metrics?.auc)}</td>
                    <td className="border border-gray-200 px-2 py-1.5 whitespace-nowrap">
                      {e.created_at.slice(0, 19).replace('T', ' ')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-400">총 {completed.length}개 완료된 배치 실험</p>
        </>
      )}
    </div>
  );
}
