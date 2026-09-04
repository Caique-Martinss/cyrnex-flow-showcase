import type { Dispatch, FormEvent, SetStateAction } from 'react';
import { Modal } from '../../components/ui/Modal';
import type { ExpenseFormState } from '../../domain/forms';
import type { BusinessSettings } from '../../domain/types';
import { SmartCalendar } from '../agenda/SmartCalendar';

interface ExpenseModalProps {
  form: ExpenseFormState;
  setForm: Dispatch<SetStateAction<ExpenseFormState>>;
  settings: BusinessSettings;
  actionLoading: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onClose: () => void;
}

const expenseCategories = [
  'Materiais',
  'Contas',
  'Alimentação',
  'Manutenção',
  'Retirada',
  'Outros'
];

export function ExpenseModal({
  form,
  setForm,
  settings,
  actionLoading,
  onSubmit,
  onClose
}: ExpenseModalProps) {
  return (
    <Modal
      title="Registrar despesa"
      description="A saída será descontada do resultado líquido."
      onClose={onClose}
    >
      <form className="modal-form" onSubmit={onSubmit}>
        <label>
          Descrição
          <input
            required
            value={form.description}
            onChange={event => {
              setForm(current => ({
                ...current,
                description: event.target.value
              }));
            }}
            placeholder="Ex.: conta de luz"
          />
        </label>

        <div className="two-columns">
          <label>
            Categoria
            <select
              value={form.category}
              onChange={event => {
                setForm(current => ({
                  ...current,
                  category: event.target.value
                }));
              }}
            >
              {expenseCategories.map(category => (
                <option key={category}>{category}</option>
              ))}
            </select>
          </label>

          <label>
            Valor
            <input
              required
              min="0.01"
              step="0.01"
              type="number"
              value={form.amount}
              onChange={event => {
                setForm(current => ({
                  ...current,
                  amount: event.target.value
                }));
              }}
              placeholder="0,00"
            />
          </label>
        </div>

        <div className="expense-calendar-field">
          <span className="field-caption">Data</span>
          <SmartCalendar
            settings={settings}
            selectedDate={form.date}
            allowPast
            allowFuture={false}
            respectBusinessHours={false}
            onSelect={date => setForm(current => ({ ...current, date }))}
          />
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
            {actionLoading ? 'Salvando...' : 'Registrar despesa'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
