import { useState } from 'react';
import type {
  Appointment,
  Client,
  MemberRole,
  Professional,
  RetroactiveServiceRequest,
  Service
} from '../../domain/types';
import { currencyFormatter } from '../../utils/formatters';
import { formatTime } from './agenda.helpers';
import { CollapsibleAgendaSection } from './CollapsibleAgendaSection';

type ReviewMode = 'approve' | 'reject' | null;

interface RetroactiveApprovalPanelProps {
  requests: RetroactiveServiceRequest[];
  appointments: Appointment[];
  clients: Client[];
  services: Service[];
  professionals: Professional[];
  role: MemberRole;
  currentUserId: string;
  actionLoading: boolean;
  timeZone: string;
  onApprove: (
    item: RetroactiveServiceRequest,
    options?: { confirmConflict?: boolean; conflictJustification?: string }
  ) => void;
  onReject: (item: RetroactiveServiceRequest, reason: string) => void;
}

export function RetroactiveApprovalPanel(props: RetroactiveApprovalPanelProps) {
  const pending = props.requests.filter(item => item.status === 'pending');
  const [reviewingId, setReviewingId] = useState('');
  const [reviewMode, setReviewMode] = useState<ReviewMode>(null);
  const [reviewed, setReviewed] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [confirmConflict, setConfirmConflict] = useState(false);
  const [conflictJustification, setConflictJustification] = useState('');
  if (!pending.length) return null;
  const canReview = props.role === 'owner' || props.role === 'manager';

  function beginReview(id: string, mode: Exclude<ReviewMode, null>) {
    setReviewingId(id);
    setReviewMode(mode);
    setReviewed(false);
    setRejectReason('');
    setConfirmConflict(false);
    setConflictJustification('');
  }

  function closeReview() {
    setReviewingId('');
    setReviewMode(null);
    setReviewed(false);
    setRejectReason('');
    setConfirmConflict(false);
    setConflictJustification('');
  }

  return (
    <CollapsibleAgendaSection
      storageKey="retroactive-approvals"
      title={canReview ? 'Atendimentos aguardando aprovação' : 'Lançamentos aguardando aprovação'}
      eyebrow="Segurança"
      criticalSummary={`${pending.length} pendência${pending.length === 1 ? '' : 's'} aguardando revisão`}
      className="retroactive-approval-panel"
    >
      <p className="muted-copy">
        Um atendimento passado só entra definitivamente no histórico e no financeiro depois da validação.
      </p>
      <div className="retroactive-request-list">
        {pending.map(item => {
          const client = props.clients.find(entry => entry.id === item.clientId);
          const service = props.services.find(entry => entry.id === item.serviceId);
          const professional = props.professionals.find(entry => entry.id === item.professionalId);
          const conflict = item.conflictAppointmentId
            ? props.appointments.find(entry => entry.id === item.conflictAppointmentId)
            : undefined;
          const date = new Date(item.startsAt);
          const isReviewing = reviewingId === item.id;
          const ownRequest = item.requestedByUserId === props.currentUserId;
          const managerCanReview = props.role === 'manager' &&
            (item.requestedByRole === 'professional' || item.requestedByRole === 'receptionist') &&
            !ownRequest;
          const canReviewItem = props.role === 'owner' || managerCanReview;
          const conflictReady = !conflict || (
            confirmConflict && conflictJustification.trim().length >= 5
          );

          return (
            <div className="retroactive-request" key={item.id}>
              <div className="retroactive-request-main">
                <div>
                  <strong>{client?.name ?? 'Cliente'}</strong>
                  <span>{client?.phone ?? 'Telefone não disponível'}</span>
                </div>
                <span>
                  {service?.name ?? 'Serviço'} •{' '}
                  {professional?.professionalName || professional?.name || 'Profissional'}
                </span>
                <small>
                  {date.toLocaleDateString('pt-BR', { timeZone: props.timeZone })} às{' '}
                  {formatTime(date, props.timeZone)} • {currencyFormatter.format(item.price)}
                </small>
              </div>
              <div className="retroactive-proof">
                <span><strong>Solicitante:</strong> {item.requestedByName}</span>
                <span><strong>Motivo:</strong> {item.reason}</span>
                <span><strong>Referência:</strong> {item.proofReference}</span>
                <span><strong>Comprovação:</strong> {item.proofDescription}</span>
              </div>

              {conflict ? (
                <div className="retroactive-conflict-warning">
                  <strong>Conflito encontrado — exige confirmação explícita</strong>
                  <span>
                    Existe {conflict.client?.name ?? 'outro cliente'} às{' '}
                    {formatTime(conflict.date, props.timeZone)} com {conflict.professionalName}.
                  </span>
                  <small>
                    Como este atendimento já aconteceu, o conflito não impede a aprovação,
                    mas a exceção precisa ser justificada e auditada.
                  </small>
                </div>
              ) : null}

              {canReview && canReviewItem ? (
                !isReviewing ? (
                  <div className="retroactive-actions">
                    <button
                      type="button"
                      className="primary-review-button"
                      disabled={props.actionLoading}
                      onClick={() => beginReview(item.id, 'approve')}
                    >
                      Revisar e aprovar
                    </button>
                    <button
                      type="button"
                      className="danger-button"
                      disabled={props.actionLoading}
                      onClick={() => beginReview(item.id, 'reject')}
                    >
                      Rejeitar
                    </button>
                  </div>
                ) : (
                  <div className="retroactive-review-box">
                    <div>
                      <strong>
                        {reviewMode === 'approve'
                          ? 'Confirme a aprovação'
                          : 'Informe o motivo da rejeição'}
                      </strong>
                      <span>Revise cliente, telefone, horário, valor, motivo, comprovação e eventual conflito.</span>
                    </div>

                    {reviewMode === 'reject' ? (
                      <label>
                        Motivo da rejeição
                        <textarea
                          minLength={3}
                          value={rejectReason}
                          onChange={event => setRejectReason(event.target.value)}
                          placeholder="Ex.: comprovante não corresponde ao valor informado."
                        />
                      </label>
                    ) : null}

                    {reviewMode === 'approve' && conflict ? (
                      <div className="conflict-confirmation-box">
                        <label>
                          Justificativa obrigatória para aprovar mesmo com conflito
                          <textarea
                            minLength={5}
                            value={conflictJustification}
                            onChange={event => setConflictJustification(event.target.value)}
                            placeholder="Explique por que os dois atendimentos realmente aconteceram no mesmo período."
                          />
                        </label>
                        <label className="review-confirmation">
                          <input
                            type="checkbox"
                            checked={confirmConflict}
                            onChange={event => setConfirmConflict(event.target.checked)}
                          />
                          <span>Confirmo que revisei a sobreposição e desejo aprovar mesmo com conflito.</span>
                        </label>
                      </div>
                    ) : null}

                    <label className="review-confirmation">
                      <input
                        type="checkbox"
                        checked={reviewed}
                        onChange={event => setReviewed(event.target.checked)}
                      />
                      <span>Revisei os dados e a evidência apresentada.</span>
                    </label>

                    <div className="retroactive-review-actions">
                      <button type="button" className="secondary-button" onClick={closeReview}>Voltar</button>
                      {reviewMode === 'approve' ? (
                        <button
                          type="button"
                          disabled={!reviewed || !conflictReady || props.actionLoading}
                          onClick={() => {
                            props.onApprove(item, {
                              confirmConflict: conflict ? confirmConflict : undefined,
                              conflictJustification: conflict ? conflictJustification.trim() : undefined
                            });
                            closeReview();
                          }}
                        >
                          Confirmar aprovação
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="danger-button"
                          disabled={!reviewed || rejectReason.trim().length < 3 || props.actionLoading}
                          onClick={() => {
                            props.onReject(item, rejectReason.trim());
                            closeReview();
                          }}
                        >
                          Confirmar rejeição
                        </button>
                      )}
                    </div>
                  </div>
                )
              ) : (
                <span className="status pending">
                  {ownRequest && props.role !== 'owner' ? 'Aguardando outro responsável' : 'Aguardando responsável'}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </CollapsibleAgendaSection>
  );
}
