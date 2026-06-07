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

interface Props {
  value: PatchCoreParamsState;
  onChange: (v: PatchCoreParamsState) => void;
}

export default function PatchCoreParams({ value, onChange }: Props) {
  function set<K extends keyof PatchCoreParamsState>(key: K, val: PatchCoreParamsState[K]) {
    onChange({ ...value, [key]: val });
  }

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center gap-3">
        <label className="w-28 shrink-0 text-xs text-gray-600">Backbone</label>
        <select
          value={value.backbone}
          onChange={(e) =>
            set('backbone', e.target.value as 'wide_resnet50_2' | 'resnet18' | 'resnet50')
          }
          className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:border-blue-400"
        >
          <option value="wide_resnet50_2">wide_resnet50_2</option>
          <option value="resnet50">resnet50</option>
          <option value="resnet18">resnet18</option>
        </select>
      </div>

      <div className="flex items-center gap-3">
        <label className="w-28 shrink-0 text-xs text-gray-600">Pretrained</label>
        <select
          value={value.pretrained_source}
          onChange={(e) => set('pretrained_source', e.target.value as 'torchvision' | 'local')}
          className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:border-blue-400"
        >
          <option value="torchvision">torchvision</option>
          <option value="local">local</option>
        </select>
      </div>

      {value.pretrained_source === 'local' && (
        <div className="flex items-center gap-3">
          <label className="w-28 shrink-0 text-xs text-gray-600">모델 경로</label>
          <input
            type="text"
            value={value.pretrained_path ?? ''}
            onChange={(e) => set('pretrained_path', e.target.value || null)}
            placeholder="./weights/resnet50.pth"
            className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:border-blue-400"
          />
        </div>
      )}

      <div className="flex items-center gap-3">
        <label className="w-28 shrink-0 text-xs text-gray-600">Coreset Ratio</label>
        <input
          type="number"
          value={value.coreset_sampling_ratio}
          min={0.01}
          max={1.0}
          step={0.05}
          onChange={(e) => set('coreset_sampling_ratio', parseFloat(e.target.value))}
          className="w-24 border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:border-blue-400"
        />
      </div>

      <div className="flex items-center gap-3">
        <label className="w-28 shrink-0 text-xs text-gray-600">Kernel Size</label>
        <select
          value={value.neighbourhood_kernel_size}
          onChange={(e) =>
            set('neighbourhood_kernel_size', parseInt(e.target.value, 10) as 1 | 3 | 5 | 7 | 9)
          }
          className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:border-blue-400"
        >
          {[1, 3, 5, 7, 9].map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-3">
        <label className="w-28 shrink-0 text-xs text-gray-600">Max Train</label>
        <input
          type="number"
          value={value.max_train}
          min={100}
          max={10000}
          step={100}
          onChange={(e) => set('max_train', parseInt(e.target.value, 10))}
          className="w-24 border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:border-blue-400"
        />
      </div>

      <div className="flex items-center gap-3">
        <label className="w-28 shrink-0 text-xs text-gray-600">kNN</label>
        <input
          type="number"
          value={value.knn}
          min={1}
          max={50}
          step={1}
          onChange={(e) => set('knn', parseInt(e.target.value, 10))}
          className="w-24 border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:border-blue-400"
        />
      </div>

      <div className="flex items-center gap-3">
        <label className="w-28 shrink-0 text-xs text-gray-600">Top-K Ratio</label>
        <input
          type="number"
          value={value.top_k_ratio}
          min={0}
          max={1}
          step={0.05}
          onChange={(e) => set('top_k_ratio', parseFloat(e.target.value))}
          className="w-24 border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:border-blue-400"
        />
      </div>
    </div>
  );
}
