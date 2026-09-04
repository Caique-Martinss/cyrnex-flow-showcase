import { type FormEvent, useState } from 'react';
import type { AuthSession } from '../../domain/types';

interface BusinessAccountSectionProps {
  session: AuthSession;
  submitting: boolean;
  error: string;
  onAddBusiness: (businessName: string) => Promise<boolean>;
  onSwitchBusiness: (businessId: string) => Promise<boolean>;
}

export function BusinessAccountSection(props: BusinessAccountSectionProps) {
  const [businessName, setBusinessName] = useState('');
  const [creating, setCreating] = useState(false);
  const otherBusinesses = props.session.businesses.filter(
    item => item.id !== props.session.business.id
  );

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = businessName.trim();
    if (name.length < 2) return;

    const created = await props.onAddBusiness(name);
    if (created) {
      setBusinessName('');
      setCreating(false);
    }
  }

  return (
    <div className="settings-business-account">
      <div className="page-title-row settings-account-heading">
        <div>
          <span className="eyebrow">Sua conta</span>
          <h2>Minhas barbearias</h2>
          <p>
            Use a mesma conta para administrar mais de uma barbearia. Cada unidade
            mantém agenda, clientes, serviços e configurações separados.
          </p>
        </div>
        {props.session.role === 'owner' ? (
          <button type="button" onClick={() => setCreating(value => !value)}>
            {creating ? 'Cancelar' : '+ Adicionar nova barbearia'}
          </button>
        ) : null}
      </div>

      {props.error ? <div className="auth-error">{props.error}</div> : null}

      {creating ? (
        <form className="panel new-business-form" onSubmit={submit}>
          <div>
            <span className="eyebrow">Nova unidade</span>
            <h3>Como essa barbearia se chama?</h3>
            <p>
              Vamos criar uma unidade vazia e abrir a configuração guiada para você
              montar horários, serviços, equipe e página pública.
            </p>
          </div>
          <label>
            Nome da barbearia
            <input
              value={businessName}
              onChange={event => setBusinessName(event.target.value)}
              placeholder="Ex.: CK Barbearia - Unidade Centro"
              minLength={2}
              maxLength={80}
              required
              autoFocus
            />
          </label>
          <button type="submit" disabled={props.submitting || businessName.trim().length < 2}>
            {props.submitting ? 'Criando...' : 'Criar e configurar esta barbearia'}
          </button>
        </form>
      ) : null}

      <div className="business-switch-grid">
        <article className="panel business-switch-card current-business-card">
          <span className="eyebrow">Em uso agora</span>
          <h3>{props.session.business.name}</h3>
          <p>/{props.session.business.slug}</p>
          <strong>✓ Barbearia atual</strong>
        </article>

        {otherBusinesses.map(business => (
          <article className="panel business-switch-card" key={business.id}>
            <span className="eyebrow">Outra barbearia</span>
            <h3>{business.name}</h3>
            <p>/{business.slug}</p>
            <button
              className="secondary-button"
              type="button"
              disabled={props.submitting}
              onClick={() => void props.onSwitchBusiness(business.id)}
            >
              Abrir esta barbearia
            </button>
          </article>
        ))}
      </div>

      {otherBusinesses.length === 0 ? (
        <div className="info-callout settings-note">
          <strong>Você tem uma barbearia nesta conta.</strong>
          <p>
            Quando abrir outra unidade, use “Adicionar nova barbearia”. Você não
            precisa criar outro usuário nem outra senha.
          </p>
        </div>
      ) : null}
    </div>
  );
}
