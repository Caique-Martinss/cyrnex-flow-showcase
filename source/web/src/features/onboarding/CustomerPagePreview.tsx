import type { ReactNode } from 'react';
import type { OnboardingState } from '../../domain/types';
import { currencyFormatter } from '../../utils/formatters';
import { weekdayLabels } from './onboarding.constants';

interface CustomerPagePreviewProps {
  draft: OnboardingState;
  mode?: 'mobile' | 'desktop' | 'full';
  onPrimaryAction?: () => void;
  onWhatsApp?: () => void;
}

export function CustomerPagePreview({
  draft,
  mode = 'mobile',
  onPrimaryAction,
  onWhatsApp
}: CustomerPagePreviewProps) {
  const settings = draft.settings;
  const profile = settings.profile;
  const activeDays = settings.businessHours.weeklySchedule.filter(day => day.enabled);
  const openStatus = getBusinessOpenStatus(draft);

  return (
    <div className={`customer-page-preview ${mode} ${profile.theme}`}>
      <div className="customer-preview-hero">
        {profile.logoDataUrl ? (
          <img src={profile.logoDataUrl} alt={`Logo da ${settings.businessName}`} />
        ) : (
          <span className="booking-logo">{initials(settings.businessName)}</span>
        )}
        <small>{settings.contact.city || 'Sua cidade'}</small>
        <h2>{settings.businessName || 'Sua barbearia'}</h2>
        <p>{profile.headline || 'Sua frase de destaque aparecerá aqui.'}</p>
        <span className={openStatus.open ? 'open-status open' : 'open-status'}>
          {openStatus.label}
        </span>
        <div className="customer-preview-actions">
          <button type="button" onClick={onPrimaryAction}>
            {primaryActionLabel(profile.primaryAction)}
          </button>
          {settings.contact.whatsapp ? (
            <button
              type="button"
              className="secondary-button"
              onClick={onWhatsApp}
            >
              WhatsApp
            </button>
          ) : null}
        </div>
      </div>

      {profile.sectionOrder
        .filter(section => profile.publicSections.includes(section) && section !== 'hero')
        .map(section => {
          if (section === 'services') {
            return (
              <PreviewSection key={section} title="Serviços">
                <div className="preview-service-list">
                  {draft.services.filter(item => item.active).slice(0, 6).map(service => (
                    <div key={service.id}>
                      <span>{service.name}</span>
                      <strong>{publicPrice(service)}</strong>
                    </div>
                  ))}
                </div>
              </PreviewSection>
            );
          }

          if (section === 'portfolio') {
            return (
              <PreviewSection key={section} title="Nosso trabalho">
                <div className="preview-photo-grid">
                  {profile.portfolioMedia
                    .filter(item => item.publicVisible && item.dataUrl)
                    .slice(0, 6)
                    .map(item => (
                      item.mediaType === 'video' ? (
                        <video key={item.id} src={item.dataUrl ?? ''} controls />
                      ) : (
                        <img key={item.id} src={item.dataUrl ?? ''} alt={item.title || 'Trabalho'} />
                      )
                    ))}
                </div>
              </PreviewSection>
            );
          }

          if (section === 'team') {
            return (
              <PreviewSection key={section} title="Profissionais">
                <div className="preview-chip-line">
                  {draft.professionals
                    .filter(item => item.active && item.publicVisible)
                    .map(item => (
                      <span key={item.id}>{item.professionalName || item.name}</span>
                    ))}
                </div>
              </PreviewSection>
            );
          }

          if (section === 'space') {
            return (
              <PreviewSection key={section} title="Conheça nosso espaço">
                <div className="preview-photo-grid">
                  {profile.spaceMedia
                    .filter(item => item.publicVisible && item.dataUrl)
                    .slice(0, 6)
                    .map(item => (
                      <figure key={item.id}>
                        <img src={item.dataUrl ?? ''} alt={item.title || item.category} />
                        {item.title ? <figcaption>{item.title}</figcaption> : null}
                      </figure>
                    ))}
                </div>
              </PreviewSection>
            );
          }

          if (section === 'about') {
            return (
              <PreviewSection key={section} title="Sobre">
                <p>{profile.originStory || profile.aboutText || 'Sua história aparecerá aqui.'}</p>
                {profile.foundedYear ? (
                  <strong>{experienceLabel(profile.foundedYear)}</strong>
                ) : null}
              </PreviewSection>
            );
          }

          if (section === 'hours') {
            return (
              <PreviewSection key={section} title="Horários">
                <div className="preview-hours-list">
                  {activeDays.map(day => (
                    <span key={day.weekday}>
                      <strong>{weekdayLabels[day.weekday].replace('-feira', '')}</strong>{' '}
                      {day.periods.map(period => `${period.startsAt}–${period.endsAt}`).join(' • ')}
                    </span>
                  ))}
                </div>
              </PreviewSection>
            );
          }

          if (section === 'location') {
            return (
              <PreviewSection key={section} title="Onde estamos">
                <p>{locationText(draft)}</p>
              </PreviewSection>
            );
          }

          if (section === 'differentials') {
            return (
              <PreviewSection
                key={section}
                title={`Por que escolher a ${settings.businessName || 'barbearia'}?`}
              >
                <div className="preview-chip-line">
                  {profile.differentials.map(item => <span key={item}>{item}</span>)}
                </div>
              </PreviewSection>
            );
          }

          return null;
        })}
    </div>
  );
}

export function publicPageCompleteness(state: OnboardingState): number {
  const profile = state.settings.profile;
  const checks = [
    Boolean(profile.logoDataUrl),
    Boolean(profile.originStory || profile.aboutText),
    profile.specialties.length > 0,
    profile.differentials.length > 0,
    state.services.some(item => item.active),
    Boolean(state.settings.contact.whatsapp),
    Boolean(state.settings.contact.city),
    profile.spaceMedia.some(item => item.dataUrl),
    profile.portfolioMedia.some(item => item.dataUrl)
  ];
  return Math.round(checks.filter(Boolean).length / checks.length * 100);
}

function PreviewSection(props: { title: string; children: ReactNode }) {
  return (
    <section className="customer-preview-section">
      <h3>{props.title}</h3>
      {props.children}
    </section>
  );
}

function publicPrice(service: OnboardingState['services'][number]): string {
  if (!service.publicPriceVisible) return '';
  if (service.priceType === 'consult') return 'Sob consulta';
  const prefix = service.priceType === 'from' ? 'A partir de ' : '';
  return `${prefix}${currencyFormatter.format(service.price)}`;
}

function locationText(state: OnboardingState): string {
  const profile = state.settings.profile;
  const contact = state.settings.contact;
  if (profile.locationVisibility === 'hidden') return 'Localização não exibida.';
  if (profile.locationVisibility === 'area') {
    return [contact.city, contact.state].filter(Boolean).join(' - ') || 'Região ainda não informada.';
  }
  const fullAddress = [contact.addressLine, contact.city, contact.state].filter(Boolean).join(' • ');
  return fullAddress || 'Endereço ainda não informado.';
}

function primaryActionLabel(action: OnboardingState['settings']['profile']['primaryAction']) {
  if (action === 'whatsapp') return 'Falar no WhatsApp';
  if (action === 'services') return 'Ver serviços';
  return 'Agendar horário';
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(item => item[0])
    .join('')
    .toUpperCase() || 'SC';
}

function experienceLabel(foundedYear: number): string {
  const years = Math.max(0, new Date().getFullYear() - foundedYear);
  if (years < 1) return `Desde ${foundedYear}`;
  return `Mais de ${years} ano${years === 1 ? '' : 's'} de experiência`;
}

function getBusinessOpenStatus(state: OnboardingState): { open: boolean; label: string } {
  const now = zonedClock(state.settings.timezone);
  const day = state.settings.businessHours.weeklySchedule.find(item => item.weekday === now.weekday);
  if (!day?.enabled) return { open: false, label: nextOpenLabel(state, now.weekday) };
  const currentMinutes = now.hour * 60 + now.minute;
  const currentPeriod = day.periods.find(period => {
    const start = clockMinutes(period.startsAt);
    const end = clockMinutes(period.endsAt);
    return currentMinutes >= start && currentMinutes < end;
  });
  if (currentPeriod) return { open: true, label: `● Aberto agora • até ${currentPeriod.endsAt}` };
  const nextToday = day.periods.find(period => clockMinutes(period.startsAt) > currentMinutes);
  if (nextToday) return { open: false, label: `Fechado agora • abre hoje às ${nextToday.startsAt}` };
  return { open: false, label: nextOpenLabel(state, now.weekday) };
}

function nextOpenLabel(state: OnboardingState, currentWeekday: number): string {
  const schedule = state.settings.businessHours.weeklySchedule;
  for (let offset = 1; offset <= 7; offset += 1) {
    const weekday = (currentWeekday + offset) % 7;
    const day = schedule.find(item => item.weekday === weekday && item.enabled);
    const first = day?.periods[0];
    if (first) {
      const dayLabel = offset === 1
        ? 'amanhã'
        : weekdayLabels[weekday].replace('-feira', '').toLocaleLowerCase('pt-BR');
      return `Fechado agora • abre ${dayLabel} às ${first.startsAt}`;
    }
  }
  return 'Fechado agora';
}

function zonedClock(timeZone: string): { weekday: number; hour: number; minute: number } {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23'
    }).formatToParts(new Date());
    const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
    const weekdays: Record<string, number> = {
      Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6
    };
    return {
      weekday: weekdays[values.weekday] ?? new Date().getDay(),
      hour: Number(values.hour),
      minute: Number(values.minute)
    };
  } catch {
    const now = new Date();
    return { weekday: now.getDay(), hour: now.getHours(), minute: now.getMinutes() };
  }
}

function clockMinutes(clock: string): number {
  const [hour, minute] = clock.split(':').map(Number);
  return hour * 60 + minute;
}
