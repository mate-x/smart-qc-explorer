interface Props {
  built: boolean;
  imageCount: number;
  building: boolean;
  buildError: string | null;
  onBuild: () => void;
}

export default function BuildSection({ built, imageCount, building, buildError, onBuild }: Props) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3 flex-wrap">
        {built ? (
          <span className="text-sm text-green-700">
            ✓ Anomaly Map 생성 완료 ({imageCount}개 이미지)
          </span>
        ) : (
          <span className="text-sm text-gray-500">Anomaly Map이 아직 생성되지 않았습니다.</span>
        )}
        <button
          onClick={onBuild}
          disabled={building}
          className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50 whitespace-nowrap cursor-pointer"
        >
          {building ? '생성 중...' : built ? '재생성' : 'Anomaly Map 생성'}
        </button>
        {building && (
          <span className="text-xs text-gray-400 animate-pulse">모델 추론 중, 잠시 기다려 주세요...</span>
        )}
      </div>
      {buildError && <p className="text-xs text-red-600">{buildError}</p>}
    </div>
  );
}
