import { Outlet, Link } from 'react-router-dom';
import { BookOpen } from 'lucide-react';

const Layout = () => {
  return (
    <div className="app-container">
      <header className="navbar glass">
        <Link to="/" className="navbar-logo" style={{ textDecoration: 'none', color: 'inherit' }}>
          <BookOpen size={28} />
          <span>Libsys</span>
        </Link>
        <div className="navbar-menu">
          <Link to="/" className="nav-item" style={{ textDecoration: 'none', color: 'inherit' }}>Pencarian Ilmiah</Link>
        </div>
      </header>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
