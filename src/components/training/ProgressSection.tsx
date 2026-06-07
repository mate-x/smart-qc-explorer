import { useRef, useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useTrainingStore } from '../../store/trainingStore';
import {
  pauseTraining,
  unpauseTraining,
  stopTraining,
  skipBatchItem,
  stopBatchTraining,
} from '../../api/trainingApi';
import type { LossPoint } from '../../types/training';

function downsample(points: LossPoint[], max = 500): LossPoint[] {
  if (points.length <= max) return points;
  const ratio = points.length / max;
  return Array.from({ length: max }, (_, i) => points[Math.floor(i * ratio)]);
}

function fmtSecs(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return m > 0 ? `${m}분 ${sec}초` : `${sec}초`;
}

export default function ProgressSection() {
  const { status, progress, loss_history, log_lines, batch_mode, batch_total, batch_done } =
    useTrainingStore();
  const logRef = useRef<HTMLPreElement>(null);
  const [ctrlError, setCtrlError] = useState<string | null>(null);
  const [pauseLoading, setPauseLoading] = useState(false);
  const [stopLoading, setStopLoading] = useState(false);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [log_lines]);

  const pct = progress
    ? Math.min(100, Math.round((progress.step / progress.total) * 100))
    : 0;
  const ratio = progress ? progress.step / progress.total : 0;
  const etaSecs =
    ratio > 0 && progress ? Math.round((progress.elapsed / ratio) * (1 - ratio)) : null;
  const chartData = downsample(loss_history, 500);

  async function handlePauseToggle() {
    setPauseLoading(true);
    setCtrlError(null);
    try {
      if (status === 'running') await pauseTraining();
      else await unpauseTraining();
    } catch (e: unknown) {
      setCtrlError((e as { message?: string })?.message ?? '오류');
    } finally {
      setPauseLoading(false);
    }
  }

  async function handleStop() {
    setStopLoading(true);
    setCtrlError(null);
    try {
      if (batch_mode) await stopBatchTraining();
      else await stopTraining();
    } catch (e: unknown) {
      setCtrlError((e as { message?: string })?.message ?? '오류');
    } finally {
      setStopLoading(false);
    }
  }

  async function handleSkip() {
    setCtrlError(null);
    try {
      await skipBatchItem();
    } catch (e: unknown) {
      setCtrlError((e as { message?: string })?.message ?? '건너뜀 실패');
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* 배치 진행 */}
      {batch_mode && (
        <p className="text-sm text-gray-600">
          일괄 학습:{' '}
          <span className="font-medium">
            {batch_done} / {batch_total}
          </span>
          개 완료
        </p>
      )}

      {/* 진행률 */}
      {progress && (
        <div className="flex flex-col gap-1">
          <div className="flex justify-between text-xs text-gray-500">
            <span>
              Step {progress.step.toLocaleString()} / {progress.total.toLocaleString()}
            </span>
            <span>{pct}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="flex gap-4 text-xs text-gray-500">
            <span>
              Loss:{' '}
              <span className="font-mono text-gray-800">{progress.loss.toFixed(6)}</span>
            </span>
            <span>경과: {fmtSecs(progress.elapsed)}</span>
            {etaSecs != null && <span>예상 잔여: {fmtSecs(etaSecs)}</span>}
          </div>
        </div>
      )}

      {/* 제어 버튼 */}
      <div className="flex gap-2 items-center flex-wrap">
        <button
          onClick={handlePauseToggle}
          disabled={pauseLoading}
          className="px-3 py-1.5 border border-gray-300 text-sm rounded hover:bg-gray-50 disabled:opacity-50 cursor-pointer"
        >
          {pauseLoading ? '...' : status === 'running' ? '⏸ 일시정지' : '▶ 재개'}
        </button>
        {batch_mode && (
          <button
            onClick={handleSkip}
            className="px-3 py-1.5 border border-gray-300 text-sm rounded hover:bg-gray-50 cursor-pointer"
          >
            ⏭ 이번 건너뜀
          </button>
        )}
        <button
          onClick={handleStop}
          disabled={stopLoading}
          className="px-3 py-1.5 border border-red-300 text-red-600 text-sm rounded hover:bg-red-50 disabled:opacity-50 cursor-pointer"
        >
          {stopLoading ? '중단 중...' : '⏹ 중단'}
        </button>
        {ctrlError && <p className="text-xs text-red-600">{ctrlError}</p>}
      </div>

      {/* Loss 차트 */}
      {chartData.length > 1 && (
        <div>
          <p className="text-xs text-gray-500 mb-1">Loss 추이</p>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
              <XAxis
                dataKey="step"
                tick={{ fontSize: 10 }}
                tickFormatter={(v: number) => v.toLocaleString()}
              />
              <YAxis
                tick={{ fontSize: 10 }}
                width={54}
                tickFormatter={(v: number) => v.toFixed(3)}
              />
              <Tooltip
                contentStyle={{ fontSize: 11 }}
                formatter={(v: number) => [v.toFixed(6), 'loss']}
                labelFormatter={(l: number) => `step ${l.toLocaleString()}`}
              />
              <Line
                type="monotone"
                dataKey="loss"
                stroke="#3b82f6"
                dot={false}
                strokeWidth={1.5}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* 로그 */}
      <div>
        <p className="text-xs text-gray-500 mb-1">로그</p>
        <pre
          ref={logRef}
          className="bg-gray-900 text-gray-100 text-xs font-mono p-3 rounded h-40 overflow-y-auto whitespace-pre-wrap leading-5"
        >
          {log_lines.length > 0 ? log_lines.join('\n') : '(로그 없음)'}
        </pre>
      </div>
    </div>
  );
}
