import type {
  AuthSession,
  BusinessSettings,
  Professional,
  Service
} from '../../domain/types';
import { BusinessAccountSection } from './BusinessAccountSection';
import { moduleLabels, weekdayLabels } from '../onboarding/onboarding.constants';

interface SettingsPageProps {
  settings: BusinessSettings;
  services: Service[];
  professionals: Professional[];
  session: AuthSession;
  accountSubmitting: boolean;
  accountError: string;
  onEdit: () => void;
  onAddBusiness: (businessName: string) => Promise<boolean>;
  onSwitchBusiness: (businessId: string) => Promise<boolean>;
}

export function SettingsPage({
  settings,
  services,
  professionals,
  session,
  accountSubmitting,
  accountError,
  onEdit,
  onAddBusiness,
  onSwitchBusiness
}: SettingsPageProps) {
  const activeModules = settings.modules.filter(item => item.enabled);
  const activeDays = settings.businessHours.weeklySchedule.filter(day => day.enabled);

  return (
    <section className="page-section">
      <div className="page-title-row">
        <div>
          <span className="eyebrow">Personalização</span>
          <h2>Configurações da barbearia</h2>
          <p>
            Veja como o CYRNEX FLOW está adaptado ao funcionamento do
            seu negócio.
          </p>
        </div>
        <button type="button" onClick={onEdit}>Editar configuração</button>
      </div>

      <div className="settings-overview-grid">
        <article className="panel settings-overview-card">
          <span className="eyebrow">Empresa</span>
          <h3>{settings.businessName}</h3>
          <p>smartcommerce.app/{settings.bookingSlug}</p>
          <dl>
            <div><dt>Modo</dt><dd>{settings.operationMode === 'solo' ? 'Profissional único' : 'Equipe'}</dd></div>
            <div><dt>Profissionais</dt><dd>{professionals.filter(item => item.active).length}</dd></div>
            <div><dt>Serviços</dt><dd>{services.filter(item => item.active).length}</dd></div>
          </dl>
        </article>

        <article className="panel settings-overview-card">
          <span className="eyebrow">Funcionamento</span>
          <h3>{activeDays.length} dias ativos</h3>
          <p>{activeDays.map(day => weekdayLabels[day.weekday].split('-')[0]).join(', ')}</p>
          <dl>
            <div><dt>Intervalo das opções de horário</dt><dd>{settings.businessHours.slotIntervalMinutes} min</dd></div>
            <div>
              <dt>Sinal padrão</dt>
              <dd>
                {settings.bookingRules.requireDeposit
                  ? `${settings.defaultDepositPercent}%`
                  : 'Não exigido'}
              </dd>
            </div>
            <div><dt>Agendamento futuro</dt><dd>{settings.bookingRules.maxBookingDaysAhead} dias</dd></div>
          </dl>
        </article>

        <article className="panel settings-overview-card wide-settings-card">
          <span className="eyebrow">Recursos ativos</span>
          <h3>{activeModules.length} módulos habilitados</h3>
          <div className="chip-list">
            {activeModules.map(module => (
              <span key={module.key}>{moduleLabels[module.key].title}</span>
            ))}
          </div>
        </article>
      </div>

      <BusinessAccountSection
        session={session}
        submitting={accountSubmitting}
        error={accountError}
        onAddBusiness={onAddBusiness}
        onSwitchBusiness={onSwitchBusiness}
      />

      <div className="info-callout settings-note">
        <strong>Você não depende da equipe do CYRNEX para mudanças simples.</strong>
        <p>
          Preços, serviços, horários, formas de pagamento, módulos e regras
          podem ser alterados por aqui sempre que a rotina da barbearia mudar.
        </p>
      </div>
    </section>
  );
}
