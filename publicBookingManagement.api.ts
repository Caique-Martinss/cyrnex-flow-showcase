export type AppointmentTimelineEventType =
  | 'created'
  | 'confirmed'
  | 'arrived'
  | 'started'
  | 'completed'
  | 'rescheduled'
  | 'cancelled'
  | 'missed'
  | 'fit_in_confirmed';

export interface AppointmentTimelineEvent {
  id: string;
  type: AppointmentTimelineEventType;
  at: string;
  actorUserId: string | null;
  actorName: string | null;
  note: string | null;
}

export type RecurrenceFrequency = 'weekly' | 'biweekly' | 'monthly' | 'custom';

export interface RecurrenceSeries {
  id: string;
  clientId: string;
  professionalId: string;
  serviceIds: string[];
  frequency: RecurrenceFrequency;
  intervalWeeks: number;
  weekdays: number[];
  startsAt: string;
  endsAt: string;
  paused: boolean;
  createdAt: string;
  createdByUserId: string | null;
}

export type WaitlistStatus = 'waiting' | 'contacted' | 'booked' | 'cancelled';

export interface WaitlistEntry {
  id: string;
  clientId: string;
  serviceId: string;
  professionalId: string | null;
  desiredFrom: string;
  desiredTo: string;
  notes: string | null;
  status: WaitlistStatus;
  createdAt: string;
}

export interface AgendaNavigationRequest {
  appointmentId: string;
  nonce: number;
}
