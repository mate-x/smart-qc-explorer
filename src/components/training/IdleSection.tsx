import { useState, useEffect } from 'react';
import { useTrainingStore } from '../../store/trainingStore';
import { useConfigStore } from '../../store/configStore';
import {
  startTraining,
  getCheckpoints,
  deleteCheckpoint,
  resumeTraining,
} from '../../api/trainingApi';
import type { CheckpointInfo } from '../../types/training';

function fmtDate(s: string) {
  return s.slice(0, 19).replace('T', ' ');
}

function ckptProgress(c: CheckpointInfo): string {
  if (c.step != null && c.total_steps != null)
    return `${c.step.toLocaleString()} / ${c.total_steps.toLocaleString()} steps`;
  if (c.batch_idx != null && c.total_batches != null)
    return `${c.batch_idx} / ${c.total_batches} batches`;
  return '';
}

export default function IdleSection() {
  const { last_result, ws_error, clearLastResult, setWsError } = useTrainingStore();
  const { preprocessingConfig, modelConfig } = useConfigStore();
  const hasConfig = !!(preprocessingConfig && modelConfig);

  const [expName, setExpName] = useState('');
  const [startLoading, setStartLoading] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  const [checkpoints, setCheckpoints] = useState<CheckpointInfo[]>([]);
  const [cpOpen, setCpOpen] = useState(false);
  const [cpLoading, setCpLoading] = useState(false);
  const [resumeLoading, setResumeLoading] = useState<string | null>(null);
  const [resumeError, setResumeError] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);

  async function loadCheckpoints() {
    setCpLoading(true);
    try {
      const res = await getCheckpoints();
      setCheckpoints(res.data.checkpoints);
    } catch {
      // 무시 — 목록을 못 불러와도 크리티컬하지 않음
    } finally {
      setCpLoading(false);
    }
  }

  useEffect(() => {
    loadCheckpoints();
  }, []);

  async function handleStart() {
    setStartLoading(true);
    setStartError(null);
    try {
      await startTraining(expName.trim() || undefined);
      setExpName('');
    } catch (e: unknown) {
      const detail =
        (e as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
      setStartError(
        typeof detail === 'string' ? detail : (e as { message?: string })?.message ?? '시작 실패',
      );
    } finally {
      setStartLoading(false);
    }
  }

  async function handleResume(name: string) {
    setResumeLoading(name);
    setResumeError(null);
    try {
      await resumeTraining(name);
    } catch (e: unknown) {
      const detail =
        (e as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
      setResumeError(
        typeof detail === 'string' ? detail : (e as { message?: string })?.message ?? '재개 실패',
      );
    } finally {
      setResumeLoading(null);
    }
  }

  async function handleDeleteCkpt(name: string) {
    setDeleteLoading(name);
    try {
      await deleteCheckpoint(name);
      setCheckpoints((prev) => prev.filter((c) => c.name !== name));
    } catch {
      // ignore
    } finally {
      setDeleteLoading(null);
    }
  }

  const resultColor = {
    success: 'bg-green-50 border-green-300 text-green-800',
    warning: 'bg-yellow-50 border-yellow-300 text-yellow-800',
    error: 'bg-red-50 border-red-300 text-red-700',
  };

  return (
    <div className="flex flex-col gap-4">
      {/* 이전 학습 결과 배너 */}
      {last_result && (
        <div
          className={`border rounded px-3 py-2 text-sm flex justify-between items-start gap-2 ${resultColor[last_result.level]}`}
        >
          <span className="whitespace-pre-wrap">{last_result.msg}</span>
          <button
            onClick={clearLastResult}
            className="text-xs opacity-60 hover:opacity-100 shrink-0 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* WS 에러 배너 */}
      {ws_error && (
        <div className="border border-red-300 bg-red-50 rounded px-3 py-2 text-sm text-red-700 flex justify-between items-start gap-2">
          <span>{ws_error}</span>
          <button
            onClick={() => setWsError(null)}
            className="text-xs opacity-60 hover:opacity-100 shrink-0 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* 학습 시작 */}
      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-medium text-gray-700">학습 시작</h3>
        {!hasConfig && (
          <p className="text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 rounded px-2 py-1.5">
            Tab2에서 전처리 · 모델 설정을 먼저 저장해 주세요.
          </p>
        )}
        <div className="flex gap-2">
          <input
            type="text"
            value={expName}
            onChange={(e) => setExpName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && hasConfig && !startLoading && handleStart()}
            placeholder="실험명 (선택)"
            className="flex-1 border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-blue-400"
          />
          <button
            onClick={handleStart}
            disabled={!hasConfig || startLoading}
            className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50 whitespace-nowrap cursor-pointer"
          >
            {startLoading ? '시작 중...' : '▶ 학습 시작'}
          </button>
        </div>
        {startError && <p className="mt-1 text-red-600 text-[13px]">{startError}</p>}
      </div>

      {/* 체크포인트 재개 */}
      <div>
        <button
          onClick={() => { setCpOpen((o) => !o); if (!cpOpen) loadCheckpoints(); }}
          className="text-sm text-gray-600 flex items-center gap-1 hover:text-gray-900 cursor-pointer"
        >
          <span>{cpOpen ? '▾' : '▸'}</span>
          체크포인트에서 재개
          {checkpoints.length > 0 && (
            <span className="ml-1 px-1.5 py-0.5 bg-gray-100 text-gray-500 text-xs rounded-full">
              {checkpoints.length}
            </span>
          )}
        </button>

        {cpOpen && (
          <div className="mt-2">
            {cpLoading ? (
              <p className="text-xs text-gray-400">로딩 중...</p>
            ) : checkpoints.length === 0 ? (
              <p className="text-xs text-gray-400">저장된 체크포인트가 없습니다.</p>
            ) : (
              <div className="flex flex-col gap-1">
                {resumeError && <p className="mt-1 text-red-600 text-[13px]">{resumeError}</p>}
                {checkpoints.map((c) => (
                  <div
                    key={c.name}
                    className="flex items-center justify-between border border-gray-200 rounded px-3 py-2 text-xs gap-2"
                  >
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <span className="font-mono text-gray-700 truncate">{c.name}</span>
                      <span className="text-gray-400">
                        {c.model_type} · {fmtDate(c.created_at)}
                        {ckptProgress(c) ? ` · ${ckptProgress(c)}` : ''}
                      </span>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button
                        onClick={() => handleResume(c.name)}
                        disabled={resumeLoading === c.name || !hasConfig}
                        className="px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
                      >
                        {resumeLoading === c.name ? '...' : '재개'}
                      </button>
                      <button
                        onClick={() => handleDeleteCkpt(c.name)}
                        disabled={deleteLoading === c.name}
                        className="px-2 py-1 border border-gray-300 text-gray-500 rounded hover:bg-gray-50 disabled:opacity-50 cursor-pointer"
                      >
                        {deleteLoading === c.name ? '...' : '삭제'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
