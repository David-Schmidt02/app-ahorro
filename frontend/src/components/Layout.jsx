import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import TabBar from './TabBar';
import Mascota from './Mascota';

function computeCalBadge() {
  try {
    const events = JSON.parse(localStorage.getItem('cal_events') || '[]');
    const now = new Date();
    const in7 = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    return events.filter(ev => {
      const d = new Date(ev.date);
      return d >= now && d <= in7;
    }).length;
  } catch {
    return 0;
  }
}

const Layout = () => {
  const [calBadge, setCalBadge] = useState(computeCalBadge);

  useEffect(() => {
    // Actualizar badge cuando cambian los eventos del calendario
    const onStorage = (e) => {
      if (!e || e.key === 'cal_events' || e.key === null) {
        setCalBadge(computeCalBadge());
      }
    };
    window.addEventListener('storage', onStorage);
    // También escuchar evento interno (mismo tab)
    const onCalChange = () => setCalBadge(computeCalBadge());
    window.addEventListener('cal_events_changed', onCalChange);
    const onCalViewed = () => setCalBadge(0);
    window.addEventListener('cal_viewed', onCalViewed);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('cal_events_changed', onCalChange);
      window.removeEventListener('cal_viewed', onCalViewed);
    };
  }, []);

  return (
    <div className="app-layout">
      <div className="app-header">
        <Navbar />
        <TabBar badges={{ '/calendario': calBadge }} />
      </div>
      <main className="main-content">
        <Outlet />
      </main>

      {/* Easter Egg */}
      <Mascota />
    </div>
  );
};

export default Layout;
