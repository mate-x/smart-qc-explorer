import { NavLink } from 'react-router-dom';

const TABS = [
  { to: '/', label: '데이터' },
  { to: '/config', label: '전처리 / 모델' },
  { to: '/training', label: '학습' },
  { to: '/experiments', label: '실험 히스토리' },
  { to: '/anomaly-map', label: '이상 시각화' },
];

export function TabBar() {
  return (
    <nav className="shrink-0 bg-white border-b border-slate-200 flex items-center px-4 gap-1">
      {TABS.map(({ to, label }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          className={({ isActive }) =>
            `px-4 py-2.5 text-sm whitespace-nowrap border-b-2 transition-colors ${
              isActive
                ? 'border-sky-500 text-sky-600 font-medium'
                : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300'
            }`
          }
        >
          {label}
        </NavLink>
      ))}
    </nav>
  );
}
