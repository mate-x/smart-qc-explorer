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

      <div className="border border-gray-200 rounded-lg p-4 flex flex-col gap-4">
        {isRunning && <StageIndicator />}
        {isRunning ? <ProgressSection /> : <IdleSection />}
      </div>
    </div>
  );
}
