import React, { useState, useEffect } from 'react';
import { User } from './types';
import { api } from './services/api';
import { Navbar } from './components/Navbar';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DashboardPage } from './pages/DashboardPage';
import { ProjectViewPage } from './pages/ProjectViewPage';
import { AdminUsersPage } from './pages/AdminUsersPage';

export function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(api.getCurrentUser());
  const [currentView, setCurrentView] = useState<'login' | 'register' | 'dashboard' | 'studio' | 'audit'>(
    api.getCurrentUser() ? 'dashboard' : 'login'
  );
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);

  useEffect(() => {
    const handleAuthChange = () => {
      const user = api.getCurrentUser();
      setCurrentUser(user);
      if (!user) {
        setCurrentView('login');
      }
    };

    window.addEventListener('auth-changed', handleAuthChange);
    return () => window.removeEventListener('auth-changed', handleAuthChange);
  }, []);

  const handleSelectProject = (id: number) => {
    setSelectedProjectId(id);
    setCurrentView('studio');
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar
        currentUser={currentUser}
        currentView={currentView}
        onNavigate={(view) => setCurrentView(view as any)}
      />

      <main style={{ flex: 1 }}>
        {currentView === 'login' && (
          <LoginPage
            onLoginSuccess={() => {
              setCurrentUser(api.getCurrentUser());
              setCurrentView('dashboard');
            }}
            onNavigateToRegister={() => setCurrentView('register')}
          />
        )}

        {currentView === 'register' && (
          <RegisterPage
            onRegisterSuccess={() => {
              setCurrentUser(api.getCurrentUser());
              setCurrentView('dashboard');
            }}
            onNavigateToLogin={() => setCurrentView('login')}
          />
        )}

        {currentView === 'dashboard' && (
          <DashboardPage
            currentUser={currentUser}
            onSelectProject={handleSelectProject}
          />
        )}

        {currentView === 'studio' && selectedProjectId !== null && (
          <ProjectViewPage
            projectId={selectedProjectId}
            onBack={() => setCurrentView('dashboard')}
          />
        )}

        {currentView === 'audit' && (
          <AdminUsersPage
            currentUser={currentUser}
            onBack={() => setCurrentView('dashboard')}
          />
        )}
      </main>
    </div>
  );
}

export default App;
