import React, { useEffect, useState } from 'react';
import { User, AuditLog } from '../types';
import { api } from '../services/api';
import { Shield, FileText, UserCheck, Clock, ArrowLeft, RefreshCw } from 'lucide-react';

interface AdminUsersPageProps {
  currentUser: User | null;
  onBack: () => void;
}

export const AdminUsersPage: React.FC<AdminUsersPageProps> = ({ currentUser, onBack }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [uData, aData] = await Promise.all([api.getUsers(), api.getAuditLogs()]);
      setUsers(uData);
      setAuditLogs(aData);
    } catch (err: any) {
      alert(`Failed to load admin data: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={onBack} className="btn btn-secondary" style={{ padding: '8px 12px' }}>
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#f8fafc' }}>
              System Administration & Audit Log
            </h1>
            <p style={{ fontSize: '13px', color: 'var(--text-dim)' }}>
              User access management, privilege isolation, and action traceability trail
            </p>
          </div>
        </div>

        <button onClick={fetchData} disabled={isLoading} className="btn btn-secondary">
          <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px' }}>
        {/* User Accounts Column */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <UserCheck size={18} color="#10b981" />
            <h2 style={{ fontSize: '16px', fontWeight: 700 }}>Registered Users ({users.length})</h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {users.map((u) => (
              <div
                key={u.id}
                style={{
                  padding: '12px',
                  background: 'rgba(0,0,0,0.25)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#f8fafc' }}>
                      {u.username}
                    </span>
                    <span className={`badge ${u.role === 'admin' ? 'badge-warning' : 'badge-info'}`} style={{ fontSize: '9px' }}>
                      {u.role.toUpperCase()}
                    </span>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '2px' }}>
                    {u.email}
                  </div>
                </div>

                <span className={`badge ${u.is_active ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: '9px' }}>
                  {u.is_active ? 'ACTIVE' : 'DISABLED'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Security Audit Log Column */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText size={18} color="#38bdf8" />
            <h2 style={{ fontSize: '16px', fontWeight: 700 }}>Security & Activity Audit Trail ({auditLogs.length})</h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '550px', overflowY: 'auto' }}>
            {auditLogs.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-dim)', fontSize: '13px' }}>
                No audit events recorded yet.
              </div>
            ) : (
              auditLogs.map((log) => (
                <div
                  key={log.id}
                  style={{
                    padding: '10px 14px',
                    background: 'rgba(0,0,0,0.25)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-color)',
                    fontSize: '12px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span className="badge badge-info" style={{ fontSize: '9px' }}>
                      {log.action}
                    </span>
                    <span style={{ fontSize: '10px', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={11} />
                      {new Date(log.timestamp).toLocaleString()}
                    </span>
                  </div>

                  <div style={{ color: '#f8fafc', fontWeight: 500 }}>
                    {log.resource_type ? `${log.resource_type} #${log.resource_id || ''}` : 'System'}
                  </div>

                  {log.details && Object.keys(log.details).length > 0 && (
                    <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '4px', background: 'rgba(0,0,0,0.3)', padding: '4px 8px', borderRadius: '4px', fontFamily: 'monospace' }}>
                      {JSON.stringify(log.details)}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
