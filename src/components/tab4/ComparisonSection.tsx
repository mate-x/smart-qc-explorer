import { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer,
} from 'recharts';
import type { Experiment } from '../../types/experiments';

export type NumericMetricKey = 'accuracy' | 'precision' | 'recall' | 'f1_score' | 'f2_score' | 'auc';

export const COMPARE_METRICS: { key: NumericMetricKey; label: string }[] = [
  { key: 'accuracy', label: 'Accuracy' },
  { key: 'precision', label: 'Precision' },
  { key: 'recall', label: 'Recall' },
  { key: 'f1_score', label: 'F1' },
  { key: 'f2_score', label: 'F2' },
  { key: 'auc', label: 'AUC' },
];

const CHART_COLORS = [
  '#2563eb', '#16a34a', '#dc2626', '#d97706', '#7c3aed',
  '#0891b2', '#db2777', '#65a30d', '#9333ea', '#c2410c',
];

export default function ComparisonSection({ completed }: { completed: Experiment[] }) {
  const [open, setOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(['Accuracy', 'F1', 'AUC']);
  const [chartType, setChartType] = useState<'bar' | 'radar'>('bar');

  const toggleId = (id: string) =>
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const toggleMetric = (label: string) =>
    setSelectedMetrics(prev =>
      prev.includes(label) ? prev.filter(m => m !== label) : [...prev, label],
    );

  const selected = completed.filter(e => selectedIds.has(e.experiment_id)).slice(0, 10);

  const barData = selected.map(e => {
    const row: Record<string, string | number> = { 실험명: e.name };
    for (const { key, label } of COMPARE_METRICS)
      if (selectedMetrics.includes(label)) row[label] = e.metrics?.[key] ?? 0;
    return row;
  });

  const radarData = selectedMetrics.map(label => {
    const mk = COMPARE_METRICS.find(m => m.label === label)?.key;
    const row: Record<string, string | number> = { metric: label };
    for (const e of selected) row[e.name] = mk ? (e.metrics?.[mk] ?? 0) : 0;
    return row;
  });

  return (
    <>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 border-b border-slate-100 text-sm font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
      >
        <span>다중 실험 비교 차트</span>
        <span className="text-slate-400 text-xs">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="px-5 pb-5 pt-3 flex flex-col gap-3">
          <p className="text-xs text-slate-500">비교할 실험을 선택하세요 (최대 10개)</p>
          <div className="flex flex-wrap gap-3">
            {completed.map(e => (
              <label key={e.experiment_id} className="flex items-center gap-1 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedIds.has(e.experiment_id)}
                  onChange={() => toggleId(e.experiment_id)}
                />
                {e.name}
              </label>
            ))}
          </div>

          <div className="flex flex-wrap gap-3 items-center">
            <span className="text-xs text-slate-500">메트릭:</span>
            {COMPARE_METRICS.map(({ label }) => (
              <label key={label} className="flex items-center gap-1 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedMetrics.includes(label)}
                  onChange={() => toggleMetric(label)}
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

          {selected.length < 2 ? (
            <p className="text-xs text-sky-600">비교 차트를 보려면 실험을 2개 이상 선택하세요.</p>
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
                {selected.map((e, i) => (
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
        </div>
      )}
    </>
  );
}
