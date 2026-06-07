import { useState, useEffect } from 'react';
import type { PreprocessingConfig, ModelConfig } from '../types/config';
import { getConfig, saveConfig } from '../api/configApi';
import { useConfigStore } from '../store/configStore';
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
  params: DEFAULT_EFFICIENTAD as unknown as Record<string, unknown>,
};

export default function Tab2Config() {
  const { setConfigs, setDeviceInfo } = useConfigStore();

  const [preConfig, setPreConfig] = useState<PreprocessingConfig>(DEFAULT_PRE);
  const [modelConfig, setModelConfig] = useState<ModelConfig>(DEFAULT_MODEL);
  const [deviceLabel, setDeviceLabel] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveOk, setSaveOk] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await getConfig();
        const { preprocessing_config, model_config, device_info } = res.data;
        if (preprocessing_config) setPreConfig(preprocessing_config);
        if (model_config) setModelConfig(model_config);
        const label =
          device_info.device === 'cuda' && device_info.gpu_name
            ? `CUDA — ${device_info.gpu_name}${device_info.vram_gb ? ` (${device_info.vram_gb} GB)` : ''}`
            : 'CPU';
        setDeviceLabel(label);
        setDeviceInfo(device_info);
      } catch {
        // 설정 없음 — 기본값 사용
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function handleSave() {
    setSaveLoading(true);
    setSaveError(null);
    setSaveOk(false);
    try {
      await saveConfig(preConfig, modelConfig);
      setConfigs(preConfig, modelConfig);
      setSaveOk(true);
      setTimeout(() => setSaveOk(false), 3000);
    } catch (e: unknown) {
      const detail =
        (e as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
      setSaveError(
        typeof detail === 'string' ? detail : (e as { message?: string })?.message ?? '저장 실패',
      );
    } finally {
      setSaveLoading(false);
    }
  }

  if (loading) return <div className="p-4 text-sm text-gray-500">로딩 중...</div>;

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      {/* 디바이스 정보 */}
      {deviceLabel && (
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span
            className={`inline-block w-2 h-2 rounded-full ${
              deviceLabel.startsWith('CUDA') ? 'bg-green-500' : 'bg-gray-400'
            }`}
          />
          {deviceLabel}
        </div>
      )}

      {/* 전처리 설정 */}
      <div className="border border-gray-200 rounded-lg p-4">
        <PreprocessingForm value={preConfig} onChange={setPreConfig} />
      </div>

      {/* 모델 설정 */}
      <div className="border border-gray-200 rounded-lg p-4">
        <ModelConfigForm value={modelConfig} onChange={setModelConfig} />
      </div>

      {/* 저장 버튼 */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saveLoading}
          className="px-5 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
        >
          {saveLoading ? '저장 중...' : '저장'}
        </button>
        {saveOk && <span className="text-sm text-green-600">저장 완료</span>}
        {saveError && <p className="mt-1 text-red-600 text-[13px]">{saveError}</p>}
      </div>

      {/* 큐 */}
      <div className="border border-gray-200 rounded-lg p-4">
        <QueueSection preprocessingConfig={preConfig} modelConfig={modelConfig} />
      </div>
    </div>
  );
}
