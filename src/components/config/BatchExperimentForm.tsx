import { useState, useMemo, useEffect } from 'react';
import type { PreprocessingConfig, ModelConfig } from '../../types/config';
import type { EfficientAdParamsState, PatchCoreParamsState } from '../../types/modelParams';
import { useLocalQueueStore } from '../../store/localQueueStore';
import { useDatasetStore } from '../../store/datasetStore';
import { DEFAULT_EFFICIENTAD } from './EfficientAdParams';
import { DEFAULT_PATCHCORE } from './PatchCoreParams';

const IMAGENET_MEAN: [number, number, number] = [0.485, 0.456, 0.406];
const IMAGENET_STD: [number, number, number] = [0.229, 0.224, 0.225];

// ── 유틸 ──

const fmtLR = (v: number) => String(v);

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
  disabledOptions?: string[];
}

function CheckGroup({ options, selected, onToggle, disabledOptions = [] }: CheckGroupProps) {
  return (
    <div className="flex flex-wrap gap-3">
      {options.map((opt) => {
        const isDisabled = disabledOptions.includes(opt);
        return (
          <label key={opt} className={`flex items-center gap-1.5 text-xs ${isDisabled ? 'cursor-not-allowed opacity-40' : 'cursor-pointer'}`}>
            <input
              type="checkbox"
              checked={selected.includes(opt)}
              onChange={() => !isDisabled && onToggle(opt)}
              disabled={isDisabled}
              className={`accent-sky-600 ${isDisabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
            />
            <span className={isDisabled ? 'text-slate-400' : 'text-slate-700'}>{opt}</span>
          </label>
        );
      })}
    </div>
  );
}

function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-slate-500">
        {label}
        {required && <span className="ml-1 text-red-400 font-semibold">*필수</span>}
      </span>
      {children}
    </div>
  );
}

// ── 요약 뷰 헬퍼 ──

function SummaryRow({ label, values, alwaysShow = false }: { label: string; values: string[]; alwaysShow?: boolean }) {
  if (values.length === 0) return null;
  if (!alwaysShow && values.length < 2) return null;
  return (
    <div className="flex items-start gap-2">
      <span className="text-xs text-slate-500 w-32 flex-shrink-0">{label}</span>
      <div className="flex flex-wrap gap-1">
        {values.map((v) => (
          <span key={v} className="bg-sky-50 border border-sky-200 text-sky-700 text-xs px-2 py-0.5 rounded-full">
            {v}
          </span>
        ))}
      </div>
    </div>
  );
}

function ns(values: number[], fmt?: (v: number) => string): string[] {
  return values.map((v) => (fmt ? fmt(v) : String(v)));
}

// ── 타입 ──

interface ComboRow {
  preprocessing_config: PreprocessingConfig;
  model_config: ModelConfig;
}

type ModelType = 'efficientad' | 'patchcore';

interface FormulaModel {
  modelLabel: string;
  dims: Array<{ label: string; count: number }>;
  total: number;
}

// ── 컴포넌트 ──

interface Props {
  preConfig: PreprocessingConfig;
}

export default function BatchExperimentForm({ preConfig }: Props) {
  const { addLocalItem, getOrCreateSetId } = useLocalQueueStore();
  const { datasetMeta, datasetPath } = useDatasetStore();
  const availableBgMethods = datasetMeta?.available_bg_methods ?? [];
  const disabledBgOptions = ['SAM2', 'SAM3'].filter(m => !availableBgMethods.includes(m.toLowerCase()));

  const [modelTypes, setModelTypes] = useState<ModelType[]>(['efficientad']);
  const [activeModelTab, setActiveModelTab] = useState<ModelType>('efficientad');

  // 공통 파라미터
  const [preMethods, setPreMethods] = useState<string[]>([]);
  const [bgMethods, setBgMethods] = useState<string[]>([]);
  const [imageSizes, setImageSizes] = useState<number[]>([256]);

  useEffect(() => {
    setBgMethods(prev => prev.filter(m =>
      m === 'none' || availableBgMethods.includes(m.toLowerCase())
    ));
  }, [datasetPath]); // eslint-disable-line react-hooks/exhaustive-deps
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

  // 조합 계산
  const combos = useMemo<ComboRow[]>(() => {
    // 3그룹 폴백 제거: 하나라도 비면 preCombos = [] → combos = []
    const methods  = preMethods;
    const bgs      = bgMethods;
    const sizes    = imageSizes;
    const batches  = batchSizes;
    const seeds    = randomSeeds;
    const tMethods = thresholdMethods.length > 0 ? thresholdMethods : ['percentile'];
    const tValues  = thresholdValues;

    // EfficientAD 폴백
    const mSizes = effModelSizes.length    > 0 ? effModelSizes   : ['medium'];
    const opts   = effOptimizers.length    > 0 ? effOptimizers   : ['adam'];
    const scheds = effSchedulers.length    > 0 ? effSchedulers   : ['StepLR'];
    const ocs    = (effOutChannels.length  > 0 ? effOutChannels  : ['384']).map(Number);
    const steps  = effTrainSteps;
    const lrs    = effLRs;
    const pads   = effPaddings.length      > 0 ? effPaddings     : ['False'];
    const pens   = effPenalties.length     > 0 ? effPenalties    : ['False'];
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

    // Step 1: 공통 전처리 조합 빌드
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
        const bgMethod = bg === 'SAM2' ? 'sam2' : bg === 'SAM3' ? 'sam3' : 'none';
        for (const sz of sizes) {
          const mean = IMAGENET_MEAN;
          const std  = IMAGENET_STD;
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

    // Step 2: 선택된 모델별 파라미터 빌드 + preCombos 교차 → 합산
    const rows: ComboRow[] = [];

    if (modelTypes.includes('efficientad')) {
      type P = EfficientAdParamsState;
      let ep: P[] = [{ ...DEFAULT_EFFICIENTAD }];
      ep = mSizes .flatMap(ms  => ep.map(p => ({ ...p, model_size:               ms  as P['model_size']   })));
      ep = opts   .flatMap(opt => ep.map(p => ({ ...p, optimizer:                opt as P['optimizer']    })));
      ep = scheds .flatMap(s   => ep.map(p => ({ ...p, scheduler:                s   as P['scheduler']    })));
      ep = ocs    .flatMap(oc  => ep.map(p => ({ ...p, out_channels:             oc  as P['out_channels'] })));
      ep = steps  .flatMap(st  => ep.map(p => ({ ...p, train_steps:              st                       })));
      ep = lrs    .flatMap(lr  => ep.map(p => ({ ...p, learning_rate:            lr                       })));
      ep = pads   .flatMap(pad => ep.map(p => ({ ...p, padding:                  pad === 'True'           })));
      ep = pens   .flatMap(pen => ep.map(p => ({ ...p, use_imagenet_penalty:     pen === 'True'           })));
      ep = wds    .flatMap(wd  => ep.map(p => ({ ...p, weight_decay:             wd                       })));
      ep = aelws  .flatMap(w   => ep.map(p => ({ ...p, ae_loss_weight:           w                        })));
      ep = aelrs  .flatMap(r   => ep.map(p => ({ ...p, autoencoder_lr:           r                        })));
      ep = aelwds .flatMap(w   => ep.map(p => ({ ...p, autoencoder_weight_decay: w                        })));
      ep = lrdes  .flatMap(e   => ep.map(p => ({ ...p, lr_decay_epochs:          e                        })));
      ep = lrdfs  .flatMap(f   => ep.map(p => ({ ...p, lr_decay_factor:          f                        })));
      ep = pbs    .flatMap(b   => ep.map(p => ({ ...p, penalty_batch_size:       b                        })));
      ep = ess    .flatMap(es  => ep.map(p => ({ ...p, early_stopping:           es === 'True'            })));
      ep = pats   .flatMap(pt  => ep.map(p => ({ ...p, patience:                 pt                       })));
      ep = mds    .flatMap(md  => ep.map(p => ({ ...p, min_delta:                md                       })));

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
    }

    if (modelTypes.includes('patchcore')) {
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
    modelTypes, preMethods, bgMethods, imageSizes, batchSizes,
    randomSeeds, thresholdMethods, thresholdValues,
    effModelSizes, effOptimizers, effSchedulers, effOutChannels, effTrainSteps,
    effLRs, effPaddings, effPenalties, effWeightDecays, effAeLossWeights,
    effAeLrs, effAeWeightDecays, effLrDecayEpochs, effLrDecayFactors,
    effPenaltyBatches, effEarlyStoppings, effPatiences, effMinDeltas,
    pcBackbones, pcKernels, pcCoresets, pcMaxTrains, pcKnns, pcTopKs, preConfig,
  ]);

  // 모델별 계산식
  const formulas = useMemo<FormulaModel[]>(() => {
    if (modelTypes.length === 0 || preMethods.length === 0 || bgMethods.length === 0) return [];

    // 공통 다차원 (count >= 2)
    const commonDims: Array<{ label: string; count: number }> = [];
    if (preMethods.length >= 2)      commonDims.push({ label: '전처리',        count: preMethods.length });
    if (bgMethods.length >= 2)       commonDims.push({ label: '배경분리',      count: bgMethods.length });
    if (imageSizes.length >= 2)      commonDims.push({ label: '이미지크기',    count: imageSizes.length });
    if (batchSizes.length >= 2)      commonDims.push({ label: '배치크기',      count: batchSizes.length });
    if (randomSeeds.length >= 2)     commonDims.push({ label: '랜덤시드',      count: randomSeeds.length });
    const effTM = thresholdMethods.length > 0 ? thresholdMethods : ['percentile'];
    if (effTM.length >= 2)           commonDims.push({ label: 'Threshold방식', count: effTM.length });
    if (thresholdValues.length >= 2) commonDims.push({ label: 'Threshold값',   count: thresholdValues.length });

    const result: FormulaModel[] = [];

    if (modelTypes.includes('efficientad')) {
      const mSizes = effModelSizes.length    > 0 ? effModelSizes    : ['medium'];
      const opts   = effOptimizers.length    > 0 ? effOptimizers    : ['adam'];
      const scheds = effSchedulers.length    > 0 ? effSchedulers    : ['StepLR'];
      const ocs    = effOutChannels.length   > 0 ? effOutChannels   : ['384'];
      const pads   = effPaddings.length      > 0 ? effPaddings      : ['False'];
      const pens   = effPenalties.length     > 0 ? effPenalties     : ['False'];
      const ess    = effEarlyStoppings.length > 0 ? effEarlyStoppings : ['False'];
      const effDims = [...commonDims];
      if (mSizes.length >= 2)            effDims.push({ label: '모델크기',         count: mSizes.length });
      if (opts.length >= 2)              effDims.push({ label: 'Optimizer',        count: opts.length });
      if (scheds.length >= 2)            effDims.push({ label: '스케줄러',         count: scheds.length });
      if (ocs.length >= 2)               effDims.push({ label: '출력채널',         count: ocs.length });
      if (effTrainSteps.length >= 2)     effDims.push({ label: 'Train Steps',      count: effTrainSteps.length });
      if (effLRs.length >= 2)            effDims.push({ label: 'LR',               count: effLRs.length });
      if (pads.length >= 2)              effDims.push({ label: '패딩',             count: pads.length });
      if (pens.length >= 2)              effDims.push({ label: 'ImageNet Penalty', count: pens.length });
      if (effWeightDecays.length >= 2)   effDims.push({ label: 'weight_decay',     count: effWeightDecays.length });
      if (effAeLossWeights.length >= 2)  effDims.push({ label: 'ae_loss_weight',   count: effAeLossWeights.length });
      if (effAeLrs.length >= 2)          effDims.push({ label: 'autoencoder_lr',   count: effAeLrs.length });
      if (effAeWeightDecays.length >= 2) effDims.push({ label: 'ae_weight_decay',  count: effAeWeightDecays.length });
      if (effLrDecayEpochs.length >= 2)  effDims.push({ label: 'lr_decay_steps',   count: effLrDecayEpochs.length });
      if (effLrDecayFactors.length >= 2) effDims.push({ label: 'lr_decay_factor',  count: effLrDecayFactors.length });
      if (effPenaltyBatches.length >= 2) effDims.push({ label: 'penalty_batch',    count: effPenaltyBatches.length });
      if (ess.length >= 2)               effDims.push({ label: 'early_stopping',   count: ess.length });
      if (effPatiences.length >= 2)      effDims.push({ label: 'patience',         count: effPatiences.length });
      if (effMinDeltas.length >= 2)      effDims.push({ label: 'min_delta',        count: effMinDeltas.length });
      result.push({
        modelLabel: 'EfficientAD',
        dims: effDims,
        total: combos.filter(c => c.model_config.model_type === 'efficientad').length,
      });
    }

    if (modelTypes.includes('patchcore')) {
      const bbs = pcBackbones.length > 0 ? pcBackbones : ['wide_resnet50_2'];
      const ks  = pcKernels.length   > 0 ? pcKernels   : ['3'];
      const pcDims = [...commonDims];
      if (bbs.length >= 2)           pcDims.push({ label: '백본',          count: bbs.length });
      if (ks.length >= 2)            pcDims.push({ label: '이웃커널크기',  count: ks.length });
      if (pcCoresets.length >= 2)    pcDims.push({ label: 'coreset_ratio', count: pcCoresets.length });
      if (pcMaxTrains.length >= 2)   pcDims.push({ label: 'max_train',     count: pcMaxTrains.length });
      if (pcKnns.length >= 2)        pcDims.push({ label: 'knn',           count: pcKnns.length });
      if (pcTopKs.length >= 2)       pcDims.push({ label: 'top_k_ratio',   count: pcTopKs.length });
      result.push({
        modelLabel: 'PatchCore',
        dims: pcDims,
        total: combos.filter(c => c.model_config.model_type === 'patchcore').length,
      });
    }

    return result;
  }, [
    combos, modelTypes, preMethods, bgMethods, imageSizes, batchSizes,
    randomSeeds, thresholdMethods, thresholdValues,
    effModelSizes, effOptimizers, effSchedulers, effOutChannels, effTrainSteps,
    effLRs, effPaddings, effPenalties, effWeightDecays, effAeLossWeights,
    effAeLrs, effAeWeightDecays, effLrDecayEpochs, effLrDecayFactors,
    effPenaltyBatches, effEarlyStoppings, effPatiences, effMinDeltas,
    pcBackbones, pcKernels, pcCoresets, pcMaxTrains, pcKnns, pcTopKs,
  ]);

  function handleModelTypeToggle(mt: ModelType) {
    const next = toggle(modelTypes, mt);
    setModelTypes(next);
    if (next.length > 0 && !next.includes(activeModelTab)) {
      setActiveModelTab(next[0]);
    }
  }

  function handleAdd() {
    if (combos.length === 0) return;
    const setId = getOrCreateSetId();
    combos.forEach((row) => {
      addLocalItem(row.preprocessing_config, row.model_config, setId);
    });
  }

  function sortedAdd(prev: number[], v: number) {
    return prev.includes(v) ? prev : [...prev, v].sort((a, b) => a - b);
  }


  return (
    <div className="flex flex-col gap-5">
      {/* 모델 타입 체크박스 */}
      <div className="flex gap-6">
        {(['efficientad', 'patchcore'] as const).map((mt) => (
          <label key={mt} className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={modelTypes.includes(mt)}
              onChange={() => handleModelTypeToggle(mt)}
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

          <Field label="전처리 방식" required>
            <CheckGroup
              options={['없음', 'Homomorphic', 'HE', 'CLAHE']}
              selected={preMethods}
              onToggle={(opt) => setPreMethods((prev) => toggle(prev, opt))}
            />
          </Field>

          <Field label="배경 분리" required>
            <CheckGroup
              options={['none', 'SAM2', 'SAM3']}
              selected={bgMethods}
              onToggle={(opt) => setBgMethods((prev) => toggle(prev, opt))}
              disabledOptions={disabledBgOptions}
            />
            {datasetMeta && disabledBgOptions.length > 0 && (
              <p className="mt-1.5 text-xs text-slate-400">
                {disabledBgOptions
                  .map(m => `${datasetPath?.split(/[\\/]/).pop() ?? ''}_${m.toLowerCase()}`)
                  .join(', ')} 폴더 없음
              </p>
            )}
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
                    defaultValue={16} step={1}
                  />
                </Field>
                <Field label="랜덤 시드">
                  <TagInput
                    values={randomSeeds}
                    onAdd={(v) => setRandomSeeds((prev) => sortedAdd(prev, v))}
                    onRemove={(v) => setRandomSeeds((prev) => prev.filter((x) => x !== v))}
                    defaultValue={42} step={1}
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
                    defaultValue={95.0} step={0.5}
                  />
                </Field>
              </div>
            )}
          </div>
        </div>

        {/* 모델 파라미터 - 탭 */}
        <div className="flex flex-col gap-4">
          {modelTypes.length === 0 ? (
            <p className="text-xs text-slate-400">모델을 선택하세요.</p>
          ) : (
            <>
              {/* 탭 헤더 */}
              <div className="flex border-b border-slate-200">
                {(['efficientad', 'patchcore'] as const)
                  .filter((mt) => modelTypes.includes(mt))
                  .map((mt) => (
                    <button
                      key={mt}
                      type="button"
                      onClick={() => setActiveModelTab(mt)}
                      className={`pb-2 px-1 mr-5 text-xs font-medium transition-colors border-b-2 -mb-px ${
                        activeModelTab === mt
                          ? 'border-sky-600 text-sky-600'
                          : 'border-transparent text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      {mt === 'efficientad' ? 'EfficientAD' : 'PatchCore'}
                    </button>
                  ))}
              </div>

              {/* EfficientAD 탭 콘텐츠 */}
              {activeModelTab === 'efficientad' && (
                <div className="flex flex-col gap-4">
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
                      fmt={fmtLR}
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
                          <TagInput values={effWeightDecays}
                            onAdd={(v) => setEffWeightDecays((prev) => sortedAdd(prev, v))}
                            onRemove={(v) => setEffWeightDecays((prev) => prev.filter((x) => x !== v))}
                            defaultValue={0.0001} step={0.00001} fmt={fmtLR} />
                        </Field>
                        <Field label="AE Loss 비중 (ae_loss_weight)">
                          <TagInput values={effAeLossWeights}
                            onAdd={(v) => setEffAeLossWeights((prev) => sortedAdd(prev, v))}
                            onRemove={(v) => setEffAeLossWeights((prev) => prev.filter((x) => x !== v))}
                            defaultValue={0.5} step={0.05} />
                        </Field>
                        <Field label="AutoEncoder LR (autoencoder_lr)">
                          <TagInput values={effAeLrs}
                            onAdd={(v) => setEffAeLrs((prev) => sortedAdd(prev, v))}
                            onRemove={(v) => setEffAeLrs((prev) => prev.filter((x) => x !== v))}
                            defaultValue={0.0001} step={0.00001} fmt={fmtLR} />
                        </Field>
                        <Field label="AE 가중치 감쇠 (autoencoder_weight_decay)">
                          <TagInput values={effAeWeightDecays}
                            onAdd={(v) => setEffAeWeightDecays((prev) => sortedAdd(prev, v))}
                            onRemove={(v) => setEffAeWeightDecays((prev) => prev.filter((x) => x !== v))}
                            defaultValue={0.00001} step={0.000001} fmt={fmtLR} />
                        </Field>
                        <Field label="LR Decay Steps (lr_decay_epochs)">
                          <TagInput values={effLrDecayEpochs}
                            onAdd={(v) => setEffLrDecayEpochs((prev) => sortedAdd(prev, v))}
                            onRemove={(v) => setEffLrDecayEpochs((prev) => prev.filter((x) => x !== v))}
                            defaultValue={50000} step={1000} />
                        </Field>
                        <Field label="LR Decay Factor (lr_decay_factor)">
                          <TagInput values={effLrDecayFactors}
                            onAdd={(v) => setEffLrDecayFactors((prev) => sortedAdd(prev, v))}
                            onRemove={(v) => setEffLrDecayFactors((prev) => prev.filter((x) => x !== v))}
                            defaultValue={0.1} step={0.05} />
                        </Field>
                        <Field label="Penalty Batch Size (penalty_batch_size)">
                          <TagInput values={effPenaltyBatches}
                            onAdd={(v) => setEffPenaltyBatches((prev) => sortedAdd(prev, v))}
                            onRemove={(v) => setEffPenaltyBatches((prev) => prev.filter((x) => x !== v))}
                            defaultValue={8} step={1} />
                        </Field>
                        <Field label="Early Stopping">
                          <CheckGroup options={['True', 'False']} selected={effEarlyStoppings}
                            onToggle={(opt) => setEffEarlyStoppings((prev) => toggle(prev, opt))} />
                        </Field>
                        <Field label="Patience (patience)">
                          <TagInput values={effPatiences}
                            onAdd={(v) => setEffPatiences((prev) => sortedAdd(prev, v))}
                            onRemove={(v) => setEffPatiences((prev) => prev.filter((x) => x !== v))}
                            defaultValue={5000} step={500} />
                        </Field>
                        <Field label="Min Delta (min_delta)">
                          <TagInput values={effMinDeltas}
                            onAdd={(v) => setEffMinDeltas((prev) => sortedAdd(prev, v))}
                            onRemove={(v) => setEffMinDeltas((prev) => prev.filter((x) => x !== v))}
                            defaultValue={0.001} step={0.001} />
                        </Field>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* PatchCore 탭 콘텐츠 */}
              {activeModelTab === 'patchcore' && (
                <div className="flex flex-col gap-4">
                  <Field label="백본">
                    <CheckGroup options={['wide_resnet50_2', 'resnet18', 'resnet50']} selected={pcBackbones}
                      onToggle={(opt) => setPcBackbones((prev) => toggle(prev, opt))} />
                  </Field>
                  <Field label="이웃 커널 크기">
                    <CheckGroup options={['1', '3', '5', '7', '9']} selected={pcKernels}
                      onToggle={(opt) => setPcKernels((prev) => toggle(prev, opt))} />
                  </Field>
                  <Field label="코어셋 비율 (coreset_sampling_ratio)">
                    <TagInput values={pcCoresets}
                      onAdd={(v) => setPcCoresets((prev) => sortedAdd(prev, v))}
                      onRemove={(v) => setPcCoresets((prev) => prev.filter((x) => x !== v))}
                      defaultValue={0.1} step={0.01} />
                  </Field>
                  <div>
                    <button type="button" onClick={() => setPcAdvOpen((o) => !o)}
                      className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 transition-colors cursor-pointer">
                      <span>{pcAdvOpen ? '▾' : '▸'}</span>추가 PatchCore 설정
                    </button>
                    {pcAdvOpen && (
                      <div className="mt-3 flex flex-col gap-4 pl-3 border-l-2 border-slate-100">
                        <Field label="최대 학습 샘플 (max_train)">
                          <TagInput values={pcMaxTrains}
                            onAdd={(v) => setPcMaxTrains((prev) => sortedAdd(prev, v))}
                            onRemove={(v) => setPcMaxTrains((prev) => prev.filter((x) => x !== v))}
                            defaultValue={1000} step={100} />
                        </Field>
                        <Field label="k-NN 이웃 수 (knn)">
                          <TagInput values={pcKnns}
                            onAdd={(v) => setPcKnns((prev) => sortedAdd(prev, v))}
                            onRemove={(v) => setPcKnns((prev) => prev.filter((x) => x !== v))}
                            defaultValue={9} step={1} />
                        </Field>
                        <Field label="Top-k 비율 (top_k_ratio)">
                          <TagInput values={pcTopKs}
                            onAdd={(v) => setPcTopKs((prev) => sortedAdd(prev, v))}
                            onRemove={(v) => setPcTopKs((prev) => prev.filter((x) => x !== v))}
                            defaultValue={0.1} step={0.01} />
                        </Field>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* 조합 미리보기 */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <span className="text-xs font-semibold text-slate-600">조합 미리보기</span>
          {combos.length > 100 && (
            <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
              100개 초과 ({combos.length}개) — 신중히 선택하세요
            </span>
          )}
        </div>

        {combos.length > 0 ? (
          <>
            <div className="rounded-xl border border-slate-200 p-4 flex flex-col gap-2 max-h-64 overflow-y-auto">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide pb-1">공통</p>
              <SummaryRow label="전처리" values={preMethods} alwaysShow />
              <SummaryRow label="배경분리" values={bgMethods} alwaysShow />
              <SummaryRow label="이미지크기" values={ns(imageSizes)} />
              <SummaryRow label="배치크기" values={ns(batchSizes)} />
              <SummaryRow label="랜덤시드" values={ns(randomSeeds)} />
              <SummaryRow label="Threshold방식" values={thresholdMethods} />
              <SummaryRow label="Threshold값" values={ns(thresholdValues)} />

              {modelTypes.includes('efficientad') && (
                <>
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide pb-1 pt-2">EfficientAD</p>
                  <SummaryRow label="모델크기" values={effModelSizes} />
                  <SummaryRow label="Optimizer" values={effOptimizers} />
                  <SummaryRow label="스케줄러" values={effSchedulers} />
                  <SummaryRow label="출력채널" values={effOutChannels} />
                  <SummaryRow label="Train Steps" values={ns(effTrainSteps, v => v.toLocaleString())} />
                  <SummaryRow label="LR" values={ns(effLRs, fmtLR)} />
                  <SummaryRow label="패딩" values={effPaddings} />
                  <SummaryRow label="ImageNet Penalty" values={effPenalties} />
                  <SummaryRow label="weight_decay" values={ns(effWeightDecays, fmtLR)} />
                  <SummaryRow label="ae_loss_weight" values={ns(effAeLossWeights)} />
                  <SummaryRow label="autoencoder_lr" values={ns(effAeLrs, fmtLR)} />
                  <SummaryRow label="ae_weight_decay" values={ns(effAeWeightDecays, fmtLR)} />
                  <SummaryRow label="lr_decay_steps" values={ns(effLrDecayEpochs, v => v.toLocaleString())} />
                  <SummaryRow label="lr_decay_factor" values={ns(effLrDecayFactors)} />
                  <SummaryRow label="penalty_batch" values={ns(effPenaltyBatches)} />
                  <SummaryRow label="Early Stopping" values={effEarlyStoppings} />
                  <SummaryRow label="patience" values={ns(effPatiences, v => v.toLocaleString())} />
                  <SummaryRow label="min_delta" values={ns(effMinDeltas)} />
                </>
              )}

              {modelTypes.includes('patchcore') && (
                <>
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide pb-1 pt-2">PatchCore</p>
                  <SummaryRow label="백본" values={pcBackbones} />
                  <SummaryRow label="이웃커널크기" values={pcKernels} />
                  <SummaryRow label="coreset_ratio" values={ns(pcCoresets)} />
                  <SummaryRow label="max_train" values={ns(pcMaxTrains, v => v.toLocaleString())} />
                  <SummaryRow label="knn" values={ns(pcKnns)} />
                  <SummaryRow label="top_k_ratio" values={ns(pcTopKs)} />
                </>
              )}
            </div>

            {/* 계산식 + 버튼 */}
            <div className="flex items-end justify-between gap-3">
              <div className="flex flex-col gap-0.5">
                {formulas.length === 1 ? (
                  <span className="text-xs text-slate-500">
                    {formulas[0].dims.length > 0
                      ? formulas[0].dims.map(d => `${d.label}(${d.count})`).join(' × ') + ` = ${formulas[0].total}`
                      : `${formulas[0].total}개 조합`}
                  </span>
                ) : formulas.length > 1 ? (
                  <>
                    {formulas.map(f => (
                      <span key={f.modelLabel} className="text-xs text-slate-500">
                        <span className="font-medium text-slate-600">{f.modelLabel}:</span>{' '}
                        {f.dims.length > 0
                          ? f.dims.map(d => `${d.label}(${d.count})`).join(' × ') + ` = ${f.total}`
                          : `${f.total}개`}
                      </span>
                    ))}
                    <span className="text-xs font-medium text-slate-600">전체 {combos.length}개</span>
                  </>
                ) : null}
              </div>
              <button
                type="button"
                onClick={handleAdd}
                className="flex-shrink-0 px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white text-sm font-medium rounded-lg transition-colors cursor-pointer"
              >
                조합 <span className="font-extrabold text-base leading-none">{combos.length}</span>개 대기열에 추가
              </button>
            </div>
          </>
        ) : (
          <p className="text-xs text-slate-400">
            {modelTypes.length === 0
              ? '모델을 선택하세요.'
              : '파라미터를 선택하면 조합이 표시됩니다.'}
          </p>
        )}
      </div>
    </div>
  );
}
