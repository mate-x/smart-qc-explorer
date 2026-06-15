import type { ModelConfig } from '../../types/config';
import EfficientAdParams, { DEFAULT_EFFICIENTAD } from './EfficientAdParams';
import PatchCoreParams, { DEFAULT_PATCHCORE } from './PatchCoreParams';

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

function computeThresholdRatio(method: string, value: number): { normal: number; defect: number } | null {
  if (method === 'percentile') {
    const normal = Math.round((value / 100) * 1e6) / 1e6;
    const defect = Math.round((1 - value / 100) * 1e6) / 1e6;
    return { normal, defect };
  }
  return null;
}

export default function ModelConfigForm({ value, onChange }: Props) {
  function set<K extends keyof ModelConfig>(key: K, val: ModelConfig[K]) {
    onChange({ ...value, [key]: val } as ModelConfig);
  }

  function handleModelTypeChange(mt: 'efficientad' | 'patchcore') {
    if (mt === 'efficientad') {
      onChange({ ...value, model_type: 'efficientad', params: DEFAULT_EFFICIENTAD });
    } else {
      onChange({ ...value, model_type: 'patchcore', params: DEFAULT_PATCHCORE });
    }
  }

  const thresholdRatio = computeThresholdRatio(value.threshold_method, value.threshold_value);

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
            value={value.params}
            onChange={(p) => onChange({ ...value, params: p })}
          />
        ) : (
          <PatchCoreParams
            value={value.params}
            onChange={(p) => onChange({ ...value, params: p })}
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
                    onChange={() => onChange({
                      ...value,
                      threshold_method: m,
                      threshold_value: m === 'percentile' ? 95.0 : 0.5,
                    })}
                    className="cursor-pointer accent-sky-600" />
                  <span className="text-sm text-slate-700">{m}</span>
                </label>
              ))}
            </div>
          </Field>

          <Field label="값">
            {value.threshold_method === 'percentile' ? (
              <div className="flex items-center gap-3 h-[38px]">
                <input
                  type="range"
                  value={value.threshold_value}
                  min={0} max={100} step={0.5}
                  onChange={(e) => set('threshold_value', parseFloat(e.target.value))}
                  className="flex-1 accent-sky-600 cursor-pointer" />
                <span className="text-sm text-slate-700 w-10 text-right tabular-nums">
                  {value.threshold_value.toFixed(1)}
                </span>
              </div>
            ) : (
              <input type="number" value={value.threshold_value}
                min={0} max={1} step={0.01}
                onChange={(e) => set('threshold_value', parseFloat(e.target.value))}
                className={inputCls} />
            )}
          </Field>
        </div>

        {/* 비율 미리보기 — 로컬 자동 계산 (Streamlit 동일) */}
        {thresholdRatio ? (
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
              <p className="text-[10px] text-slate-400 mb-0.5">예상 정상 판정 비율</p>
              <p className="text-sm font-semibold text-slate-700">{(thresholdRatio.normal * 100).toFixed(1)}%</p>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
              <p className="text-[10px] text-slate-400 mb-0.5">예상 결함 판정 비율</p>
              <p className="text-sm font-semibold text-slate-700">{(thresholdRatio.defect * 100).toFixed(1)}%</p>
            </div>
          </div>
        ) : (
          <p className="text-xs text-slate-400 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
            absolute 방식은 학습 완료 후 실제 점수 분포에서 확인 가능합니다.
          </p>
        )}
      </div>
    </div>
  );
}
