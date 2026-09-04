import type { BusinessSettings, PublicBookingResult } from '../../domain/types';

export function openAppointmentCalendar(result: PublicBookingResult, settings: BusinessSettings) {
  const { appointment } = result;
  const start = new Date(appointment.date);
  const end = new Date(start.getTime() + appointment.durationMinutes * 60_000);
  const location = businessAddress(settings);
  const managementUrl = appointmentManagementUrl(result, settings);
  const description = [
    `${appointment.serviceName} com ${appointment.professionalName}.`,
    `Agendamento #${appointment.id.slice(0, 8).toUpperCase()}.`,
    location ? `Local: ${location}.` : '',
    managementUrl ? `Gerenciar: ${managementUrl}` : ''
  ].filter(Boolean).join(' ');
  const calendar = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//CYRNEX FLOW//Booking//PT-BR',
    'BEGIN:VEVENT',
    `UID:${appointment.id}@cyrnex-flow`,
    `DTSTAMP:${icsDate(new Date())}`,
    `DTSTART:${icsDate(start)}`,
    `DTEND:${icsDate(end)}`,
    `SUMMARY:${icsEscape(`${settings.businessName} — ${appointment.serviceName}`)}`,
    `DESCRIPTION:${icsEscape(description)}`,
    `LOCATION:${icsEscape(location)}`,
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');
  const blob = new Blob([calendar], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `agendamento-${settings.bookingSlug || 'barbearia'}.ics`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

export function openAppointmentWhatsApp(result: PublicBookingResult, settings: BusinessSettings) {
  const phone = digits(settings.contact.whatsapp || settings.contact.phone);
  const start = new Date(result.appointment.date);
  const when = new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short'
  }).format(start);
  const message = encodeURIComponent(
    `Olá! Tenho um agendamento na ${settings.businessName}: ` +
      `${result.appointment.serviceName}, ${when}. ` +
      `Código ${result.appointment.id.slice(0, 8).toUpperCase()}.`
  );
  const href = phone ? `https://wa.me/${phone}?text=${message}` : `https://wa.me/?text=${message}`;
  window.open(href, '_blank', 'noopener,noreferrer');
}

export function openAppointmentRoute(settings: BusinessSettings) {
  const address = businessAddress(settings);
  if (!address) return;
  window.open(
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`,
    '_blank',
    'noopener,noreferrer'
  );
}


export function appointmentManagementPath(
  result: PublicBookingResult,
  settings: BusinessSettings
): string | null {
  const token = result.managementToken?.trim();
  const slug = settings.bookingSlug.trim();
  if (!token || !slug) return null;
  return `/b/${encodeURIComponent(slug)}/agendamento/${encodeURIComponent(token)}`;
}

export function appointmentManagementUrl(
  result: PublicBookingResult,
  settings: BusinessSettings
): string | null {
  const path = appointmentManagementPath(result, settings);
  return path ? `${window.location.origin}${path}` : null;
}

export function openPersistentAppointment(
  result: PublicBookingResult,
  settings: BusinessSettings
): boolean {
  const path = appointmentManagementPath(result, settings);
  if (!path) return false;
  window.location.assign(path);
  return true;
}

export function businessAddress(settings: BusinessSettings) {
  return [
    settings.contact.addressLine,
    settings.contact.city,
    settings.contact.state,
    settings.contact.postalCode
  ].filter(Boolean).join(', ');
}

function digits(value: string) {
  return value.replace(/\D/g, '');
}

function icsDate(value: Date) {
  return value.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

function icsEscape(value: string) {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}
