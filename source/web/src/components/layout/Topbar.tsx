import type { BusinessSettings } from '../../domain/types';
import type { Theme } from '../../hooks/useTheme';
import { ThemeSwitch } from '../ui/ThemeSwitch';

interface TopbarProps {
  settings: BusinessSettings;
  theme: Theme;
  liveSyncing: boolean;
  syncError: string;
  lastSyncedAt: string | null;
  onThemeChange: (theme: Theme) => void;
  onOpenPublicPage: () => void;
  onNewAppointment: () => void;
  onRefresh: () => void;
}

export function Topbar({
  settings,
  theme,
  liveSyncing,
  syncError,
  lastSyncedAt,
  onThemeChange,
  onOpenPublicPage,
  onNewAppointment,
  onRefresh
}: TopbarProps) {
  return (
    <header className="topbar">
      <div className="topbar-copy">
        <span className="eyebrow">Barbearia • gestão simples</span>
        <h1>{settings.businessName}</h1>
        <p>
          Agenda, clientes, sinal, faturamento e despesas em um único lugar.
        </p>
        <button
          type="button"
          className={`topbar-sync-status ${syncError ? 'error' : ''}`}
          onClick={onRefresh}
          disabled={liveSyncing}
          title={syncError || 'Clique para sincronizar agora'}
        >
          <span aria-hidden="true">{syncError ? '!' : '●'}</span>
          {liveSyncing
            ? 'Sincronizando...'
            : syncError
              ? 'Falha ao sincronizar • tentar novamente'
              : syncLabel(lastSyncedAt)}
        </button>
      </div>

      <div className="top-actions">
        <ThemeSwitch
          theme={theme}
          onChange={onThemeChange}
          label="Tema do painel"
        />

        {settings.profile.publicPageEnabled ? (
          <button
            className="secondary-button"
            type="button"
            onClick={onOpenPublicPage}
          >
            Ver página pública ↗
          </button>
        ) : null}

        <button type="button" onClick={onNewAppointment}>
          + Novo agendamento
        </button>
      </div>
    </header>
  );
}

function syncLabel(value: string | null): string {
  if (!value) return 'Aguardando primeira sincronização';
  const seconds = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 10) return 'Sincronizado agora';
  if (seconds < 60) return `Sincronizado há ${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `Sincronizado há ${minutes} min`;
  return `Última sincronização às ${new Date(value).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit'
  })}`;
}
