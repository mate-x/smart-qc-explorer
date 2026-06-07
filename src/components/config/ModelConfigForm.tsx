import { useState } from 'react';
import type { ModelConfig } from '../../types/config';
import EfficientAdParams, {
  DEFAULT_EFFICIENTAD,
  type EfficientAdParamsState,
} from './EfficientAdParams';
import PatchCoreParams, {
  DEFAULT_PATCHCORE,
  type PatchCoreParamsState,
} from './PatchCoreParams';
import { previewThreshold } from '../../api/configApi';

interface Props {
  value: ModelConfig;
  onChange: (v: ModelConfig) => void;
}

export default function ModelConfigForm({ value, onChange }: Props) {
  const [previewLoading, setPreviewLoading] = useState(false);
  const [preview, setPreview] = useState<{ normal: number; defect: number } | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);

  function set<K extends keyof ModelConfig>(key: K, val: ModelConfig[K]) {
    onChange({ ...value, [key]: val });
  }

  function handleModelTypeChange(mt: 'efficientad' | 'patchcore') {
    onChange({
      ...value,
      model_type: mt,
      params: mt === 'efficientad' ? DEFAULT_EFFICIENTAD : DEFAULT_PATCHCORE,
    });
    setPreview(null);
  }

  async function handlePreview() {
    setPreviewLoading(true);
    setPreviewError(null);
    try {
      const res = await previewThreshold(value.threshold_method, value.threshold_value);
      const { normal_ratio, defect_ratio } = res.data;
      if (normal_ratio != null && defect_ratio != null) {
        setPreview({ normal: normal_ratio, defect: defect_ratio });
      } else {
        setPreviewError('학습 완료 실험이 없어 미리보기를 계산할 수 없습니다.');
      }
    } catch (e: unknown) {
      const detail =
        (e as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
      setPreviewError(
        typeof detail === 'string'
          ? detail
          : (e as { message?: string })?.message ?? '미리보기 실패',
      );
    } finally {
      setPreviewLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-sm font-semibold text-gray-700">모델 설정</h3>

      {/* 모델 타입 토글 */}
      <div className="flex gap-2">
        {(['efficientad', 'patchcore'] as const).map((mt) => (
          <button
            key={mt}
            type="button"
            onClick={() => handleModelTypeChange(mt)}
            className={`px-3 py-1.5 text-sm rounded border cursor-pointer ${
              value.model_type === mt
                ? 'bg-blue-600 text-white border-blue-600'
                : 'border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            {mt === 'efficientad' ? 'EfficientAD' : 'PatchCore'}
          </button>
        ))}
      </div>

      {/* 공통 설정 */}
      <div className="flex flex-col gap-2.5">
        <div className="flex items-center gap-3">
          <label className="w-28 shrink-0 text-xs text-gray-600">Batch Size</label>
          <input
            type="number"
            value={value.batch_size}
            min={1}
            max={128}
            step={1}
            onChange={(e) => set('batch_size', parseInt(e.target.value, 10))}
            className="w-24 border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:border-blue-400"
          />
        </div>

        <div className="flex items-center gap-3">
          <label className="w-28 shrink-0 text-xs text-gray-600">Random Seed</label>
          <input
            type="number"
            value={value.random_seed}
            min={0}
            max={2147483647}
            step={1}
            onChange={(e) => set('random_seed', parseInt(e.target.value, 10))}
            className="w-24 border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:border-blue-400"
          />
        </div>
      </div>

      {/* 모델별 파라미터 */}
      <div className="border-t border-gray-100 pt-3">
        {value.model_type === 'efficientad' ? (
          <EfficientAdParams
            value={(value.params as EfficientAdParamsState) ?? DEFAULT_EFFICIENTAD}
            onChange={(p) => set('params', p)}
          />
        ) : (
          <PatchCoreParams
            value={(value.params as PatchCoreParamsState) ?? DEFAULT_PATCHCORE}
            onChange={(p) => set('params', p)}
          />
        )}
      </div>

      {/* Threshold */}
      <div className="border-t border-gray-100 pt-3 flex flex-col gap-2.5">
        <h4 className="text-xs font-semibold text-gray-600">Threshold</h4>

        <div className="flex items-center gap-3">
          <label className="w-28 shrink-0 text-xs text-gray-600">방법</label>
          <div className="flex gap-3">
            {(['percentile', 'absolute'] as const).map((m) => (
              <label key={m} className="flex items-center gap-1.5 text-sm cursor-pointer">
                <input
                  type="radio"
                  name="threshold_method"
                  value={m}
                  checked={value.threshold_method === m}
                  onChange={() => {
                    set('threshold_method', m);
                    set('threshold_value', m === 'percentile' ? 95.0 : 0.5);
                    setPreview(null);
                  }}
                  className="cursor-pointer"
                />
                {m}
              </label>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <label className="w-28 shrink-0 text-xs text-gray-600">값</label>
          <input
            type="number"
            value={value.threshold_value}
            min={value.threshold_method === 'percentile' ? 0 : 0}
            max={value.threshold_method === 'percentile' ? 100 : 1}
            step={value.threshold_method === 'percentile' ? 0.5 : 0.01}
            onChange={(e) => {
              set('threshold_value', parseFloat(e.target.value));
              setPreview(null);
            }}
            className="w-24 border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:border-blue-400"
          />
          <button
            type="button"
            onClick={handlePreview}
            disabled={previewLoading}
            className="px-2 py-1 border border-gray-300 text-xs rounded hover:bg-gray-50 disabled:opacity-50 cursor-pointer"
          >
            {previewLoading ? '...' : '미리보기'}
          </button>
        </div>

        {preview && (
          <p className="text-xs text-gray-600 pl-31">
            정상 {(preview.normal * 100).toFixed(1)}% 정상 판정 ·{' '}
            결함 {(preview.defect * 100).toFixed(1)}% 정상 판정
          </p>
        )}
        {previewError && <p className="mt-1 text-red-600 text-[13px]">{previewError}</p>}
      </div>
    </div>
  );
}
