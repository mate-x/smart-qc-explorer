import type { PreprocessingConfig } from '../../types/config';

interface Props {
  value: PreprocessingConfig;
  onChange: (v: PreprocessingConfig) => void;
}

const inputCls = 'w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-400 transition-shadow';
const selectCls = inputCls + ' cursor-pointer';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-500 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

export default function PreprocessingForm({ value, onChange }: Props) {
  function set<K extends keyof PreprocessingConfig>(key: K, val: PreprocessingConfig[K]) {
    onChange({ ...value, [key]: val });
  }

  function setParam(key: string, val: unknown) {
    onChange({ ...value, params: { ...(value.params ?? {}), [key]: val } });
  }

  const p = value.params as Record<string, unknown> | null;

  const METHODS: { value: PreprocessingConfig['method']; label: string }[] = [
    { value: 'none', label: 'none' },
    { value: 'homomorphic', label: 'Homomorphic' },
    { value: 'he', label: 'HE' },
    { value: 'clahe', label: 'CLAHE' },
  ];

  function handleMethodChange(m: PreprocessingConfig['method']) {
    const params =
      m === 'homomorphic'
        ? { sigma: 10.0, gamma_H: 1.5, gamma_L: 0.5, normalize: true }
        : m === 'clahe'
        ? { clip_limit: 2.0 }
        : null;
    onChange({ ...value, method: m, params });
  }

  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-sm font-semibold text-slate-800">전처리 설정</h3>

      {/* 전처리 방법 토글 */}
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1.5">전처리 방법</label>
        <div className="flex gap-2 flex-wrap">
          {METHODS.map((m) => (
            <button key={m.value} type="button"
              onClick={() => handleMethodChange(m.value)}
              className={`px-4 py-1.5 text-sm font-medium rounded-lg border transition-colors cursor-pointer ${
                value.method === m.value
                  ? 'bg-sky-600 text-white border-sky-600'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}>
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-4">
        <Field label="배경 분리">
          <select
            value={value.background_method}
            onChange={(e) => set('background_method', e.target.value as 'none' | 'sam2')}
            className={selectCls}
          >
            <option value="none">none</option>
            <option value="sam2">SAM2</option>
          </select>
        </Field>

        {/* homomorphic 파라미터 */}
        {value.method === 'homomorphic' && (
          <>
            <Field label="sigma">
              <input type="number" min={0.1} max={50} step={0.5}
                value={(p?.sigma as number) ?? 10.0}
                onChange={(e) => setParam('sigma', parseFloat(e.target.value))}
                className={inputCls} />
            </Field>
            <Field label="gamma_H">
              <input type="number" min={1.0} max={3.0} step={0.1}
                value={(p?.gamma_H as number) ?? 1.5}
                onChange={(e) => setParam('gamma_H', parseFloat(e.target.value))}
                className={inputCls} />
            </Field>
            <Field label="gamma_L">
              <input type="number" min={0.1} max={1.0} step={0.05}
                value={(p?.gamma_L as number) ?? 0.5}
                onChange={(e) => setParam('gamma_L', parseFloat(e.target.value))}
                className={inputCls} />
            </Field>
            <Field label="normalize">
              <div className="flex items-center h-[38px]">
                <input type="checkbox"
                  checked={(p?.normalize as boolean) ?? true}
                  onChange={(e) => setParam('normalize', e.target.checked)}
                  className="w-4 h-4 cursor-pointer accent-sky-600" />
              </div>
            </Field>
          </>
        )}

        {/* clahe 파라미터 */}
        {value.method === 'clahe' && (
          <Field label="clip_limit">
            <input type="number" min={0.1} max={40} step={0.5}
              value={(p?.clip_limit as number) ?? 2.0}
              onChange={(e) => setParam('clip_limit', parseFloat(e.target.value))}
              className={inputCls} />
          </Field>
        )}

        <Field label="image_size">
          <div className="flex items-center gap-2">
            <input type="number" min={32} max={1024} step={32}
              value={value.image_size}
              onChange={(e) => set('image_size', parseInt(e.target.value, 10))}
              className={inputCls} />
            <span className="text-xs text-slate-400 whitespace-nowrap">px</span>
          </div>
        </Field>
      </div>
    </div>
  );
}
