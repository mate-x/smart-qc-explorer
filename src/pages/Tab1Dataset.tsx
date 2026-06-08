import { useState } from 'react';
import { validateDataset } from '../api/datasetApi';
import { useDatasetStore } from '../store/datasetStore';
import { useConfigStore } from '../store/configStore';
import ThumbnailGrid from '../components/tab1/ThumbnailGrid';
import ClassCountTable from '../components/tab1/ClassCountTable';

export default function Tab1Dataset() {
  const { datasetPath, productName, datasetMeta, setDataset, clearDataset } = useDatasetStore();
  const { clearConfigs } = useConfigStore();

  const [inputPath, setInputPath] = useState(datasetPath ?? '');
  const [productNameInput, setProductNameInput] = useState(productName);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleValidate() {
    const path = inputPath.trim();
    if (!path) { setError('데이터셋 경로를 입력해 주세요.'); return; }
    setLoading(true);
    setError(null);
    try {
      const res = await validateDataset(path, productNameInput.trim() || undefined);
      if (path !== datasetPath) clearConfigs();
      setDataset(path, res.data, productNameInput.trim());
    } catch (e: unknown) {
      const detail = (e as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
      setError(
        typeof detail === 'string' ? detail
          : Array.isArray(detail) ? (detail as Array<{ msg?: string }>).map(d => d.msg).join(', ')
          : (e as { message?: string })?.message ?? '데이터셋 검증 실패',
      );
      clearDataset();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-5 h-full">
      {/* 입력 카드 */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <h2 className="text-sm font-semibold text-slate-800 mb-5">데이터셋 경로 설정</h2>
        <div className="grid grid-cols-2 gap-5">
          {/* 왼쪽: 폼 */}
          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Dataset Path</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={inputPath}
                  onChange={e => setInputPath(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleValidate()}
                  placeholder="예: C:/datasets/bolt  또는  C:/datasets/mvtec/screw"
                  className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-400 transition-shadow"
                />
                <button
                  onClick={handleValidate}
                  disabled={loading}
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white text-sm font-medium rounded-lg disabled:opacity-40 whitespace-nowrap transition-colors cursor-pointer"
                >
                  {loading ? '확인 중...' : '경로 확인'}
                </button>
              </div>
              {error && (
                <p className="mt-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">검사 제품명</label>
              <input
                type="text"
                value={productNameInput}
                onChange={e => setProductNameInput(e.target.value)}
                placeholder="예: screw, bolt, pill ..."
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-400 transition-shadow"
              />
            </div>
          </div>

          {/* 오른쪽: 폴더 구조 */}
          <div>
            {datasetMeta ? (
              <>
                <p className="text-xs font-medium text-slate-500 mb-1.5">폴더 구조</p>
                <pre className="bg-slate-50 text-slate-700 border border-slate-200 rounded-lg p-3 text-xs font-mono whitespace-pre overflow-auto max-h-52 leading-5">
                  {datasetMeta.folder_tree}
                </pre>
              </>
            ) : (
              <div className="h-full flex items-center justify-center rounded-xl border-2 border-dashed border-slate-200">
                <p className="text-xs text-slate-400">경로를 확인하면 폴더 구조가 표시됩니다</p>
              </div>
            )}
          </div>
        </div>

        {/* 검증 후 배너 */}
        {datasetMeta && (
          <div className="mt-4 flex flex-col gap-2">
            {!datasetMeta.has_background_clean && (
              <div className="bg-sky-50 border border-sky-200 rounded-lg px-4 py-2.5 text-xs text-sky-700">
                배경 분리 이미지 없음 (background_clean/ ❌) — SAM2 사용 시 필요합니다.
              </div>
            )}
            {datasetMeta.channels === 1 && (
              <div className="bg-sky-50 border border-sky-200 rounded-lg px-4 py-2.5 text-xs text-sky-700">
                그레이스케일 이미지로 감지되었습니다. (1채널)
              </div>
            )}
            {datasetMeta.has_invalid_files && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5 text-xs text-amber-700">
                지원하지 않는 파일 {datasetMeta.invalid_file_count}개 발견 — 학습에서 제외됩니다.
              </div>
            )}
            {datasetMeta.dataset_format === 'oking' && (
              <div className="bg-sky-50 border border-sky-200 rounded-lg px-4 py-2.5 text-xs text-sky-700">
                <strong>OK/NG 형식으로 로드됩니다.</strong>
                {' '}OK {datasetMeta.oking_ok_count ?? 0}장 중{' '}
                {Math.round((datasetMeta.train_ratio ?? 0.8) * 100)}%({datasetMeta.train_good_count}장) 학습 /
                나머지 {(datasetMeta.oking_ok_count ?? 0) - datasetMeta.train_good_count}장 테스트(정상) /
                NG {datasetMeta.oking_ng_count ?? 0}장 테스트(불량)
              </div>
            )}
          </div>
        )}
      </div>

      {/* 검증 후: 썸네일 + 클래스 수 */}
      {datasetMeta && (
        <div className="grid grid-cols-2 gap-5">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-4">클래스 대표 이미지</h3>
            <ThumbnailGrid meta={datasetMeta} datasetPath={datasetPath!} />
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-4">클래스별 이미지 수</h3>
            <ClassCountTable meta={datasetMeta} />
          </div>
        </div>
      )}
    </div>
  );
}
