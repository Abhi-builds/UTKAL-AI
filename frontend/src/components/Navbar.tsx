import React from 'react';
import { User } from '../types';
import { api } from '../services/api';
import { Shield, Trees, Map, LogOut, FileText, User as UserIcon } from 'lucide-react';

interface NavbarProps {
  currentUser: User | null;
  currentView: string;
  onNavigate: (view: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentUser, currentView, onNavigate }) => {
  const handleLogout = () => {
    api.logout();
    onNavigate('login');
  };

  return (
    <header style={{
      background: 'rgba(15, 23, 42, 0.85)',
      backdropFilter: 'blur(12px)',
      borderBottom: '1px solid var(--border-color)',
      padding: '0 24px',
      height: '64px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      position: 'sticky',
      top: 0,
      zIndex: 500,
    }}>
      {/* Brand */}
      <div 
        onClick={() => onNavigate('dashboard')} 
        style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}
      >
        <div style={{
          width: '36px',
          height: '36px',
          borderRadius: '10px',
          background: 'linear-gradient(135deg, #10b981 0%, #06b6d4 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 2px 10px rgba(16, 185, 129, 0.3)'
        }}>
          <Trees size={20} color="#ffffff" />
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '18px', fontWeight: 800, letterSpacing: '0.05em', background: 'linear-gradient(90deg, #34d399, #38bdf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              UTKAL
            </span>
            <span style={{ fontSize: '10px', background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
              v1.0 LOCAL
            </span>
          </div>
          <p style={{ fontSize: '11px', color: 'var(--text-dim)', margin: 0 }}>
            Ecological City Planning System
          </p>
        </div>
      </div>

      {/* Nav links */}
      {currentUser && (
        <nav style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => onNavigate('dashboard')}
            className={`btn ${currentView === 'dashboard' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '6px 14px', fontSize: '13px' }}
          >
            <Map size={15} />
            Projects
          </button>

          {currentUser.role === 'admin' && (
            <button
              onClick={() => onNavigate('audit')}
              className={`btn ${currentView === 'audit' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '6px 14px', fontSize: '13px' }}
            >
              <FileText size={15} />
              Audit Logs & Accounts
            </button>
          )}
        </nav>
      )}

      {/* User profile & actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {currentUser ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid var(--border-color)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <UserIcon size={16} color="var(--text-muted)" />
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '13px', fontWeight: 600 }}>
                  {currentUser.full_name || currentUser.username}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end' }}>
                  <span className={`badge ${currentUser.role === 'admin' ? 'badge-warning' : 'badge-info'}`} style={{ fontSize: '9px', padding: '1px 5px' }}>
                    {currentUser.role === 'admin' ? <Shield size={10} /> : null}
                    {currentUser.role.toUpperCase()}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="btn btn-secondary"
              title="Sign Out"
              style={{ padding: '6px 10px', color: 'var(--text-dim)' }}
            >
              <LogOut size={16} />
            </button>
          </>
        ) : (
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => onNavigate('login')} className="btn btn-primary" style={{ padding: '6px 16px' }}>
              Sign In
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
