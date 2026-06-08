import { useTrainingStore } from '../../store/trainingStore';
import { useConfigStore } from '../../store/configStore';

const STAGES: Record<string, string[]> = {
  efficientad: ['데이터 로딩', '모델 초기화', '학습 루프', '테스트 추론', '완료'],
  patchcore: ['데이터 로딩', '모델 초기화', '특징 추출', 'Coreset 구성', 'Memory Bank', '테스트 추론', '완료'],
};

export default function StageIndicator() {
  const { current_stage_idx, status, exp_id } = useTrainingStore();
  const { modelConfig } = useConfigStore();

  const modelType = modelConfig?.model_type ?? 'efficientad';
  const stages = STAGES[modelType] ?? STAGES.efficientad;
  const currentIdx = current_stage_idx ?? 0;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1 flex-wrap">
        {stages.map((name, idx) => {
          const isDone = idx < currentIdx;
          const isCurrent = idx === currentIdx;

          return (
            <div key={idx} className="flex items-center gap-1">
              <div
                className={[
                  'flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-colors',
                  isDone
                    ? 'bg-slate-100 text-slate-400'
                    : isCurrent
                      ? 'bg-sky-600 text-white shadow-sm'
                      : 'bg-slate-50 text-slate-300 border border-slate-200',
                ].join(' ')}
              >
                {isDone && <span>✓</span>}
                {isCurrent && status === 'running' && (
                  <span className="inline-block w-2 h-2 rounded-full bg-white/70 animate-pulse" />
                )}
                {name}
              </div>
              {idx < stages.length - 1 && (
                <span className="text-gray-300 text-xs select-none">›</span>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-2">
        {status === 'paused' && (
          <span className="px-2.5 py-1 bg-amber-100 text-amber-700 text-xs font-semibold rounded-full">
            일시정지
          </span>
        )}
        {exp_id && (
          <span className="text-xs text-slate-400 font-mono">#{exp_id.slice(0, 8)}</span>
        )}
      </div>
    </div>
  );
}
