import { useDatasetStore } from '../../store/datasetStore';
import { useConfigStore } from '../../store/configStore';
import { useTrainingStore } from '../../store/trainingStore';
import type { EfficientAdParamsState, PatchCoreParamsState } from '../../types/modelParams';

export function Navbar() {
  const { datasetMeta } = useDatasetStore();
  const { deviceInfo, modelConfig, preprocessingConfig } = useConfigStore();
  const { status } = useTrainingStore();

  const modelChip = modelConfig
    ? (() => {
        const sub =
          modelConfig.model_type === 'efficientad'
            ? (modelConfig.params as EfficientAdParamsState).model_size
            : (modelConfig.params as PatchCoreParamsState).backbone;
        return `${modelConfig.model_type.toUpperCase()} · ${sub}`;
      })()
    : null;

  return (
    <nav className="shrink-0 bg-slate-900 flex items-center px-4 py-3 gap-3">
      {/* Logo */}
      <div className="flex items-center gap-2 shrink-0">
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M11 2L13.5 7H19L14.75 10.5L16.5 16L11 12.5L5.5 16L7.25 10.5L3 7H8.5L11 2Z"
            fill="#38bdf8"
            stroke="#0ea5e9"
            strokeWidth="0.5"
          />
          <circle cx="11" cy="10" r="3" fill="#0f172a" />
          <path d="M9.5 10l1 1 2-2" stroke="#38bdf8" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="text-sm font-bold text-white tracking-wide whitespace-nowrap">Smart QC</span>
      </div>

      {/* Divider */}
      <div className="w-px h-5 bg-slate-700 shrink-0" />

      {/* Config chips */}
      <div className="flex items-center gap-2 flex-1 flex-wrap">
        {modelChip && (
          <span className="text-xs bg-slate-700 text-slate-200 px-2.5 py-1 rounded-full whitespace-nowrap">
            {modelChip}
          </span>
        )}
        {preprocessingConfig && (
          <span className="text-xs bg-slate-700 text-slate-200 px-2.5 py-1 rounded-full whitespace-nowrap">
            전처리 · {preprocessingConfig.method}
          </span>
        )}
        {datasetMeta && (
          <span className="text-xs text-slate-400 whitespace-nowrap">
            학습 <span className="text-white">{datasetMeta.train_good_count}</span>
            {' / '}테스트 <span className="text-white">
              {Object.values(datasetMeta.test_counts).reduce((a, b) => a + b, 0)}
            </span>
          </span>
        )}
      </div>

      {/* Status chips */}
      <div className="flex items-center gap-2 shrink-0">
        {status === 'running' && (
          <span className="text-xs bg-amber-400 text-amber-950 font-semibold px-2.5 py-1 rounded-full animate-pulse whitespace-nowrap">
            학습 중
          </span>
        )}
        {deviceInfo && (
          <span
            className={`text-xs px-2.5 py-1 rounded-full font-medium whitespace-nowrap ${
              deviceInfo.device === 'cuda'
                ? 'bg-emerald-900 text-emerald-300'
                : 'bg-slate-700 text-slate-300'
            }`}
          >
            {deviceInfo.device === 'cuda' ? 'GPU' : 'CPU'}
          </span>
        )}
      </div>
    </nav>
  );
}
