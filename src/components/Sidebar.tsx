import React from 'react';
import { 
  LayoutDashboard, 
  Dumbbell, 
  Footprints, 
  Apple,
  Calendar, 
  Bot, 
  HeartPulse, 
  Settings,
  LogOut
} from 'lucide-react';
import './Styles/sidebar.css';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  user: any;
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, user, onLogout }) => {
  const menuItems = [
    { id: 'dashboard', name: 'Painel Geral', icon: LayoutDashboard, colorClass: 'active' },
    { id: 'workouts', name: 'Musculação', icon: Dumbbell, colorClass: 'active-green' },
    { id: 'runtracker', name: 'Corrida & Corpo', icon: Footprints, colorClass: 'active-blue' },
    { id: 'diet', name: 'Dieta & Nutrição', icon: Apple, colorClass: 'active-orange' },
    { id: 'calendar', name: 'Calendário', icon: Calendar, colorClass: 'active' },
    { id: 'aicoach', name: 'Treinador IA', icon: Bot, colorClass: 'active' },
    { id: 'aianalyzer', name: 'Analisador IA', icon: HeartPulse, colorClass: 'active' },
    { id: 'settings', name: 'Ajustes', icon: Settings, colorClass: 'active' },
  ];

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <Dumbbell className="text-primary" size={26} color="#00e5ff" style={{ transform: 'rotate(-25deg)' }} />
        <span className="sidebar-logo-text">Vida Saudável</span>
      </div>

      <ul className="sidebar-menu">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          
          return (
            <li key={item.id} className="sidebar-item">
              <button
                onClick={() => setActiveTab(item.id)}
                className={`sidebar-btn ${isActive ? item.colorClass : ''}`}
                title={item.name}
              >
                <Icon size={20} />
                <span>{item.name}</span>
              </button>
            </li>
          );
        })}
      </ul>

      <div className="sidebar-footer" style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
        {/* Painel do Usuário */}
        {user && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0.25rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', overflow: 'hidden' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent-blue), var(--accent-purple))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.85rem', flexShrink: 0 }}>
                {getInitials(user.displayName || user.email)}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left', overflow: 'hidden' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {user.displayName || 'Atleta'}
                </span>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {user.email}
                </span>
              </div>
            </div>
            <button 
              onClick={onLogout}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#ff6b6b', display: 'flex', alignItems: 'center', padding: '4px' }}
              title="Fazer Logout"
            >
              <LogOut size={16} />
            </button>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: 'var(--accent-emerald)', boxShadow: '0 0 8px var(--accent-emerald)' }}></div>
          <span>Sincronizado</span>
        </div>
      </div>
    </aside>
  );
};
