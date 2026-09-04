import { Router } from 'express';
import { asyncRoute } from '../../middleware/asyncRoute.js';
import {
  getPlatformBusinessDetails,
  listPlatformBusinesses,
  updatePlatformSubscription
} from './platformAdmin.repository.js';
import { hardDeletePlatformBusiness } from './platformDeletion.service.js';
import {
  getPlatformSystemHealth,
  listPlatformAuditLogs,
  listPlatformSystemLogs
} from './platformObservability.repository.js';
import type { SubscriptionAdminAction } from './platformAdmin.types.js';

export const platformAdminRouter = Router();

platformAdminRouter.get('/overview', asyncRoute(async (request, response) => {
  const businesses = await listPlatformBusinesses(String(request.query.search ?? ''));
  const statusCounts = {
    trial: 0,
    active: 0,
    past_due: 0,
    suspended: 0,
    cancelled: 0
  };
  businesses.forEach(item => {
    statusCounts[item.subscription.status] += 1;
  });
  response.json({
    totalBusinesses: businesses.length,
    statusCounts,
    businesses
  });
}));

platformAdminRouter.get('/businesses/:businessId', asyncRoute(async (request, response) => {
  response.json(await getPlatformBusinessDetails(request.params.businessId));
}));

platformAdminRouter.patch(
  '/businesses/:businessId/subscription',
  asyncRoute(async (request, response) => {
    const action = String(request.body.action ?? '') as SubscriptionAdminAction;
    const validActions = new Set<SubscriptionAdminAction>([
      'update_settings',
      'start_trial',
      'activate',
      'mark_past_due',
      'suspend',
      'cancel'
    ]);
    if (!validActions.has(action)) {
      response.status(400).json({ error: 'Ação de assinatura inválida.' });
      return;
    }
    const admin = request.platformAdmin!;
    if (admin.role !== 'super_admin') {
      response.status(403).json({ error: 'Somente super_admin pode alterar assinaturas.' });
      return;
    }
    response.json(await updatePlatformSubscription({
      actorUserId: admin.userId,
      businessId: request.params.businessId,
      action,
      reason: String(request.body.reason ?? ''),
      planCode: String(request.body.planCode ?? ''),
      trialDays: Number(request.body.trialDays ?? 14),
      graceDays: Number(request.body.graceDays ?? 5),
      retentionDays: Number(request.body.retentionDays ?? 60),
      currentPeriodEnd: request.body.currentPeriodEnd
        ? String(request.body.currentPeriodEnd)
        : null
    }));
  })
);

platformAdminRouter.delete(
  '/businesses/:businessId',
  asyncRoute(async (request, response) => {
    const admin = request.platformAdmin!;
    if (admin.role !== 'super_admin') {
      response.status(403).json({ error: 'Somente super_admin pode excluir uma empresa definitivamente.' });
      return;
    }
    const receipt = await hardDeletePlatformBusiness({
      actorUserId: admin.userId,
      businessId: request.params.businessId,
      reason: String(request.body.reason ?? ''),
      confirmation: String(request.body.confirmation ?? '')
    });
    response.json(receipt);
  })
);

platformAdminRouter.get('/observability/health', asyncRoute(async (_request, response) => {
  response.json(await getPlatformSystemHealth());
}));

platformAdminRouter.get('/observability/logs', asyncRoute(async (request, response) => {
  response.json(await listPlatformSystemLogs({
    severity: String(request.query.severity ?? ''),
    category: String(request.query.category ?? ''),
    source: String(request.query.source ?? ''),
    search: String(request.query.search ?? ''),
    limit: Number(request.query.limit ?? 120)
  }));
}));

platformAdminRouter.get('/audit', asyncRoute(async (request, response) => {
  response.json(await listPlatformAuditLogs({
    search: String(request.query.search ?? ''),
    limit: Number(request.query.limit ?? 100)
  }));
}));
