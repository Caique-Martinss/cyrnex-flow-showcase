import { useState } from 'react';
import type { ReactNode } from 'react';
import type {
  BusinessSettings,
  Professional,
  PublicSectionKey,
  Service
} from '../../domain/types';
import { initials } from './publicPage.helpers';

interface PublicNavigationProps {
  settings: BusinessSettings;
  services: Service[];
  professionals: Professional[];
  sections: PublicSectionKey[];
  onBooking: () => void;
  onServiceFocus: (id: string) => void;
  onProfessionalFocus: (id: string) => void;
  onMediaFocus: (id: string) => void;
  onSectionFocus: (id: string) => void;
}

export function PublicNavigation(props: PublicNavigationProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const media = props.settings.profile.portfolioMedia.filter(
    item => item.publicVisible
  );

  return (
    <nav className="pp-nav" aria-label="Navegação da página pública">
      <div className="pp-shell pp-nav-inner">
        <Brand
          businessName={props.settings.businessName}
          onClick={() => setMobileOpen(false)}
        />
        <div className="pp-nav-links">
          {props.sections.includes('services') ? (
            <Context label="Serviços" href="#public-services">
              <span className="pp-menu-kicker">Nossos serviços</span>
              {props.services.slice(0, 4).map(service => (
                <button
                  type="button"
                  key={service.id}
                  onClick={() => props.onServiceFocus(service.id)}
                >
                  <span>
                    <strong>{service.name}</strong>
                    <small>
                      {service.durationMinutes} min •{' '}
                      {service.description || 'serviço premium'}
                    </small>
                  </span>
                  <i>›</i>
                </button>
              ))}
              <a href="#public-services" className="pp-menu-all">
                Ver todos os serviços <span>→</span>
              </a>
            </Context>
          ) : null}

          {props.sections.includes('team') ? (
            <Context label="Equipe" href="#public-team">
              <span className="pp-menu-kicker">Quem atende você</span>
              {props.professionals.slice(0, 4).map(professional => (
                <button
                  type="button"
                  key={professional.id}
                  onClick={() => props.onProfessionalFocus(professional.id)}
                >
                  <b>{initials(professional.professionalName || professional.name)}</b>
                  <span>
                    <strong>
                      {professional.professionalName || professional.name}
                    </strong>
                    <small>Perfil e horários</small>
                  </span>
                  <i>›</i>
                </button>
              ))}
            </Context>
          ) : null}

          {props.sections.includes('portfolio') ? (
            <Context label="Trabalhos" href="#public-portfolio">
              <span className="pp-menu-kicker">Resultados em destaque</span>
              {media.slice(0, 3).map(item => (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => props.onMediaFocus(item.id)}
                >
                  <span>
                    <strong>{item.title || item.category || 'Trabalho'}</strong>
                    <small>
                      {item.mediaType === 'video'
                        ? 'Assistir vídeo'
                        : 'Ver trabalho'}
                    </small>
                  </span>
                  <i>›</i>
                </button>
              ))}
              {!media.length ? (
                <p className="pp-menu-empty">
                  Os trabalhos públicos aparecerão aqui.
                </p>
              ) : null}
            </Context>
          ) : null}

          {props.sections.includes('about') ? (
            <Context label="Sobre" href="#public-about">
              <span className="pp-menu-kicker">Conheça a experiência</span>
              <ContextAction
                title="Nossa história"
                copy="Origem e proposta"
                onClick={() => props.onSectionFocus('public-about')}
              />
              <ContextAction
                title="Diferenciais"
                copy="O que torna a visita especial"
                onClick={() => props.onSectionFocus('public-differentials')}
              />
              <ContextAction
                title="Informações"
                copy="Horários, mapa e contato"
                onClick={() => props.onSectionFocus('public-information')}
              />
            </Context>
          ) : null}

          <button
            type="button"
            className="pp-nav-cta"
            onClick={props.onBooking}
          >
            Agendar horário
          </button>
        </div>

        <button
          type="button"
          className="pp-mobile-toggle"
          onClick={() => setMobileOpen(open => !open)}
          aria-expanded={mobileOpen}
          aria-label="Abrir menu"
        >
          <i />
          <i />
          <i />
        </button>
      </div>

      {mobileOpen ? (
        <div className="pp-mobile-menu">
          <MobileLink
            href="#public-services"
            label="Serviços"
            onClick={() => setMobileOpen(false)}
          />
          <MobileLink
            href="#public-team"
            label="Equipe"
            onClick={() => setMobileOpen(false)}
          />
          <MobileLink
            href="#public-portfolio"
            label="Trabalhos"
            onClick={() => setMobileOpen(false)}
          />
          <MobileLink
            href="#public-about"
            label="Sobre"
            onClick={() => setMobileOpen(false)}
          />
          <button
            type="button"
            onClick={() => {
              setMobileOpen(false);
              props.onBooking();
            }}
          >
            Agendar horário
          </button>
        </div>
      ) : null}
    </nav>
  );
}

function Brand({ businessName, onClick }: {
  businessName: string;
  onClick: () => void;
}) {
  return (
    <a className="pp-brand" href="#public-top" onClick={onClick}>
      <span className="pp-brand-mark">{initials(businessName)}</span>
      <span>
        <strong>{businessName}</strong>
        <small>Agendamento online</small>
      </span>
    </a>
  );
}

function ContextAction(props: {
  title: string;
  copy: string;
  onClick: () => void;
}) {
  return (
    <button type="button" onClick={props.onClick}>
      <span>
        <strong>{props.title}</strong>
        <small>{props.copy}</small>
      </span>
      <i>›</i>
    </button>
  );
}

function MobileLink(props: {
  href: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <a href={props.href} onClick={props.onClick}>
      {props.label}
    </a>
  );
}

function Context({
  label,
  href,
  children
}: {
  label: string;
  href: string;
  children: ReactNode;
}) {
  return (
    <span className="pp-context">
      <a href={href}>{label}</a>
      <span className="pp-context-panel">{children}</span>
    </span>
  );
}
