import { useState } from 'react';
import type { ModelConfig } from '../../types/config';
import type { EfficientAdParamsState, PatchCoreParamsState } from '../../types/modelParams';
import EfficientAdParams, { DEFAULT_EFFICIENTAD } from './EfficientAdParams';
import PatchCoreParams, { DEFAULT_PATCHCORE } from './PatchCoreParams';
import { previewThreshold } from '../../api/configApi';

interface Props {
  value: ModelConfig;
  onChange: (v: ModelConfig) => void;
}

const inputCls = 'w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-400 transition-shadow';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-500 mb-1.5">{label}</label>
      {children}
    </div>
  );
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
    <div className="flex flex-col gap-5">
      <h3 className="text-sm font-semibold text-slate-800">모델 설정</h3>

      {/* 모델 타입 토글 */}
      <div className="flex gap-2">
        {(['efficientad', 'patchcore'] as const).map((mt) => (
          <button key={mt} type="button"
            onClick={() => handleModelTypeChange(mt)}
            className={`px-4 py-1.5 text-sm font-medium rounded-lg border transition-colors cursor-pointer ${
              value.model_type === mt
                ? 'bg-sky-600 text-white border-sky-600'
                : 'border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}>
            {mt === 'efficientad' ? 'EfficientAD' : 'PatchCore'}
          </button>
        ))}
      </div>

      {/* 공통 설정 */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-4">
        <Field label="Batch Size">
          <input type="number" value={value.batch_size}
            min={1} max={128} step={1}
            onChange={(e) => set('batch_size', parseInt(e.target.value, 10))}
            className={inputCls} />
        </Field>

        <Field label="Random Seed">
          <input type="number" value={value.random_seed}
            min={0} max={2147483647} step={1}
            onChange={(e) => set('random_seed', parseInt(e.target.value, 10))}
            className={inputCls} />
        </Field>
      </div>

      {/* 모델별 파라미터 */}
      <div className="border-t border-slate-100 pt-4">
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
      <div className="border-t border-slate-100 pt-4 flex flex-col gap-4">
        <h4 className="text-xs font-semibold text-slate-600">Threshold</h4>

        <div className="grid grid-cols-2 gap-x-4 gap-y-4">
          <Field label="방법">
            <div className="flex gap-4 h-[38px] items-center">
              {(['percentile', 'absolute'] as const).map((m) => (
                <label key={m} className="flex items-center gap-1.5 text-sm cursor-pointer">
                  <input type="radio" name="threshold_method" value={m}
                    checked={value.threshold_method === m}
                    onChange={() => {
                      set('threshold_method', m);
                      set('threshold_value', m === 'percentile' ? 95.0 : 0.5);
                      setPreview(null);
                    }}
                    className="cursor-pointer accent-sky-600" />
                  <span className="text-sm text-slate-700">{m}</span>
                </label>
              ))}
            </div>
          </Field>

          <Field label="값">
            <div className="flex gap-2">
              <input type="number" value={value.threshold_value}
                min={0}
                max={value.threshold_method === 'percentile' ? 100 : 1}
                step={value.threshold_method === 'percentile' ? 0.5 : 0.01}
                onChange={(e) => {
                  set('threshold_value', parseFloat(e.target.value));
                  setPreview(null);
                }}
                className={inputCls} />
              <button type="button" onClick={handlePreview} disabled={previewLoading}
                className="px-3 py-2 border border-slate-200 text-xs text-slate-600 rounded-lg hover:bg-slate-50 disabled:opacity-50 whitespace-nowrap transition-colors cursor-pointer">
                {previewLoading ? '...' : '미리보기'}
              </button>
            </div>
          </Field>
        </div>

        {preview && (
          <p className="text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
            정상 {(preview.normal * 100).toFixed(1)}% 정상 판정 ·{' '}
            결함 {(preview.defect * 100).toFixed(1)}% 정상 판정
          </p>
        )}
        {previewError && (
          <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {previewError}
          </p>
        )}
      </div>
    </div>
  );
}
