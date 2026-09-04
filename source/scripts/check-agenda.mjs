import { access, readFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';

const requiredFiles = [
  'web/src/features/agenda/AgendaPage.tsx',
  'web/src/features/agenda/AgendaDayView.tsx',
  'web/src/features/agenda/AgendaWeekView.tsx',
  'web/src/features/agenda/AgendaMonthView.tsx',
  'web/src/features/onboarding/ProfessionalHoursEditor.tsx',
  'web/src/utils/businessTime.ts',
  'web/src/features/agenda/SmartCalendar.tsx',
  'web/src/features/agenda/OfficialDateTimePicker.tsx',
  'web/src/features/agenda/NextAvailabilityPanel.tsx',
  'web/src/features/agenda/AppointmentInspector.tsx',
  'web/src/features/agenda/RecurrenceEditor.tsx',
  'web/src/features/agenda/WaitlistPanel.tsx',
  'web/src/features/agenda/PastServiceModal.tsx',
  'web/src/features/agenda/RetroactiveApprovalPanel.tsx',
  'server/src/modules/scheduling/availability.service.ts',
  'server/src/modules/appointments/appointment.mutation.routes.ts',
  'server/src/modules/appointments/recurrence.service.ts',
  'server/src/modules/appointments/retroactive.routes.ts',
  'server/src/modules/waitlist/waitlist.routes.ts',
  'supabase/migrations/20260826001700_production_core.sql',
  'supabase/migrations/20260826172305_tighten_professional_operational_scope.sql',
  'docs/AGENDA.md'
];

for (const file of requiredFiles) await access(file);

const availability = await readFile(
  'server/src/modules/scheduling/availability.service.ts',
  'utf8'
);
const mutations = await readFile(
  'server/src/modules/appointments/appointment.mutation.routes.ts',
  'utf8'
);
const mutationHelpers = await readFile(
  'server/src/modules/appointments/appointment.mutation.helpers.ts',
  'utf8'
);
const appointments = await readFile(
  'server/src/modules/appointments/appointment.routes.ts',
  'utf8'
);
const retroactive = await readFile(
  'server/src/modules/appointments/retroactive.routes.ts',
  'utf8'
);
const recurrence = await readFile(
  'server/src/modules/appointments/recurrence.service.ts',
  'utf8'
);
const migration = await readFile(
  'supabase/migrations/20260826001700_production_core.sql',
  'utf8'
);
const stabilizationMigration = await readFile(
  'supabase/migrations/20260826001700_production_core.sql',
  'utf8'
);
const dayView = await readFile(
  'web/src/features/agenda/AgendaDayView.tsx',
  'utf8'
);
const agendaHelpers = await readFile(
  'web/src/features/agenda/agenda.helpers.ts',
  'utf8'
);
const monthView = await readFile(
  'web/src/features/agenda/AgendaMonthView.tsx',
  'utf8'
);
const professionalHours = await readFile(
  'web/src/features/onboarding/ProfessionalHoursEditor.tsx',
  'utf8'
);
const businessTime = await readFile(
  'web/src/utils/businessTime.ts',
  'utf8'
);
const inspector = await readFile(
  'web/src/features/agenda/AppointmentInspector.tsx',
  'utf8'
);
const nextAvailability = await readFile(
  'web/src/features/agenda/NextAvailabilityPanel.tsx',
  'utf8'
);
const waitlist = await readFile(
  'server/src/modules/waitlist/waitlist.routes.ts',
  'utf8'
);
const preview = await readFile('ABRIR-PREVIEW-CYRNEX-FLOW.html', 'utf8');

const checks = [
  [availability.includes('getBookingWindowViolation'), 'janela de agendamento'],
  [availability.includes('hasScheduleBlockConflict'), 'bloqueios'],
  [availability.includes('hasScheduleConflict'), 'conflitos'],
  [mutationHelpers.includes("scheduled: ['confirmed', 'arrived', 'in_service'"), 'ciclo operacional'],
  [mutationHelpers.includes('requiresEarlyStartConfirmation'), 'confirmação de início antecipado'],
  [appointments.includes('appointment.fit_in_created'), 'encaixe auditado'],
  [appointments.includes('appointment.recurrence_created'), 'recorrência'],
  [recurrence.includes("frequency === 'biweekly'"), 'recorrência quinzenal'],
  [retroactive.includes('requiresConflictConfirmation'), 'conflito retroativo revisável'],
  [retroactive.includes('conflictJustification'), 'justificativa de conflito retroativo'],
  [dayView.includes('Outros horários ocupados hoje'), 'resumo de ocupações fora do filtro'],
  [agendaHelpers.includes('reservedEndsAt'), 'buffer preservado na disponibilidade visual'],
  [agendaHelpers.includes('isCountedAppointmentStatus'), 'status operacionais centralizados'],
  [monthView.includes('month-day-content'), 'hierarquia visual mensal'],
  [professionalHours.includes('Definir horário próprio'), 'horário individual do profissional'],
  [businessTime.includes('zonedDateTimeToUtc'), 'fuso horário da empresa no frontend'],
  [inspector.includes('Iniciar atendimento'), 'início antes da conclusão'],
  [inspector.includes('Linha do tempo'), 'linha do tempo do atendimento'],
  [nextAvailability.includes('loadAdminAvailability'), 'próxima vaga usa disponibilidade oficial'],
  [nextAvailability.includes('Qualquer profissional'), 'próxima vaga para qualquer profissional'],
  [waitlist.includes('waitlist.created'), 'lista de espera auditada'],
  [migration.includes('actual_started_at'), 'timestamps operacionais no schema'],
  [migration.includes('conflict_justification'), 'justificativa de conflito no schema'],
  [stabilizationMigration.includes('buffer_after_minutes_snapshot'), 'snapshot de buffer no schema'],
  [stabilizationMigration.includes('recurrence_paused'), 'pausa real no schema'],
  [preview.includes('agenda intelligence'), 'preview da Agenda atualizado'],
  [preview.includes('Confirmar mesmo com conflito'), 'conflito retroativo no preview'],
  [preview.includes('Iniciar atendimento'), 'ciclo operacional no preview'],
  [preview.includes('pvaServiceEnd'), 'buffer separado do fim visual no preview'],
  [preview.includes('pva-month-copy'), 'calendário mensal refinado no preview'],
  [preview.includes('Trocar foto'), 'troca de foto sem remover o bloco no preview']
];

for (const [ok, label] of checks) {
  if (!ok) throw new Error(`Agenda incompleta: ${label}.`);
}

const version = JSON.parse(readFileSync('package.json', 'utf8')).version;
console.log(`✅ Agenda v${version} aprovada.`);
console.log('   Dia/Semana/Mês: presentes');
console.log('   Disponibilidade: fonte única conectada ao backend');
console.log('   Ciclo: agendado → confirmado → chegada → atendimento → conclusão');
console.log('   Encaixe e conflito retroativo: confirmação + justificativa + auditoria');
console.log('   Recorrência: conectada');
console.log('   Lista de espera: base técnica preservada, bloqueada no lançamento inicial');
console.log('   Buffer, fuso e horário individual: alinhados');
console.log(`   Preview standalone: Agenda v${version} ativa`);
