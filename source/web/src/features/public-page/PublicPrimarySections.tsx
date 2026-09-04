import type {
  BusinessMediaItem,
  Professional,
  Service
} from '../../domain/types';
import {
  initials,
  professionalRoleLabel,
  publicPrice
} from './publicPage.helpers';

interface ServicesSectionProps {
  services: Service[];
  media: BusinessMediaItem[];
  focusedServiceId: string | null;
  onBookService: (serviceId: string) => void;
}

export function ServicesSection(props: ServicesSectionProps) {
  const services = props.services
    .filter(service => service.active && service.onlineBookingEnabled)
    .slice(0, 6);

  if (!services.length) return null;

  return (
    <section className="pp-section pp-services" id="public-services">
      <div className="pp-shell">
        <SectionHead
          kicker="Serviços"
          title="Escolha o seu serviço"
          copy="Técnicas, duração e valores públicos com clareza antes de agendar."
        />
        <div className="pp-service-grid">
          {services.map((service, index) => (
            <ServiceCard
              key={service.id}
              service={service}
              index={index}
              media={findServiceMedia(props.media, service.id)}
              focused={props.focusedServiceId === service.id}
              onBook={() => props.onBookService(service.id)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function ServiceCard(props: {
  service: Service;
  index: number;
  media?: BusinessMediaItem;
  focused: boolean;
  onBook: () => void;
}) {
  return (
    <article
      className={`pp-service-card pp-glow${props.focused ? ' is-focused' : ''}`}
      id={`public-service-${props.service.id}`}
    >
      <ServiceVisual item={props.media} index={props.index} />
      <div className="pp-service-content">
        <span className="pp-card-badge">
          {props.index === 0
            ? '★ Mais escolhido'
            : props.service.category || 'Serviço'}
        </span>
        <h3>{props.service.name}</h3>
        <small>{props.service.durationMinutes} min</small>
        <p>
          {props.service.description ||
            'Atendimento premium configurado pelo estabelecimento.'}
        </p>
        <strong>{publicPrice(props.service)}</strong>
        <button type="button" onClick={props.onBook}>
          Agendar este serviço <span>→</span>
        </button>
      </div>
    </article>
  );
}

function ServiceVisual(props: {
  item?: BusinessMediaItem;
  index: number;
}) {
  if (props.item?.dataUrl) {
    return props.item.mediaType === 'video' ? (
      <video
        className="pp-service-image"
        src={props.item.dataUrl}
        muted
        playsInline
        preload="metadata"
      />
    ) : (
      <img className="pp-service-image" src={props.item.dataUrl} alt="" />
    );
  }

  return (
    <div
      className={`pp-service-image pp-service-art art-${(props.index % 3) + 1}`}
      aria-hidden="true"
    />
  );
}

interface TeamSectionProps {
  services: Service[];
  professionals: Professional[];
  focusedProfessionalId: string | null;
  onBooking: () => void;
  onBookProfessional: (professionalId: string) => void;
}

export function TeamSection(props: TeamSectionProps) {
  const professionals = props.professionals
    .filter(item => item.active && item.publicVisible)
    .slice(0, 4);

  if (!professionals.length) return null;

  return (
    <section className="pp-section pp-team" id="public-team">
      <div className="pp-shell">
        <div className="pp-team-heading">
          <div>
            <span className="pp-kicker">Equipe</span>
            <h2>Seu estilo nas mãos certas</h2>
            <p>
              Profissionais experientes, atendimento personalizado e foco total
              em você.
            </p>
          </div>
          <button
            type="button"
            className="pp-any-pro pp-glow"
            onClick={props.onBooking}
          >
            <i>♙</i>
            <span>
              <strong>Qualquer profissional disponível</strong>
              <small>Encontrar o primeiro horário compatível</small>
            </span>
            <b>›</b>
          </button>
        </div>

        <div className="pp-team-grid">
          {professionals.map((professional, index) => (
            <ProfessionalCard
              key={professional.id}
              professional={professional}
              index={index}
              services={props.services}
              focused={props.focusedProfessionalId === professional.id}
              onBook={() => props.onBookProfessional(professional.id)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function ProfessionalCard(props: {
  professional: Professional;
  index: number;
  services: Service[];
  focused: boolean;
  onBook: () => void;
}) {
  const name = props.professional.professionalName || props.professional.name;
  const services = props.services
    .filter(service => service.professionalIds.includes(props.professional.id))
    .slice(0, 3);

  return (
    <article
      className={`pp-pro-card pp-glow${props.focused ? ' is-focused' : ''}`}
      id={`public-professional-${props.professional.id}`}
    >
      <div
        className={`pp-pro-photo photo-${(props.index % 3) + 1}`}
        aria-hidden="true"
      >
        <span>{initials(name)}</span>
      </div>
      <div className="pp-pro-copy">
        <h3>{name}</h3>
        <p>{professionalRoleLabel(props.professional.role)}</p>
        <div className="pp-chip-row">
          {services.map(service => (
            <span key={service.id}>{service.name}</span>
          ))}
        </div>
        <button type="button" onClick={props.onBook}>
          Ver horários <span>→</span>
        </button>
      </div>
    </article>
  );
}


function findServiceMedia(items: BusinessMediaItem[], serviceId: string) {
  return items.find(
    item => item.publicVisible && item.serviceId === serviceId && item.dataUrl
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
