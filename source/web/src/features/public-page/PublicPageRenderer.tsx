import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import type {
  BusinessMediaItem,
  BusinessSettings,
  Professional,
  PublicSectionKey,
  Service
} from '../../domain/types';
import type { PublicStaffContext } from '../../services/publicPage.api';
import { PublicNavigation } from './PublicNavigation';
import { PublicStaffToolbar } from './PublicStaffToolbar';
import {
  AboutSection,
  DifferentialsSection,
  InformationSection,
  PortfolioSection,
  ServicesSection,
  SpaceSection,
  TeamSection
} from './PublicSections';
import { businessStatus, initials } from './publicPage.helpers';

interface PublicPageRendererProps {
  settings: BusinessSettings;
  slug?: string;
  staffContext?: PublicStaffContext | null;
  services: Service[];
  professionals: Professional[];
  booking: ReactNode;
  onSelectService?: (serviceId: string) => void;
  onSelectProfessional?: (professionalId: string) => void;
}

export function PublicPageRenderer(props: PublicPageRendererProps) {
  const [focusedServiceId, setFocusedServiceId] = useState<string | null>(null);
  const [focusedProfessionalId, setFocusedProfessionalId] = useState<string | null>(null);
  const [focusedMediaId, setFocusedMediaId] = useState<string | null>(null);
  const [bookingOpen, setBookingOpen] = useState(false);
  const profile = props.settings.profile;
  const visible = useMemo(() => orderedVisibleSections(profile), [profile]);
  const style = { '--pp-accent': profile.accentColor || '#d6a34b' } as CSSProperties;

  useEffect(() => {
    if (!bookingOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setBookingOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [bookingOpen]);

  const focus = (id: string) => requestAnimationFrame(() => scrollTo(id));
  const focusService = (id: string) => {
    setFocusedServiceId(id);
    focus(`public-service-${id}`);
    window.setTimeout(() => {
      setFocusedServiceId(current => current === id ? null : current);
    }, 1400);
  };
  const focusProfessional = (id: string) => {
    setFocusedProfessionalId(id);
    focus(`public-professional-${id}`);
    window.setTimeout(() => {
      setFocusedProfessionalId(current => current === id ? null : current);
    }, 1400);
  };
  const focusMedia = (id: string) => {
    setFocusedMediaId(id);
    focus(`public-media-${id}`);
    window.setTimeout(() => {
      setFocusedMediaId(current => current === id ? null : current);
    }, 1400);
  };
  const openBooking = () => {
    setBookingOpen(true);
    focus('public-booking');
  };
  const bookService = (id: string) => {
    props.onSelectService?.(id);
    setFocusedServiceId(id);
    openBooking();
  };
  const bookProfessional = (id: string) => {
    props.onSelectProfessional?.(id);
    setFocusedProfessionalId(id);
    openBooking();
  };

  return (
    <div className="public-customer-page pp-page" style={style}>
      {props.staffContext && props.slug ? (
        <PublicStaffToolbar context={props.staffContext} slug={props.slug} />
      ) : null}
      <PublicNavigation
        settings={props.settings}
        services={props.services}
        professionals={props.professionals}
        sections={profile.publicSections}
        onBooking={openBooking}
        onServiceFocus={focusService}
        onProfessionalFocus={focusProfessional}
        onMediaFocus={focusMedia}
        onSectionFocus={focus}
      />
      <BlueprintHero settings={props.settings} onBooking={openBooking} />
      {visible.map(section => (
        <BlueprintSection
          key={section}
          section={section}
          settings={props.settings}
          services={props.services}
          professionals={props.professionals}
          focusedServiceId={focusedServiceId}
          focusedProfessionalId={focusedProfessionalId}
          focusedMediaId={focusedMediaId}
          onBooking={openBooking}
          onBookService={bookService}
          onBookProfessional={bookProfessional}
        />
      ))}
      <BookingCallout settings={props.settings} onBooking={openBooking} />
      <section
        className={`pp-booking-panel${bookingOpen ? ' is-open' : ''}`}
        id="public-booking"
        aria-hidden={!bookingOpen}
        aria-modal={bookingOpen}
        role="dialog"
      >
        <button
          aria-label="Fechar agendamento"
          className="pp-booking-backdrop"
          onClick={() => setBookingOpen(false)}
          type="button"
        />
        <div className="pp-booking-shell">
          <header className="pp-booking-header">
            <div className="pp-booking-brand">
              <span className="pp-brand-mark">{initials(props.settings.businessName)}</span>
              <div>
                <small>Reserva online</small>
                <strong>Agendar na {props.settings.businessName}</strong>
              </div>
            </div>
            <button
              aria-label="Fechar agendamento"
              className="pp-booking-close"
              onClick={() => setBookingOpen(false)}
              type="button"
            >
              ✕
            </button>
          </header>
          <div className="public-booking-card">{props.booking}</div>
        </div>
      </section>
      <footer className="pp-footer">
        <div className="pp-shell">
          <span className="pp-brand-mark">{initials(props.settings.businessName)}</span>
          <strong>{props.settings.businessName}</strong>
          <span>{props.settings.contact.instagram || props.settings.contact.city}</span>
        </div>
      </footer>
    </div>
  );
}

function BlueprintHero({ settings, onBooking }: { settings: BusinessSettings; onBooking: () => void }) {
  const profile = settings.profile;
  const media = heroMedia(profile);
  return (
    <section className="pp-hero" id="public-top">
      <div className="pp-shell pp-hero-grid">
        <div className="pp-hero-copy">
          <span className="pp-open"><i />{businessStatus(settings)}</span>
          <h1>{settings.businessName}</h1>
          <p className="pp-hero-lead">
            {profile.headline || 'Precisão no corte. Presença no detalhe.'}
          </p>
          <p className="pp-hero-about">
            {profile.aboutText || 'Atendimento com hora marcada, cuidado e uma experiência sem pressa.'}
          </p>
          <div className="pp-actions">
            <button type="button" className="pp-primary" onClick={onBooking}>Agendar horário <span>→</span></button>
            <a className="pp-secondary" href="#public-services">Ver serviços</a>
          </div>
          <div className="pp-meta">
            {settings.contact.city ? <span>⌖ {settings.contact.city}</span> : null}
            <span>◷ Próximo horário online</span>
            {settings.contact.instagram ? <span>◎ {settings.contact.instagram}</span> : null}
          </div>
        </div>
        <HeroCollage media={media} />
      </div>
    </section>
  );
}

function HeroCollage({ media }: { media: HeroItem[] }) {
  return (
    <div className="pp-hero-collage" aria-label="Destaques visuais">
      {media.map((item, index) => (
        <figure className={`pp-float-card pp-float-${index + 1}`} key={`${item.src}-${index}`} tabIndex={0}>
          {item.kind === 'video' ? (
            <video src={item.src} muted playsInline preload="metadata" />
          ) : item.src ? (
            <img src={item.src} alt="" />
          ) : (
            <div className={`pp-art pp-art-${index + 1}`} aria-hidden="true" />
          )}
          {item.kind === 'video' ? <span className="pp-play">▶</span> : null}
          <figcaption><strong>{item.title}</strong><small>{item.copy}</small></figcaption>
        </figure>
      ))}
    </div>
  );
}

interface HeroItem { src: string; kind: 'image' | 'video'; title: string; copy: string }

function heroMedia(profile: BusinessSettings['profile']): HeroItem[] {
  const source = [...profile.spaceMedia, ...profile.portfolioMedia]
    .filter(item => item.publicVisible && item.dataUrl)
    .slice(0, 3);
  const defaults = [
    { title: 'Ambiente Signature', copy: 'Conforto • experiência personalizada' },
    { title: 'Conheça o espaço', copy: 'Veja de perto antes de chegar' },
    { title: 'Barba Ritual', copy: 'Detalhes que fazem diferença' }
  ];
  return defaults.map((item, index) => ({
    src: source[index]?.dataUrl || '',
    kind: source[index]?.mediaType || 'image',
    title: source[index]?.title || item.title,
    copy: source[index]?.description || item.copy
  }));
}

function BlueprintSection(props: {
  section: PublicSectionKey;
  settings: BusinessSettings;
  services: Service[];
  professionals: Professional[];
  focusedServiceId: string | null;
  focusedProfessionalId: string | null;
  focusedMediaId: string | null;
  onBooking: () => void;
  onBookService: (id: string) => void;
  onBookProfessional: (id: string) => void;
}) {
  if (props.section === 'services') {
    return <ServicesSection
      services={props.services}
      media={[...props.settings.profile.portfolioMedia, ...props.settings.profile.spaceMedia]}
      focusedServiceId={props.focusedServiceId}
      onBookService={props.onBookService}
    />;
  }
  if (props.section === 'team') {
    return (
      <TeamSection
        services={props.services}
        professionals={props.professionals}
        focusedProfessionalId={props.focusedProfessionalId}
        onBooking={props.onBooking}
        onBookProfessional={props.onBookProfessional}
      />
    );
  }
  if (props.section === 'differentials') return <DifferentialsSection settings={props.settings} />;
  if (props.section === 'hours' || props.section === 'location') {
    return <InformationSection settings={props.settings} showHours showLocation />;
  }
  if (props.section === 'portfolio') {
    return <PortfolioSection items={props.settings.profile.portfolioMedia} focusedMediaId={props.focusedMediaId} />;
  }
  if (props.section === 'space') return <SpaceSection items={props.settings.profile.spaceMedia} />;
  if (props.section === 'about') return <AboutSection settings={props.settings} onBooking={props.onBooking} />;
  return null;
}

function BookingCallout({
  settings: _settings,
  onBooking
}: {
  settings: BusinessSettings;
  onBooking: () => void;
}) {
  return (
    <section className="pp-cta" id="public-cta">
      <div className="pp-shell pp-cta-grid">
        <div className="pp-cta-copy">
          <span className="pp-kicker">Sem esperar resposta</span>
          <h2>Seu próximo horário pode estar a poucos toques.</h2>
          <p>Escolha serviço, profissional, data e horário. O sistema revalida tudo antes de confirmar.</p>
          <button type="button" className="pp-primary" onClick={onBooking}>
            Ver horários disponíveis <span>→</span>
          </button>
        </div>
        <div className="pp-live-card">
          <strong><i /> Disponibilidade em tempo real</strong>
          <small>Próximos horários para hoje</small>
          <div className="pp-slot-row">
            <span>17:30<b>Disponível</b></span>
            <span>18:15<b>Disponível</b></span>
            <span>19:00<b>Disponível</b></span>
          </div>
          <button type="button" onClick={onBooking}>Ver mais horários <span>→</span></button>
        </div>
        <div className="pp-tools-visual" aria-label="Ferramentas de barbearia" />
      </div>
    </section>
  );
}

function orderedVisibleSections(profile: BusinessSettings['profile']) {
  const base = profile.sectionOrder.length ? profile.sectionOrder : profile.publicSections;
  const visible = base.filter(item => profile.publicSections.includes(item) && item !== 'hero');
  const deduped = visible.filter((item, index) => visible.indexOf(item) === index);
  if (deduped.includes('hours') && deduped.includes('location')) {
    return deduped.filter(item => item !== 'location');
  }
  return deduped;
}

function scrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
