import { useState } from 'react';
import type { PreprocessingConfig } from '../../types/config';
import { useDatasetStore } from '../../store/datasetStore';
import { previewPreprocessing } from '../../api/configApi';
import type { PreviewImageResponse } from '../../types/config';

interface Props {
  value: PreprocessingConfig;
  onChange: (v: PreprocessingConfig) => void;
  datasetPath: string | null;
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

export default function PreprocessingForm({ value, onChange, datasetPath }: Props) {
  const { datasetMeta } = useDatasetStore();
  const availableBgMethods = datasetMeta?.available_bg_methods ?? [];

  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewData, setPreviewData] = useState<PreviewImageResponse | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);

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

  async function handlePreview() {
    if (!datasetPath) return;
    setPreviewLoading(true);
    setPreviewError(null);
    setPreviewData(null);
    try {
      const res = await previewPreprocessing(
        datasetPath,
        value.background_method,
        value.method,
        value.params as Record<string, unknown> | null,
        value.image_size,
      );
      setPreviewData(res.data);
    } catch (e: unknown) {
      const detail = (e as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
      setPreviewError(
        typeof detail === 'string' ? detail : (e as { message?: string })?.message ?? '미리보기 실패',
      );
    } finally {
      setPreviewLoading(false);
    }
  }

  const previewDisabled = !datasetPath || previewLoading || value.image_size % 32 !== 0;

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

        {/* he 안내 */}
        {value.method === 'he' && (
          <div className="col-span-2 bg-sky-50 border border-sky-200 rounded-lg px-3 py-2 text-xs text-sky-700">
            히스토그램 평탄화(HE)는 파라미터가 없습니다.
          </div>
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
              className={`${inputCls} ${value.image_size % 32 !== 0 ? 'border-red-400 focus:ring-red-400 focus:border-red-400' : ''}`} />
            <span className="text-xs text-slate-400 whitespace-nowrap">px</span>
          </div>
          {value.image_size % 32 !== 0 && (
            <p className="text-xs text-red-500 mt-1">32의 배수만 입력 가능합니다.</p>
          )}
        </Field>
      </div>

      {/* 배경 분리 */}
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1.5">배경 분리</label>
        <div className="flex items-center gap-2 flex-wrap">
          {(['none', 'sam2', 'sam3'] as const).map((m) => {
            const isDisabled = m !== 'none' && !availableBgMethods.includes(m);
            return (
              <button key={m} type="button"
                onClick={() => set('background_method', m)}
                disabled={isDisabled}
                className={`px-4 py-1.5 text-sm font-medium rounded-lg border transition-colors ${
                  isDisabled
                    ? 'border-slate-200 text-slate-300 bg-slate-50 cursor-not-allowed'
                    : value.background_method === m
                    ? 'bg-sky-600 text-white border-sky-600 cursor-pointer'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer'
                }`}>
                {m === 'none' ? 'none' : m.toUpperCase()}
              </button>
            );
          })}
        </div>
        {datasetMeta && (['sam2', 'sam3'] as const).filter(m => !availableBgMethods.includes(m)).length > 0 && (
          <p className="mt-1.5 text-xs text-slate-400">
            {(['sam2', 'sam3'] as const)
              .filter(m => !availableBgMethods.includes(m))
              .map(m => `${datasetPath?.split(/[\\/]/).pop() ?? ''}_${m}`)
              .join(', ')} 폴더 없음
          </p>
        )}
      </div>

      {/* 미리보기 섹션 */}
      <div className="border-t border-slate-100 pt-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-500">전처리 미리보기</span>
          <button
            type="button"
            onClick={handlePreview}
            disabled={previewDisabled}
            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-sky-300 text-sky-700 bg-sky-50 hover:bg-sky-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            {previewLoading ? '로딩 중...' : '미리보기'}
          </button>
        </div>

        {!datasetPath && (
          <p className="text-xs text-slate-400">탭1에서 데이터셋을 검증하면 미리보기가 활성화됩니다.</p>
        )}

        {previewError && (
          <p className="text-xs text-red-500">{previewError}</p>
        )}

        {previewData?.warning && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-700">
            {previewData.warning}
          </div>
        )}

        {previewData && (
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <span className="text-xs text-slate-400 text-center">원본</span>
              <img
                src={`data:image/png;base64,${previewData.original_b64}`}
                alt="원본"
                className="w-full rounded-lg border border-slate-200 object-contain"
              />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs text-slate-400 text-center">전처리 후</span>
              <img
                src={`data:image/png;base64,${previewData.processed_b64}`}
                alt="전처리 후"
                className="w-full rounded-lg border border-slate-200 object-contain"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
