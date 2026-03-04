import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Mascota from './Mascota';

const Layout = () => {
  return (
    <div className="app-layout">
      <Navbar />
      <main className="main-content">
        <Outlet />
      </main>
      
      {/* Easter Egg */}
      <Mascota />
    </div>
  );
};

export default Layout;
