import { useDatasetStore } from '../../store/datasetStore';
import { useConfigStore } from '../../store/configStore';
import { useTrainingStore } from '../../store/trainingStore';

export function Sidebar() {
  const { datasetPath, datasetMeta } = useDatasetStore();
  const { deviceInfo, preprocessingConfig, modelConfig } = useConfigStore();
  const { status } = useTrainingStore();

  return (
    <aside className="w-56 shrink-0 bg-white border-r border-gray-200 flex flex-col overflow-y-auto">
      <div className="p-4 border-b border-gray-200">
        <h1 className="text-base font-bold text-gray-900">Smart QC Dashboard</h1>
      </div>

      {datasetMeta && (
        <section className="p-4 border-b border-gray-200">
          <h2 className="text-xs font-semibold text-gray-500 uppercase mb-2">데이터셋</h2>
          <p className="text-xs text-gray-600 break-all mb-2">{datasetPath}</p>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-gray-50 rounded p-2 text-center">
              <div className="text-lg font-bold text-gray-900">{datasetMeta.train_good_count}</div>
              <div className="text-xs text-gray-500">학습</div>
            </div>
            <div className="bg-gray-50 rounded p-2 text-center">
              <div className="text-lg font-bold text-gray-900">
                {Object.values(datasetMeta.test_counts).reduce((a, b) => a + b, 0)}
              </div>
              <div className="text-xs text-gray-500">테스트</div>
            </div>
          </div>
        </section>
      )}

      {deviceInfo && (
        <section className="p-4 border-b border-gray-200">
          <h2 className="text-xs font-semibold text-gray-500 uppercase mb-2">디바이스</h2>
          {deviceInfo.device === 'cuda' ? (
            <div className="text-xs text-green-700 bg-green-50 rounded p-2">
              ✅ CUDA: {deviceInfo.gpu_name}
              {deviceInfo.vram_gb != null && (
                <span className="block text-green-600">VRAM: {deviceInfo.vram_gb.toFixed(1)} GB</span>
              )}
            </div>
          ) : (
            <div className="text-xs text-blue-700 bg-blue-50 rounded p-2">ℹ️ CPU 모드</div>
          )}
        </section>
      )}

      {status === 'running' && (
        <div className="mx-4 my-2 text-xs text-blue-700 bg-blue-50 rounded p-2">
          ⚠️ 학습 실행 중...
        </div>
      )}

      {(preprocessingConfig || modelConfig) && (
        <section className="p-4">
          <h2 className="text-xs font-semibold text-gray-500 uppercase mb-2">현재 설정</h2>
          {modelConfig && (
            <p className="text-xs text-gray-700">모델: {modelConfig.model_type}</p>
          )}
          {preprocessingConfig && (
            <p className="text-xs text-gray-700">전처리: {preprocessingConfig.method}</p>
          )}
          {preprocessingConfig && (
            <p className="text-xs text-gray-700">image_size: {preprocessingConfig.image_size}</p>
          )}
        </section>
      )}
    </aside>
  );
}
