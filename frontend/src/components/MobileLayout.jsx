import { useRef, useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import SavingsIcon from '@mui/icons-material/Savings';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import EventRepeatIcon from '@mui/icons-material/EventRepeat';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import Dashboard from '../pages/Dashboard';
import Gastos from '../pages/Gastos';
import HorariosSemanales from '../pages/HorariosSemanales';
import Calendario from '../pages/Calendario';

const TABS = [
  { path: '/',           label: 'Objetivos',  Icon: SavingsIcon,       Component: Dashboard },
  { path: '/gastos',     label: 'Gastos',      Icon: ReceiptLongIcon,   Component: Gastos },
  { path: '/horarios',   label: 'Horarios',    Icon: EventRepeatIcon,   Component: HorariosSemanales },
  { path: '/calendario', label: 'Calendario',  Icon: CalendarMonthIcon, Component: Calendario },
];

const getIndexFromPath = (path) => {
  const idx = TABS.findIndex(t => t.path === path);
  return idx >= 0 ? idx : 0;
};

const MobileLayout = ({ badges = {} }) => {
  const containerRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const [activeIdx, setActiveIdx] = useState(() => getIndexFromPath(location.pathname));

  // Scroll to correct page on mount (no animation — restores position when coming back from detail)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const idx = getIndexFromPath(location.pathname);
    container.scrollTo({ left: idx * container.offsetWidth, behavior: 'instant' });
    setActiveIdx(idx);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Detect which page is visible after scroll ends → update tab + URL
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let timer;
    const onScrollSettle = () => {
      const idx = Math.round(container.scrollLeft / container.offsetWidth);
      setActiveIdx(prev => {
        if (idx !== prev) {
          navigate(TABS[idx].path, { replace: true });
          return idx;
        }
        return prev;
      });
    };

    // Use scrollend if supported, fallback to debounced scroll
    const supportsScrollEnd = 'onscrollend' in window;
    if (supportsScrollEnd) {
      container.addEventListener('scrollend', onScrollSettle);
    } else {
      const debounced = () => { clearTimeout(timer); timer = setTimeout(onScrollSettle, 80); };
      container.addEventListener('scroll', debounced);
    }

    return () => {
      container.removeEventListener('scrollend', onScrollSettle);
      container.removeEventListener('scroll', onScrollSettle);
      clearTimeout(timer);
    };
  }, [navigate]);

  const handleTabClick = (idx) => {
    const container = containerRef.current;
    if (!container) return;
    container.scrollTo({ left: idx * container.offsetWidth, behavior: 'smooth' });
    setActiveIdx(idx);
    navigate(TABS[idx].path, { replace: true });
  };

  return (
    <>
      <div ref={containerRef} className="mobile-swipe-container">
        {TABS.map(({ path, Component }) => (
          <div key={path} className="mobile-swipe-page">
            <Component />
          </div>
        ))}
      </div>

      <nav className="mobile-tabbar">
        {TABS.map(({ path, label, Icon }, idx) => (
          <button
            key={path}
            className={`mobile-tabbar-tab${idx === activeIdx ? ' active' : ''}`}
            onClick={() => handleTabClick(idx)}
          >
            <Icon fontSize="small" />
            <span className="mobile-tabbar-label">{label}</span>
            {badges[path] > 0 && (
              <span className="tab-badge">{badges[path]}</span>
            )}
          </button>
        ))}
      </nav>
    </>
  );
};

export default MobileLayout;
