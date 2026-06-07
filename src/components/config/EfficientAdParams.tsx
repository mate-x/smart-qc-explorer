import { useState } from 'react';

export interface EfficientAdParamsState {
  model_size: 'small' | 'medium';
  train_steps: number;
  optimizer: 'adam' | 'adamw' | 'sgd';
  learning_rate: number;
  weight_decay: number;
  out_channels: 128 | 256 | 384 | 512;
  padding: boolean;
  ae_loss_weight: number;
  autoencoder_lr: number;
  autoencoder_weight_decay: number;
  lr_decay_epochs: number;
  lr_decay_factor: number;
  scheduler: 'StepLR' | 'CosineAnnealingLR';
  use_imagenet_penalty: boolean;
  penalty_batch_size: number;
}

export const DEFAULT_EFFICIENTAD: EfficientAdParamsState = {
  model_size: 'medium',
  train_steps: 70000,
  optimizer: 'adam',
  learning_rate: 0.0001,
  weight_decay: 0.0001,
  out_channels: 384,
  padding: false,
  ae_loss_weight: 0.5,
  autoencoder_lr: 0.0001,
  autoencoder_weight_decay: 0.00001,
  lr_decay_epochs: 50000,
  lr_decay_factor: 0.1,
  scheduler: 'StepLR',
  use_imagenet_penalty: false,
  penalty_batch_size: 8,
};

interface Props {
  value: EfficientAdParamsState;
  onChange: (v: EfficientAdParamsState) => void;
}

function NumInput({
  value,
  onChange,
  min,
  max,
  step,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <input
      type="number"
      value={value}
      min={min}
      max={max}
      step={step}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className="w-28 border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:border-blue-400"
    />
  );
}

export default function EfficientAdParams({ value, onChange }: Props) {
  const [advOpen, setAdvOpen] = useState(false);

  function set<K extends keyof EfficientAdParamsState>(key: K, val: EfficientAdParamsState[K]) {
    onChange({ ...value, [key]: val });
  }

  return (
    <div className="flex flex-col gap-3">
      {/* 기본 파라미터 */}
      <div className="flex flex-col gap-2.5">
        <div className="flex items-center gap-3">
          <label className="w-28 shrink-0 text-xs text-gray-600">Model Size</label>
          <select
            value={value.model_size}
            onChange={(e) => set('model_size', e.target.value as 'small' | 'medium')}
            className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:border-blue-400"
          >
            <option value="small">small</option>
            <option value="medium">medium</option>
          </select>
        </div>

        <div className="flex items-center gap-3">
          <label className="w-28 shrink-0 text-xs text-gray-600">Train Steps</label>
          <NumInput
            value={value.train_steps}
            onChange={(v) => set('train_steps', Math.round(v))}
            min={1000}
            max={200000}
            step={1000}
          />
        </div>

        <div className="flex items-center gap-3">
          <label className="w-28 shrink-0 text-xs text-gray-600">Optimizer</label>
          <select
            value={value.optimizer}
            onChange={(e) => set('optimizer', e.target.value as 'adam' | 'adamw' | 'sgd')}
            className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:border-blue-400"
          >
            <option value="adam">adam</option>
            <option value="adamw">adamw</option>
            <option value="sgd">sgd</option>
          </select>
        </div>

        <div className="flex items-center gap-3">
          <label className="w-28 shrink-0 text-xs text-gray-600">Learning Rate</label>
          <NumInput
            value={value.learning_rate}
            onChange={(v) => set('learning_rate', v)}
            min={0.000001}
            max={0.1}
            step={0.0001}
          />
        </div>
      </div>

      {/* 고급 파라미터 */}
      <div>
        <button
          type="button"
          onClick={() => setAdvOpen((o) => !o)}
          className="text-xs text-gray-500 flex items-center gap-1 hover:text-gray-800 cursor-pointer"
        >
          <span>{advOpen ? '▾' : '▸'}</span>
          고급 설정
        </button>

        {advOpen && (
          <div className="mt-2 flex flex-col gap-2.5 pl-2 border-l border-gray-200">
            <div className="flex items-center gap-3">
              <label className="w-28 shrink-0 text-xs text-gray-600">Weight Decay</label>
              <NumInput
                value={value.weight_decay}
                onChange={(v) => set('weight_decay', v)}
                min={0}
                max={0.1}
                step={0.00001}
              />
            </div>

            <div className="flex items-center gap-3">
              <label className="w-28 shrink-0 text-xs text-gray-600">Out Channels</label>
              <select
                value={value.out_channels}
                onChange={(e) =>
                  set('out_channels', parseInt(e.target.value, 10) as 128 | 256 | 384 | 512)
                }
                className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:border-blue-400"
              >
                <option value={128}>128</option>
                <option value={256}>256</option>
                <option value={384}>384</option>
                <option value={512}>512</option>
              </select>
            </div>

            <div className="flex items-center gap-3">
              <label className="w-28 shrink-0 text-xs text-gray-600">Padding</label>
              <input
                type="checkbox"
                checked={value.padding}
                onChange={(e) => set('padding', e.target.checked)}
                className="w-4 h-4 cursor-pointer"
              />
            </div>

            <div className="flex items-center gap-3">
              <label className="w-28 shrink-0 text-xs text-gray-600">AE Loss Weight</label>
              <NumInput
                value={value.ae_loss_weight}
                onChange={(v) => set('ae_loss_weight', v)}
                min={0}
                max={1}
                step={0.1}
              />
            </div>

            <div className="flex items-center gap-3">
              <label className="w-28 shrink-0 text-xs text-gray-600">AutoEncoder LR</label>
              <NumInput
                value={value.autoencoder_lr}
                onChange={(v) => set('autoencoder_lr', v)}
                min={0.000001}
                max={0.1}
                step={0.00001}
              />
            </div>

            <div className="flex items-center gap-3">
              <label className="w-28 shrink-0 text-xs text-gray-600">AE Weight Decay</label>
              <NumInput
                value={value.autoencoder_weight_decay}
                onChange={(v) => set('autoencoder_weight_decay', v)}
                min={0}
                max={0.1}
                step={0.00001}
              />
            </div>

            <div className="flex items-center gap-3">
              <label className="w-28 shrink-0 text-xs text-gray-600">LR Decay Steps</label>
              <NumInput
                value={value.lr_decay_epochs}
                onChange={(v) => set('lr_decay_epochs', Math.round(v))}
                min={1000}
                max={200000}
                step={1000}
              />
            </div>

            <div className="flex items-center gap-3">
              <label className="w-28 shrink-0 text-xs text-gray-600">LR Decay Factor</label>
              <NumInput
                value={value.lr_decay_factor}
                onChange={(v) => set('lr_decay_factor', v)}
                min={0.01}
                max={1}
                step={0.05}
              />
            </div>

            <div className="flex items-center gap-3">
              <label className="w-28 shrink-0 text-xs text-gray-600">Scheduler</label>
              <select
                value={value.scheduler}
                onChange={(e) =>
                  set('scheduler', e.target.value as 'StepLR' | 'CosineAnnealingLR')
                }
                className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:border-blue-400"
              >
                <option value="StepLR">StepLR</option>
                <option value="CosineAnnealingLR">CosineAnnealingLR</option>
              </select>
            </div>

            <div className="flex items-center gap-3">
              <label className="w-28 shrink-0 text-xs text-gray-600">ImageNet Penalty</label>
              <input
                type="checkbox"
                checked={value.use_imagenet_penalty}
                onChange={(e) => set('use_imagenet_penalty', e.target.checked)}
                className="w-4 h-4 cursor-pointer"
              />
            </div>

            {value.use_imagenet_penalty && (
              <div className="flex items-center gap-3">
                <label className="w-28 shrink-0 text-xs text-gray-600">Penalty Batch</label>
                <NumInput
                  value={value.penalty_batch_size}
                  onChange={(v) => set('penalty_batch_size', Math.round(v))}
                  min={1}
                  max={64}
                  step={1}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
