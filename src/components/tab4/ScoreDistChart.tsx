import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine, ResponsiveContainer,
} from 'recharts';
import type { ExperimentMetrics } from '../../types/experiments';

function scoreDistBins(
  scores: number[],
  labels: number[],
  nBins = 20,
): { bin: number; 정상: number; 결함: number }[] {
  if (scores.length === 0) return [];
  const min = Math.min(...scores);
  const max = Math.max(...scores);
  const norm = scores.map(s => max > min ? (s - min) / (max - min) : 0);

  const bins = Array.from({ length: nBins }, (_, i) => ({
    bin: +((i + 0.5) / nBins).toFixed(3),
    정상: 0,
    결함: 0,
  }));
  norm.forEach((s, i) => {
    const idx = Math.min(Math.floor(s * nBins), nBins - 1);
    if (labels[i] === 0) bins[idx]['정상']++;
    else bins[idx]['결함']++;
  });
  return bins;
}

export default function ScoreDistChart({
  metrics,
  thresholdValue,
  onThresholdChange,
}: {
  metrics: ExperimentMetrics;
  thresholdValue?: number;
  onThresholdChange?: (normalizedTh: number) => void;
}) {
  const scores = metrics.anomaly_scores ?? [];
  const labels = metrics.image_labels ?? [];

  if (scores.length === 0) return <p className="text-xs text-gray-400">Score 데이터 없음</p>;

  const bins = scoreDistBins(scores, labels);
  // thresholdValue는 normalized(0~1) 기준으로 직접 사용
  const normTh = thresholdValue ?? null;

  return (
    <div>
      <p className="text-xs font-semibold text-gray-600 mb-1 text-center">
        Anomaly Score 분포 (Min-Max 정규화)
      </p>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={bins} margin={{ top: 5, right: 10, bottom: 20, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="bin"
            type="number"
            domain={[0, 1]}
            label={{ value: 'Score (0~1)', position: 'insideBottom', offset: -10 }}
            tick={{ fontSize: 10 }}
          />
          <YAxis tick={{ fontSize: 10 }} />
          <Tooltip />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Bar dataKey="정상" fill="#3b82f6" opacity={0.7} />
          <Bar dataKey="결함" fill="#ef4444" opacity={0.7} />
          {normTh != null && (
            <ReferenceLine
              x={+normTh.toFixed(3)}
              stroke="red"
              strokeDasharray="4 4"
              label={{ value: `th=${normTh.toFixed(3)}`, fontSize: 10, fill: 'red' }}
            />
          )}
        </BarChart>
      </ResponsiveContainer>
      {onThresholdChange && normTh != null && (
        <div className="flex items-center gap-2 mt-2 px-1">
          <label className="text-xs text-gray-500 whitespace-nowrap">Threshold</label>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={normTh}
            onChange={e => onThresholdChange(parseFloat(e.target.value))}
            className="flex-1"
          />
          <span className="text-xs font-mono text-gray-700 w-10 text-right">
            {normTh.toFixed(2)}
          </span>
        </div>
      )}
    </div>
  );
}
