import type { Experiment } from '../types/experiments';

function sortedPercentile(sorted: number[], p: number): number {
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (idx - lo) * (sorted[hi] - sorted[lo]);
}

export function computeInitialThreshold(exp: Experiment): number {
  const scores = exp.metrics?.anomaly_scores ?? [];
  const labels = exp.metrics?.image_labels ?? [];
  if (scores.length === 0) return 0.5;
  const sMin = Math.min(...scores);
  const sMax = Math.max(...scores);
  if (sMax <= sMin) return 0.5;
  const method = exp.threshold_method ?? 'percentile';
  const value = exp.threshold_value ?? 95.0;
  let rawThr: number;
  if (method === 'absolute') {
    rawThr = value;
  } else {
    const normalSorted = scores.filter((_, i) => labels[i] === 0).sort((a, b) => a - b);
    rawThr = normalSorted.length > 0 ? sortedPercentile(normalSorted, value) : value;
  }
  return Math.round(Math.max(0, Math.min(1, (rawThr - sMin) / (sMax - sMin))) * 10000) / 10000;
}
