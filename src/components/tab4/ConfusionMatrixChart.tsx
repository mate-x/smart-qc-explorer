import type { ExperimentMetrics } from '../../types/experiments';

export default function ConfusionMatrixChart({ metrics }: { metrics: ExperimentMetrics }) {
  const cm = metrics.confusion_matrix;
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
