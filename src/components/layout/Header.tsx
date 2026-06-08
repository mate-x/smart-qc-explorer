import { useDatasetStore } from '../../store/datasetStore';
import { useConfigStore } from '../../store/configStore';
import { useTrainingStore } from '../../store/trainingStore';

export function Header() {
  const { datasetMeta } = useDatasetStore();
  const { deviceInfo, modelConfig, preprocessingConfig } = useConfigStore();
  const { status } = useTrainingStore();

  return (
    <header className="shrink-0 bg-slate-900 text-white px-5 py-2.5 flex items-center gap-6">
      <h1 className="text-sm font-semibold tracking-wide whitespace-nowrap mr-2">
        Smart QC Dashboard
      </h1>

      <div className="w-px h-4 bg-slate-600" />

      {deviceInfo && (
        <span className="text-xs text-slate-300 whitespace-nowrap">
          {deviceInfo.device === 'cuda' ? (
            <span className="text-emerald-400">
              GPU&nbsp;{deviceInfo.gpu_name}
              {deviceInfo.vram_gb != null && ` · ${deviceInfo.vram_gb.toFixed(1)} GB`}
            </span>
          ) : (
            <span className="text-sky-400">CPU 모드</span>
          )}
        </span>
      )}

      {datasetMeta && (
        <>
          <div className="w-px h-4 bg-slate-600" />
          <span className="text-xs text-slate-300 whitespace-nowrap">
            학습&nbsp;<span className="text-white font-medium">{datasetMeta.train_good_count}</span>
            &nbsp;·&nbsp;테스트&nbsp;
            <span className="text-white font-medium">
              {Object.values(datasetMeta.test_counts).reduce((a, b) => a + b, 0)}
            </span>
          </span>
        </>
      )}

      {modelConfig && (
        <>
          <div className="w-px h-4 bg-slate-600" />
          <span className="text-xs text-slate-400 whitespace-nowrap">
            {modelConfig.model_type}
            {preprocessingConfig && <>&nbsp;· {preprocessingConfig.method}</>}
          </span>
        </>
      )}

      <div className="flex-1" />

      {status === 'running' && (
        <span className="text-xs bg-amber-500 text-amber-950 font-semibold px-2 py-0.5 rounded-full animate-pulse whitespace-nowrap">
          학습 실행 중
        </span>
      )}
    </header>
  );
}
