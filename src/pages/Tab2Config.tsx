import { useState, useEffect } from 'react';
import type { PreprocessingConfig, ModelConfig } from '../types/config';
import { getConfig, saveConfig } from '../api/configApi';
import { useConfigStore } from '../store/configStore';
import { useDatasetStore } from '../store/datasetStore';
import PreprocessingForm from '../components/config/PreprocessingForm';
import ModelConfigForm from '../components/config/ModelConfigForm';
import QueueSection from '../components/config/QueueSection';
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
  const { setConfigs, setDeviceInfo } = useConfigStore();
  const { datasetMeta } = useDatasetStore();

  const [preConfig, setPreConfig] = useState<PreprocessingConfig>(DEFAULT_PRE);
  const [modelConfig, setModelConfig] = useState<ModelConfig>(DEFAULT_MODEL);
  const [deviceLabel, setDeviceLabel] = useState<string | null>(null);
  const [isGpu, setIsGpu] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveOk, setSaveOk] = useState(false);
  const [queueOpen, setQueueOpen] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await getConfig();
        const { preprocessing_config, model_config, device_info } = res.data;
        if (preprocessing_config) setPreConfig(preprocessing_config);
        if (model_config) setModelConfig(model_config);
        const gpu = device_info.device === 'cuda';
        const label = gpu && device_info.gpu_name
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
  }, []);

  async function handleSave() {
    if (preConfig.image_size % 32 !== 0) {
      setSaveError('이미지 크기가 32의 배수가 아닙니다. 수정 후 저장해 주세요.');
      return;
    }
    setSaveLoading(true);
    setSaveError(null);
    setSaveOk(false);
    try {
      await saveConfig(preConfig, modelConfig);
      setConfigs(preConfig, modelConfig);
      setSaveOk(true);
      setTimeout(() => setSaveOk(false), 3000);
    } catch (e: unknown) {
      const detail = (e as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
      setSaveError(
        typeof detail === 'string' ? detail : (e as { message?: string })?.message ?? '저장 실패',
      );
    } finally {
      setSaveLoading(false);
    }
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
        <p className="text-xs text-amber-600">탭1에서 데이터셋 경로를 입력하고 검증을 완료해야 설정 탭을 사용할 수 있습니다.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* 상단 바: 디바이스 + 저장 */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-5 py-3 flex items-center gap-4">
        {deviceLabel && (
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full shrink-0 ${isGpu ? 'bg-emerald-500' : 'bg-slate-400'}`} />
            <span className="text-xs font-medium text-slate-600">{deviceLabel}</span>
          </div>
        )}
        <div className="flex-1" />
        {saveOk && (
          <span className="text-xs font-medium text-emerald-600 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
            저장 완료
          </span>
        )}
        {saveError && (
          <span className="text-xs text-red-600">{saveError}</span>
        )}
        <button
          onClick={handleSave}
          disabled={saveLoading}
          className="px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white text-sm font-medium rounded-lg disabled:opacity-40 transition-colors cursor-pointer whitespace-nowrap"
        >
          {saveLoading ? '저장 중...' : '설정 저장'}
        </button>
      </div>

      {/* 2열: 전처리 | 모델 */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <PreprocessingForm value={preConfig} onChange={setPreConfig} />
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <ModelConfigForm value={modelConfig} onChange={setModelConfig} />
        </div>
      </div>

      {/* 학습 대기열 (아코디언) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
        <button
          type="button"
          onClick={() => setQueueOpen(o => !o)}
          className="w-full flex items-center gap-2 px-5 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-2xl transition-colors cursor-pointer"
        >
          <span className="text-slate-400 text-xs">{queueOpen ? '▾' : '▸'}</span>
          학습 대기열 관리
        </button>
        {queueOpen && (
          <div className="px-5 pb-5 border-t border-slate-100">
            <div className="pt-4">
              <QueueSection preprocessingConfig={preConfig} modelConfig={modelConfig} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
