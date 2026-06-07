import { NavLink } from 'react-router-dom';

const TABS = [
  { to: '/', label: '📁 탭1. 데이터 폴더' },
  { to: '/config', label: '⚙️ 탭2. 전처리 및 모델 설정' },
  { to: '/training', label: '🚀 탭3. 학습' },
  { to: '/experiments', label: '📊 탭4. 실험 히스토리' },
  { to: '/anomaly-map', label: '🗺️ 탭5. 이상 영역 시각화' },
];

export function TabBar() {
  return (
    <nav className="flex border-b border-gray-200 bg-white px-2 shrink-0">
      {TABS.map(({ to, label }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          className={({ isActive }) =>
            `px-4 py-3 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition-colors ${
              isActive
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
            }`
          }
        >
          {label}
        </NavLink>
      ))}
    </nav>
  );
}
