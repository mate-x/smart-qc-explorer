import type { PreprocessingConfig } from '../../types/config';

interface Props {
  value: PreprocessingConfig;
  onChange: (v: PreprocessingConfig) => void;
}

function row(label: string, children: React.ReactNode) {
  return (
    <div className="flex items-center gap-3">
      <label className="w-28 shrink-0 text-xs text-gray-600">{label}</label>
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

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold text-gray-700">전처리 설정</h3>

      {row(
        '전처리 방법',
        <select
          value={value.method}
          onChange={(e) => {
            const m = e.target.value as PreprocessingConfig['method'];
            const params =
              m === 'homomorphic'
                ? { sigma: 10.0, gamma_H: 1.5, gamma_L: 0.5, normalize: true }
                : m === 'clahe'
                ? { clip_limit: 2.0 }
                : null;
            onChange({ ...value, method: m, params });
          }}
          className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:border-blue-400"
        >
          <option value="none">none (없음)</option>
          <option value="homomorphic">homomorphic</option>
          <option value="he">he (히스토그램 평탄화)</option>
          <option value="clahe">clahe (적응형)</option>
        </select>,
      )}

      {/* homomorphic params */}
      {value.method === 'homomorphic' && (
        <>
          {row(
            'sigma',
            <input
              type="number"
              min={0.1}
              max={50}
              step={0.5}
              value={(p?.sigma as number) ?? 10.0}
              onChange={(e) => setParam('sigma', parseFloat(e.target.value))}
              className="w-24 border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:border-blue-400"
            />,
          )}
          {row(
            'gamma_H',
            <input
              type="number"
              min={1.0}
              max={3.0}
              step={0.1}
              value={(p?.gamma_H as number) ?? 1.5}
              onChange={(e) => setParam('gamma_H', parseFloat(e.target.value))}
              className="w-24 border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:border-blue-400"
            />,
          )}
          {row(
            'gamma_L',
            <input
              type="number"
              min={0.1}
              max={1.0}
              step={0.05}
              value={(p?.gamma_L as number) ?? 0.5}
              onChange={(e) => setParam('gamma_L', parseFloat(e.target.value))}
              className="w-24 border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:border-blue-400"
            />,
          )}
          {row(
            'normalize',
            <input
              type="checkbox"
              checked={(p?.normalize as boolean) ?? true}
              onChange={(e) => setParam('normalize', e.target.checked)}
              className="w-4 h-4 cursor-pointer"
            />,
          )}
        </>
      )}

      {/* clahe params */}
      {value.method === 'clahe' &&
        row(
          'clip_limit',
          <input
            type="number"
            min={0.1}
            max={40}
            step={0.5}
            value={(p?.clip_limit as number) ?? 2.0}
            onChange={(e) => setParam('clip_limit', parseFloat(e.target.value))}
            className="w-24 border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:border-blue-400"
          />,
        )}

      {row(
        'image_size',
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={32}
            max={1024}
            step={32}
            value={value.image_size}
            onChange={(e) => set('image_size', parseInt(e.target.value, 10))}
            className="w-24 border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:border-blue-400"
          />
          <span className="text-xs text-gray-400">px (32의 배수)</span>
        </div>,
      )}

      {row(
        '배경 분리',
        <select
          value={value.background_method}
          onChange={(e) => set('background_method', e.target.value as 'none' | 'sam2')}
          className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:border-blue-400"
        >
          <option value="none">none</option>
          <option value="sam2">SAM2</option>
        </select>,
      )}
    </div>
  );
}
