import type { PatchCoreParamsState } from '../../types/modelParams';

export type { PatchCoreParamsState };

export const DEFAULT_PATCHCORE: PatchCoreParamsState = {
  backbone: 'wide_resnet50_2',
  pretrained_source: 'torchvision',
  pretrained_path: null,
  coreset_sampling_ratio: 0.1,
  neighbourhood_kernel_size: 3,
  max_train: 1000,
  knn: 9,
  top_k_ratio: 0.1,
};

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

interface Props {
  value: PatchCoreParamsState;
  onChange: (v: PatchCoreParamsState) => void;
}

export default function PatchCoreParams({ value, onChange }: Props) {
  function set<K extends keyof PatchCoreParamsState>(key: K, val: PatchCoreParamsState[K]) {
    onChange({ ...value, [key]: val });
  }

  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-4">
      <Field label="Backbone">
        <select value={value.backbone}
          onChange={(e) => set('backbone', e.target.value as 'wide_resnet50_2' | 'resnet18' | 'resnet50')}
          className={selectCls}>
          <option value="wide_resnet50_2">wide_resnet50_2</option>
          <option value="resnet50">resnet50</option>
          <option value="resnet18">resnet18</option>
        </select>
      </Field>

      <Field label="Pretrained">
        <select value={value.pretrained_source}
          onChange={(e) => set('pretrained_source', e.target.value as 'torchvision' | 'local')}
          className={selectCls}>
          <option value="torchvision">torchvision</option>
          <option value="local">local</option>
        </select>
      </Field>

      {value.pretrained_source === 'local' && (
        <div className="col-span-2">
          <Field label="모델 경로">
            <input type="text"
              value={value.pretrained_path ?? ''}
              onChange={(e) => set('pretrained_path', e.target.value || null)}
              placeholder="./weights/resnet50.pth"
              className={inputCls} />
          </Field>
        </div>
      )}

      <Field label="Coreset Ratio">
        <input type="number" value={value.coreset_sampling_ratio}
          min={0.01} max={1.0} step={0.05}
          onChange={(e) => set('coreset_sampling_ratio', parseFloat(e.target.value))}
          className={inputCls} />
      </Field>

      <Field label="Kernel Size">
        <select value={value.neighbourhood_kernel_size}
          onChange={(e) => set('neighbourhood_kernel_size', parseInt(e.target.value, 10) as 1 | 3 | 5 | 7 | 9)}
          className={selectCls}>
          {[1, 3, 5, 7, 9].map((v) => (
            <option key={v} value={v}>{v}</option>
          ))}
        </select>
      </Field>

      <Field label="Max Train">
        <input type="number" value={value.max_train}
          min={100} max={10000} step={100}
          onChange={(e) => set('max_train', parseInt(e.target.value, 10))}
          className={inputCls} />
      </Field>

      <Field label="kNN">
        <input type="number" value={value.knn}
          min={1} max={50} step={1}
          onChange={(e) => set('knn', parseInt(e.target.value, 10))}
          className={inputCls} />
      </Field>

      <Field label="Top-K Ratio">
        <input type="number" value={value.top_k_ratio}
          min={0} max={1} step={0.05}
          onChange={(e) => set('top_k_ratio', parseFloat(e.target.value))}
          className={inputCls} />
      </Field>
    </div>
  );
}
