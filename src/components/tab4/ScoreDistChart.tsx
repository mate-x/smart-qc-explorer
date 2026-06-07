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

function normThreshold(scores: number[], threshold: number): number | null {
  if (scores.length === 0) return null;
  const min = Math.min(...scores);
  const max = Math.max(...scores);
  if (max <= min) return null;
  return (threshold - min) / (max - min);
}

export default function ScoreDistChart({
  metrics,
  thresholdValue,
}: {
  metrics: ExperimentMetrics;
  thresholdValue?: number;
}) {
  const scores = metrics.anomaly_scores ?? [];
  const labels = metrics.image_labels ?? [];

  if (scores.length === 0) return <p className="text-xs text-gray-400">Score 데이터 없음</p>;

  const bins = scoreDistBins(scores, labels);
  const normTh = thresholdValue != null ? normThreshold(scores, thresholdValue) : null;

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
    </div>
  );
}
