import type { Experiment } from '../../types/experiments';

const BACKBONE_ABBREV: Record<string, string> = {
  wide_resnet50_2: 'wrn50',
  resnet50: 'r50',
  resnet18: 'r18',
};

export function paramSummary(exp: Experiment): string {
  const params = exp.model_params ?? {};
  if (exp.model_type === 'efficientad') {
    const size = params['model_size'] ?? '?';
    const steps = params['train_steps'];
    const opt = params['optimizer'] ?? '?';
    const stepsStr =
      typeof steps === 'number' ? `${Math.floor(steps / 1000)}k` : String(steps ?? '?');
    return `${size}/${stepsStr}/${opt}`;
  }
  if (exp.model_type === 'patchcore') {
    const backbone = String(params['backbone'] ?? '?');
    const ratio = params['coreset_sampling_ratio'] ?? '?';
    return `${BACKBONE_ABBREV[backbone] ?? backbone}/${ratio}`;
  }
  return '';
}

export function fmt(v: number | undefined, digits = 4): string {
  return v != null ? v.toFixed(digits) : '—';
}
