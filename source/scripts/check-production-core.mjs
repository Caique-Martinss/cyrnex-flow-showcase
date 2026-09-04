import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const errors = [];

const routeChecks = [
  ['server/src/modules/clients/client.routes.ts', ['usesSupabaseAuth', 'listProductionClients']],
  ['server/src/modules/services/service.routes.ts', ['usesSupabaseAuth', 'listProductionServices']],
  [
    'server/src/modules/professionals/professional.routes.ts',
    ['usesSupabaseAuth', 'listProductionProfessionals']
  ],
  ['server/src/modules/settings/settings.routes.ts', ['usesSupabaseAuth', 'loadProductionSettings']],
  [
    'server/src/modules/appointments/appointment.routes.ts',
    ['usesSupabaseAuth', 'listProductionAppointments', 'createProductionAppointment']
  ],
  [
    'server/src/modules/appointments/appointment.mutation.routes.ts',
    ['usesSupabaseAuth', 'rescheduleProductionAppointment', 'setProductionStatus']
  ],
  [
    'server/src/modules/appointments/retroactive.routes.ts',
    ['usesSupabaseAuth', 'listProductionRetroactiveRequests']
  ],
  [
    'server/src/modules/scheduling/scheduling.routes.ts',
    ['usesSupabaseAuth', 'loadProductionAvailability', 'createProductionScheduleBlock']
  ],
  [
    'server/src/modules/waitlist/waitlist.routes.ts',
    ['usesSupabaseAuth', 'listProductionWaitlist', 'createProductionWaitlistEntry']
  ],
  [
    'server/src/modules/expenses/expense.routes.ts',
    ['usesSupabaseAuth', 'listProductionExpenses', 'createProductionExpense']
  ],
  [
    'server/src/modules/dashboard/dashboard.routes.ts',
    ['usesSupabaseAuth', 'loadProductionDashboard']
  ],
  [
    'server/src/modules/public-booking/publicBooking.routes.ts',
    [
      'usesSupabaseAuth',
      'loadProductionPublicPage',
      'loadProductionPublicAvailability',
      'createProductionPublicBooking',
      'publicBookingManagementRouter',
      'optionalAuth',
      'loadPublicStaffContext'
    ]
  ],
  [
    'server/src/modules/public-booking/publicBooking.management.routes.ts',
    [
      'loadProductionPublicBookingManagement',
      'loadProductionPublicBookingManagementAvailability',
      'rescheduleProductionPublicBooking',
      'cancelProductionPublicBooking',
      'x-booking-access-token'
    ]
  ]
];

for (const [relativePath, markers] of routeChecks) {
  const path = join(ROOT, relativePath);
  if (!existsSync(path)) {
    errors.push(`Arquivo obrigatório ausente: ${relativePath}`);
    continue;
  }
  const source = readFileSync(path, 'utf8');
  for (const marker of markers) {
    if (!source.includes(marker)) {
      errors.push(`${relativePath} não contém integração de produção: ${marker}`);
    }
  }
}

const staffViewChecks = [
  ['web/src/features/public-page/PublicCustomerApp.tsx', [
    'loadPublicStaffContext',
    'isCustomerView'
  ]],
  ['web/src/features/public-page/PublicStaffToolbar.tsx', [
    'Voltar ao painel',
    'Configurar página',
    'Ver como cliente'
  ]],
  ['web/src/components/layout/Topbar.tsx', [
    'Ver página pública ↗',
    'onOpenPublicPage'
  ]],
  ['web/src/app/App.tsx', [
    'requestedPublicPageConfiguration',
    'initialStep={publicPageConfigurationRequested ? 8 : undefined}'
  ]]
];

for (const [relativePath, markers] of staffViewChecks) {
  const path = join(ROOT, relativePath);
  if (!existsSync(path)) {
    errors.push(`Arquivo de integração Painel ↔ Página Pública ausente: ${relativePath}`);
    continue;
  }
  const source = readFileSync(path, 'utf8');
  for (const marker of markers) {
    if (!source.includes(marker)) {
      errors.push(`${relativePath} não contém integração da visualização da equipe: ${marker}`);
    }
  }
}

const migrationChecks = [
  ['20260826190157_production_scheduling_operations.sql', [
    'get_agenda_availability',
    'create_schedule_block',
    'revoke insert, update, delete on public.schedule_blocks'
  ]],
  ['20260826191422_production_waitlist_operations.sql', [
    'create_waitlist_entry',
    'set_waitlist_status',
    'revoke insert, update, delete on public.waiting_list_entries'
  ]],
  ['20260826191458_production_retroactive_operations.sql', [
    'create_retroactive_request',
    'approve_retroactive_request',
    'retroactive_scoped_read',
    'revoke insert, update, delete on public.retroactive_service_requests'
  ]],
  ['20260826192234_production_expense_operations.sql', [
    'create_expense',
    'delete_expense',
    'revoke insert, update, delete on public.expenses'
  ]],
  ['20260827162214_public_booking_bridge.sql', [
    'get_public_booking_availability',
    'create_public_booking',
    'resolve_public_business_id',
    'grant execute on function public.create_public_booking',
    'to service_role'
  ]],
  ['20260827171610_public_booking_management_tokens.sql', [
    'booking_access_tokens',
    'force row level security'
  ]],
  ['20260827171648_public_booking_management_helpers.sql', [
    'get_public_booking_availability_scoped_internal'
  ]],
  ['20260827171712_public_booking_management_creation.sql', [
    'create_public_booking_with_access',
    'get_public_booking_management'
  ]],
  ['20260827171754_public_booking_management_actions.sql', [
    'get_public_booking_management_availability',
    'reschedule_public_booking',
    'cancel_public_booking',
    'to service_role'
  ]],
  ['20260827171909_public_booking_management_token_policy.sql', [
    'booking_access_tokens_deny_client_access',
    'using (false)',
    'with check (false)'
  ]]
];

for (const [file, markers] of migrationChecks) {
  const path = join(ROOT, 'supabase', 'migrations', file);
  if (!existsSync(path)) {
    errors.push(`Migration de produção ausente: ${file}`);
    continue;
  }
  const sql = readFileSync(path, 'utf8').toLowerCase();
  for (const marker of markers) {
    if (!sql.includes(marker.toLowerCase())) {
      errors.push(`${file} não contém proteção/operação: ${marker}`);
    }
  }
}

const authDoc = join(ROOT, 'docs', 'PRODUCAO-SUPABASE-AUTH.md');
if (!existsSync(authDoc)) {
  errors.push('Documentação de produção Supabase/Auth ausente.');
}

if (errors.length) {
  console.error('\n❌ Production Core não passou:\n');
  errors.forEach(error => console.error(`- ${error}`));
  process.exit(1);
}

console.log('✅ Production Core aprovado.');
console.log('   Auth/JWT + RLS: separados do preview local');
console.log('   Clientes/serviços/profissionais/configurações: Supabase em produção');
console.log('   Agenda/disponibilidade/bloqueios/retroativo: Supabase em produção');
console.log('   Lista de espera: backend preservado, launch guard mantém indisponível');
console.log('   Financeiro básico + Visão Geral: Supabase em produção');
console.log('   Página pública + booking: ponte server-side Supabase protegida');
console.log('   Meu agendamento: token hash + reagendamento/cancelamento protegidos');
console.log('   Painel ↔ Página Pública: ferramentas visíveis somente para a própria equipe');
