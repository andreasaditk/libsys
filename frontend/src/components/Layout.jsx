import { Outlet, Link } from 'react-router-dom';
import { BookOpen, Moon, Sun } from 'lucide-react';
import { useState, useEffect } from 'react';

const Layout = () => {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark') {
      setIsDark(true);
      document.body.classList.add('dark');
    }
  }, []);

  const toggleTheme = () => {
    if (isDark) {
      document.body.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    } else {
      document.body.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    }
    setIsDark(!isDark);
  };

  return (
    <div className="app-container">
      <header className="navbar glass">
        <Link to="/" className="navbar-logo" style={{ textDecoration: 'none', color: 'inherit' }}>
          <BookOpen size={28} />
          <span>Libsys</span>
        </Link>
        <div className="navbar-menu" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <Link to="/" className="nav-item" style={{ textDecoration: 'none', color: 'inherit' }}>Pencarian Ilmiah</Link>
          <button 
            onClick={toggleTheme} 
            className="theme-toggle" 
            style={{ 
              background: 'transparent', 
              border: 'none', 
              cursor: 'pointer', 
              color: 'var(--text-main)', 
              display: 'flex', 
              alignItems: 'center',
              padding: '0.25rem'
            }}
            title="Toggle Dark Mode"
          >
            {isDark ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>
      </header>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
