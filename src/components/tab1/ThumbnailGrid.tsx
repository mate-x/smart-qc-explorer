import { getThumbnailUrl } from '../../api/datasetApi';
import type { DatasetValidateResponse } from '../../types/dataset';

export default function ThumbnailGrid({
  meta,
  datasetPath,
}: {
  meta: DatasetValidateResponse;
  datasetPath: string;
}) {
  if (meta.dataset_format === 'oking') {
    const cols: Array<{ label: string; className: string }> = [];
    if (meta.oking_ok_dir) cols.push({ label: 'OK (정상)', className: meta.oking_ok_dir });
    if (meta.oking_ng_dir) cols.push({ label: 'NG (불량)', className: meta.oking_ng_dir });

    if (cols.length === 0) return <p className="text-sm text-gray-500">이미지 없음</p>;

    return (
      <div className={cols.length === 1 ? 'grid grid-cols-1 gap-3' : 'grid grid-cols-2 gap-3'}>
        {cols.map(({ label, className }) => (
          <div key={className} className="text-center">
            <img
              src={getThumbnailUrl(className, datasetPath)}
              alt={label}
              className="w-full rounded border border-gray-200 object-cover"
              style={{ aspectRatio: '1 / 1' }}
              onError={e => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
            <p className="text-xs text-gray-600 mt-1">{label}</p>
          </div>
        ))}
      </div>
    );
  }

  // MVTec AD: 3열 그리드
  const classes = meta.defect_classes;
  if (classes.length === 0) return <p className="text-sm text-gray-500">이미지 없음</p>;

  return (
    <div className="grid grid-cols-3 gap-3">
      {classes.map(cls => (
        <div key={cls} className="text-center">
          <img
            src={getThumbnailUrl(cls, datasetPath)}
            alt={cls}
            className="w-full rounded border border-gray-200 object-cover"
            style={{ aspectRatio: '1 / 1' }}
            onError={e => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
          <p className="text-xs text-gray-600 mt-1">{cls}</p>
        </div>
      ))}
    </div>
  );
}
