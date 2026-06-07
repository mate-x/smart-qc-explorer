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
    if (!path) {
      setError('데이터셋 경로를 입력해 주세요.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await validateDataset(path, productNameInput.trim() || undefined);
      if (path !== datasetPath) clearConfigs();
      setDataset(path, res.data, productNameInput.trim());
    } catch (e: unknown) {
      const detail = (e as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
      setError(
        typeof detail === 'string'
          ? detail
          : Array.isArray(detail)
            ? (detail as Array<{ msg?: string }>).map(d => d.msg).join(', ')
            : (e as { message?: string })?.message ?? '데이터셋 검증 실패',
      );
      clearDataset();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-4 flex flex-col gap-4 overflow-auto h-full">
      {/* ── Top 2-col ── */}
      <div className="grid grid-cols-2 gap-4">
        {/* Left: input area */}
        <div className="flex flex-col gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              데이터셋 경로 (Dataset Path)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={inputPath}
                onChange={e => setInputPath(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleValidate()}
                placeholder="예: C:/datasets/bolt  또는  C:/datasets/mvtec/screw"
                className="flex-1 border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-blue-400"
              />
              <button
                onClick={handleValidate}
                disabled={loading}
                className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50 whitespace-nowrap cursor-pointer"
              >
                {loading ? '확인 중...' : '경로 확인'}
              </button>
            </div>
            {error && <p className="mt-1 text-red-600 text-[13px]">{error}</p>}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              검사 제품 입력 (ex. screw)
            </label>
            <input
              type="text"
              value={productNameInput}
              onChange={e => setProductNameInput(e.target.value)}
              placeholder="예: screw, bolt, pill ..."
              className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-blue-400"
            />
          </div>

          {/* Post-validation banners */}
          {datasetMeta && (
            <div className="flex flex-col gap-2">
              {!datasetMeta.has_background_clean && (
                <div className="bg-blue-50 border border-blue-200 rounded px-3 py-2 text-sm text-blue-700">
                  배경 분리 이미지 없음 (background_clean/ ❌) — SAM2 사용 시 필요합니다.
                </div>
              )}
              {datasetMeta.channels === 1 && (
                <div className="bg-blue-50 border border-blue-200 rounded px-3 py-2 text-sm text-blue-700">
                  그레이스케일 이미지로 감지되었습니다. (1채널)
                </div>
              )}
              {datasetMeta.has_invalid_files && (
                <div className="bg-yellow-50 border border-yellow-300 rounded px-3 py-2 text-sm text-yellow-700">
                  지원하지 않는 파일 {datasetMeta.invalid_file_count}개가 발견되었습니다. 학습에서
                  제외됩니다.
                </div>
              )}
              {datasetMeta.dataset_format === 'oking' && (
                <div className="bg-blue-50 border border-blue-200 rounded px-3 py-2 text-sm text-blue-700">
                  <strong>OK/NG 형식으로 로드됩니다.</strong>
                  <br />
                  OK {datasetMeta.oking_ok_count ?? 0}장 중{' '}
                  {Math.round((datasetMeta.train_ratio ?? 0.8) * 100)}% (
                  {datasetMeta.train_good_count}장)을 학습에, 나머지{' '}
                  {(datasetMeta.oking_ok_count ?? 0) - datasetMeta.train_good_count}장을 테스트(정상)에
                  사용합니다.
                  <br />
                  NG {datasetMeta.oking_ng_count ?? 0}장은 테스트(불량)로 사용합니다.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: folder tree */}
        <div>
          {datasetMeta && (
            <>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">폴더 구조</h3>
              <pre className="bg-gray-100 border border-gray-200 rounded p-3 text-xs font-mono whitespace-pre overflow-auto max-h-64">
                {datasetMeta.folder_tree}
              </pre>
            </>
          )}
        </div>
      </div>

      {/* ── Bottom section (검증 후만 표시) ── */}
      {datasetMeta && (
        <>
          <hr className="border-gray-200" />
          <div className="grid grid-cols-2 gap-4 items-start">
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">클래스 대표 이미지</h3>
              <ThumbnailGrid meta={datasetMeta} datasetPath={datasetPath!} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">클래스별 이미지수</h3>
              <ClassCountTable meta={datasetMeta} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
