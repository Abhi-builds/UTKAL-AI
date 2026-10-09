import React, { useState } from 'react';
import { api } from '../services/api';
import { Trees, Shield, User, Lock, AlertCircle, ArrowRight } from 'lucide-react';

interface LoginPageProps {
  onLoginSuccess: () => void;
  onNavigateToRegister: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess, onNavigateToRegister }) => {
  const [identifier, setIdentifier] = useState('admin');
  const [password, setPassword] = useState('UtkalAdmin2026!');
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg('');
    try {
      await api.login(identifier, password);
      onLoginSuccess();
    } catch (err: any) {
      setErrorMsg(err.message || 'Invalid username or password');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickLogin = (user: string, pass: string) => {
    setIdentifier(user);
    setPassword(pass);
  };

  return (
    <div style={{
      minHeight: 'calc(100vh - 64px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      background: 'radial-gradient(ellipse at top, #111e38 0%, #090d16 80%)',
    }}>
      <div className="card" style={{ maxWidth: '440px', width: '100%', padding: '36px' }}>
        {/* Brand header */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '14px',
            background: 'linear-gradient(135deg, #10b981 0%, #06b6d4 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
            boxShadow: '0 4px 16px rgba(16, 185, 129, 0.4)',
          }}>
            <Trees size={26} color="#ffffff" />
          </div>

          <h1 style={{ fontSize: '24px', fontWeight: 800, letterSpacing: '-0.02em', color: '#f8fafc', marginBottom: '6px' }}>
            UTKAL City Planning
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-dim)' }}>
            Local Ecological Land-Use Exploration System
          </p>
        </div>

        {errorMsg && (
          <div style={{
            padding: '12px',
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 'var(--radius-md)',
            color: '#fca5a5',
            fontSize: '12px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <AlertCircle size={16} />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Username or Email</label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
                className="form-input"
                placeholder="admin or planner"
                style={{ paddingLeft: '38px' }}
              />
              <User size={16} color="var(--text-dim)" style={{ position: 'absolute', left: '12px', top: '13px' }} />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="form-input"
                placeholder="Enter password"
                style={{ paddingLeft: '38px' }}
              />
              <Lock size={16} color="var(--text-dim)" style={{ position: 'absolute', left: '12px', top: '13px' }} />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="btn btn-primary"
            style={{ width: '100%', padding: '12px', marginTop: '8px', fontSize: '14px' }}
          >
            {isLoading ? 'Signing in...' : 'Sign In to Studio'}
            <ArrowRight size={16} />
          </button>
        </form>

        {/* Quick Demo Credentials Switcher */}
        <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid var(--border-color)' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginBottom: '8px', textAlign: 'center' }}>
            Quick Demo Accounts (Local PostgreSQL):
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <button
              type="button"
              onClick={() => handleQuickLogin('admin', 'UtkalAdmin2026!')}
              className="btn btn-secondary"
              style={{ fontSize: '11px', padding: '8px' }}
            >
              <Shield size={12} color="#f59e0b" />
              Administrator
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin('planner', 'Planner2026!')}
              className="btn btn-secondary"
              style={{ fontSize: '11px', padding: '8px' }}
            >
              <User size={12} color="#38bdf8" />
              Lead Planner
            </button>
          </div>
        </div>

        <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '12px', color: 'var(--text-dim)' }}>
          Don't have an account?{' '}
          <span
            onClick={onNavigateToRegister}
            style={{ color: 'var(--primary)', cursor: 'pointer', fontWeight: 600 }}
          >
            Register as Planner
          </span>
        </div>
      </div>
    </div>
  );
};
