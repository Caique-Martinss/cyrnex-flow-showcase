import type { Client } from '../../domain/types';

interface WhatsAppPageProps {
  clients: Client[];
  selectedClientId: string;
  message: string;
  actionLoading: boolean;
  onClientChange: (clientId: string) => void;
  onMessageChange: (message: string) => void;
  onSend: () => void;
}

const confirmationTemplate =
  'Olá! Passando para confirmar seu horário na barbearia. Caso precise reagendar, fale com a gente com antecedência.';

const returnTemplate =
  'Fala! Já faz um tempo desde seu último corte. Temos alguns horários livres nesta semana. Quer reservar?';

export function WhatsAppPage({
  clients,
  selectedClientId,
  message,
  actionLoading,
  onClientChange,
  onMessageChange,
  onSend
}: WhatsAppPageProps) {
  return (
    <section className="page-section">
      <div className="page-title-row">
        <div>
          <span className="eyebrow">Comunicação</span>
          <h2>Central de WhatsApp</h2>
          <p>
            Prepare confirmações e mensagens de retorno antes da integração
            oficial.
          </p>
        </div>
      </div>

      <div className="dashboard-grid">
        <article className="panel panel-large">
          <div className="form-grid">
            <label>
              Cliente
              <select
                value={selectedClientId}
                onChange={event => onClientChange(event.target.value)}
              >
                <option value="">Selecione um cliente</option>
                {clients.map(client => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Mensagem
              <textarea
                value={message}
                onChange={event => onMessageChange(event.target.value)}
                placeholder="Olá! Passando para confirmar seu horário..."
              />
            </label>

            <div className="template-buttons">
              <button
                className="secondary-button"
                type="button"
                onClick={() => onMessageChange(confirmationTemplate)}
              >
                Confirmação
              </button>
              <button
                className="secondary-button"
                type="button"
                onClick={() => onMessageChange(returnTemplate)}
              >
                Retorno
              </button>
            </div>

            <div className="form-actions">
              <button disabled={actionLoading} onClick={onSend}>
                {actionLoading ? 'Enviando...' : 'Simular envio'}
              </button>
            </div>
          </div>
        </article>

        <article className="panel">
          <span className="eyebrow">Versão inicial</span>
          <h2>Sem custo de API agora</h2>
          <p className="muted-text">
            O sistema prepara o fluxo e as mensagens. A conexão oficial com o
            WhatsApp entra depois que o piloto comprovar valor.
          </p>
          <div className="check-list">
            <span>✓ Confirmação de horário</span>
            <span>✓ Recuperação de clientes</span>
            <span>✓ Cadastro já ligado ao telefone</span>
            <span>Próximo: envio automático</span>
          </div>
        </article>
      </div>
    </section>
  );
}
