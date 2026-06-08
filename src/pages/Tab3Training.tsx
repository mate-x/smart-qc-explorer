import { useTrainingStore } from '../store/trainingStore';
import { useDatasetStore } from '../store/datasetStore';
import { useConfigStore } from '../store/configStore';
import StageIndicator from '../components/training/StageIndicator';
import ProgressSection from '../components/training/ProgressSection';
import IdleSection from '../components/training/IdleSection';
import QueuePanel from '../components/training/QueuePanel';

export default function Tab3Training() {
  const { status } = useTrainingStore();
  const { datasetMeta } = useDatasetStore();
  const { preprocessingConfig, modelConfig } = useConfigStore();
  const isRunning = status === 'running' || status === 'paused';

  if (!datasetMeta || !(preprocessingConfig && modelConfig)) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-8 flex flex-col items-center gap-3 text-center">
        <p className="text-sm font-medium text-amber-800">학습을 시작할 수 없습니다</p>
        <p className="text-xs text-amber-600">
          탭1에서 데이터셋을 검증하고, 탭2에서 설정을 저장한 뒤 다시 시도해 주세요.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <QueuePanel />

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col gap-5">
        {isRunning && (
          <div className="pb-4 border-b border-slate-100">
            <StageIndicator />
          </div>
        )}
        {isRunning ? <ProgressSection /> : <IdleSection />}
      </div>
    </div>
  );
}
