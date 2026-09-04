import { readFileSync } from 'node:fs';

const checks = [
  ['server/src/app.ts', '/api/platform-admin'],
  ['server/src/app.ts', 'requestTelemetry'],
  ['server/src/middleware/platformAdminAuth.ts', 'requirePlatformAdmin'],
  ['server/src/middleware/subscription.ts', 'subscription_blocked'],
  ['server/src/modules/platform-admin/platformAdmin.routes.ts', 'update_settings'],
  ['server/src/modules/platform-admin/platformAdmin.routes.ts', 'mark_past_due'],
  ['server/src/modules/platform-admin/platformAdmin.routes.ts', "'/observability/health'"],
  ['server/src/modules/platform-admin/platformAdmin.routes.ts', "'/observability/logs'"],
  ['server/src/modules/platform-admin/platformAdmin.routes.ts', "'/businesses/:businessId'"],
  ['server/src/modules/platform-admin/platformDeletion.service.ts', 'hardDeletePlatformBusiness'],
  ['server/src/modules/platform-admin/platformDeletion.service.ts', 'retryStorageCleanup'],
  ['server/src/modules/platform-admin/platformSystemLog.ts', 'writePlatformSystemLog'],
  ['server/src/middleware/requestTelemetry.ts', 'slow_request'],
  ['server/src/middleware/errorHandlers.ts', 'unhandled_error'],
  ['server/src/index.ts', 'process_failure'],
  ['web/src/features/platform-admin/PlatformAdminDashboard.tsx', 'Empresas & assinaturas'],
  ['web/src/features/platform-admin/PlatformAdminDashboard.tsx', 'PlatformAdminSidebar'],
  ['web/src/features/platform-admin/PlatformAdminSidebar.tsx', 'Saúde do sistema'],
  ['web/src/features/platform-admin/PlatformSystemHealthPanel.tsx', 'Saúde do sistema'],
  ['web/src/features/platform-admin/PlatformSystemLogsPanel.tsx', 'Logs do sistema'],
  ['web/src/features/platform-admin/PlatformSystemLogsPanel.tsx', 'O QUE ISSO SIGNIFICA'],
  ['web/src/features/platform-admin/PlatformSystemLogsPanel.tsx', 'ONDE INVESTIGAR / ARRUMAR'],
  ['web/src/features/platform-admin/platformLogDiagnostics.ts', 'diagnoseLog'],
  ['web/src/features/platform-admin/platformLogDiagnostics.ts', 'resolvedWhen'],
  ['web/src/features/platform-admin/PlatformSystemHealthPanel.tsx', 'COMO LER ESTA TELA'],
  ['web/src/features/platform-admin/PlatformAuditPanel.tsx', 'Auditoria da plataforma'],
  ['web/src/features/platform-admin/PlatformDeleteBusinessDialog.tsx', 'EXCLUIR'],
  ['web/src/features/platform-admin/PlatformSubscriptionControls.tsx', 'Excluir definitivamente'],
  ['web/src/features/platform-admin/PlatformDangerDialogs.tsx', 'ActionDialog'],
  ['web/src/features/platform-admin/PlatformBusinessDetailsPanel.tsx', 'platform-business-drawer-backdrop'],
  ['web/src/components/ui/ActionDialog.tsx', 'role="alertdialog"'],
  ['web/src/styles/platform-admin.css', '.platform-admin-sidebar'],
  ['web/src/styles/platform-admin.css', '.platform-admin-hard-delete-zone'],
  ['web/src/styles/platform-admin.css', '.platform-system-log-list'],
  ['PREVIEW-CYRNEX-ADMIN.html', 'ZONA IRREVERSÍVEL'],
  ['PREVIEW-CYRNEX-ADMIN.html', 'Logs do sistema'],
  ['supabase/migrations/20260901110000_cyrnex_platform_admin_subscriptions.sql', 'platform_admins'],
  ['supabase/migrations/20260901110000_cyrnex_platform_admin_subscriptions.sql', 'business_subscriptions'],
  ['supabase/migrations/20260901122000_cyrnex_platform_observability_and_deletion.sql', 'platform_system_logs'],
  ['supabase/migrations/20260901122000_cyrnex_platform_observability_and_deletion.sql', 'platform_deletion_receipts'],
  ['supabase/migrations/20260901122000_cyrnex_platform_observability_and_deletion.sql', 'platform_hard_delete_business'],
  ['scripts/grant-platform-admin.mjs', 'CYRNEX_ADMIN_USERNAME'],
  ['scripts/grant-platform-admin.mjs', 'CYRNEX_ADMIN_EMAIL'],
  ['docs/CYRNEX-ADMIN-LOGIN-SEGURO.md', 'não possui uma senha paralela']
];

const errors = [];
for (const [file, expected] of checks) {
  const text = readFileSync(file, 'utf8');
  if (!text.includes(expected)) errors.push(`${file}: ausente ${expected}`);
}

const controls = readFileSync('web/src/features/platform-admin/PlatformSubscriptionControls.tsx', 'utf8');
const dialogs = readFileSync('web/src/features/platform-admin/PlatformDeleteBusinessDialog.tsx', 'utf8');
if (/window\.(alert|confirm)/.test(controls + dialogs)) {
  errors.push('O CYRNEX Admin não pode usar alert/confirm nativos do navegador.');
}
if (!dialogs.includes('confirmationMatches') || !dialogs.includes('EXCLUIR')) {
  errors.push('Exclusão definitiva precisa de confirmação digitada forte.');
}

const migration = readFileSync(
  'supabase/migrations/20260901122000_cyrnex_platform_observability_and_deletion.sql',
  'utf8'
);
if (!/revoke all on function public\.platform_hard_delete_business/i.test(migration)) {
  errors.push('RPC de exclusão precisa estar revogada para usuários comuns.');
}
if (!/grant execute on function public\.platform_hard_delete_business[\s\S]*to service_role/i.test(migration)) {
  errors.push('RPC de exclusão deve ser backend/service_role only.');
}
if (!/on delete set null/i.test(migration)) {
  errors.push('Logs da plataforma precisam sobreviver à exclusão do tenant sem manter FK inválida.');
}

const grantScript = readFileSync('scripts/grant-platform-admin.mjs', 'utf8');
if (/ADMIN_PASSWORD|password\s*[:=]\s*process\.env/i.test(grantScript)) {
  errors.push('O bootstrap do Admin não deve armazenar ou exigir senha administrativa em variável própria.');
}

if (errors.length) {
  console.error('❌ CYRNEX Admin não passou nos checks:');
  errors.forEach(error => console.error(`- ${error}`));
  process.exit(1);
}
console.log('✅ CYRNEX Admin / observabilidade / exclusão controlada aprovado.');
