import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Patito from './Patito';

const Layout = () => {
  return (
    <div className="app-layout">
      <Navbar />
      <main className="main-content">
        <Outlet />
      </main>
      
      {/* Easter Egg */}
      <Patito />
    </div>
  );
};

export default Layout;
