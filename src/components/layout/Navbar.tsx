import { NavLink } from 'react-router-dom';
import { useDatasetStore } from '../../store/datasetStore';
import { useConfigStore } from '../../store/configStore';
import { useTrainingStore } from '../../store/trainingStore';

const TABS = [
  { to: '/', label: '데이터' },
  { to: '/config', label: '전처리 / 모델' },
  { to: '/training', label: '학습' },
  { to: '/experiments', label: '실험 히스토리' },
  { to: '/anomaly-map', label: '이상 시각화' },
];

export function Navbar() {
  const { datasetMeta } = useDatasetStore();
  const { deviceInfo } = useConfigStore();
  const { status } = useTrainingStore();

  return (
    <nav className="shrink-0 bg-slate-900 flex items-center h-12 px-4 gap-2">
      {/* Logo */}
      <div className="flex items-center gap-2 mr-4 shrink-0">
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M11 2L13.5 7H19L14.75 10.5L16.5 16L11 12.5L5.5 16L7.25 10.5L3 7H8.5L11 2Z"
            fill="#38bdf8"
            stroke="#0ea5e9"
            strokeWidth="0.5"
          />
          <circle cx="11" cy="10" r="3" fill="#0f172a" />
          <path d="M9.5 10l1 1 2-2" stroke="#38bdf8" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="text-sm font-bold text-white tracking-wide whitespace-nowrap">Smart QC</span>
      </div>

      {/* Divider */}
      <div className="w-px h-5 bg-slate-700 shrink-0" />

      {/* Nav links */}
      <div className="flex items-center flex-1 overflow-x-auto scrollbar-hide">
        {TABS.map(({ to, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `px-3 py-1.5 text-sm rounded whitespace-nowrap transition-colors mx-0.5 ${
                isActive
                  ? 'bg-sky-500 text-white font-medium'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700'
              }`
            }
          >
            {label}
          </NavLink>
        ))}
      </div>

      {/* Status chips */}
      <div className="flex items-center gap-2 shrink-0 ml-2">
        {status === 'running' && (
          <span className="text-xs bg-amber-400 text-amber-950 font-semibold px-2.5 py-0.5 rounded-full animate-pulse">
            학습 중
          </span>
        )}

        {datasetMeta && (
          <span className="text-xs text-slate-400 whitespace-nowrap hidden lg:block">
            <span className="text-white">{datasetMeta.train_good_count}</span> /{' '}
            <span className="text-white">
              {Object.values(datasetMeta.test_counts).reduce((a, b) => a + b, 0)}
            </span>
          </span>
        )}

        {deviceInfo && (
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${
              deviceInfo.device === 'cuda'
                ? 'bg-emerald-900 text-emerald-300'
                : 'bg-slate-700 text-slate-300'
            }`}
          >
            {deviceInfo.device === 'cuda' ? `GPU` : 'CPU'}
          </span>
        )}
      </div>
    </nav>
  );
}
