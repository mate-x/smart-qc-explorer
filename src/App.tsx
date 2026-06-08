import { Routes, Route, Navigate } from 'react-router-dom';
import { Navbar } from './components/layout/Navbar';
import { TabBar } from './components/layout/TabBar';
import Tab1Dataset from './pages/Tab1Dataset';
import Tab2Config from './pages/Tab2Config';
import Tab3Training from './pages/Tab3Training';
import Tab4Experiments from './pages/Tab4Experiments';
import Tab5AnomalyMap from './pages/Tab5AnomalyMap';
import { useTrainingWs } from './hooks/useTrainingWs';

export default function App() {
  useTrainingWs();
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Navbar />
      <TabBar />
      <main className="flex-1 overflow-auto p-6 bg-slate-100">
        <Routes>
          <Route path="/" element={<Tab1Dataset />} />
          <Route path="/config" element={<Tab2Config />} />
          <Route path="/training" element={<Tab3Training />} />
          <Route path="/experiments" element={<Tab4Experiments />} />
          <Route path="/anomaly-map" element={<Tab5AnomalyMap />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
