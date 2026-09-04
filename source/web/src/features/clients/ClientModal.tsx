import type { Dispatch, FormEvent, SetStateAction } from 'react';
import { Modal } from '../../components/ui/Modal';
import type { ClientFormState } from '../../domain/forms';

interface ClientModalProps {
  form: ClientFormState;
  setForm: Dispatch<SetStateAction<ClientFormState>>;
  actionLoading: boolean;
  editing?: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onClose: () => void;
}

export function ClientModal({
  form,
  setForm,
  actionLoading,
  editing = false,
  onSubmit,
  onClose
}: ClientModalProps) {
  return (
    <Modal
      title={editing ? "Editar cliente" : "Cadastrar cliente"}
      description={editing
        ? 'Atualize os dados de contato sem perder o histórico do cliente.'
        : 'Use para clientes presenciais. No link público, o cadastro é automático.'}
      onClose={onClose}
    >
      <form className="modal-form" onSubmit={onSubmit}>
        <label>
          Nome
          <input
            required
            value={form.name}
            onChange={event => {
              setForm(current => ({
                ...current,
                name: event.target.value
              }));
            }}
            placeholder="Nome do cliente"
          />
        </label>

        <div className="two-columns">
          <label>
            WhatsApp
            <input
              required
              value={form.phone}
              onChange={event => {
                setForm(current => ({
                  ...current,
                  phone: event.target.value
                }));
              }}
              placeholder="(11) 99999-9999"
            />
          </label>

          <label>
            E-mail
            <input
              type="email"
              value={form.email}
              onChange={event => {
                setForm(current => ({
                  ...current,
                  email: event.target.value
                }));
              }}
              placeholder="Opcional"
            />
          </label>
        </div>

        <div className="modal-actions">
          <button
            className="secondary-button"
            type="button"
            onClick={onClose}
          >
            Cancelar
          </button>
          <button disabled={actionLoading}>
            {actionLoading ? 'Salvando...' : editing ? 'Salvar alterações' : 'Cadastrar'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
