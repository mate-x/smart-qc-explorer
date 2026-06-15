import { useState, useMemo } from 'react';
import type { PreprocessingConfig, ModelConfig } from '../../types/config';
import type { EfficientAdParamsState, PatchCoreParamsState } from '../../types/modelParams';
import { addToQueue } from '../../api/configApi';
import { useTrainingStore } from '../../store/trainingStore';
import { DEFAULT_EFFICIENTAD } from './EfficientAdParams';

interface Props {
  preprocessingConfig: PreprocessingConfig;
  modelConfig: ModelConfig;
  onQueueChanged: () => void;
}

const inputCls = 'w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-400 transition-shadow';

type VarValues = Record<string, unknown[]>;

function cartesian(grid: VarValues): Record<string, unknown>[] {
  const keys = Object.keys(grid).filter(k => (grid[k] ?? []).length > 0);
  if (keys.length === 0) return [{}];
  let acc: unknown[][] = [[]];
  for (const key of keys) {
    const next: unknown[][] = [];
    for (const row of acc) {
      for (const v of grid[key]) next.push([...row, v]);
    }
    acc = next;
  }
  return acc.map(row => Object.fromEntries(keys.map((k, i) => [k, row[i]])));
}

function parseInts(s: string, fallback: number[]): number[] {
  const r = s.split(',').map(x => parseInt(x.trim(), 10)).filter(n => Number.isFinite(n));
  return r.length > 0 ? r : fallback;
}

function parseFloats(s: string, fallback: number[]): number[] {
  const r = s.split(',').map(x => parseFloat(x.trim())).filter(n => Number.isFinite(n));
  return r.length > 0 ? r : fallback;
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-slate-500">{label}</label>
      {children}
      {hint && <p className="text-[11px] text-slate-400">{hint}</p>}
    </div>
  );
}

function toggle<T>(arr: T[], v: T): T[] {
  return arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v];
}

function MultiCheck<T extends string | number | boolean>({
  options,
  selected,
  onToggle,
  fmt,
}: {
  options: T[];
  selected: T[];
  onToggle: (v: T) => void;
  fmt?: (v: T) => string;
}) {
  return (
    <div className="flex gap-3 flex-wrap">
      {options.map(opt => {
        const on = selected.includes(opt);
        return (
          <label key={String(opt)} className="flex items-center gap-1.5 text-xs cursor-pointer select-none">
            <input type="checkbox" checked={on}
              onChange={() => onToggle(opt)}
              className="cursor-pointer accent-sky-600" />
            <span className="text-slate-700">{fmt ? fmt(opt) : String(opt)}</span>
          </label>
        );
      })}
    </div>
  );
}

const BOOL_FMT = (v: boolean) => (v ? '사용' : '미사용');

export default function AutoExperimentSection({ preprocessingConfig, modelConfig, onQueueChanged }: Props) {
  const { clearLastResult } = useTrainingStore();

  const [aeModel, setAeModel] = useState<'efficientad' | 'patchcore'>('efficientad');

  // 공통 파라미터
  const [prepMethods, setPrepMethods] = useState<string[]>(['none']);
  const [bgMethods, setBgMethods] = useState<string[]>(['none']);
  const [imageSizesStr, setImageSizesStr] = useState('256');
  const [batchSizesStr, setBatchSizesStr] = useState('16');
  const [seedsStr, setSeedsStr] = useState('42');
  const [threshMethods, setThreshMethods] = useState<string[]>(['percentile']);
  const [threshValsStr, setThreshValsStr] = useState('95.0');

  // EfficientAD 파라미터
  const [effSizes, setEffSizes] = useState<string[]>(['medium']);
  const [effOpts, setEffOpts] = useState<string[]>(['adam']);
  const [effScheds, setEffScheds] = useState<string[]>(['StepLR']);
  const [effChs, setEffChs] = useState<number[]>([384]);
  const [effPad, setEffPad] = useState<boolean[]>([false]);
  const [effPen, setEffPen] = useState<boolean[]>([false]);
  const [effStepsStr, setEffStepsStr] = useState('70000');
  const [effLrStr, setEffLrStr] = useState('0.0001');
  const [effWdStr, setEffWdStr] = useState('0.0001');
  const [effAeStr, setEffAeStr] = useState('0.5');

  // PatchCore 파라미터
  const [pcBbs, setPcBbs] = useState<string[]>(['wide_resnet50_2']);
  const [pcKerns, setPcKerns] = useState<number[]>([3]);
  const [pcCoreStr, setPcCoreStr] = useState('0.1');
  const [pcMaxStr, setPcMaxStr] = useState('1000');
  const [pcKnnStr, setPcKnnStr] = useState('9');
  const [pcTopStr, setPcTopStr] = useState('0.1');

  const [setId, setSetId] = useState('');
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [addSuccess, setAddSuccess] = useState(false);

  const combinations = useMemo(() => {
    const common: VarValues = {
      prep_method: prepMethods.length ? prepMethods : ['none'],
      background_method: bgMethods.length ? bgMethods : ['none'],
      image_size: parseInts(imageSizesStr, [256]),
      batch_size: parseInts(batchSizesStr, [16]),
      random_seed: parseInts(seedsStr, [42]),
      threshold_method: threshMethods.length ? threshMethods : ['percentile'],
      threshold_value: parseFloats(threshValsStr, [95.0]),
    };
    const model: VarValues = aeModel === 'efficientad' ? {
      model_size: effSizes.length ? effSizes : ['medium'],
      optimizer: effOpts.length ? effOpts : ['adam'],
      scheduler: effScheds.length ? effScheds : ['StepLR'],
      out_channels: effChs.length ? effChs : [384],
      padding: effPad.length ? effPad : [false],
      use_imagenet_penalty: effPen.length ? effPen : [false],
      train_steps: parseInts(effStepsStr, [70000]),
      learning_rate: parseFloats(effLrStr, [0.0001]),
      weight_decay: parseFloats(effWdStr, [0.0001]),
      ae_loss_weight: parseFloats(effAeStr, [0.5]),
    } : {
      backbone: pcBbs.length ? pcBbs : ['wide_resnet50_2'],
      neighbourhood_kernel_size: pcKerns.length ? pcKerns : [3],
      coreset_sampling_ratio: parseFloats(pcCoreStr, [0.1]),
      max_train: parseInts(pcMaxStr, [1000]),
      knn: parseInts(pcKnnStr, [9]),
      top_k_ratio: parseFloats(pcTopStr, [0.1]),
    };
    return cartesian({ ...common, ...model });
  }, [
    prepMethods, bgMethods, imageSizesStr, batchSizesStr, seedsStr, threshMethods, threshValsStr,
    aeModel,
    effSizes, effOpts, effScheds, effChs, effPad, effPen, effStepsStr, effLrStr, effWdStr, effAeStr,
    pcBbs, pcKerns, pcCoreStr, pcMaxStr, pcKnnStr, pcTopStr,
  ]);

  async function handleBatchAdd() {
    if (combinations.length === 0) return;
    const baseEff = modelConfig.model_type === 'efficientad'
      ? (modelConfig.params as EfficientAdParamsState)
      : DEFAULT_EFFICIENTAD;
    const sid = setId.trim() || undefined;
    setAddLoading(true);
    setAddError(null);
    setAddSuccess(false);
    try {
      for (const c of combinations) {
        const method = c.prep_method as PreprocessingConfig['method'];
        const preCfg: PreprocessingConfig = {
          method,
          background_method: c.background_method as 'none' | 'sam2',
          resize_mode: 'padding',
          image_size: c.image_size as number,
          normalization: 'imagenet',
          mean: [0.485, 0.456, 0.406],
          std: [0.229, 0.224, 0.225],
          params: (method === 'homomorphic' || method === 'clahe') ? preprocessingConfig.params : null,
        };
        let mdlCfg: ModelConfig;
        if (aeModel === 'efficientad') {
          mdlCfg = {
            model_type: 'efficientad',
            batch_size: c.batch_size as number,
            random_seed: c.random_seed as number,
            threshold_method: c.threshold_method as 'percentile' | 'absolute',
            threshold_value: c.threshold_value as number,
            params: {
              model_size: c.model_size as 'small' | 'medium',
              train_steps: c.train_steps as number,
              optimizer: c.optimizer as 'adam' | 'adamw' | 'sgd',
              learning_rate: c.learning_rate as number,
              weight_decay: c.weight_decay as number,
              out_channels: c.out_channels as 128 | 256 | 384 | 512,
              padding: c.padding as boolean,
              ae_loss_weight: c.ae_loss_weight as number,
              scheduler: c.scheduler as 'StepLR' | 'CosineAnnealingLR',
              use_imagenet_penalty: c.use_imagenet_penalty as boolean,
              autoencoder_lr: baseEff.autoencoder_lr,
              autoencoder_weight_decay: baseEff.autoencoder_weight_decay,
              lr_decay_epochs: baseEff.lr_decay_epochs,
              lr_decay_factor: baseEff.lr_decay_factor,
              penalty_batch_size: baseEff.penalty_batch_size,
              early_stopping: baseEff.early_stopping,
              patience: baseEff.patience,
              min_delta: baseEff.min_delta,
            } as EfficientAdParamsState,
          };
        } else {
          mdlCfg = {
            model_type: 'patchcore',
            batch_size: c.batch_size as number,
            random_seed: c.random_seed as number,
            threshold_method: c.threshold_method as 'percentile' | 'absolute',
            threshold_value: c.threshold_value as number,
            params: {
              backbone: c.backbone as 'wide_resnet50_2' | 'resnet18' | 'resnet50',
              pretrained_source: 'torchvision',
              pretrained_path: null,
              coreset_sampling_ratio: c.coreset_sampling_ratio as number,
              neighbourhood_kernel_size: c.neighbourhood_kernel_size as 1 | 3 | 5 | 7 | 9,
              max_train: c.max_train as number,
              knn: c.knn as number,
              top_k_ratio: c.top_k_ratio as number,
            } as PatchCoreParamsState,
          };
        }
        await addToQueue(preCfg, mdlCfg, sid);
      }
      clearLastResult();
      onQueueChanged();
      setAddSuccess(true);
      setTimeout(() => setAddSuccess(false), 3000);
    } catch (e: unknown) {
      const detail = (e as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
      setAddError(typeof detail === 'string' ? detail : (e as { message?: string })?.message ?? '일괄 추가 실패');
    } finally {
      setAddLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <p className="text-xs text-slate-500">
        파라미터 선택지를 여러 개 지정하면 모든 조합으로 실험을 자동 생성합니다.
        생성된 조합은 기존 대기열에 일괄 추가됩니다.
      </p>

      {/* 모델 선택 */}
      <Field label="모델 선택">
        <div className="flex gap-2">
          {(['efficientad', 'patchcore'] as const).map(m => (
            <button key={m} type="button" onClick={() => setAeModel(m)}
              className={`px-4 py-1.5 text-sm font-medium rounded-lg border transition-colors cursor-pointer ${
                aeModel === m
                  ? 'bg-sky-600 text-white border-sky-600'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}>
              {m === 'efficientad' ? 'EfficientAD' : 'PatchCore'}
            </button>
          ))}
        </div>
      </Field>

      {/* 파라미터 2열 */}
      <div className="grid grid-cols-2 gap-6">
        {/* 공통 파라미터 */}
        <div className="flex flex-col gap-4">
          <h4 className="text-xs font-semibold text-slate-600 uppercase tracking-wide border-b border-slate-100 pb-2">
            공통 파라미터
          </h4>

          <Field label="전처리 방식">
            <MultiCheck
              options={['none', 'homomorphic', 'he', 'clahe']}
              selected={prepMethods}
              onToggle={v => setPrepMethods(prev => toggle(prev, v))}
              fmt={v => ({ none: '없음', homomorphic: 'Homomorphic', he: 'HE', clahe: 'CLAHE' }[v as string] ?? String(v))}
            />
          </Field>

          <Field label="배경 분리">
            <MultiCheck
              options={['none', 'sam2']}
              selected={bgMethods}
              onToggle={v => setBgMethods(prev => toggle(prev, v))}
              fmt={v => ({ none: '없음', sam2: 'SAM2' }[v as string] ?? String(v))}
            />
          </Field>

          <Field label="이미지 크기" hint="쉼표로 여러 값 (32의 배수). 예: 256,512">
            <input type="text" value={imageSizesStr} onChange={e => setImageSizesStr(e.target.value)}
              placeholder="256" className={inputCls} />
          </Field>

          <Field label="배치 크기" hint="예: 16,32">
            <input type="text" value={batchSizesStr} onChange={e => setBatchSizesStr(e.target.value)}
              placeholder="16" className={inputCls} />
          </Field>

          <Field label="랜덤 시드" hint="예: 42">
            <input type="text" value={seedsStr} onChange={e => setSeedsStr(e.target.value)}
              placeholder="42" className={inputCls} />
          </Field>

          <Field label="Threshold 방식">
            <MultiCheck
              options={['percentile', 'absolute']}
              selected={threshMethods}
              onToggle={v => setThreshMethods(prev => toggle(prev, v))}
            />
          </Field>

          <Field label="Threshold 값" hint="예: 95.0,97.0">
            <input type="text" value={threshValsStr} onChange={e => setThreshValsStr(e.target.value)}
              placeholder="95.0" className={inputCls} />
          </Field>
        </div>

        {/* 모델별 파라미터 */}
        <div className="flex flex-col gap-4">
          <h4 className="text-xs font-semibold text-slate-600 uppercase tracking-wide border-b border-slate-100 pb-2">
            {aeModel === 'efficientad' ? 'EfficientAD' : 'PatchCore'} 파라미터
          </h4>

          {aeModel === 'efficientad' ? (
            <>
              <Field label="모델 크기">
                <MultiCheck options={['small', 'medium']} selected={effSizes}
                  onToggle={v => setEffSizes(prev => toggle(prev, v))} />
              </Field>
              <Field label="옵티마이저">
                <MultiCheck options={['adam', 'adamw', 'sgd']} selected={effOpts}
                  onToggle={v => setEffOpts(prev => toggle(prev, v))} />
              </Field>
              <Field label="스케줄러">
                <MultiCheck options={['StepLR', 'CosineAnnealingLR']} selected={effScheds}
                  onToggle={v => setEffScheds(prev => toggle(prev, v))} />
              </Field>
              <Field label="출력 채널 수">
                <MultiCheck options={[128, 256, 384, 512]} selected={effChs}
                  onToggle={v => setEffChs(prev => toggle(prev, v))} />
              </Field>
              <Field label="패딩">
                <MultiCheck options={[true, false]} selected={effPad}
                  onToggle={v => setEffPad(prev => toggle(prev, v))} fmt={BOOL_FMT} />
              </Field>
              <Field label="ImageNet Penalty">
                <MultiCheck options={[true, false]} selected={effPen}
                  onToggle={v => setEffPen(prev => toggle(prev, v))} fmt={BOOL_FMT} />
              </Field>
              <Field label="학습 단계 수 (train_steps)" hint="예: 30000,70000">
                <input type="text" value={effStepsStr} onChange={e => setEffStepsStr(e.target.value)}
                  placeholder="70000" className={inputCls} />
              </Field>
              <Field label="학습률 (learning_rate)" hint="예: 0.0001,0.001">
                <input type="text" value={effLrStr} onChange={e => setEffLrStr(e.target.value)}
                  placeholder="0.0001" className={inputCls} />
              </Field>
              <Field label="가중치 감쇠 (weight_decay)" hint="예: 0.0001">
                <input type="text" value={effWdStr} onChange={e => setEffWdStr(e.target.value)}
                  placeholder="0.0001" className={inputCls} />
              </Field>
              <Field label="AE Loss 비중 (ae_loss_weight)" hint="예: 0.5">
                <input type="text" value={effAeStr} onChange={e => setEffAeStr(e.target.value)}
                  placeholder="0.5" className={inputCls} />
              </Field>
            </>
          ) : (
            <>
              <Field label="백본 (backbone)">
                <MultiCheck options={['wide_resnet50_2', 'resnet18', 'resnet50']} selected={pcBbs}
                  onToggle={v => setPcBbs(prev => toggle(prev, v))} />
              </Field>
              <Field label="이웃 커널 크기">
                <MultiCheck options={[1, 3, 5, 7, 9]} selected={pcKerns}
                  onToggle={v => setPcKerns(prev => toggle(prev, v))} />
              </Field>
              <Field label="코어셋 비율 (coreset_sampling_ratio)" hint="예: 0.05,0.1">
                <input type="text" value={pcCoreStr} onChange={e => setPcCoreStr(e.target.value)}
                  placeholder="0.1" className={inputCls} />
              </Field>
              <Field label="최대 학습 샘플 (max_train)" hint="예: 1000">
                <input type="text" value={pcMaxStr} onChange={e => setPcMaxStr(e.target.value)}
                  placeholder="1000" className={inputCls} />
              </Field>
              <Field label="k-NN 이웃 수 (knn)" hint="예: 9">
                <input type="text" value={pcKnnStr} onChange={e => setPcKnnStr(e.target.value)}
                  placeholder="9" className={inputCls} />
              </Field>
              <Field label="Top-k 비율 (top_k_ratio)" hint="예: 0.1">
                <input type="text" value={pcTopStr} onChange={e => setPcTopStr(e.target.value)}
                  placeholder="0.1" className={inputCls} />
              </Field>
            </>
          )}
        </div>
      </div>

      {/* 조합 미리보기 + 추가 */}
      <div className="border-t border-slate-100 pt-4 flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-700">
            총{' '}
            <strong className={combinations.length > 100 ? 'text-amber-600' : 'text-sky-700'}>
              {combinations.length}
            </strong>
            개 조합
          </span>
          {combinations.length > 100 && (
            <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
              선택지를 줄이는 것을 권장합니다
            </span>
          )}
        </div>

        <Field label="Set ID">
          <input type="text" value={setId} onChange={e => setSetId(e.target.value)}
            placeholder="예: batch_001 (Tab4 그룹 비교용)" className={inputCls} />
        </Field>

        <div className="flex gap-3 items-center">
          <button type="button" onClick={handleBatchAdd}
            disabled={addLoading || combinations.length === 0}
            className="px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white text-sm font-medium rounded-lg disabled:opacity-40 transition-colors cursor-pointer">
            {addLoading
              ? `추가 중... (${combinations.length}개)`
              : `큐에 ${combinations.length}개 추가`}
          </button>
          {addSuccess && (
            <span className="text-xs font-medium text-emerald-600 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
              {combinations.length}개 추가 완료
            </span>
          )}
        </div>

        {addError && (
          <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{addError}</p>
        )}
      </div>
    </div>
  );
}
