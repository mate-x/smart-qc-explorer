import { useState, useEffect, useRef } from 'react';
import type { AnomalyMapImagesResponse, AnomalyImage } from '../../types/anomalyMap';
import {
  getTripletImageUrl,
  getOriginalImageUrl,
  getGtMaskImageUrl,
  getHeatmapImageUrl,
} from '../../api/anomalyMapApi';

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
  threshold: number;
  page: number;
  onPageChange: (p: number) => void;
}

export default function ImageGrid({ imagesData, expId, threshold, page, onPageChange }: Props) {
  const { images, score_max, score_avg, tp, fp, tn, fn } = imagesData;
  const totalPages = Math.max(1, Math.ceil(images.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageImages = images.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const [selectedImage, setSelectedImage] = useState<AnomalyImage | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selectedImage && panelRef.current) {
      panelRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [selectedImage]);

  function handleCardClick(img: AnomalyImage) {
    setSelectedImage(prev => prev?.image_path === img.image_path ? null : img);
  }

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
              <ImageCard
                key={img.image_path}
                img={img}
                expId={expId}
                threshold={threshold}
                isSelected={selectedImage?.image_path === img.image_path}
                onClick={() => handleCardClick(img)}
              />
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

      {/* 하단 3-panel 상세 패널 */}
      {selectedImage && (
        <div ref={panelRef}>
          <DetailPanel
            img={selectedImage}
            expId={expId}
            threshold={threshold}
            onClose={() => setSelectedImage(null)}
          />
        </div>
      )}
    </div>
  );
}

// ---------- ImageCard ----------

interface CardProps {
  img: AnomalyImage;
  expId: string;
  threshold: number;
  isSelected: boolean;
  onClick: () => void;
}

function ImageCard({ img, expId, threshold, isSelected, onClick }: CardProps) {
  const badgeClass = CLS_BADGE[img.classification] ?? 'bg-gray-100 text-gray-700 border-gray-300';
  return (
    <div
      onClick={onClick}
      className={`border rounded overflow-hidden flex flex-col bg-white cursor-pointer transition-all ${
        isSelected ? 'border-sky-500 ring-2 ring-sky-300' : 'border-gray-200 hover:border-slate-400'
      }`}
    >
      <div className="bg-gray-100 flex items-center justify-center min-h-20">
        <img
          src={getTripletImageUrl(expId, img.image_path, threshold)}
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

// ---------- DetailPanel ----------

interface DetailPanelProps {
  img: AnomalyImage;
  expId: string;
  threshold: number;
  onClose: () => void;
}

function DetailPanel({ img, expId, threshold, onClose }: DetailPanelProps) {
  const [gtMaskError, setGtMaskError] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => { setGtMaskError(false); }, [img.image_path]);

  const verdict = img.anomaly_score >= threshold ? 'NG' : 'OK';
  const stem = img.image_name.replace(/\.[^/.]+$/, '');

  async function handleDownload() {
    setDownloading(true);
    try {
      const res = await fetch(getTripletImageUrl(expId, img.image_path, threshold));
      const blob = await res.blob();
      const objUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objUrl;
      a.download = `${expId}_${stem}_anomaly.png`;
      a.click();
      URL.revokeObjectURL(objUrl);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="border border-sky-200 rounded-xl bg-sky-50 p-4 flex flex-col gap-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-800">이미지 상세 시각화</p>
        <button
          onClick={onClose}
          className="text-xs text-slate-400 hover:text-slate-700 cursor-pointer"
        >
          ✕ 닫기
        </button>
      </div>

      <p className="text-xs text-slate-500 -mt-2">{img.image_name}</p>

      {/* 3-panel */}
      <div className="grid grid-cols-3 gap-3">
        <PanelImage
          label="원본 이미지"
          src={getOriginalImageUrl(expId, img.image_path)}
          alt="원본 이미지"
        />
        <div className="flex flex-col gap-1">
          <p className="text-xs text-slate-500 font-medium">GT 마스크</p>
          {gtMaskError ? (
            <div className="flex-1 bg-slate-200 rounded flex items-center justify-center min-h-32">
              <p className="text-xs text-slate-400">GT 마스크 없음</p>
            </div>
          ) : (
            <img
              src={getGtMaskImageUrl(expId, img.image_path)}
              alt="GT 마스크"
              className="w-full rounded object-contain bg-slate-100"
              onError={() => setGtMaskError(true)}
            />
          )}
        </div>
        <PanelImage
          label="Anomaly Heatmap (윤곽선 오버레이)"
          src={getHeatmapImageUrl(expId, img.image_path)}
          alt="Anomaly Heatmap"
        />
      </div>

      {/* 메트릭 */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Anomaly Score', value: img.anomaly_score.toFixed(4) },
          { label: 'Threshold', value: threshold.toFixed(4) },
          { label: '판정', value: verdict },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white border border-slate-200 rounded-lg px-3 py-2.5">
            <p className="text-[10px] text-slate-400 mb-0.5">{label}</p>
            <p className={`text-sm font-semibold ${
              label === '판정'
                ? verdict === 'NG' ? 'text-red-600' : 'text-blue-600'
                : 'text-slate-800'
            }`}>
              {value}
            </p>
          </div>
        ))}
      </div>

      {/* PNG 다운로드 */}
      <div>
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-xs font-medium rounded-lg disabled:opacity-40 transition-colors cursor-pointer"
        >
          {downloading ? '다운로드 중...' : '↓ PNG 다운로드'}
        </button>
      </div>
    </div>
  );
}

function PanelImage({ label, src, alt }: { label: string; src: string; alt: string }) {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-xs text-slate-500 font-medium">{label}</p>
      <img
        src={src}
        alt={alt}
        className="w-full rounded object-contain bg-slate-100"
        onError={e => { (e.currentTarget as HTMLImageElement).style.opacity = '0.3'; }}
      />
    </div>
  );
}
