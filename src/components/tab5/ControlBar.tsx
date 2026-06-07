interface Props {
  threshold: number;
  onThresholdChange: (v: number) => void;
  defectClasses: string[];
  selectedClass: string;
  onClassChange: (v: string) => void;
}

export default function ControlBar({
  threshold,
  onThresholdChange,
  defectClasses,
  selectedClass,
  onClassChange,
}: Props) {
  return (
    <div className="flex flex-wrap gap-4 items-center bg-gray-50 border border-gray-200 rounded px-4 py-3">
      <div className="flex items-center gap-2">
        <label className="text-xs font-medium text-gray-600 whitespace-nowrap">Threshold</label>
        <input
          type="range"
          min={0}
          max={1.2}
          step={0.01}
          value={threshold}
          onChange={e => onThresholdChange(parseFloat(e.target.value))}
          className="w-40"
        />
        <span className="text-sm font-mono text-gray-700 w-12 text-right">{threshold.toFixed(2)}</span>
      </div>

      {defectClasses.length > 0 && (
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-gray-600 whitespace-nowrap">결함 유형</label>
          <select
            value={selectedClass}
            onChange={e => onClassChange(e.target.value)}
            className="border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none"
          >
            <option value="전체">전체</option>
            {defectClasses.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
