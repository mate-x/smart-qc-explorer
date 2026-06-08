import type { DatasetValidateResponse } from '../../types/dataset';

export default function ClassCountTable({ meta }: { meta: DatasetValidateResponse }) {
  const rows: Array<{ cls: string; train: number; test: number; gt: number }> = [];

  rows.push({
    cls: 'good (정상)',
    train: meta.train_good_count,
    test: meta.test_counts['good'] ?? 0,
    gt: meta.gt_counts['good'] ?? 0,
  });

  for (const cls of meta.defect_classes) {
    if (cls === 'good') continue;
    rows.push({
      cls,
      train: 0,
      test: meta.test_counts[cls] ?? 0,
      gt: meta.gt_counts[cls] ?? 0,
    });
  }

  const total = {
    train: rows.reduce((s, r) => s + r.train, 0),
    test: rows.reduce((s, r) => s + r.test, 0),
    gt: rows.reduce((s, r) => s + r.gt, 0),
  };

  return (
    <table className="w-full text-sm border-collapse">
      <thead>
        <tr className="bg-gray-100">
          <th className="border border-gray-200 px-3 py-1.5 text-left font-medium">클래스</th>
          <th className="border border-gray-200 px-3 py-1.5 text-right font-medium">학습(train)</th>
          <th className="border border-gray-200 px-3 py-1.5 text-right font-medium">테스트(test)</th>
          <th className="border border-gray-200 px-3 py-1.5 text-right font-medium">GT 마스크</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(r => (
          <tr key={r.cls} className="hover:bg-gray-50">
            <td className="border border-gray-200 px-3 py-1.5">{r.cls}</td>
            <td className="border border-gray-200 px-3 py-1.5 text-right">{r.train.toLocaleString()}</td>
            <td className="border border-gray-200 px-3 py-1.5 text-right">{r.test.toLocaleString()}</td>
            <td className="border border-gray-200 px-3 py-1.5 text-right">{r.gt.toLocaleString()}</td>
          </tr>
        ))}
        <tr className="bg-gray-100 font-semibold">
          <td className="border border-gray-200 px-3 py-1.5">합계</td>
          <td className="border border-gray-200 px-3 py-1.5 text-right">{total.train.toLocaleString()}</td>
          <td className="border border-gray-200 px-3 py-1.5 text-right">{total.test.toLocaleString()}</td>
          <td className="border border-gray-200 px-3 py-1.5 text-right">{total.gt.toLocaleString()}</td>
        </tr>
      </tbody>
    </table>
  );
}
