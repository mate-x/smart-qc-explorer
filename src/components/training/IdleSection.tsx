import { useState, useEffect } from 'react';
import { useTrainingStore } from '../../store/trainingStore';
import { useConfigStore } from '../../store/configStore';
import { useDatasetStore } from '../../store/datasetStore';
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
  const { last_result, ws_error, clearLastResult, setWsError, setCurrentModelType } = useTrainingStore();
  const { preprocessingConfig, modelConfig, deviceInfo } = useConfigStore();
  const { datasetPath } = useDatasetStore();
  const hasConfig = !!(datasetPath && preprocessingConfig && modelConfig);

  const [summaryOpen, setSummaryOpen] = useState(false);
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
    } catch { /* 무시 */ }
    finally { setCpLoading(false); }
  }

  useEffect(() => { loadCheckpoints(); }, []);

  async function handleStart() {
    setStartLoading(true);
    setStartError(null);
    try {
      const res = await startTraining(expName.trim() || undefined);
      setCurrentModelType(res.data.model_type ?? null);
      setExpName('');
    } catch (e: unknown) {
      const detail = (e as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
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
      const detail = (e as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
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
    } catch { /* ignore */ }
    finally { setDeleteLoading(null); }
  }

  const resultBanner = {
    success: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    warning: 'bg-amber-50 border-amber-200 text-amber-800',
    error: 'bg-red-50 border-red-200 text-red-700',
  };

  return (
    <div className="flex flex-col gap-5">
      {/* 이전 학습 결과 배너 */}
      {last_result && (
        <div className={`border rounded-xl px-4 py-3 text-sm flex justify-between items-start gap-2 ${resultBanner[last_result.level]}`}>
          <span className="whitespace-pre-wrap">{last_result.msg}</span>
          <button onClick={clearLastResult} className="text-xs opacity-50 hover:opacity-100 shrink-0 cursor-pointer">✕</button>
        </div>
      )}

      {/* WS 에러 배너 */}
      {ws_error && (
        <div className="border border-red-200 bg-red-50 rounded-xl px-4 py-3 text-sm text-red-700 flex justify-between items-start gap-2">
          <span>{ws_error}</span>
          <button onClick={() => setWsError(null)} className="text-xs opacity-50 hover:opacity-100 shrink-0 cursor-pointer">✕</button>
        </div>
      )}

      {/* 학습 시작 */}
      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold text-slate-800">학습 시작</h3>

        {/* 현재 학습 설정 요약 */}
        {preprocessingConfig && modelConfig && (
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => setSummaryOpen((o) => !o)}
              className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-medium text-slate-600 bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <span>현재 학습 설정 요약</span>
              <span className="text-slate-400">{summaryOpen ? '▲' : '▼'}</span>
            </button>
            {summaryOpen && (
              <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 px-4 py-3 text-xs text-slate-700">
                <p><span className="text-slate-400">모델</span>&nbsp;&nbsp;{modelConfig.model_type.toUpperCase()}</p>
                <p><span className="text-slate-400">전처리</span>&nbsp;&nbsp;{preprocessingConfig.method}</p>
                <p><span className="text-slate-400">이미지 크기</span>&nbsp;&nbsp;{preprocessingConfig.image_size}px</p>
                <p><span className="text-slate-400">Threshold</span>&nbsp;&nbsp;{modelConfig.threshold_method} ({modelConfig.threshold_value})</p>
                <p><span className="text-slate-400">배치 크기</span>&nbsp;&nbsp;{modelConfig.batch_size}</p>
                <p><span className="text-slate-400">디바이스</span>&nbsp;&nbsp;{deviceInfo?.device.toUpperCase() ?? '—'}</p>
                <p><span className="text-slate-400">랜덤 시드</span>&nbsp;&nbsp;{modelConfig.random_seed}</p>
              </div>
            )}
          </div>
        )}

        {!datasetPath && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 text-xs text-amber-700">
            탭1에서 데이터셋 경로를 검증해 주세요.
          </div>
        )}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-slate-500">
            실험명 <span className="font-normal text-slate-400">(비워두면 자동 생성)</span>
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={expName}
              onChange={(e) => setExpName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && hasConfig && !startLoading && handleStart()}
              placeholder="예: EfficientAD CLAHE clip2.0 실험"
              className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-400 transition-shadow"
            />
            <button
              onClick={handleStart}
              disabled={!hasConfig || startLoading}
              className="px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white text-sm font-medium rounded-lg disabled:opacity-40 whitespace-nowrap transition-colors cursor-pointer"
            >
              {startLoading ? '시작 중...' : '▶ 학습 시작'}
            </button>
          </div>
        </div>
        {startError && (
          <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{startError}</p>
        )}
      </div>

      {/* 체크포인트 재개 */}
      <div className="border-t border-slate-100 pt-4">
        <button
          onClick={() => { setCpOpen((o) => !o); if (!cpOpen) loadCheckpoints(); }}
          className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
        >
          <span className="text-slate-400 text-xs">{cpOpen ? '▾' : '▸'}</span>
          체크포인트에서 재개
          {checkpoints.length > 0 && (
            <span className="ml-1 px-1.5 py-0.5 bg-slate-100 text-slate-500 text-xs rounded-full font-medium">
              {checkpoints.length}
            </span>
          )}
        </button>

        {cpOpen && (
          <div className="mt-3 flex flex-col gap-2">
            {cpLoading ? (
              <p className="text-xs text-slate-400 animate-pulse">로딩 중...</p>
            ) : checkpoints.length === 0 ? (
              <p className="text-xs text-slate-400">저장된 체크포인트가 없습니다.</p>
            ) : (
              <>
                {resumeError && (
                  <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{resumeError}</p>
                )}
                {checkpoints.map((c) => (
                  <div
                    key={c.name}
                    className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 gap-3"
                  >
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <span className="font-mono text-xs text-slate-700 truncate">{c.name}</span>
                      <span className="text-xs text-slate-400">
                        {c.model_type} · {fmtDate(c.created_at)}
                        {ckptProgress(c) ? ` · ${ckptProgress(c)}` : ''}
                      </span>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => handleResume(c.name)}
                        disabled={resumeLoading === c.name || !hasConfig}
                        className="px-3 py-1 bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium rounded-lg disabled:opacity-40 transition-colors cursor-pointer"
                      >
                        {resumeLoading === c.name ? '...' : '재개'}
                      </button>
                      <button
                        onClick={() => handleDeleteCkpt(c.name)}
                        disabled={deleteLoading === c.name}
                        className="px-3 py-1 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-xs rounded-lg disabled:opacity-40 transition-colors cursor-pointer"
                      >
                        {deleteLoading === c.name ? '...' : '삭제'}
                      </button>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
