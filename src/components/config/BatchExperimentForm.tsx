import { useState, useMemo } from 'react';
import type { PreprocessingConfig, ModelConfig } from '../../types/config';
import type { EfficientAdParamsState, PatchCoreParamsState } from '../../types/modelParams';
import { useLocalQueueStore } from '../../store/localQueueStore';
import { DEFAULT_EFFICIENTAD } from './EfficientAdParams';
import { DEFAULT_PATCHCORE } from './PatchCoreParams';

const IMAGENET_MEAN: [number, number, number] = [0.485, 0.456, 0.406];
const IMAGENET_STD: [number, number, number] = [0.229, 0.224, 0.225];
const PAGE_SIZE = 10;

// ── 유틸 ──

function toggle<T>(arr: T[], item: T): T[] {
  return arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item];
}

// ── TagInput ──

interface TagInputProps {
  values: number[];
  onAdd: (v: number) => void;
  onRemove: (v: number) => void;
  defaultValue: number;
  step?: number;
  fmt?: (v: number) => string;
  validate?: (v: number) => string | null;
}

function TagInput({ values, onAdd, onRemove, defaultValue, step = 1, fmt, validate }: TagInputProps) {
  const [input, setInput] = useState(String(defaultValue));
  const [error, setError] = useState<string | null>(null);

  function handleAdd() {
    const v = parseFloat(input);
    if (isNaN(v)) return;
    if (validate) {
      const msg = validate(v);
      if (msg) { setError(msg); return; }
    }
    setError(null);
    if (!values.includes(v)) onAdd(v);
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex gap-1.5">
        <input
          type="number"
          value={input}
          step={step}
          onChange={(e) => { setInput(e.target.value); setError(null); }}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAdd(); } }}
          className="flex-1 border border-slate-200 rounded-lg px-3 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-400"
        />
        <button
          type="button"
          onClick={handleAdd}
          className="px-2.5 py-1.5 text-xs bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
        >추가</button>
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
      {values.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-0.5">
          {values.map((v) => (
            <span key={v} className="flex items-center gap-1 bg-sky-50 border border-sky-200 text-sky-700 text-xs px-2 py-0.5 rounded-full">
              {fmt ? fmt(v) : String(v)}
              <button type="button" onClick={() => onRemove(v)} className="cursor-pointer opacity-60 hover:opacity-100">✕</button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ── CheckGroup ──

interface CheckGroupProps {
  options: string[];
  selected: string[];
  onToggle: (opt: string) => void;
}

function CheckGroup({ options, selected, onToggle }: CheckGroupProps) {
  return (
    <div className="flex flex-wrap gap-3">
      {options.map((opt) => (
        <label key={opt} className="flex items-center gap-1.5 text-xs cursor-pointer">
          <input
            type="checkbox"
            checked={selected.includes(opt)}
            onChange={() => onToggle(opt)}
            className="cursor-pointer accent-sky-600"
          />
          <span className="text-slate-700">{opt}</span>
        </label>
      ))}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-slate-500">{label}</span>
      {children}
    </div>
  );
}

// ── 조합 행 타입 ──

interface ComboRow {
  preprocessing_config: PreprocessingConfig;
  model_config: ModelConfig;
}

// ── 컴포넌트 ──

interface Props {
  preConfig: PreprocessingConfig;
}

export default function BatchExperimentForm({ preConfig }: Props) {
  const { addLocalItem } = useLocalQueueStore();
  const [modelType, setModelType] = useState<'efficientad' | 'patchcore'>('efficientad');

  // 공통 파라미터
  const [preMethods, setPreMethods] = useState<string[]>([]);
  const [bgMethods, setBgMethods] = useState<string[]>([]);
  const [normMethods, setNormMethods] = useState<string[]>([]);
  const [imageSizes, setImageSizes] = useState<number[]>([256]);
  const [commonAdvOpen, setCommonAdvOpen] = useState(false);
  const [batchSizes, setBatchSizes] = useState<number[]>([16]);
  const [randomSeeds, setRandomSeeds] = useState<number[]>([42]);
  const [thresholdMethods, setThresholdMethods] = useState<string[]>([]);
  const [thresholdValues, setThresholdValues] = useState<number[]>([95.0]);

  // EfficientAD 파라미터
  const [effModelSizes, setEffModelSizes] = useState<string[]>([]);
  const [effOptimizers, setEffOptimizers] = useState<string[]>([]);
  const [effSchedulers, setEffSchedulers] = useState<string[]>([]);
  const [effOutChannels, setEffOutChannels] = useState<string[]>([]);
  const [effTrainSteps, setEffTrainSteps] = useState<number[]>([70000]);
  const [effLRs, setEffLRs] = useState<number[]>([0.0001]);
  const [effAdvOpen, setEffAdvOpen] = useState(false);
  const [effPaddings, setEffPaddings] = useState<string[]>([]);
  const [effPenalties, setEffPenalties] = useState<string[]>([]);
  const [effWeightDecays, setEffWeightDecays] = useState<number[]>([0.0001]);
  const [effAeLossWeights, setEffAeLossWeights] = useState<number[]>([0.5]);
  const [effAeLrs,          setEffAeLrs         ] = useState<number[]>([0.0001]);
  const [effAeWeightDecays, setEffAeWeightDecays] = useState<number[]>([0.00001]);
  const [effLrDecayEpochs,  setEffLrDecayEpochs ] = useState<number[]>([50000]);
  const [effLrDecayFactors, setEffLrDecayFactors] = useState<number[]>([0.1]);
  const [effPenaltyBatches, setEffPenaltyBatches] = useState<number[]>([8]);
  const [effEarlyStoppings, setEffEarlyStoppings] = useState<string[]>([]);
  const [effPatiences,      setEffPatiences     ] = useState<number[]>([5000]);
  const [effMinDeltas,      setEffMinDeltas     ] = useState<number[]>([0.001]);

  // PatchCore 파라미터
  const [pcBackbones, setPcBackbones] = useState<string[]>([]);
  const [pcKernels, setPcKernels] = useState<string[]>([]);
  const [pcCoresets, setPcCoresets] = useState<number[]>([0.1]);
  const [pcAdvOpen, setPcAdvOpen] = useState(false);
  const [pcMaxTrains, setPcMaxTrains] = useState<number[]>([1000]);
  const [pcKnns, setPcKnns] = useState<number[]>([9]);
  const [pcTopKs, setPcTopKs] = useState<number[]>([0.1]);

  // 페이지네이션 & 선택
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  function handleModelTypeChange(mt: 'efficientad' | 'patchcore') {
    setModelType(mt);
    setSelected(new Set());
    setPage(0);
  }

  // 조합 계산
  const combos = useMemo<ComboRow[]>(() => {
    // 폴백
    const methods = preMethods.length  > 0 ? preMethods  : ['없음'];
    const bgs     = bgMethods.length   > 0 ? bgMethods   : ['none'];
    const norms   = normMethods.length > 0 ? normMethods : ['ImageNet'];
    const sizes   = imageSizes;
    const batches = batchSizes;
    const seeds   = randomSeeds;
    const tMethods = thresholdMethods.length > 0 ? thresholdMethods : ['percentile'];
    const tValues  = thresholdValues;

    // EfficientAD 폴백
    const mSizes = effModelSizes.length   > 0 ? effModelSizes  : ['medium'];
    const opts   = effOptimizers.length   > 0 ? effOptimizers  : ['adam'];
    const scheds = effSchedulers.length   > 0 ? effSchedulers  : ['StepLR'];
    const ocs    = (effOutChannels.length > 0 ? effOutChannels : ['384']).map(Number);
    const steps  = effTrainSteps;
    const lrs    = effLRs;
    const pads   = effPaddings.length     > 0 ? effPaddings    : ['False'];
    const pens   = effPenalties.length    > 0 ? effPenalties   : ['False'];
    const wds    = effWeightDecays;
    const aelws  = effAeLossWeights;
    const aelrs  = effAeLrs;
    const aelwds = effAeWeightDecays;
    const lrdes  = effLrDecayEpochs;
    const lrdfs  = effLrDecayFactors;
    const pbs    = effPenaltyBatches;
    const ess    = effEarlyStoppings.length > 0 ? effEarlyStoppings : ['False'];
    const pats   = effPatiences;
    const mds    = effMinDeltas;

    // PatchCore 폴백
    const bbs  = pcBackbones.length > 0 ? pcBackbones : ['wide_resnet50_2'];
    const ks   = (pcKernels.length  > 0 ? pcKernels   : ['3']).map(Number);
    const crs  = pcCoresets;
    const mts  = pcMaxTrains;
    const knns = pcKnns;
    const tks  = pcTopKs;

    // Step 1: 전처리 조합 배열 빌드
    const preCombos: Array<{
      pre: PreprocessingConfig;
      batch: number;
      seed: number;
      tm: 'percentile' | 'absolute';
      tv: number;
    }> = [];

    for (const m of methods) {
      const preMethod = m === '없음' ? 'none' : m === 'Homomorphic' ? 'homomorphic' : m === 'HE' ? 'he' : 'clahe';
      for (const bg of bgs) {
        const bgMethod = bg === 'SAM2' ? 'sam2' : 'none';
        for (const norm of norms) {
          const mean = norm === 'ImageNet' ? IMAGENET_MEAN : preConfig.mean;
          const std = norm === 'ImageNet' ? IMAGENET_STD : preConfig.std;
          for (const sz of sizes) {
            for (const batch of batches) {
              for (const seed of seeds) {
                for (const tm of tMethods) {
                  for (const tv of tValues) {
                    preCombos.push({
                      pre: {
                        method: preMethod as PreprocessingConfig['method'],
                        background_method: bgMethod as PreprocessingConfig['background_method'],
                        resize_mode: 'padding',
                        image_size: sz,
                        normalization: 'imagenet',
                        mean,
                        std,
                        params: null,
                      },
                      batch,
                      seed,
                      tm: tm as 'percentile' | 'absolute',
                      tv,
                    });
                  }
                }
              }
            }
          }
        }
      }
    }

    // Step 2: 모델 파라미터 배열 빌드 + preCombos 교차
    const rows: ComboRow[] = [];

    if (modelType === 'efficientad') {
      type P = EfficientAdParamsState;
      let ep: P[] = [{ ...DEFAULT_EFFICIENTAD }];
      ep = mSizes .flatMap(ms  => ep.map(p => ({ ...p, model_size:              ms  as P['model_size']   })));
      ep = opts   .flatMap(opt => ep.map(p => ({ ...p, optimizer:               opt as P['optimizer']    })));
      ep = scheds .flatMap(s   => ep.map(p => ({ ...p, scheduler:               s   as P['scheduler']    })));
      ep = ocs    .flatMap(oc  => ep.map(p => ({ ...p, out_channels:            oc  as P['out_channels'] })));
      ep = steps  .flatMap(st  => ep.map(p => ({ ...p, train_steps:             st                       })));
      ep = lrs    .flatMap(lr  => ep.map(p => ({ ...p, learning_rate:           lr                       })));
      ep = pads   .flatMap(pad => ep.map(p => ({ ...p, padding:                 pad === 'True'           })));
      ep = pens   .flatMap(pen => ep.map(p => ({ ...p, use_imagenet_penalty:    pen === 'True'           })));
      ep = wds    .flatMap(wd  => ep.map(p => ({ ...p, weight_decay:            wd                       })));
      ep = aelws  .flatMap(w   => ep.map(p => ({ ...p, ae_loss_weight:          w                        })));
      ep = aelrs  .flatMap(r   => ep.map(p => ({ ...p, autoencoder_lr:          r                        })));
      ep = aelwds .flatMap(w   => ep.map(p => ({ ...p, autoencoder_weight_decay: w                       })));
      ep = lrdes  .flatMap(e   => ep.map(p => ({ ...p, lr_decay_epochs:         e                        })));
      ep = lrdfs  .flatMap(f   => ep.map(p => ({ ...p, lr_decay_factor:         f                        })));
      ep = pbs    .flatMap(b   => ep.map(p => ({ ...p, penalty_batch_size:      b                        })));
      ep = ess    .flatMap(es  => ep.map(p => ({ ...p, early_stopping:          es === 'True'            })));
      ep = pats   .flatMap(pt  => ep.map(p => ({ ...p, patience:                pt                       })));
      ep = mds    .flatMap(md  => ep.map(p => ({ ...p, min_delta:               md                       })));

      for (const { pre, batch, seed, tm, tv } of preCombos) {
        for (const effParams of ep) {
          rows.push({
            preprocessing_config: pre,
            model_config: {
              model_type: 'efficientad',
              batch_size: batch,
              random_seed: seed,
              threshold_method: tm,
              threshold_value: tv,
              params: effParams,
            },
          });
        }
      }
    } else {
      type PC = PatchCoreParamsState;
      let pp: PC[] = [{ ...DEFAULT_PATCHCORE }];
      pp = bbs .flatMap(bb => pp.map(p => ({ ...p, backbone:                  bb as PC['backbone']                  })));
      pp = ks  .flatMap(k  => pp.map(p => ({ ...p, neighbourhood_kernel_size: k  as PC['neighbourhood_kernel_size'] })));
      pp = crs .flatMap(cr => pp.map(p => ({ ...p, coreset_sampling_ratio:    cr                                    })));
      pp = mts .flatMap(mt => pp.map(p => ({ ...p, max_train:                 mt                                    })));
      pp = knns.flatMap(kn => pp.map(p => ({ ...p, knn:                       kn                                    })));
      pp = tks .flatMap(tk => pp.map(p => ({ ...p, top_k_ratio:               tk                                    })));

      for (const { pre, batch, seed, tm, tv } of preCombos) {
        for (const pcParams of pp) {
          rows.push({
            preprocessing_config: pre,
            model_config: {
              model_type: 'patchcore',
              batch_size: batch,
              random_seed: seed,
              threshold_method: tm,
              threshold_value: tv,
              params: pcParams,
            },
          });
        }
      }
    }

    return rows;
  }, [
    modelType, preMethods, bgMethods, normMethods, imageSizes, batchSizes,
    randomSeeds, thresholdMethods, thresholdValues,
    effModelSizes, effOptimizers, effSchedulers, effOutChannels, effTrainSteps,
    effLRs, effPaddings, effPenalties, effWeightDecays, effAeLossWeights,
    effAeLrs, effAeWeightDecays, effLrDecayEpochs, effLrDecayFactors,
    effPenaltyBatches, effEarlyStoppings, effPatiences, effMinDeltas,
    pcBackbones, pcKernels, pcCoresets, pcMaxTrains, pcKnns, pcTopKs, preConfig,
  ]);

  const totalPages = Math.max(1, Math.ceil(combos.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const pageItems = combos.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);
  const selectedCount = selected.size;

  function handleRowToggle(globalIdx: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(globalIdx)) next.delete(globalIdx);
      else next.add(globalIdx);
      return next;
    });
  }

  function handleAdd() {
    if (selectedCount === 0 || combos.length === 0) return;
    const setId = `SET_${crypto.randomUUID().replace(/-/g, '').slice(0, 8)}`;
    selected.forEach((idx) => {
      const row = combos[idx];
      if (row) addLocalItem(row.preprocessing_config, row.model_config, setId);
    });
    setSelected(new Set());
  }

  function sortedAdd(prev: number[], v: number) {
    return prev.includes(v) ? prev : [...prev, v].sort((a, b) => a - b);
  }

  return (
    <div className="flex flex-col gap-5">
      {/* 모델 타입 라디오 */}
      <div className="flex gap-6">
        {(['efficientad', 'patchcore'] as const).map((mt) => (
          <label key={mt} className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="batch-model-type"
              value={mt}
              checked={modelType === mt}
              onChange={() => handleModelTypeChange(mt)}
              className="cursor-pointer accent-sky-600"
            />
            <span className="text-sm font-medium text-slate-700">
              {mt === 'efficientad' ? 'EfficientAD' : 'PatchCore'}
            </span>
          </label>
        ))}
      </div>

      {/* 2열 그리드 */}
      <div className="grid grid-cols-2 gap-6">
        {/* 공통 파라미터 */}
        <div className="flex flex-col gap-4">
          <h4 className="text-xs font-semibold text-slate-600 uppercase tracking-wide">공통 파라미터</h4>

          <Field label="전처리 방식">
            <CheckGroup
              options={['없음', 'Homomorphic', 'HE', 'CLAHE']}
              selected={preMethods}
              onToggle={(opt) => setPreMethods((prev) => toggle(prev, opt))}
            />
          </Field>

          <Field label="배경 분리">
            <CheckGroup
              options={['none', 'SAM2']}
              selected={bgMethods}
              onToggle={(opt) => setBgMethods((prev) => toggle(prev, opt))}
            />
          </Field>

          <Field label="정규화 방식">
            <CheckGroup
              options={['ImageNet', '커스텀']}
              selected={normMethods}
              onToggle={(opt) => setNormMethods((prev) => toggle(prev, opt))}
            />
          </Field>

          <Field label="이미지 크기">
            <TagInput
              values={imageSizes}
              onAdd={(v) => setImageSizes((prev) => sortedAdd(prev, v))}
              onRemove={(v) => setImageSizes((prev) => prev.filter((x) => x !== v))}
              defaultValue={256}
              step={32}
              validate={(v) => v % 32 !== 0 ? '이미지 크기는 32의 배수여야 합니다.' : null}
            />
          </Field>

          <div>
            <button
              type="button"
              onClick={() => setCommonAdvOpen((o) => !o)}
              className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
            >
              <span>{commonAdvOpen ? '▾' : '▸'}</span>
              추가 공통 설정
            </button>
            {commonAdvOpen && (
              <div className="mt-3 flex flex-col gap-4 pl-3 border-l-2 border-slate-100">
                <Field label="배치 크기">
                  <TagInput
                    values={batchSizes}
                    onAdd={(v) => setBatchSizes((prev) => sortedAdd(prev, v))}
                    onRemove={(v) => setBatchSizes((prev) => prev.filter((x) => x !== v))}
                    defaultValue={16}
                    step={1}
                  />
                </Field>
                <Field label="랜덤 시드">
                  <TagInput
                    values={randomSeeds}
                    onAdd={(v) => setRandomSeeds((prev) => sortedAdd(prev, v))}
                    onRemove={(v) => setRandomSeeds((prev) => prev.filter((x) => x !== v))}
                    defaultValue={42}
                    step={1}
                  />
                </Field>
                <Field label="Threshold 방식">
                  <CheckGroup
                    options={['percentile', 'absolute']}
                    selected={thresholdMethods}
                    onToggle={(opt) => setThresholdMethods((prev) => toggle(prev, opt))}
                  />
                </Field>
                <Field label="Threshold 값">
                  <TagInput
                    values={thresholdValues}
                    onAdd={(v) => setThresholdValues((prev) => sortedAdd(prev, v))}
                    onRemove={(v) => setThresholdValues((prev) => prev.filter((x) => x !== v))}
                    defaultValue={95.0}
                    step={0.5}
                  />
                </Field>
              </div>
            )}
          </div>
        </div>

        {/* 모델 파라미터 */}
        <div className="flex flex-col gap-4">
          {modelType === 'efficientad' ? (
            <>
              <h4 className="text-xs font-semibold text-slate-600 uppercase tracking-wide">EfficientAD 파라미터</h4>

              <Field label="모델 크기">
                <CheckGroup options={['small', 'medium']} selected={effModelSizes}
                  onToggle={(opt) => setEffModelSizes((prev) => toggle(prev, opt))} />
              </Field>
              <Field label="옵티마이저">
                <CheckGroup options={['adam', 'adamw', 'sgd']} selected={effOptimizers}
                  onToggle={(opt) => setEffOptimizers((prev) => toggle(prev, opt))} />
              </Field>
              <Field label="스케줄러">
                <CheckGroup options={['StepLR', 'CosineAnnealingLR']} selected={effSchedulers}
                  onToggle={(opt) => setEffSchedulers((prev) => toggle(prev, opt))} />
              </Field>
              <Field label="출력 채널 수">
                <CheckGroup options={['128', '256', '384', '512']} selected={effOutChannels}
                  onToggle={(opt) => setEffOutChannels((prev) => toggle(prev, opt))} />
              </Field>
              <Field label="학습 단계 수 (train_steps)">
                <TagInput
                  values={effTrainSteps}
                  onAdd={(v) => setEffTrainSteps((prev) => sortedAdd(prev, v))}
                  onRemove={(v) => setEffTrainSteps((prev) => prev.filter((x) => x !== v))}
                  defaultValue={70000} step={1000}
                />
              </Field>
              <Field label="학습률 (learning_rate)">
                <TagInput
                  values={effLRs}
                  onAdd={(v) => setEffLRs((prev) => sortedAdd(prev, v))}
                  onRemove={(v) => setEffLRs((prev) => prev.filter((x) => x !== v))}
                  defaultValue={0.0001} step={0.0001}
                  fmt={(v) => v.toExponential(2)}
                />
              </Field>

              <div>
                <button type="button" onClick={() => setEffAdvOpen((o) => !o)}
                  className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 transition-colors cursor-pointer">
                  <span>{effAdvOpen ? '▾' : '▸'}</span>추가 EfficientAD 설정
                </button>
                {effAdvOpen && (
                  <div className="mt-3 flex flex-col gap-4 pl-3 border-l-2 border-slate-100">
                    <Field label="패딩 사용">
                      <CheckGroup options={['True', 'False']} selected={effPaddings}
                        onToggle={(opt) => setEffPaddings((prev) => toggle(prev, opt))} />
                    </Field>
                    <Field label="ImageNet Penalty">
                      <CheckGroup options={['True', 'False']} selected={effPenalties}
                        onToggle={(opt) => setEffPenalties((prev) => toggle(prev, opt))} />
                    </Field>
                    <Field label="가중치 감쇠 (weight_decay)">
                      <TagInput
                        values={effWeightDecays}
                        onAdd={(v) => setEffWeightDecays((prev) => sortedAdd(prev, v))}
                        onRemove={(v) => setEffWeightDecays((prev) => prev.filter((x) => x !== v))}
                        defaultValue={0.0001} step={0.00001}
                        fmt={(v) => v.toExponential(2)}
                      />
                    </Field>
                    <Field label="AE Loss 비중 (ae_loss_weight)">
                      <TagInput
                        values={effAeLossWeights}
                        onAdd={(v) => setEffAeLossWeights((prev) => sortedAdd(prev, v))}
                        onRemove={(v) => setEffAeLossWeights((prev) => prev.filter((x) => x !== v))}
                        defaultValue={0.5} step={0.05}
                      />
                    </Field>
                    <Field label="AutoEncoder LR (autoencoder_lr)">
                      <TagInput
                        values={effAeLrs}
                        onAdd={(v) => setEffAeLrs((prev) => sortedAdd(prev, v))}
                        onRemove={(v) => setEffAeLrs((prev) => prev.filter((x) => x !== v))}
                        defaultValue={0.0001} step={0.00001}
                        fmt={(v) => v.toExponential(2)}
                      />
                    </Field>
                    <Field label="AE 가중치 감쇠 (autoencoder_weight_decay)">
                      <TagInput
                        values={effAeWeightDecays}
                        onAdd={(v) => setEffAeWeightDecays((prev) => sortedAdd(prev, v))}
                        onRemove={(v) => setEffAeWeightDecays((prev) => prev.filter((x) => x !== v))}
                        defaultValue={0.00001} step={0.000001}
                        fmt={(v) => v.toExponential(2)}
                      />
                    </Field>
                    <Field label="LR Decay Steps (lr_decay_epochs)">
                      <TagInput
                        values={effLrDecayEpochs}
                        onAdd={(v) => setEffLrDecayEpochs((prev) => sortedAdd(prev, v))}
                        onRemove={(v) => setEffLrDecayEpochs((prev) => prev.filter((x) => x !== v))}
                        defaultValue={50000} step={1000}
                      />
                    </Field>
                    <Field label="LR Decay Factor (lr_decay_factor)">
                      <TagInput
                        values={effLrDecayFactors}
                        onAdd={(v) => setEffLrDecayFactors((prev) => sortedAdd(prev, v))}
                        onRemove={(v) => setEffLrDecayFactors((prev) => prev.filter((x) => x !== v))}
                        defaultValue={0.1} step={0.05}
                      />
                    </Field>
                    <Field label="Penalty Batch Size (penalty_batch_size)">
                      <TagInput
                        values={effPenaltyBatches}
                        onAdd={(v) => setEffPenaltyBatches((prev) => sortedAdd(prev, v))}
                        onRemove={(v) => setEffPenaltyBatches((prev) => prev.filter((x) => x !== v))}
                        defaultValue={8} step={1}
                      />
                    </Field>
                    <Field label="Early Stopping">
                      <CheckGroup options={['True', 'False']} selected={effEarlyStoppings}
                        onToggle={(opt) => setEffEarlyStoppings((prev) => toggle(prev, opt))} />
                    </Field>
                    <Field label="Patience (patience)">
                      <TagInput
                        values={effPatiences}
                        onAdd={(v) => setEffPatiences((prev) => sortedAdd(prev, v))}
                        onRemove={(v) => setEffPatiences((prev) => prev.filter((x) => x !== v))}
                        defaultValue={5000} step={500}
                      />
                    </Field>
                    <Field label="Min Delta (min_delta)">
                      <TagInput
                        values={effMinDeltas}
                        onAdd={(v) => setEffMinDeltas((prev) => sortedAdd(prev, v))}
                        onRemove={(v) => setEffMinDeltas((prev) => prev.filter((x) => x !== v))}
                        defaultValue={0.001} step={0.001}
                      />
                    </Field>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <h4 className="text-xs font-semibold text-slate-600 uppercase tracking-wide">PatchCore 파라미터</h4>

              <Field label="백본">
                <CheckGroup options={['wide_resnet50_2', 'resnet18', 'resnet50']} selected={pcBackbones}
                  onToggle={(opt) => setPcBackbones((prev) => toggle(prev, opt))} />
              </Field>
              <Field label="이웃 커널 크기">
                <CheckGroup options={['1', '3', '5', '7', '9']} selected={pcKernels}
                  onToggle={(opt) => setPcKernels((prev) => toggle(prev, opt))} />
              </Field>
              <Field label="코어셋 비율 (coreset_sampling_ratio)">
                <TagInput
                  values={pcCoresets}
                  onAdd={(v) => setPcCoresets((prev) => sortedAdd(prev, v))}
                  onRemove={(v) => setPcCoresets((prev) => prev.filter((x) => x !== v))}
                  defaultValue={0.1} step={0.01}
                />
              </Field>

              <div>
                <button type="button" onClick={() => setPcAdvOpen((o) => !o)}
                  className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 transition-colors cursor-pointer">
                  <span>{pcAdvOpen ? '▾' : '▸'}</span>추가 PatchCore 설정
                </button>
                {pcAdvOpen && (
                  <div className="mt-3 flex flex-col gap-4 pl-3 border-l-2 border-slate-100">
                    <Field label="최대 학습 샘플 (max_train)">
                      <TagInput
                        values={pcMaxTrains}
                        onAdd={(v) => setPcMaxTrains((prev) => sortedAdd(prev, v))}
                        onRemove={(v) => setPcMaxTrains((prev) => prev.filter((x) => x !== v))}
                        defaultValue={1000} step={100}
                      />
                    </Field>
                    <Field label="k-NN 이웃 수 (knn)">
                      <TagInput
                        values={pcKnns}
                        onAdd={(v) => setPcKnns((prev) => sortedAdd(prev, v))}
                        onRemove={(v) => setPcKnns((prev) => prev.filter((x) => x !== v))}
                        defaultValue={9} step={1}
                      />
                    </Field>
                    <Field label="Top-k 비율 (top_k_ratio)">
                      <TagInput
                        values={pcTopKs}
                        onAdd={(v) => setPcTopKs((prev) => sortedAdd(prev, v))}
                        onRemove={(v) => setPcTopKs((prev) => prev.filter((x) => x !== v))}
                        defaultValue={0.1} step={0.01}
                      />
                    </Field>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* 조합 미리보기 테이블 */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <span className="text-xs font-semibold text-slate-600">
            조합 미리보기
            <span className="ml-2 font-normal text-slate-400">
              {selectedCount}개 / {combos.length}개 선택됨
            </span>
          </span>
          {combos.length > 100 && (
            <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
              100개 초과 ({combos.length}개) — 신중히 선택하세요
            </span>
          )}
        </div>

        {combos.length > 0 ? (
          <>
            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <div className="overflow-auto max-h-56">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-slate-50">
                    <tr className="border-b border-slate-200">
                      <th className="px-3 py-2.5 text-left font-semibold text-slate-500 whitespace-nowrap">포함</th>
                      <th className="px-3 py-2.5 text-left font-semibold text-slate-500 whitespace-nowrap">배경분리</th>
                      <th className="px-3 py-2.5 text-left font-semibold text-slate-500 whitespace-nowrap">전처리</th>
                      <th className="px-3 py-2.5 text-left font-semibold text-slate-500 whitespace-nowrap">크기</th>
                      {modelType === 'efficientad' ? (
                        <>
                          <th className="px-3 py-2.5 text-left font-semibold text-slate-500 whitespace-nowrap">모델크기</th>
                          <th className="px-3 py-2.5 text-left font-semibold text-slate-500 whitespace-nowrap">Steps</th>
                          <th className="px-3 py-2.5 text-left font-semibold text-slate-500 whitespace-nowrap">Optimizer</th>
                          <th className="px-3 py-2.5 text-left font-semibold text-slate-500 whitespace-nowrap">LR</th>
                        </>
                      ) : (
                        <>
                          <th className="px-3 py-2.5 text-left font-semibold text-slate-500 whitespace-nowrap">백본</th>
                          <th className="px-3 py-2.5 text-left font-semibold text-slate-500 whitespace-nowrap">Coreset</th>
                          <th className="px-3 py-2.5 text-left font-semibold text-slate-500 whitespace-nowrap">커널</th>
                        </>
                      )}
                      <th className="px-3 py-2.5 text-left font-semibold text-slate-500 whitespace-nowrap">Threshold</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pageItems.map((row, pageIdx) => {
                      const globalIdx = safePage * PAGE_SIZE + pageIdx;
                      const isChecked = selected.has(globalIdx);
                      const pre = row.preprocessing_config;
                      const mc = row.model_config;
                      const effP = modelType === 'efficientad' ? mc.params as EfficientAdParamsState : null;
                      const pcP = modelType === 'patchcore' ? mc.params as PatchCoreParamsState : null;
                      return (
                        <tr key={globalIdx} className={`transition-colors ${isChecked ? 'bg-sky-50' : 'hover:bg-slate-50'}`}>
                          <td className="px-3 py-2">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleRowToggle(globalIdx)}
                              className="cursor-pointer accent-sky-600"
                            />
                          </td>
                          <td className="px-3 py-2 text-slate-600">{pre.background_method}</td>
                          <td className="px-3 py-2 text-slate-600">{pre.method}</td>
                          <td className="px-3 py-2 text-slate-600">{pre.image_size}</td>
                          {effP && (
                            <>
                              <td className="px-3 py-2 text-slate-600">{effP.model_size}</td>
                              <td className="px-3 py-2 text-slate-600">{effP.train_steps.toLocaleString()}</td>
                              <td className="px-3 py-2 text-slate-600">{effP.optimizer}</td>
                              <td className="px-3 py-2 text-slate-600">{effP.learning_rate.toExponential(2)}</td>
                            </>
                          )}
                          {pcP && (
                            <>
                              <td className="px-3 py-2 text-slate-600">{pcP.backbone}</td>
                              <td className="px-3 py-2 text-slate-600">{pcP.coreset_sampling_ratio}</td>
                              <td className="px-3 py-2 text-slate-600">{pcP.neighbourhood_kernel_size}</td>
                            </>
                          )}
                          <td className="px-3 py-2 text-slate-600">{mc.threshold_method} {mc.threshold_value}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3">
                <button type="button"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={safePage === 0}
                  className="px-2.5 py-1 border border-slate-200 rounded-lg text-xs hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >←</button>
                <span className="text-xs text-slate-500">{safePage + 1} / {totalPages} 페이지</span>
                <button type="button"
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={safePage >= totalPages - 1}
                  className="px-2.5 py-1 border border-slate-200 rounded-lg text-xs hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >→</button>
              </div>
            )}
          </>
        ) : (
          <p className="text-xs text-slate-400">파라미터를 선택하면 조합이 표시됩니다.</p>
        )}
      </div>

      {/* 추가 버튼 */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleAdd}
          disabled={selectedCount === 0 || combos.length === 0}
          className="px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white text-sm font-medium rounded-lg disabled:opacity-40 transition-colors cursor-pointer"
        >
          선택된 {selectedCount}개 조합 대기열에 추가
        </button>
      </div>
    </div>
  );
}
