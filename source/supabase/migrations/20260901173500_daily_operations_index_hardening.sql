-- CYRNEX FLOW V11.7.2
-- Índice de suporte para a FK que identifica quem revisou um comprovante Pix.
-- Evita custo desnecessário em integridade/manutenção quando o histórico crescer.

create index if not exists appointment_payment_proofs_reviewed_by_idx
  on public.appointment_payment_proofs (reviewed_by);
