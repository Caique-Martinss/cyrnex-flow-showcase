import type { Dispatch, FormEvent, SetStateAction } from 'react';
import type { ModalName } from './navigation';
import type {
  AppointmentFormState,
  ClientFormState,
  CompletionFormState,
  ExpenseFormState,
  PastServiceFormState,
  ScheduleBlockFormState
} from '../domain/forms';
import type {
  Appointment,
  BusinessSettings,
  Client,
  MemberRole,
  Professional,
  PublicBookingResult,
  Service
} from '../domain/types';
import { AppointmentModal } from '../features/agenda/AppointmentModal';
import { CompletionModal } from '../features/agenda/CompletionModal';
import { PastServiceModal } from '../features/agenda/PastServiceModal';
import { RescheduleModal } from '../features/agenda/RescheduleModal';
import { ScheduleBlockModal } from '../features/agenda/ScheduleBlockModal';
import { PaymentConfirmationModal } from '../features/booking/PaymentConfirmationModal';
import { ClientModal } from '../features/clients/ClientModal';
import { ExpenseModal } from '../features/finance/ExpenseModal';

interface AppModalsProps {
  modal: ModalName;
  settings: BusinessSettings;
  clientForm: ClientFormState;
  setClientForm: Dispatch<SetStateAction<ClientFormState>>;
  appointmentForm: AppointmentFormState;
  setAppointmentForm: Dispatch<SetStateAction<AppointmentFormState>>;
  expenseForm: ExpenseFormState;
  setExpenseForm: Dispatch<SetStateAction<ExpenseFormState>>;
  scheduleBlockForm: ScheduleBlockFormState;
  setScheduleBlockForm: Dispatch<SetStateAction<ScheduleBlockFormState>>;
  pastServiceForm: PastServiceFormState;
  setPastServiceForm: Dispatch<SetStateAction<PastServiceFormState>>;
  completionForm: CompletionFormState;
  setCompletionForm: Dispatch<SetStateAction<CompletionFormState>>;
  clients: Client[];
  services: Service[];
  professionals: Professional[];
  selectedAdminService: Service | undefined;
  selectedAppointment: Appointment | null;
  role: MemberRole;
  actionLoading: boolean;
  editingClient: boolean;
  bookingResult: PublicBookingResult | null;
  paymentConfirmationOpen: boolean;
  onSubmitClient: (event: FormEvent<HTMLFormElement>) => void;
  onSubmitAppointment: (event: FormEvent<HTMLFormElement>) => void;
  onSubmitExpense: (event: FormEvent<HTMLFormElement>) => void;
  onSubmitScheduleBlock: (event: FormEvent<HTMLFormElement>) => void;
  onSubmitPastService: (event: FormEvent<HTMLFormElement>) => void;
  onSubmitReschedule: (date: string, scope?: 'this' | 'future' | 'all') => void;
  onSubmitCompletion: (event: FormEvent<HTMLFormElement>) => void;
  onCloseModal: () => void;
  onCloseCompletion: () => void;
  onClosePaymentConfirmation: () => void;
}

export function AppModals(props: AppModalsProps) {
  return (
    <>
      {props.modal === 'client' ? (
        <ClientModal
          form={props.clientForm}
          setForm={props.setClientForm}
          actionLoading={props.actionLoading}
          editing={props.editingClient}
          onSubmit={props.onSubmitClient}
          onClose={props.onCloseModal}
        />
      ) : null}

      {props.modal === 'appointment' ? (
        <AppointmentModal
          form={props.appointmentForm}
          setForm={props.setAppointmentForm}
          clients={props.clients}
          services={props.services}
          professionals={props.professionals}
          settings={props.settings}
          selectedService={props.selectedAdminService}
          actionLoading={props.actionLoading}
          onSubmit={props.onSubmitAppointment}
          onClose={props.onCloseModal}
        />
      ) : null}


      {props.modal === 'scheduleBlock' ? (
        <ScheduleBlockModal
          form={props.scheduleBlockForm}
          setForm={props.setScheduleBlockForm}
          settings={props.settings}
          professionals={props.professionals}
          actionLoading={props.actionLoading}
          onSubmit={props.onSubmitScheduleBlock}
          onClose={props.onCloseModal}
        />
      ) : null}

      {props.modal === 'pastService' ? (
        <PastServiceModal
          form={props.pastServiceForm}
          setForm={props.setPastServiceForm}
          clients={props.clients}
          services={props.services}
          professionals={props.professionals}
          settings={props.settings}
          role={props.role}
          actionLoading={props.actionLoading}
          onSubmit={props.onSubmitPastService}
          onClose={props.onCloseModal}
        />
      ) : null}

      {props.modal === 'reschedule' && props.selectedAppointment ? (
        <RescheduleModal
          appointment={props.selectedAppointment}
          service={props.services.find(
            service => service.id === props.selectedAppointment?.serviceId
          )}
          settings={props.settings}
          actionLoading={props.actionLoading}
          onSubmit={props.onSubmitReschedule}
          onClose={props.onCloseCompletion}
        />
      ) : null}

      {props.modal === 'expense' ? (
        <ExpenseModal
          form={props.expenseForm}
          settings={props.settings}
          setForm={props.setExpenseForm}
          actionLoading={props.actionLoading}
          onSubmit={props.onSubmitExpense}
          onClose={props.onCloseModal}
        />
      ) : null}

      {props.modal === 'complete' && props.selectedAppointment ? (
        <CompletionModal
          appointment={props.selectedAppointment}
          services={props.services}
          paymentMethods={props.settings.paymentMethods}
          form={props.completionForm}
          setForm={props.setCompletionForm}
          actionLoading={props.actionLoading}
          timeZone={props.settings.timezone}
          onSubmit={props.onSubmitCompletion}
          onClose={props.onCloseCompletion}
        />
      ) : null}

      {props.paymentConfirmationOpen && props.bookingResult ? (
        <PaymentConfirmationModal
          result={props.bookingResult}
          onClose={props.onClosePaymentConfirmation}
        />
      ) : null}
    </>
  );
}
