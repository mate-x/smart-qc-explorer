import { useState } from 'react';
import type { EfficientAdParamsState } from '../../types/modelParams';

export type { EfficientAdParamsState };

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
  early_stopping: false,
  patience: 5000,
  min_delta: 0.001,
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

function NumInput({ value, onChange, min, max, step }: {
  value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number;
}) {
  return (
    <input type="number" value={value} min={min} max={max} step={step}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className={inputCls} />
  );
}

interface Props {
  value: EfficientAdParamsState;
  onChange: (v: EfficientAdParamsState) => void;
}

export default function EfficientAdParams({ value, onChange }: Props) {
  const [advOpen, setAdvOpen] = useState(false);

  function set<K extends keyof EfficientAdParamsState>(key: K, val: EfficientAdParamsState[K]) {
    onChange({ ...value, [key]: val });
  }

  return (
    <div className="flex flex-col gap-4">
      {/* 기본 파라미터 — Streamlit col1/col2 순서: model_size|lr, train_steps|wd, optimizer|padding, out_channels|early_stopping */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-4">
        <Field label="Model Size">
          <select value={value.model_size}
            onChange={(e) => set('model_size', e.target.value as 'small' | 'medium')}
            className={selectCls}>
            <option value="small">small</option>
            <option value="medium">medium</option>
          </select>
        </Field>

        <Field label="Learning Rate">
          <NumInput value={value.learning_rate}
            onChange={(v) => set('learning_rate', v)}
            min={0.000001} max={0.1} step={0.0001} />
        </Field>

        <Field label="Train Steps">
          <NumInput value={value.train_steps}
            onChange={(v) => set('train_steps', Math.round(v))}
            min={1000} max={200000} step={1000} />
        </Field>

        <Field label="Weight Decay">
          <NumInput value={value.weight_decay}
            onChange={(v) => set('weight_decay', v)}
            min={0} max={0.1} step={0.00001} />
        </Field>

        <Field label="Optimizer">
          <select value={value.optimizer}
            onChange={(e) => set('optimizer', e.target.value as 'adam' | 'adamw' | 'sgd')}
            className={selectCls}>
            <option value="adam">adam</option>
            <option value="adamw">adamw</option>
            <option value="sgd">sgd</option>
          </select>
        </Field>

        <Field label="Padding">
          <div className="flex items-center h-[38px]">
            <input type="checkbox" checked={value.padding}
              onChange={(e) => set('padding', e.target.checked)}
              className="w-4 h-4 cursor-pointer accent-sky-600" />
          </div>
        </Field>

        <Field label="Out Channels">
          <select value={value.out_channels}
            onChange={(e) => set('out_channels', parseInt(e.target.value, 10) as 128 | 256 | 384 | 512)}
            className={selectCls}>
            <option value={128}>128</option>
            <option value={256}>256</option>
            <option value={384}>384</option>
            <option value={512}>512</option>
          </select>
        </Field>

        <Field label="Early Stopping">
          <div className="flex items-center h-[38px]">
            <input type="checkbox" checked={value.early_stopping}
              onChange={(e) => set('early_stopping', e.target.checked)}
              className="w-4 h-4 cursor-pointer accent-sky-600" />
          </div>
        </Field>

        {value.early_stopping && (
          <>
            <Field label="Patience (steps)">
              <NumInput value={value.patience}
                onChange={(v) => set('patience', Math.round(v))}
                min={100} max={200000} step={500} />
            </Field>
            <Field label="Min Delta">
              <NumInput value={value.min_delta}
                onChange={(v) => set('min_delta', v)}
                min={0} max={1} step={0.001} />
            </Field>
          </>
        )}
      </div>

      {/* AE Loss Weight — expander 바깥 별도 슬라이더 (Streamlit 동일) */}
      <Field label="AE Loss Weight (α)">
        <div className="flex items-center gap-3">
          <input
            type="range"
            value={value.ae_loss_weight}
            min={0} max={1} step={0.01}
            onChange={(e) => set('ae_loss_weight', parseFloat(e.target.value))}
            className="flex-1 accent-sky-600 cursor-pointer" />
          <span className="text-sm text-slate-700 w-10 text-right tabular-nums">
            {value.ae_loss_weight.toFixed(2)}
          </span>
        </div>
      </Field>

      {/* 고급 설정 */}
      <div>
        <button type="button"
          onClick={() => setAdvOpen((o) => !o)}
          className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 transition-colors cursor-pointer">
          <span>{advOpen ? '▾' : '▸'}</span>
          고급 설정
        </button>

        {advOpen && (
          <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-4 pl-3 border-l-2 border-slate-100">
            <Field label="AutoEncoder LR">
              <NumInput value={value.autoencoder_lr}
                onChange={(v) => set('autoencoder_lr', v)}
                min={0.000001} max={0.1} step={0.00001} />
            </Field>

            <Field label="AE Weight Decay">
              <NumInput value={value.autoencoder_weight_decay}
                onChange={(v) => set('autoencoder_weight_decay', v)}
                min={0} max={0.1} step={0.00001} />
            </Field>

            <Field label="LR Decay Steps">
              <NumInput value={value.lr_decay_epochs}
                onChange={(v) => set('lr_decay_epochs', Math.round(v))}
                min={1000} max={200000} step={1000} />
            </Field>

            <Field label="LR Decay Factor">
              <NumInput value={value.lr_decay_factor}
                onChange={(v) => set('lr_decay_factor', v)}
                min={0.01} max={1} step={0.05} />
            </Field>

            <Field label="Scheduler">
              <select value={value.scheduler}
                onChange={(e) => set('scheduler', e.target.value as 'StepLR' | 'CosineAnnealingLR')}
                className={selectCls}>
                <option value="StepLR">StepLR</option>
                <option value="CosineAnnealingLR">CosineAnnealingLR</option>
              </select>
            </Field>

            <Field label="ImageNet Penalty">
              <div className="flex items-center h-[38px]">
                <input type="checkbox" checked={value.use_imagenet_penalty}
                  onChange={(e) => set('use_imagenet_penalty', e.target.checked)}
                  className="w-4 h-4 cursor-pointer accent-sky-600" />
              </div>
            </Field>

            {value.use_imagenet_penalty && (
              <Field label="Penalty Batch">
                <NumInput value={value.penalty_batch_size}
                  onChange={(v) => set('penalty_batch_size', Math.round(v))}
                  min={1} max={64} step={1} />
              </Field>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
