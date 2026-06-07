import { useTrainingStore } from '../../store/trainingStore';

export default function StageIndicator() {
  const { current_stage_idx, current_stage_name, exp_id, status } = useTrainingStore();

  if (!current_stage_name) return null;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xs text-gray-500">단계</span>
      <span className="px-2.5 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full font-medium">
        {current_stage_idx != null ? `[${current_stage_idx + 1}] ` : ''}
        {current_stage_name}
      </span>
      {status === 'paused' && (
        <span className="px-2.5 py-0.5 bg-yellow-100 text-yellow-800 text-xs rounded-full">
          일시정지
        </span>
      )}
      {exp_id && (
        <span className="text-xs text-gray-400 font-mono">#{exp_id.slice(0, 8)}</span>
      )}
    </div>
  );
}
