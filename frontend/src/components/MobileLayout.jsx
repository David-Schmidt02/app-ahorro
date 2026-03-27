import { useRef, useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import SavingsIcon from '@mui/icons-material/Savings';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import EventRepeatIcon from '@mui/icons-material/EventRepeat';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import AddIcon from '@mui/icons-material/Add';
import SaveIcon from '@mui/icons-material/Save';
import Dashboard from '../pages/Dashboard';
import Gastos from '../pages/Gastos';
import HorariosSemanales from '../pages/HorariosSemanales';
import Calendario from '../pages/Calendario';
import FAB from './FAB';

// color = FAB gradient key, tabColor = bottom-bar active color, glowColor = FAB shadow
const FAB_CONFIGS = {
  '/':           { Icon: AddIcon,  color: 'primary', glowColor: 'rgba(225,29,72,0.55)',   title: 'Nuevo Objetivo' },
  '/gastos':     { Icon: AddIcon,  color: 'warning', glowColor: 'rgba(245,158,11,0.55)',  title: 'Registrar Gasto' },
  '/horarios':   { Icon: SaveIcon, color: 'success', glowColor: 'rgba(16,185,129,0.55)',  title: 'Guardar horario' },
  '/calendario': { Icon: AddIcon,  color: 'info',    glowColor: 'rgba(56,189,248,0.55)',  title: 'Nuevo Evento' },
};

const TAB_COLORS = {
  '/':           '#ff719a',
  '/gastos':     '#f59e0b',
  '/horarios':   '#10b981',
  '/calendario': '#38bdf8',
};

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
  const [dragOffset, setDragOffset] = useState(0);
  const [pageWidth, setPageWidth] = useState(window.innerWidth);

  const activeIdxRef = useRef(activeIdx);
  const touchStartX = useRef(null);
  const touchStartY = useRef(null);
  const isHorizontalRef = useRef(false);
  const skipSwipeRef = useRef(false);

  useEffect(() => { activeIdxRef.current = activeIdx; }, [activeIdx]);

  // Get real container width after mount (avoids window.innerWidth mismatches on iOS)
  useEffect(() => {
    const update = () => {
      if (containerRef.current) setPageWidth(containerRef.current.offsetWidth);
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const goToTab = useCallback((idx) => {
    if (idx < 0 || idx >= TABS.length) return;
    setDragOffset(0);
    setActiveIdx(idx);
    activeIdxRef.current = idx;
    navigate(TABS[idx].path, { replace: true });
  }, [navigate]);

  // Non-passive touchmove to allow preventDefault on horizontal swipes
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onMove = (e) => {
      if (touchStartX.current === null || skipSwipeRef.current) return;
      const dx = e.touches[0].clientX - touchStartX.current;
      const dy = e.touches[0].clientY - touchStartY.current;

      if (!isHorizontalRef.current) {
        if (Math.abs(dy) > Math.abs(dx)) return; // vertical scroll — don't interfere
        if (Math.abs(dx) < 8) return;
        isHorizontalRef.current = true;
      }

      e.preventDefault(); // block vertical scroll during horizontal swipe

      const idx = activeIdxRef.current;
      let clamped = dx;
      if (idx === 0 && dx > 0) clamped = dx / 3;           // resist past first
      if (idx === TABS.length - 1 && dx < 0) clamped = dx / 3; // resist past last

      setDragOffset(clamped);
    };

    el.addEventListener('touchmove', onMove, { passive: false });
    return () => el.removeEventListener('touchmove', onMove);
  }, []);

  const onTouchStart = (e) => {
    // Check if touch is inside a horizontally scrollable element
    let node = e.target;
    let insideScrollable = false;
    while (node && node !== containerRef.current) {
      const style = window.getComputedStyle(node);
      const ox = style.overflowX;
      if ((ox === 'auto' || ox === 'scroll') && node.scrollWidth > node.clientWidth) {
        insideScrollable = true;
        break;
      }
      node = node.parentElement;
    }
    skipSwipeRef.current = insideScrollable;
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    isHorizontalRef.current = false;
  };

  const onTouchEnd = (e) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (skipSwipeRef.current || !isHorizontalRef.current) return;
    setDragOffset(0);
    const threshold = 60;
    const idx = activeIdxRef.current;
    if (dx < -threshold && idx < TABS.length - 1) goToTab(idx + 1);
    else if (dx > threshold && idx > 0) goToTab(idx - 1);
  };

  const isDragging = dragOffset !== 0;
  const activePath = TABS[activeIdx]?.path;
  const fabConfig = FAB_CONFIGS[activePath];

  const handleFAB = () => {
    window.dispatchEvent(new CustomEvent(`fab:click:${activePath}`));
  };

  return (
    <>
      <div
        ref={containerRef}
        className="mobile-swipe-outer"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {TABS.map(({ path, Component }, idx) => {
          // Each page positioned absolutely; slides via its own translateX
          const translateX = (idx - activeIdx) * pageWidth + dragOffset;
          const isAdjacent = Math.abs(idx - activeIdx) <= 1;

          return (
            <div
              key={path}
              className="mobile-swipe-page"
              style={{
                transform: `translateX(${translateX}px)`,
                transition: isDragging || !isAdjacent ? 'none' : 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                pointerEvents: idx === activeIdx ? 'auto' : 'none',
              }}
            >
              <Component />
            </div>
          );
        })}
      </div>

      {fabConfig && (
        <FAB
          onClick={handleFAB}
          icon={<fabConfig.Icon />}
          animKey={activePath}
          color={fabConfig.color}
          glowColor={fabConfig.glowColor}
          title={fabConfig.title}
        />
      )}

      <nav className="mobile-tabbar">
        {TABS.map(({ path, label, Icon }, idx) => {
          const isActive = idx === activeIdx;
          const accentColor = TAB_COLORS[path];
          return (
            <button
              key={path}
              className={`mobile-tabbar-tab${isActive ? ' active' : ''}`}
              style={isActive ? { color: accentColor } : undefined}
              onClick={() => goToTab(idx)}
            >
              <Icon fontSize="small" />
              <span className="mobile-tabbar-label">{label}</span>
              {badges[path] > 0 && <span className="tab-badge">{badges[path]}</span>}
            </button>
          );
        })}
      </nav>
    </>
  );
};

export default MobileLayout;
