import { NavLink } from 'react-router-dom';
import SavingsIcon from '@mui/icons-material/Savings';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import EventRepeatIcon from '@mui/icons-material/EventRepeat';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import '../styles/tabs.css';

const TABS = [
  { path: '/',           label: 'Objetivos',  Icon: SavingsIcon,       end: true },
  { path: '/gastos',     label: 'Gastos',      Icon: ReceiptLongIcon },
  { path: '/horarios',   label: 'Horarios',    Icon: EventRepeatIcon },
  { path: '/calendario', label: 'Calendario',  Icon: CalendarMonthIcon },
];

const TabBar = ({ badges = {} }) => (
  <div className="tabbar-wrapper">
    <nav className="tabbar">
      {TABS.map(({ path, label, Icon, end }) => (
        <NavLink
          key={path}
          to={path}
          end={end}
          className={({ isActive }) => `tabbar-tab${isActive ? ' active' : ''}`}
        >
          <Icon fontSize="small" />
          <span className="tabbar-label">{label}</span>
          {badges[path] > 0 && (
            <span className="tab-badge">{badges[path]}</span>
          )}
        </NavLink>
      ))}
    </nav>
  </div>
);

export default TabBar;
