import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import type { ExperimentMetrics } from '../../types/experiments';

function computeRocCurve(
  labels: number[],
  scores: number[],
): { data: { fpr: number; tpr: number }[]; auc: number } {
  const nPos = labels.filter(l => l === 1).length;
  const nNeg = labels.length - nPos;
  if (nPos === 0 || nNeg === 0 || labels.length === 0)
    return { data: [{ fpr: 0, tpr: 0 }, { fpr: 1, tpr: 1 }], auc: 0.5 };

  const paired = labels.map((l, i) => ({ l, s: scores[i] })).sort((a, b) => b.s - a.s);
  const data: { fpr: number; tpr: number }[] = [{ fpr: 0, tpr: 0 }];
  let tp = 0, fp = 0;
  for (const { l } of paired) {
    if (l === 1) tp++;
    else fp++;
    data.push({ fpr: +(fp / nNeg).toFixed(4), tpr: +(tp / nPos).toFixed(4) });
  }

  let auc = 0;
  for (let i = 1; i < data.length; i++)
    auc += (data[i].fpr - data[i - 1].fpr) * (data[i].tpr + data[i - 1].tpr) / 2;

  return { data, auc };
}

export default function RocCurveChart({ metrics }: { metrics: ExperimentMetrics }) {
  const scores = metrics.anomaly_scores ?? [];
  const labels = metrics.image_labels ?? [];

  if (scores.length === 0 || labels.length === 0 || new Set(labels).size < 2)
    return <p className="text-xs text-gray-400">ROC 데이터 없음</p>;

  const { data, auc } = computeRocCurve(labels, scores);
  const step = Math.max(1, Math.floor(data.length / 200));
  const sampled = data.filter((_, i) => i % step === 0 || i === data.length - 1);
  const randomLine = [{ fpr: 0, tpr: 0 }, { fpr: 1, tpr: 1 }];

  return (
    <div>
      <p className="text-xs font-semibold text-gray-600 mb-1 text-center">
        ROC Curve (AUC = {auc.toFixed(4)})
      </p>
      <ResponsiveContainer width="100%" height={240}>
        <LineChart margin={{ top: 5, right: 10, bottom: 20, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="fpr"
            type="number"
            domain={[0, 1]}
            label={{ value: 'FPR', position: 'insideBottom', offset: -10 }}
            tick={{ fontSize: 10 }}
          />
          <YAxis domain={[0, 1]} tick={{ fontSize: 10 }} />
          <Tooltip formatter={(v: number) => v.toFixed(4)} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Line data={sampled} type="monotone" dataKey="tpr" stroke="#2563eb" dot={false} name="ROC" />
          <Line data={randomLine} type="linear" dataKey="tpr" stroke="#9ca3af" strokeDasharray="4 4" dot={false} name="Random" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
