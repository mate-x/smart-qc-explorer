import type { AnomalyMapImagesResponse, AnomalyImage } from '../../types/anomalyMap';
import { getTripletImageUrl } from '../../api/anomalyMapApi';

const PAGE_SIZE = 20;

const CLS_BADGE: Record<string, string> = {
  TP: 'bg-green-100 text-green-700 border-green-300',
  FP: 'bg-red-100 text-red-700 border-red-300',
  TN: 'bg-blue-100 text-blue-700 border-blue-300',
  FN: 'bg-orange-100 text-orange-700 border-orange-300',
};

interface Props {
  imagesData: AnomalyMapImagesResponse;
  expId: string;
  page: number;
  onPageChange: (p: number) => void;
}

export default function ImageGrid({ imagesData, expId, page, onPageChange }: Props) {
  const { images, score_max, score_avg, tp, fp, tn, fn } = imagesData;
  const totalPages = Math.max(1, Math.ceil(images.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageImages = images.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <div className="flex flex-col gap-3">
      {/* 통계 바 */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600">
        <span>전체 {images.length}개</span>
        <span className="text-green-700 font-medium">TP {tp}</span>
        <span className="text-red-700 font-medium">FP {fp}</span>
        <span className="text-blue-700 font-medium">TN {tn}</span>
        <span className="text-orange-700 font-medium">FN {fn}</span>
        <span>Max: {score_max.toFixed(4)}</span>
        <span>Avg: {score_avg.toFixed(4)}</span>
      </div>

      {images.length === 0 ? (
        <p className="text-sm text-gray-400">해당 조건에 맞는 이미지가 없습니다.</p>
      ) : (
        <>
          <div className="grid grid-cols-4 gap-3">
            {pageImages.map(img => (
              <ImageCard key={img.image_path} img={img} expId={expId} />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center gap-2 justify-center mt-1">
              <button
                onClick={() => onPageChange(Math.max(1, safePage - 1))}
                disabled={safePage === 1}
                className="px-2 py-1 border border-gray-300 rounded text-xs disabled:opacity-40 hover:bg-gray-50 cursor-pointer"
              >
                ‹
              </button>
              <span className="text-xs text-gray-600">{safePage} / {totalPages}</span>
              <button
                onClick={() => onPageChange(Math.min(totalPages, safePage + 1))}
                disabled={safePage === totalPages}
                className="px-2 py-1 border border-gray-300 rounded text-xs disabled:opacity-40 hover:bg-gray-50 cursor-pointer"
              >
                ›
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ImageCard({ img, expId }: { img: AnomalyImage; expId: string }) {
  const badgeClass = CLS_BADGE[img.classification] ?? 'bg-gray-100 text-gray-700 border-gray-300';
  return (
    <div className="border border-gray-200 rounded overflow-hidden flex flex-col bg-white">
      <div className="bg-gray-100 flex items-center justify-center min-h-20">
        <img
          src={getTripletImageUrl(expId, img.image_path)}
          alt={img.image_name}
          className="w-full object-contain"
          onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
        />
      </div>
      <div className="px-2 py-1.5 flex flex-col gap-0.5">
        <div className="flex items-center justify-between">
          <span className={`text-[10px] px-1.5 py-0.5 rounded border font-semibold ${badgeClass}`}>
            {img.classification}
          </span>
          <span className={`text-[10px] font-semibold ${img.verdict === 'NG' ? 'text-red-600' : 'text-blue-600'}`}>
            {img.verdict}
          </span>
        </div>
        <p className="text-[10px] text-gray-500 truncate" title={img.image_name}>{img.image_name}</p>
        <p className="text-[10px] text-gray-700">{img.defect_class} · {img.anomaly_score.toFixed(4)}</p>
      </div>
    </div>
  );
}
