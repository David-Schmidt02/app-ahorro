import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import CloseIcon from '@mui/icons-material/Close';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CheckIcon from '@mui/icons-material/Check';

const PADDING = 10;
const TOOLTIP_H_EST = 230; // altura estimada del tooltip

const getTooltipW = () => Math.min(360, window.innerWidth - 32);

const getTooltipPos = (rect, position) => {
  const tooltipW = getTooltipW();
  if (!rect || position === 'center') {
    return {
      top: Math.round(window.innerHeight / 2 - TOOLTIP_H_EST / 2),
      left: Math.round(window.innerWidth / 2 - tooltipW / 2),
    };
  }

  const offset = 18;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const clampX = (x) => Math.max(16, Math.min(x, vw - tooltipW - 16));
  const centerX = clampX(rect.left + rect.width / 2 - tooltipW / 2);

  let top, left;

  switch (position) {
    case 'bottom':
      top = rect.bottom + offset;
      left = centerX;
      if (top + 210 > vh) top = Math.max(16, rect.top - 210 - offset);
      break;
    case 'top':
      top = rect.top - 210 - offset;
      left = centerX;
      if (top < 16) top = rect.bottom + offset;
      break;
    case 'right':
      top = Math.max(16, rect.top + rect.height / 2 - 105);
      left = rect.right + offset;
      if (left + tooltipW > vw) left = rect.left - tooltipW - offset;
      // Fallback a bottom si no entra a los lados
      if (left < 16) { left = centerX; top = rect.bottom + offset; }
      break;
    case 'left':
      top = Math.max(16, rect.top + rect.height / 2 - 105);
      left = rect.left - tooltipW - offset;
      if (left < 16) left = rect.right + offset;
      // Fallback a bottom si no entra a los lados
      if (left + tooltipW > vw - 16) { left = centerX; top = rect.bottom + offset; }
      break;
    default:
      top = rect.bottom + offset;
      left = centerX;
  }

  // Prevenir que desaparezca por los bordes en ninguna circunstancia
  left = clampX(left);

  return { top, left };
};

const TutorialOverlay = ({
  active, step, currentIndex, total,
  isFirst, isLast, progress,
  onNext, onPrev, onFinish,
}) => {
  const [rect, setRect] = useState(null);
  const [rectReady, setRectReady] = useState(false);

  useEffect(() => {
    if (!active || !step) return;

    setRectReady(false);

    const applyRect = () => {
      if (!step.selector) {
        setRect(null);
        setRectReady(true);
        return;
      }
      const el = document.querySelector(step.selector);
      if (el) {
        setRect(el.getBoundingClientRect());
      } else {
        setRect(null);
      }
      setRectReady(true);
    };

    if (step.selector) {
      const el = document.querySelector(step.selector);
      if (el) {
        const r = el.getBoundingClientRect();
        const inView = r.top >= 0 && r.bottom <= window.innerHeight;
        if (inView) {
          setTimeout(applyRect, 50);
        } else {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          setTimeout(applyRect, 500);
        }
      } else {
        setRect(null);
        setRectReady(true);
      }
    } else {
      setRect(null);
      setRectReady(true);
    }

    const onResize = () => {
      if (!step.selector) return;
      const el = document.querySelector(step.selector);
      if (el) setRect(el.getBoundingClientRect());
    };

    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onResize);
    };
  }, [active, step, currentIndex]);

  if (!active || !step) return null;

  const hasSpotlight = !!step.selector && !!rect;
  const tooltipPos = getTooltipPos(rect, step.position);

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 9000, pointerEvents: 'none' }}>

      {/* Overlay plano — visible cuando NO hay spotlight, se desvanece cuando aparece */}
      <div style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.78)',
        opacity: hasSpotlight ? 0 : 1,
        transition: 'opacity 0.7s ease',
        pointerEvents: 'all',
        zIndex: 9000,
      }} onClick={onFinish} />

      {/* Spotlight — fade in cuando aparece, fade out cuando desaparece */}
      <div style={{
        position: 'fixed',
        top: rect ? rect.top - PADDING : 0,
        left: rect ? rect.left - PADDING : 0,
        width: rect ? rect.width + PADDING * 2 : 0,
        height: rect ? rect.height + PADDING * 2 : 0,
        borderRadius: 10,
        opacity: hasSpotlight ? 1 : 0,
        boxShadow: '0 0 0 3px rgba(225,29,72,0.55), 0 0 0 9999px rgba(0,0,0,0.78)',
        transition: 'opacity 0.7s ease, top 0.7s cubic-bezier(0.4,0,0.2,1), left 0.7s cubic-bezier(0.4,0,0.2,1), width 0.7s cubic-bezier(0.4,0,0.2,1), height 0.7s cubic-bezier(0.4,0,0.2,1)',
        pointerEvents: 'none',
        zIndex: 9001,
      }} />

      {/* Tooltip — solo se monta cuando la posición ya está calculada */}
      {rectReady && <div
        key={currentIndex}
        className="tutorial-tooltip"
        style={{ position: 'fixed', width: getTooltipW(), zIndex: 9002, pointerEvents: 'all', ...tooltipPos }}
      >
        <div className="tutorial-header">
          <span className="tutorial-step-label">Paso {currentIndex + 1} de {total}</span>
          <button className="tutorial-close" onClick={onFinish}><CloseIcon fontSize="small" /></button>
        </div>

        <h3 className="tutorial-title">{step.title}</h3>
        <p className="tutorial-desc">{step.description}</p>

        <div className="tutorial-progress-track">
          <div className="tutorial-progress-fill" style={{ width: `${progress}%` }} />
        </div>

        <div className="tutorial-nav">
          <button className="tutorial-btn-sec" onClick={onPrev} disabled={isFirst}>
            <ArrowBackIcon fontSize="small" /> Anterior
          </button>
          <button className="tutorial-btn-pri" onClick={isLast ? onFinish : onNext}>
            {isLast
              ? <><CheckIcon fontSize="small" /> Listo</>
              : <>Siguiente <ArrowForwardIcon fontSize="small" /></>
            }
          </button>
        </div>
      </div>}

    </div>,
    document.body
  );
};

export default TutorialOverlay;
