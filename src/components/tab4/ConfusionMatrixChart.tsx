import type { ExperimentMetrics } from '../../types/experiments';

function recomputeCM(
  scores: number[],
  labels: number[],
  normalizedTh: number,
): { tp: number; fp: number; tn: number; fn: number } {
  const sMin = Math.min(...scores);
  const sMax = Math.max(...scores);
  const rawTh = sMax > sMin ? sMin + normalizedTh * (sMax - sMin) : sMin;
  let tp = 0, fp = 0, tn = 0, fn = 0;
  for (let i = 0; i < scores.length; i++) {
    const pred = scores[i] >= rawTh ? 1 : 0;
    if (labels[i] === 1 && pred === 1) tp++;
    else if (labels[i] === 0 && pred === 1) fp++;
    else if (labels[i] === 0 && pred === 0) tn++;
    else fn++;
  }
  return { tp, fp, tn, fn };
}

export default function ConfusionMatrixChart({
  metrics,
  threshold,
}: {
  metrics: ExperimentMetrics;
  threshold?: number;
}) {
  const scores = metrics.anomaly_scores ?? [];
  const labels = metrics.image_labels ?? [];
  const canRecompute = threshold != null && scores.length > 0 && labels.length === scores.length;
  const cm = canRecompute
    ? recomputeCM(scores, labels, threshold!)
    : metrics.confusion_matrix;

  if (!cm) return <p className="text-xs text-gray-400">데이터 없음</p>;

  return (
    <div>
      <p className="text-xs font-semibold text-gray-600 mb-2 text-center">Confusion Matrix</p>
      <p className="text-[10px] text-gray-400 text-center mb-1">← 예측 →</p>
      <div className="grid grid-cols-2 gap-1 w-48 mx-auto">
        <div className="rounded p-3 text-center bg-blue-100 text-blue-800">
          <p className="text-xs font-bold">TN</p>
          <p className="text-sm font-semibold">{cm.tn}</p>
        </div>
        <div className="rounded p-3 text-center bg-red-100 text-red-700">
          <p className="text-xs font-bold">FP</p>
          <p className="text-sm font-semibold">{cm.fp}</p>
        </div>
        <div className="rounded p-3 text-center bg-orange-100 text-orange-700">
          <p className="text-xs font-bold">FN</p>
          <p className="text-sm font-semibold">{cm.fn}</p>
        </div>
        <div className="rounded p-3 text-center bg-green-100 text-green-800">
          <p className="text-xs font-bold">TP</p>
          <p className="text-sm font-semibold">{cm.tp}</p>
        </div>
      </div>
      <div className="flex justify-around text-[10px] text-gray-400 mt-1 w-48 mx-auto">
        <span>정상</span>
        <span>결함</span>
      </div>
    </div>
  );
}
