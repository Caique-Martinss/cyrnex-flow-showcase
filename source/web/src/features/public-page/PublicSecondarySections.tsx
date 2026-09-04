import { useState } from 'react';
import type {
  BusinessMediaItem,
  BusinessSettings
} from '../../domain/types';
import { weekdayLabels } from './publicPage.helpers';

export function DifferentialsSection({ settings }: { settings: BusinessSettings }) {
  const source = settings.profile.differentials.length
    ? settings.profile.differentials
    : [
      'Horário marcado de verdade',
      'Ambiente confortável',
      'Produtos profissionais',
      'Atendimento sem pressa'
    ];
  const icons = ['◷', '▣', '♙', '⏱'];
  const labels = ['Pontualidade', 'Conforto', 'Qualidade', 'Experiência'];

  return (
    <section className="pp-section pp-differentials" id="public-differentials">
      <div className="pp-shell pp-differential-layout">
        <header>
          <span className="pp-kicker">Experiência</span>
          <h2>O que faz a visita valer a pena</h2>
          <p>
            {settings.profile.differentiatorText ||
              'Cada detalhe é pensado para transformar sua rotina em um momento só seu.'}
          </p>
        </header>
        <div className="pp-differential-grid">
          {source.slice(0, 4).map((item, index) => (
            <article className="pp-diff-card pp-glow" key={item}>
              <div>
                <i>{icons[index]}</i>
                <span>{String(index + 1).padStart(2, '0')}</span>
              </div>
              <h3>{item}</h3>
              <p>{differentialCopy(index)}</p>
              <footer>
                <small>{labels[index]}</small>
                <strong>{differentialValue(index)}</strong>
              </footer>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

interface InformationSectionProps {
  settings: BusinessSettings;
  showHours: boolean;
  showLocation: boolean;
}

export function InformationSection(props: InformationSectionProps) {
  const settings = props.settings;
  const days = settings.businessHours.weeklySchedule
    .filter(day => day.enabled)
    .slice(0, 6);
  const location = publicLocation(settings);
  const mapsQuery = encodeURIComponent(location);
  const hasContact = Boolean(
    settings.contact.whatsapp ||
    settings.contact.phone ||
    settings.contact.instagram
  );

  return (
    <section className="pp-section pp-information" id="public-information">
      <div className="pp-shell pp-info-layout">
        <header>
          <span className="pp-kicker">Informações</span>
          <h2>Tudo que você precisa antes de sair de casa</h2>
          <p>Planeje sua visita e chegue tranquilo.</p>
        </header>
        <div className="pp-info-grid">
          {props.showHours && days.length ? <HoursCard days={days} /> : null}
          {props.showLocation && location ? (
            <MapCard
              settings={settings}
              location={location}
              mapsQuery={mapsQuery}
            />
          ) : null}
          {hasContact ? <ContactCard settings={settings} /> : null}
        </div>
      </div>
    </section>
  );
}

function HoursCard({
  days
}: {
  days: BusinessSettings['businessHours']['weeklySchedule'];
}) {
  return (
    <article className="pp-info-card pp-glow">
      <i>◷</i>
      <h3>Horários</h3>
      <p>Agenda online respeitando expediente, pausas e duração de cada serviço.</p>
      <div className="pp-hours">
        {days.map(day => (
          <div key={day.weekday}>
            <strong>{weekdayLabels[day.weekday]}</strong>
            <span>
              {day.periods
                .map(period => `${period.startsAt} – ${period.endsAt}`)
                .join(' • ')}
            </span>
          </div>
        ))}
      </div>
    </article>
  );
}

function MapCard(props: {
  settings: BusinessSettings;
  location: string;
  mapsQuery: string;
}) {
  return (
    <article className="pp-info-card pp-map-card pp-glow">
      <i>⌖</i>
      <h3>Localização</h3>
      <p>{props.location}</p>
      {props.settings.profile.locationVisibility === 'full' ? (
        <iframe
          title={`Mapa da ${props.settings.businessName}`}
          src={`https://www.google.com/maps?q=${props.mapsQuery}&output=embed`}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      ) : (
        <div className="pp-map-fallback">⌖</div>
      )}
      <a
        href={`https://www.google.com/maps/search/?api=1&query=${props.mapsQuery}`}
        target="_blank"
        rel="noreferrer"
      >
        Ver rota no mapa <span>→</span>
      </a>
    </article>
  );
}

function ContactCard({ settings }: { settings: BusinessSettings }) {
  return (
    <article className="pp-info-card pp-glow">
      <i>◌</i>
      <h3>Contato</h3>
      <p>Fale direto pelos canais configurados como públicos.</p>
      <div className="pp-contact">
        {settings.contact.whatsapp ? (
          <a
            href={`https://wa.me/${settings.contact.whatsapp.replace(/\D/g, '')}`}
            target="_blank"
            rel="noreferrer"
          >
            Abrir WhatsApp
          </a>
        ) : null}
        {settings.contact.phone ? <span>{settings.contact.phone}</span> : null}
        {settings.contact.instagram ? (
          <span>{settings.contact.instagram}</span>
        ) : null}
      </div>
    </article>
  );
}

export function PortfolioSection(props: {
  items: BusinessMediaItem[];
  focusedMediaId: string | null;
}) {
  const [active, setActive] = useState<BusinessMediaItem | null>(null);
  const items = props.items
    .filter(item => item.publicVisible && item.dataUrl)
    .slice(0, 5);

  if (!items.length) return null;

  return (
    <section className="pp-section pp-portfolio" id="public-portfolio">
      <div className="pp-shell">
        <SectionHead kicker="Trabalhos" title="Resultados que falam por nós" />
        <div className="pp-media-grid">
          {items.map((item, index) => (
            <MediaCard
              key={item.id}
              item={item}
              index={index}
              focused={props.focusedMediaId === item.id}
              onClick={() => setActive(item)}
            />
          ))}
        </div>
      </div>
      {active ? <MediaModal item={active} onClose={() => setActive(null)} /> : null}
    </section>
  );
}

function MediaCard(props: {
  item: BusinessMediaItem;
  index: number;
  focused: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      id={`public-media-${props.item.id}`}
      className={
        `pp-media-card pp-glow media-${props.index + 1}` +
        `${props.focused ? ' is-focused' : ''}`
      }
      onClick={props.onClick}
    >
      {props.item.mediaType === 'video' ? (
        <video src={props.item.dataUrl || ''} muted preload="metadata" />
      ) : (
        <img
          src={props.item.dataUrl || ''}
          alt={props.item.title || 'Trabalho'}
        />
      )}
      <span>
        <strong>{props.item.title || props.item.category || 'Trabalho'}</strong>
        <small>
          {props.item.mediaType === 'video' ? 'Assistir vídeo' : 'Ver trabalho'}
        </small>
      </span>
    </button>
  );
}

export function SpaceSection({ items }: { items: BusinessMediaItem[] }) {
  const visible = items
    .filter(item => item.publicVisible && item.dataUrl)
    .slice(0, 3);

  if (!visible.length) return null;
  return <PortfolioSection items={visible} focusedMediaId={null} />;
}

export function AboutSection(props: {
  settings: BusinessSettings;
  onBooking: () => void;
}) {
  const text = props.settings.profile.originStory || props.settings.profile.aboutText;
  if (!text) return null;

  return (
    <section className="pp-section pp-about" id="public-about">
      <div className="pp-shell pp-about-grid">
        <div>
          <span className="pp-kicker">Sobre</span>
          <h2>Mais que um horário na agenda</h2>
        </div>
        <article className="pp-glow">
          <p>{text}</p>
          {props.settings.profile.experienceText ? (
            <p>{props.settings.profile.experienceText}</p>
          ) : null}
          <button type="button" onClick={props.onBooking}>
            Reservar meu horário <span>→</span>
          </button>
        </article>
      </div>
    </section>
  );
}

function MediaModal(props: {
  item: BusinessMediaItem;
  onClose: () => void;
}) {
  return (
    <div className="pp-modal" role="dialog" aria-modal="true">
      <button
        type="button"
        className="pp-modal-backdrop"
        onClick={props.onClose}
        aria-label="Fechar"
      />
      <div>
        {props.item.mediaType === 'video' ? (
          <video src={props.item.dataUrl || ''} controls />
        ) : (
          <img
            src={props.item.dataUrl || ''}
            alt={props.item.title || 'Mídia'}
          />
        )}
        <button type="button" onClick={props.onClose}>✕</button>
      </div>
    </div>
  );
}

function SectionHead(props: {
  kicker: string;
  title: string;
  copy?: string;
}) {
  return (
    <header className="pp-section-head">
      <div>
        <span className="pp-kicker">{props.kicker}</span>
        <h2>{props.title}</h2>
      </div>
      {props.copy ? <p>{props.copy}</p> : null}
    </header>
  );
}

function publicLocation(settings: BusinessSettings) {
  if (settings.profile.locationVisibility === 'hidden') return '';
  const contact = settings.contact;
  if (settings.profile.locationVisibility === 'area') {
    return [contact.city, contact.state].filter(Boolean).join(' - ');
  }
  return [
    contact.addressLine,
    contact.city,
    contact.state,
    contact.postalCode
  ].filter(Boolean).join(' • ');
}

function differentialCopy(index: number) {
  return [
    'Você escolhe o horário e recebe confirmação clara. Sem espera, sem surpresas.',
    'Conforto e ritmo pensados para a experiência do cliente.',
    'Qualidade e consistência em cada etapa do atendimento.',
    'Sem correria. O tempo certo de cada cliente é respeitado.'
  ][index] || 'Um diferencial pensado para melhorar sua experiência.';
}

function differentialValue(index: number) {
  return ['98%', '★★★★★', 'Premium', '—'][index] || '—';
}
