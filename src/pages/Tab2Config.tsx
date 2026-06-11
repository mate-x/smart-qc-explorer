import { useState, useEffect } from 'react';
import type { PreprocessingConfig, ModelConfig } from '../types/config';
import { getConfig } from '../api/configApi';
import { useConfigStore } from '../store/configStore';
import { useLocalQueueStore } from '../store/localQueueStore';
import { useDatasetStore } from '../store/datasetStore';
import PreprocessingForm from '../components/config/PreprocessingForm';
import ModelConfigForm from '../components/config/ModelConfigForm';
import QueueSection from '../components/config/QueueSection';
import BatchExperimentForm from '../components/config/BatchExperimentForm';
import { DEFAULT_EFFICIENTAD } from '../components/config/EfficientAdParams';

const DEFAULT_PRE: PreprocessingConfig = {
  method: 'none',
  background_method: 'none',
  resize_mode: 'padding',
  image_size: 256,
  normalization: 'imagenet',
  mean: [0.485, 0.456, 0.406],
  std: [0.229, 0.224, 0.225],
  params: null,
};

const DEFAULT_MODEL: ModelConfig = {
  model_type: 'efficientad',
  batch_size: 16,
  random_seed: 42,
  threshold_method: 'percentile',
  threshold_value: 95.0,
  params: DEFAULT_EFFICIENTAD,
};

export default function Tab2Config() {
  const { setDeviceInfo } = useConfigStore();
  const { addLocalItem } = useLocalQueueStore();
  const { datasetMeta, datasetPath } = useDatasetStore();

  const [preConfig, setPreConfig] = useState<PreprocessingConfig>(DEFAULT_PRE);
  const [modelConfig, setModelConfig] = useState<ModelConfig>(DEFAULT_MODEL);
  const [deviceLabel, setDeviceLabel] = useState<string | null>(null);
  const [isGpu, setIsGpu] = useState(false);
  const [loading, setLoading] = useState(true);

  const [accordion1Open, setAccordion1Open] = useState(true);
  const [accordion2Open, setAccordion2Open] = useState(false);

  const [addError, setAddError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await getConfig();
        const { preprocessing_config, model_config, device_info } = res.data;
        if (preprocessing_config) setPreConfig(preprocessing_config);
        if (model_config) setModelConfig(model_config);
        const gpu = device_info.device === 'cuda';
        const label =
          gpu && device_info.gpu_name
            ? `${device_info.gpu_name}${device_info.vram_gb ? ` · ${device_info.vram_gb} GB` : ''}`
            : 'CPU 모드';
        setDeviceLabel(label);
        setIsGpu(gpu);
        setDeviceInfo(device_info);
      } catch {
        // 기본값 사용
      } finally {
        setLoading(false);
      }
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleAddToQueue() {
    if (preConfig.image_size % 32 !== 0) {
      setAddError('이미지 크기가 32의 배수가 아닙니다.');
      return;
    }
    setAddError(null);
    addLocalItem(preConfig, modelConfig);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <span className="text-sm text-slate-400 animate-pulse">설정 로딩 중...</span>
      </div>
    );
  }

  if (!datasetMeta) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-8 flex flex-col items-center gap-3 text-center">
        <p className="text-sm font-medium text-amber-800">데이터셋을 먼저 검증해 주세요</p>
        <p className="text-xs text-amber-600">
          탭1에서 데이터셋 경로를 입력하고 검증을 완료해야 설정 탭을 사용할 수 있습니다.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* 상단 바: 디바이스 정보만 */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-5 py-3 flex items-center gap-4">
        {deviceLabel && (
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full shrink-0 ${isGpu ? 'bg-emerald-500' : 'bg-slate-400'}`} />
            <span className="text-xs font-medium text-slate-600">{deviceLabel}</span>
          </div>
        )}
      </div>

      {/* 아코디언 1: 개별 실험 등록 — 기본 열림 */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
        <button
          type="button"
          onClick={() => setAccordion1Open((o) => !o)}
          className="w-full flex items-center gap-2 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 rounded-2xl transition-colors cursor-pointer"
        >
          <span className="text-slate-400 text-xs">{accordion1Open ? '▾' : '▸'}</span>
          개별 실험 등록
        </button>
        {accordion1Open && (
          <div className="px-5 pb-5 border-t border-slate-100">
            <div className="pt-4 flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl border border-slate-100 p-4">
                  <PreprocessingForm value={preConfig} onChange={setPreConfig} datasetPath={datasetPath} />
                </div>
                <div className="rounded-xl border border-slate-100 p-4">
                  <ModelConfigForm value={modelConfig} onChange={setModelConfig} />
                </div>
              </div>
              <div className="flex justify-end items-center gap-3">
                {addError && <span className="text-xs text-red-600">{addError}</span>}
                <button
                  type="button"
                  onClick={handleAddToQueue}
                  className="px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white text-sm font-medium rounded-lg transition-colors cursor-pointer"
                >
                  + 대기열 추가
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 아코디언 2: 실험 조합 생성 — 기본 닫힘 */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
        <button
          type="button"
          onClick={() => setAccordion2Open((o) => !o)}
          className="w-full flex items-center gap-2 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 rounded-2xl transition-colors cursor-pointer"
        >
          <span className="text-slate-400 text-xs">{accordion2Open ? '▾' : '▸'}</span>
          실험 조합 생성
        </button>
        {accordion2Open && (
          <div className="px-5 pb-5 border-t border-slate-100">
            <div className="pt-4">
              <BatchExperimentForm preConfig={preConfig} />
            </div>
          </div>
        )}
      </div>

      {/* 실험 대기열 — 항상 표시 */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <QueueSection />
      </div>
    </div>
  );
}
