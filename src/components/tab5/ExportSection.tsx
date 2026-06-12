import { useState } from 'react';
import { exportCsv, prepareZip, getJobStatus, downloadZip } from '../../api/anomalyMapApi';

interface Props {
  expId: string;
  threshold: number;
  defectClass: string;
}

function extractError(e: unknown): string {
  const detail = (e as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
  if (typeof detail === 'string') return detail;
  return (e as { message?: string })?.message ?? '오류가 발생했습니다.';
}

export default function ExportSection({ expId, threshold, defectClass }: Props) {
  const [csvLoading, setCsvLoading] = useState(false);
  const [csvError, setCsvError] = useState<string | null>(null);
  const [zipLoading, setZipLoading] = useState(false);
  const [zipError, setZipError] = useState<string | null>(null);
  const [verdictFilter, setVerdictFilter] = useState<'전체' | 'OK' | 'NG'>('전체');

  const cls = defectClass !== '전체' ? defectClass : undefined;

  async function handleCsv() {
    setCsvLoading(true);
    setCsvError(null);
    try {
      const res = await exportCsv(expId, threshold, cls);
      const url = URL.createObjectURL(res.data as Blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${expId}_results.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: unknown) {
      setCsvError(extractError(e));
    } finally {
      setCsvLoading(false);
    }
  }

  async function handleZip() {
    setZipLoading(true);
    setZipError(null);
    try {
      const prepRes = await prepareZip(expId, threshold, cls, verdictFilter);
      const jobId = prepRes.data.job_id;
      let done = false;
      while (!done) {
        await new Promise(r => setTimeout(r, 1000));
        const statusRes = await getJobStatus(jobId);
        if (statusRes.data.status === 'completed') {
          done = true;
        } else if (statusRes.data.status === 'failed') {
          throw new Error(statusRes.data.error ?? 'ZIP 생성 실패');
        }
      }
      const dlRes = await downloadZip(jobId);
      const url = URL.createObjectURL(dlRes.data as Blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${expId}_anomaly_maps.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: unknown) {
      setZipError(extractError(e));
    } finally {
      setZipLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-sm font-semibold text-gray-700">결과 내보내기</h3>

      {/* verdict 필터 */}
      <div className="flex items-center gap-3">
        <span className="text-xs text-slate-500">대상:</span>
        {(['전체', 'OK', 'NG'] as const).map(v => (
          <label key={v} className="flex items-center gap-1 text-xs cursor-pointer">
            <input
              type="radio"
              name="verdict-filter"
              value={v}
              checked={verdictFilter === v}
              onChange={() => setVerdictFilter(v)}
              className="accent-sky-600"
            />
            {v === '전체' ? '모두' : v === 'OK' ? '정상(OK)' : '이상(NG)'}
          </label>
        ))}
      </div>

      <div className="flex gap-2 flex-wrap">
        <button
          onClick={handleCsv}
          disabled={csvLoading}
          className="px-3 py-1.5 border border-gray-300 text-sm rounded hover:bg-gray-50 disabled:opacity-50 cursor-pointer"
        >
          {csvLoading ? '내보내는 중...' : 'CSV 다운로드'}
        </button>
        <button
          onClick={handleZip}
          disabled={zipLoading}
          className="px-3 py-1.5 border border-gray-300 text-sm rounded hover:bg-gray-50 disabled:opacity-50 cursor-pointer"
        >
          {zipLoading ? 'ZIP 생성 중...' : 'ZIP 다운로드'}
        </button>
      </div>
      {csvError && <p className="text-xs text-red-600">CSV: {csvError}</p>}
      {zipError && <p className="text-xs text-red-600">ZIP: {zipError}</p>}
    </div>
  );
}
