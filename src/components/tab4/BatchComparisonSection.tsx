import { useState, useRef, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer,
} from 'recharts';
import type { Experiment, ExperimentMetrics } from '../../types/experiments';
import { paramSummary, fmt } from './experimentUtils';
import { COMPARE_METRICS } from './ComparisonSection';
import { useBatchCompColumnStore } from '../../store/batchCompColumnStore';

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

const CHART_COLORS = [
  '#2563eb', '#16a34a', '#dc2626', '#d97706', '#7c3aed',
  '#0891b2', '#db2777', '#65a30d', '#9333ea', '#c2410c',
];

const LEARN_COL_COUNT = 6;
const METRIC_COL_COUNT = 6;

const thCls = 'px-2 py-1.5 text-left text-xs font-semibold text-slate-500 whitespace-nowrap bg-slate-50 border-b border-slate-200';
const thGroupCls = `${thCls} cursor-pointer select-none hover:bg-slate-100 transition-colors border-l border-slate-200`;
const tdCls = 'px-2 py-1.5 text-slate-600 whitespace-nowrap border-b border-slate-100';

export default function BatchComparisonSection({ experiments }: { experiments: Experiment[] }) {
  const [filterSetId, setFilterSetId] = useState('__all__');
  const [sortBy, setSortBy] = useState<SortMetric>('AUC');
  const [chartType, setChartType] = useState<'bar' | 'radar'>('bar');
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(['Accuracy', 'F1', 'AUC']);
  const { learningOpen, metricsOpen, setLearningOpen, setMetricsOpen } = useBatchCompColumnStore();

  const groupHeaderRowRef = useRef<HTMLTableRowElement>(null);
  const [groupHeaderHeight, setGroupHeaderHeight] = useState(32);

  const batch = experiments.filter(e => e.set_id);

  const setMeta: Record<string, { count: number; date: string }> = {};
  for (const e of batch) {
    const sid = e.set_id!;
    if (!setMeta[sid]) setMeta[sid] = { count: 0, date: e.created_at.slice(0, 16) };
    setMeta[sid].count++;
  }
  const setIds = Object.keys(setMeta);

  useEffect(() => {
    if (setIds.length <= 1) setFilterSetId('__all__');
  }, [setIds.length]);

  useEffect(() => {
    const el = groupHeaderRowRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setGroupHeaderHeight(el.getBoundingClientRect().height);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  if (batch.length === 0) return null;

  const filtered =
    filterSetId === '__all__' ? batch : batch.filter(e => e.set_id === filterSetId);
  const completed = [...filtered.filter(e => e.status === 'completed')].sort((a, b) => {
    const mk = BATCH_METRIC_KEYS[sortBy];
    return (b.metrics?.[mk] ?? 0) > (a.metrics?.[mk] ?? 0) ? 1 : -1;
  });

  const chartData = completed.slice(0, 10);

  const barData = chartData.map(e => {
    const row: Record<string, string | number> = { 실험명: e.name };
    for (const { key, label } of COMPARE_METRICS)
      if (selectedMetrics.includes(label)) row[label] = e.metrics?.[key] ?? 0;
    return row;
  });

  const radarData = selectedMetrics.map(label => {
    const mk = COMPARE_METRICS.find(m => m.label === label)?.key;
    const row: Record<string, string | number> = { metric: label };
    for (const e of chartData) row[e.name] = mk ? (e.metrics?.[mk] ?? 0) : 0;
    return row;
  });

  return (
    <>
      <div className="px-5 py-4 border-b border-slate-100">
        <h3 className="text-sm font-semibold text-slate-800">배치 실험 비교</h3>
      </div>
      <div className="px-5 py-4 flex flex-col gap-2">
        <div className="flex gap-3 flex-wrap items-center">
          {setIds.length > 1 && (
            <div>
              <label className="text-xs text-slate-500 mr-1">실험 세트</label>
              <select
                value={filterSetId}
                onChange={e => setFilterSetId(e.target.value)}
                className="border border-slate-200 rounded px-2 py-1 text-xs focus:outline-none"
              >
                <option value="__all__">(전체 배치 실험)</option>
                {setIds.map(sid => (
                  <option key={sid} value={sid}>
                    {sid} ({setMeta[sid].count}개, {setMeta[sid].date})
                  </option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="text-xs text-slate-500 mr-1">정렬 기준</label>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as SortMetric)}
              className="border border-slate-200 rounded px-2 py-1 text-xs focus:outline-none"
            >
              {BATCH_SORT_METRICS.map(m => <option key={m}>{m}</option>)}
            </select>
          </div>
        </div>

        {completed.length === 0 ? (
          <p className="text-xs text-sky-600">
            완료된 배치 실험이 없습니다. (미완료/실패:{' '}
            {filtered.filter(e => e.status !== 'completed').length}개)
          </p>
        ) : (
          <>
            <div className="overflow-x-auto rounded border border-slate-200">
              <table className="text-xs border-separate border-spacing-0 min-w-full">
                <thead>
                  {/* Row 1: 그룹 헤더 */}
                  <tr ref={groupHeaderRowRef}>
                    <th rowSpan={2} className={`sticky left-0 z-30 border-r border-slate-200 ${thCls}`}>실험명</th>
                    <th
                      colSpan={learningOpen ? LEARN_COL_COUNT : 1}
                      className={thGroupCls}
                      onClick={() => setLearningOpen(!learningOpen)}
                    >
                      {learningOpen ? '▾' : '▸'} [학습설정]
                    </th>
                    <th
                      colSpan={metricsOpen ? METRIC_COL_COUNT : 1}
                      className={thGroupCls}
                      onClick={() => setMetricsOpen(!metricsOpen)}
                    >
                      {metricsOpen ? '▾' : '▸'} [메트릭]
                    </th>
                    <th rowSpan={2} className={thCls}>세트ID</th>
                    <th rowSpan={2} className={thCls}>실행시각</th>
                  </tr>
                  {/* Row 2: 컬럼 헤더 */}
                  <tr style={{ top: groupHeaderHeight }}>
                    {learningOpen ? (
                      <>
                        <th className={`sticky z-10 ${thCls}`}>모델</th>
                        <th className={`sticky z-10 ${thCls}`}>전처리</th>
                        <th className={`sticky z-10 ${thCls}`}>이미지크기</th>
                        <th className={`sticky z-10 ${thCls}`}>파라미터요약</th>
                        <th className={`sticky z-10 ${thCls}`}>Th방식</th>
                        <th className={`sticky z-10 ${thCls}`}>Th값</th>
                      </>
                    ) : (
                      <th />
                    )}
                    {metricsOpen ? (
                      <>
                        <th className={`sticky z-10 ${thCls}`}>Accuracy</th>
                        <th className={`sticky z-10 ${thCls}`}>Precision</th>
                        <th className={`sticky z-10 ${thCls}`}>Recall</th>
                        <th className={`sticky z-10 ${thCls}`}>F1</th>
                        <th className={`sticky z-10 ${thCls}`}>F2</th>
                        <th className={`sticky z-10 ${thCls}`}>AUC</th>
                      </>
                    ) : (
                      <th />
                    )}
                  </tr>
                </thead>
                <tbody>
                  {completed.map(e => (
                    <tr key={e.experiment_id} className="group hover:bg-slate-50">
                      <td className={`sticky left-0 z-[1] border-r border-slate-200 border-b border-slate-100 px-2 py-1.5 whitespace-nowrap bg-white group-hover:bg-slate-50`}>
                        {e.name}
                      </td>
                      {learningOpen ? (
                        <>
                          <td className={tdCls}>{e.model_type}</td>
                          <td className={tdCls}>{e.preprocessing_method ?? ''}</td>
                          <td className={`${tdCls} text-right`}>{e.image_size ?? ''}</td>
                          <td className={tdCls}>{paramSummary(e)}</td>
                          <td className={tdCls}>{e.threshold_method ?? ''}</td>
                          <td className={`${tdCls} text-right`}>{e.threshold_value ?? ''}</td>
                        </>
                      ) : (
                        <td className={tdCls} />
                      )}
                      {metricsOpen ? (
                        <>
                          <td className={`${tdCls} text-right`}>{fmt(e.metrics?.accuracy)}</td>
                          <td className={`${tdCls} text-right`}>{fmt(e.metrics?.precision)}</td>
                          <td className={`${tdCls} text-right`}>{fmt(e.metrics?.recall)}</td>
                          <td className={`${tdCls} text-right`}>{fmt(e.metrics?.f1_score)}</td>
                          <td className={`${tdCls} text-right`}>{fmt(e.metrics?.f2_score)}</td>
                          <td className={`${tdCls} text-right font-semibold`}>{fmt(e.metrics?.auc)}</td>
                        </>
                      ) : (
                        <td className={tdCls} />
                      )}
                      <td className={tdCls}>{e.set_id ?? ''}</td>
                      <td className={`${tdCls} whitespace-nowrap`}>{e.created_at.slice(0, 19).replace('T', ' ')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-slate-400">총 {completed.length}개 완료된 배치 실험</p>

            {completed.length > 10 && (
              <p className="text-xs text-amber-600">상위 10개만 표시됩니다.</p>
            )}

            <div className="flex flex-wrap gap-3 items-center">
              <span className="text-xs text-slate-500">메트릭:</span>
              {COMPARE_METRICS.map(({ label }) => (
                <label key={label} className="flex items-center gap-1 text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedMetrics.includes(label)}
                    onChange={() => setSelectedMetrics(prev =>
                      prev.includes(label) ? prev.filter(m => m !== label) : [...prev, label],
                    )}
                  />
                  {label}
                </label>
              ))}
            </div>

            <div className="flex gap-4 text-xs">
              {(['bar', 'radar'] as const).map(t => (
                <label key={t} className="flex items-center gap-1 cursor-pointer">
                  <input type="radio" checked={chartType === t} onChange={() => setChartType(t)} />
                  {t === 'bar' ? '막대 차트' : '레이더 차트'}
                </label>
              ))}
            </div>

            {chartData.length < 2 ? (
              <p className="text-xs text-sky-600">비교 차트를 보려면 완료된 실험이 2개 이상 필요합니다.</p>
            ) : selectedMetrics.length === 0 ? null : chartType === 'bar' ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={barData} margin={{ top: 5, right: 10, bottom: 20, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="실험명" tick={{ fontSize: 10 }} />
                  <YAxis domain={[0, 1]} tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  {selectedMetrics.map((label, i) => (
                    <Bar key={label} dataKey={label} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            ) : selectedMetrics.length < 2 ? (
              <p className="text-xs text-sky-600">레이더 차트는 메트릭을 2개 이상 선택해야 합니다.</p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11 }} />
                  <PolarRadiusAxis domain={[0, 1]} tick={{ fontSize: 9 }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  {chartData.map((e, i) => (
                    <Radar
                      key={e.experiment_id}
                      dataKey={e.name}
                      stroke={CHART_COLORS[i % CHART_COLORS.length]}
                      fill={CHART_COLORS[i % CHART_COLORS.length]}
                      fillOpacity={0.15}
                    />
                  ))}
                </RadarChart>
              </ResponsiveContainer>
            )}
          </>
        )}
      </div>
    </>
  );
}
