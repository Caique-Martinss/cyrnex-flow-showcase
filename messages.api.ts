import type {
  PaymentMethod,
  RetroactiveProofType,
  ScheduleBlockType
} from './types';

export interface ClientFormState {
  name: string;
  phone: string;
  email: string;
}

export interface AppointmentFormState {
  clientId: string;
  serviceId: string;
  professionalId: string;
  date: string;
  notes: string;
  mode: 'normal' | 'fit_in';
  conflictConfirmed: boolean;
  fitInReason: string;
  recurrenceEnabled: boolean;
  recurrenceFrequency: 'weekly' | 'biweekly' | 'monthly' | 'custom';
  recurrenceCount: string;
  recurrenceIntervalWeeks: string;
  recurrenceWeekdays: number[];
  recurrenceServiceIds: string[];
}

export interface ExpenseFormState {
  description: string;
  category: string;
  amount: string;
  date: string;
}

export interface CompletionFormState {
  serviceId: string;
  price: string;
  paymentMethod: PaymentMethod;
  cardFee: string;
  notes: string;
}


export interface ScheduleBlockFormState {
  professionalId: string;
  startsAt: string;
  endsAt: string;
  blockType: ScheduleBlockType;
  reason: string;
}

export interface PastServiceFormState {
  clientId: string;
  serviceId: string;
  professionalId: string;
  startsAt: string;
  price: string;
  paymentMethod: PaymentMethod;
  notes: string;
  reason: string;
  proofType: RetroactiveProofType;
  proofReference: string;
  proofDescription: string;
}

export interface BookingFormState {
  name: string;
  phone: string;
  email: string;
  serviceId: string;
  professionalId: string;
  date: string;
  notes: string;
}

export const createEmptyClientForm = (): ClientFormState => ({
  name: '',
  phone: '',
  email: ''
});

export const createEmptyAppointmentForm = (): AppointmentFormState => ({
  clientId: '',
  serviceId: '',
  professionalId: '',
  date: '',
  notes: '',
  mode: 'normal',
  conflictConfirmed: false,
  fitInReason: '',
  recurrenceEnabled: false,
  recurrenceFrequency: 'weekly',
  recurrenceCount: '8',
  recurrenceIntervalWeeks: '1',
  recurrenceWeekdays: [],
  recurrenceServiceIds: []
});

export const createEmptyExpenseForm = (): ExpenseFormState => ({
  description: '',
  category: 'Materiais',
  amount: '',
  date: new Date().toISOString().slice(0, 10)
});

export const createEmptyCompletionForm = (): CompletionFormState => ({
  serviceId: '',
  price: '',
  paymentMethod: 'pix',
  cardFee: '0',
  notes: ''
});

export const createEmptyBookingForm = (): BookingFormState => ({
  name: '',
  phone: '',
  email: '',
  serviceId: '',
  professionalId: '',
  date: '',
  notes: ''
});


export const createEmptyScheduleBlockForm = (): ScheduleBlockFormState => ({
  professionalId: '',
  startsAt: '',
  endsAt: '',
  blockType: 'personal',
  reason: ''
});

export const createEmptyPastServiceForm = (): PastServiceFormState => ({
  clientId: '',
  serviceId: '',
  professionalId: '',
  startsAt: '',
  price: '',
  paymentMethod: 'pix',
  notes: '',
  reason: '',
  proofType: 'payment_record',
  proofReference: '',
  proofDescription: ''
});
