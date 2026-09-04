import { useEffect, useMemo, useState } from 'react';
import { getNavigationItems, type AppTab } from '../../app/navigation';
import type { AuthSession, BusinessSettings } from '../../domain/types';

interface SidebarProps {
  settings: BusinessSettings;
  session: AuthSession;
  activeTab: AppTab;
  upcomingAppointments: number;
  onNavigate: (tab: AppTab) => void;
  onSwitchBusiness: (businessId: string) => Promise<boolean>;
  onLogout: () => void;
}

const mobilePrimaryTabs: Array<{ id: AppTab | 'more'; label: string; icon: string }> = [
  { id: 'overview', label: 'Início', icon: '⌂' },
  { id: 'agenda', label: 'Agenda', icon: '◷' },
  { id: 'clients', label: 'Clientes', icon: '◎' },
  { id: 'finance-revenue', label: 'Financeiro', icon: '$' },
  { id: 'more', label: 'Mais', icon: '•••' }
];

export function Sidebar({
  settings,
  session,
  activeTab,
  upcomingAppointments,
  onNavigate,
  onSwitchBusiness,
  onLogout
}: SidebarProps) {
  const navigationItems = getNavigationItems(settings, session.role);
  const financeActive = activeTab === 'finance-revenue' || activeTab === 'finance-expenses';
  const [financeOpen, setFinanceOpen] = useState(financeActive);
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false);

  const currentPageLabel = useMemo(() => {
    for (const item of navigationItems) {
      if (item.id === activeTab) return item.label;
      const child = item.children?.find(candidate => candidate.id === activeTab);
      if (child) return child.label;
    }
    return 'Painel';
  }, [activeTab, navigationItems]);

  const moreActive = ['booking', 'settings', 'whatsapp', 'waitlist', 'reports'].includes(activeTab);

  useEffect(() => {
    if (financeActive) setFinanceOpen(true);
    setMobileMoreOpen(false);
  }, [activeTab, financeActive]);

  useEffect(() => {
    if (!mobileMoreOpen) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobileMoreOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [mobileMoreOpen]);

  const navigateMobile = (tab: AppTab) => {
    setMobileMoreOpen(false);
    onNavigate(tab);
  };

  return (
    <>
      <aside className="sidebar desktop-sidebar">
        <div className="brand">
          <span className="brand-mark">CRX</span>
          <div>
            <strong>CYRNEX FLOW</strong>
            <small>CRX • Barbearia • Piloto</small>
          </div>
        </div>

        <nav aria-label="Navegação principal">
          {navigationItems.map(item => {
            if (item.children?.length) {
              return (
                <div className="nav-group" key={item.label}>
                  <button
                    type="button"
                    className={`nav-button nav-group-button ${financeActive ? 'active' : ''}`}
                    onClick={() => setFinanceOpen(current => !current)}
                    aria-expanded={financeOpen}
                  >
                    <span>{item.label}</span>
                    <span className={`nav-chevron ${financeOpen ? 'open' : ''}`} aria-hidden="true">⌄</span>
                  </button>
                  {financeOpen ? (
                    <div className="nav-submenu" aria-label={`${item.label} - opções`}>
                      {item.children.map(child => (
                        <button
                          type="button"
                          key={child.id}
                          className={`nav-button nav-subbutton ${activeTab === child.id ? 'active' : ''}`}
                          onClick={() => onNavigate(child.id)}
                        >
                          {child.label}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            }

            return (
              <button
                key={item.id}
                type="button"
                className={`nav-button ${activeTab === item.id ? 'active' : ''} ${item.disabled ? 'disabled' : ''}`}
                onClick={() => { if (!item.disabled) onNavigate(item.id); }}
                disabled={item.disabled}
                aria-disabled={item.disabled || undefined}
                title={item.disabled ? `${item.label} — ${item.badge ?? 'Indisponível'}` : undefined}
              >
                <span>{item.label}</span>
                {item.badge ? <small className="nav-development-badge">{item.badge}</small> : null}
                {item.id === 'agenda' && upcomingAppointments > 0 ? (
                  <em>{upcomingAppointments}</em>
                ) : null}
              </button>
            );
          })}
        </nav>

        <DesktopAccount
          settings={settings}
          session={session}
          onSwitchBusiness={onSwitchBusiness}
          onLogout={onLogout}
        />
      </aside>

      <header className="mobile-panel-header">
        <div className="mobile-panel-brand">
          <span className="brand-mark">CRX</span>
          <div>
            <strong>{settings.businessName}</strong>
            <small>{currentPageLabel}</small>
          </div>
        </div>
        <span className="mobile-panel-role">{roleLabel(session.role)}</span>
      </header>

      <nav className="mobile-bottom-nav" aria-label="Navegação principal no celular">
        {mobilePrimaryTabs.map(item => {
          if (item.id === 'finance-revenue' && !(session.role === 'owner' || session.role === 'manager')) {
            return null;
          }
          const active = item.id === 'finance-revenue'
            ? financeActive
            : item.id === 'more'
              ? moreActive || mobileMoreOpen
              : activeTab === item.id;
          return (
            <button
              type="button"
              key={item.id}
              className={active ? 'active' : ''}
              onClick={() => {
                if (item.id === 'more') {
                  setMobileMoreOpen(current => !current);
                  return;
                }
                navigateMobile(item.id === 'finance-revenue' && activeTab === 'finance-expenses'
                  ? 'finance-expenses'
                  : item.id);
              }}
              aria-current={active && item.id !== 'more' ? 'page' : undefined}
              aria-expanded={item.id === 'more' ? mobileMoreOpen : undefined}
            >
              <span className="mobile-nav-icon" aria-hidden="true">{item.icon}</span>
              <span>{item.label}</span>
              {item.id === 'agenda' && upcomingAppointments > 0 ? (
                <em>{Math.min(upcomingAppointments, 99)}</em>
              ) : null}
            </button>
          );
        })}
      </nav>

      {mobileMoreOpen ? (
        <div className="mobile-more-layer" role="presentation">
          <button
            type="button"
            className="mobile-more-backdrop"
            aria-label="Fechar menu"
            onClick={() => setMobileMoreOpen(false)}
          />
          <section className="mobile-more-sheet" role="dialog" aria-modal="true" aria-label="Mais opções">
            <div className="mobile-more-handle" aria-hidden="true" />
            <div className="mobile-more-heading">
              <div>
                <span className="eyebrow">Mais opções</span>
                <strong>{settings.businessName}</strong>
              </div>
              <button
                type="button"
                className="mobile-more-close"
                onClick={() => setMobileMoreOpen(false)}
                aria-label="Fechar menu"
              >
                ×
              </button>
            </div>

            <div className="mobile-more-actions">
              {session.platformAdmin ? (
                <button type="button" className="mobile-platform-admin-link" onClick={openPlatformAdmin}>
                  <span>CYRNEX Admin</span>
                  <small>Empresas, assinaturas e controle da plataforma</small>
                </button>
              ) : null}
              {settings.profile.publicPageEnabled ? (
                <button type="button" onClick={() => navigateMobile('booking')}>
                  <span>Link do cliente</span>
                  <small>Página pública e agendamento</small>
                </button>
              ) : null}
              {(session.role === 'owner' || session.role === 'manager') ? (
                <button type="button" onClick={() => navigateMobile('settings')}>
                  <span>Configurações</span>
                  <small>Barbearia, equipe, horários e regras</small>
                </button>
              ) : null}
            </div>

            {(session.role === 'owner' || session.role === 'manager') ? (
              <div className="mobile-development-list">
                <span className="mobile-sheet-section-title">Em desenvolvimento</span>
                {navigationItems.filter(item => item.disabled).map(item => (
                  <div key={item.id}>
                    <span>{item.label}</span>
                    <small>{item.badge}</small>
                  </div>
                ))}
              </div>
            ) : null}

            <div className="mobile-account-card">
              <div>
                <strong>{session.user.displayName}</strong>
                <small>@{session.user.username} • {roleLabel(session.role)}</small>
              </div>
              {session.businesses.length > 1 ? (
                <label>
                  <span>Trocar barbearia</span>
                  <select
                    value={session.business.id}
                    onChange={event => void onSwitchBusiness(event.target.value)}
                  >
                    {session.businesses.map(business => (
                      <option key={business.id} value={business.id}>{business.name}</option>
                    ))}
                  </select>
                </label>
              ) : null}
              <button type="button" className="mobile-logout" onClick={onLogout}>Sair da conta</button>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}

function DesktopAccount({
  settings,
  session,
  onSwitchBusiness,
  onLogout
}: Pick<SidebarProps, 'settings' | 'session' | 'onSwitchBusiness' | 'onLogout'>) {
  return (
    <div className="sidebar-account">
      <div className="sidebar-card">
        <span className="online-dot" />
        <div>
          <strong>{session.user.displayName}</strong>
          <small>@{session.user.username} • {roleLabel(session.role)}</small>
        </div>
      </div>

      <div className="sidebar-business-copy">
        <strong>{settings.businessName}</strong>
        <small>{settings.operationMode === 'solo' ? 'Modo profissional único' : 'Modo equipe'}</small>
      </div>

      {session.businesses.length > 1 ? (
        <label className="sidebar-business-switcher">
          <span>Trocar barbearia</span>
          <select value={session.business.id} onChange={event => void onSwitchBusiness(event.target.value)}>
            {session.businesses.map(business => (
              <option key={business.id} value={business.id}>{business.name}</option>
            ))}
          </select>
        </label>
      ) : null}

      {session.platformAdmin ? (
        <button className="sidebar-platform-admin-button" type="button" onClick={openPlatformAdmin}>
          <span>CRX</span> CYRNEX Admin
        </button>
      ) : null}

            <button className="sidebar-logout-button" type="button" onClick={onLogout}>Sair da conta</button>
    </div>
  );
}

function openPlatformAdmin() {
  window.location.assign('/admin');
}

function roleLabel(role: AuthSession['role']): string {
  if (role === 'owner') return 'Dono';
  if (role === 'manager') return 'Gerente';
  if (role === 'professional') return 'Profissional';
  return 'Recepção';
}
