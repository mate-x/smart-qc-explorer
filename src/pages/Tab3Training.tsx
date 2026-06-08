import { useTrainingStore } from '../store/trainingStore';
import StageIndicator from '../components/training/StageIndicator';
import ProgressSection from '../components/training/ProgressSection';
import IdleSection from '../components/training/IdleSection';
import QueuePanel from '../components/training/QueuePanel';

export default function Tab3Training() {
  const { status } = useTrainingStore();
  const isRunning = status === 'running' || status === 'paused';

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
