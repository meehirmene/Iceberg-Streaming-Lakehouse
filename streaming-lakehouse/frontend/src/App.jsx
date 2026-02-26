import React from 'react'
import { NavLink, Routes, Route, useLocation } from 'react-router-dom'
import { Database, LayoutDashboard, Settings as SettingsIcon, Activity } from 'lucide-react'
import Dashboard from './components/Dashboard'
import RawStreams from './components/RawStreams'
import Settings from './components/Settings'
import EcommerceDashboard from './components/EcommerceDashboard'
import { ShoppingCart } from 'lucide-react'

function App() {
  const location = useLocation();

  const getPageTitle = () => {
    switch (location.pathname) {
      case '/': return 'Dashboard';
      case '/ecommerce': return 'Ecommerce Funnel';
      case '/streams': return 'Raw Streams';
      case '/settings': return 'Settings';
      default: return '';
    }
  };

  const navLinkStyle = ({ isActive }) => ({
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    borderRadius: '8px',
    textDecoration: 'none',
    transition: 'all 0.2s',
    background: isActive ? 'rgba(255,255,255,0.05)' : 'transparent',
    color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
    fontWeight: isActive ? 500 : 400
  });

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '40px' }}>
          <div style={{ background: 'var(--primary-glow)', padding: '8px', borderRadius: '12px', border: '1px solid rgba(99, 102, 241, 0.3)' }}>
            <Database size={24} color="var(--accent-blue)" />
          </div>
          <div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }} className="text-gradient">Iceberg View</h1>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Streaming Lakehouse</span>
          </div>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <NavLink to="/" style={navLinkStyle}>
            {({ isActive }) => <><LayoutDashboard size={20} color={isActive ? "var(--accent-blue)" : "currentColor"} /> Overview</>}
          </NavLink>
          <NavLink to="/ecommerce" style={navLinkStyle}>
            {({ isActive }) => <><ShoppingCart size={20} color={isActive ? "var(--accent-blue)" : "currentColor"} /> Ecommerce</>}
          </NavLink>
          <NavLink to="/streams" style={navLinkStyle}>
            {({ isActive }) => <><Activity size={20} color={isActive ? "var(--accent-blue)" : "currentColor"} /> Raw Streams</>}
          </NavLink>
          <NavLink to="/settings" style={navLinkStyle}>
            {({ isActive }) => <><SettingsIcon size={20} color={isActive ? "var(--accent-blue)" : "currentColor"} /> Settings</>}
          </NavLink>
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        <header className="header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 500 }}>{getPageTitle()}</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', padding: '4px 10px', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--accent-green)', borderRadius: '100px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent-green)' }} className="animate-pulse"></div>
              Live Connection
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--primary-glow)', border: '1px solid var(--border-focus)', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'var(--accent-blue)', fontWeight: 'bold' }}>
              A
            </div>
          </div>
        </header>

        <div className="content-area">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/ecommerce" element={<EcommerceDashboard />} />
            <Route path="/streams" element={<RawStreams />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </div>
      </main>
    </div>
  )
}

export default App
