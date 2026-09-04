import cors, { type CorsOptions } from 'cors';
import express from 'express';
import { requireAuth } from './middleware/auth.js';
import { serializeAuthMutations, serializeBusinessMutations } from './middleware/businessLock.js';
import { requirePlatformAdmin } from './middleware/platformAdminAuth.js';
import { requireActiveBusinessSubscription } from './middleware/subscription.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandlers.js';
import { requestTelemetry } from './middleware/requestTelemetry.js';
import { createRateLimiter } from './middleware/rateLimit.js';
import { securityHeaders } from './middleware/securityHeaders.js';
import { appointmentRouter } from './modules/appointments/appointment.routes.js';
import { retroactiveRouter } from './modules/appointments/retroactive.routes.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { clientRouter } from './modules/clients/client.routes.js';
import { dashboardRouter } from './modules/dashboard/dashboard.routes.js';
import { expenseRouter } from './modules/expenses/expense.routes.js';
import { messageRouter } from './modules/messages/message.routes.js';
import { onboardingRouter } from './modules/onboarding/onboarding.routes.js';
import { platformAdminAuthRouter } from './modules/platform-admin/platformAdmin.auth.routes.js';
import { platformAdminRouter } from './modules/platform-admin/platformAdmin.routes.js';
import { professionalRouter } from './modules/professionals/professional.routes.js';
import { publicBookingRouter } from './modules/public-booking/publicBooking.routes.js';
import { publicBookingPaymentProofRouter } from './modules/public-booking/publicBooking.paymentProof.routes.js';
import { serviceRouter } from './modules/services/service.routes.js';
import { checkRuntimeReadiness } from './modules/health/runtimeHealth.js';
import { schedulingRouter } from './modules/scheduling/scheduling.routes.js';
import { settingsRouter } from './modules/settings/settings.routes.js';
import { waitlistRouter } from './modules/waitlist/waitlist.routes.js';
import { subscriptionRouter } from './modules/subscription/subscription.routes.js';

const app = express();

app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(securityHeaders);
app.use(requestTelemetry);
app.use(cors(buildCorsOptions()));

app.get('/api/health', (_request, response) => {
  response.json({
    status: 'ok',
    service: 'cyrnex-flow-api',
    release: (process.env.CYRNEX_RELEASE ?? 'development').trim() || 'development',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/ready', async (_request, response) => {
  const readiness = await checkRuntimeReadiness();
  response.status(readiness.status === 'ready' ? 200 : 503).json(readiness);
});

const authLimiter = createRateLimiter({
  windowMs: 15 * 60_000,
  max: 60,
  message: 'Muitas tentativas de autenticação. Aguarde alguns minutos e tente novamente.'
});
const publicLimiter = createRateLimiter({
  windowMs: 60_000,
  max: 120,
  message: 'Muitas solicitações em pouco tempo. Aguarde um momento e tente novamente.'
});

app.use(
  '/api/platform-admin/auth',
  authLimiter,
  express.json({ limit: '64kb' }),
  platformAdminAuthRouter
);
app.use(
  '/api/platform-admin',
  express.json({ limit: '256kb' }),
  requirePlatformAdmin,
  platformAdminRouter
);
app.use('/api/auth', authLimiter, serializeAuthMutations, express.json({ limit: '64kb' }), authRouter);
app.use(
  '/api/public/bookings/manage/payment-proof',
  publicLimiter,
  express.json({ limit: '7mb' }),
  publicBookingPaymentProofRouter
);
app.use('/api/public', publicLimiter, express.json({ limit: '64kb' }), publicBookingRouter);

// A área privada precisa aceitar o onboarding com imagens de demonstração,
// mas não deixa mais toda a API aceitar payloads de 32 MB indiscriminadamente.
app.use('/api', express.json({ limit: '6mb' }), requireAuth, serializeBusinessMutations);
app.use('/api/subscription', subscriptionRouter);
app.use('/api', requireActiveBusinessSubscription);
app.use('/api/settings', settingsRouter);
app.use('/api/onboarding', onboardingRouter);
app.use('/api/services', serviceRouter);
app.use('/api/professionals', professionalRouter);
app.use('/api/clients', clientRouter);
app.use('/api/appointments', appointmentRouter);
app.use('/api/retroactive-services', retroactiveRouter);
app.use('/api/scheduling', schedulingRouter);
app.use('/api/expenses', expenseRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/messages', messageRouter);
app.use('/api/waitlist', waitlistRouter);

app.use(notFoundHandler);
app.use(errorHandler);

function buildCorsOptions(): CorsOptions {
  const configured = (process.env.CORS_ORIGIN ?? '')
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);
  const allowed = new Set(configured);
  const developmentOpen = process.env.NODE_ENV !== 'production' && allowed.size === 0;

  return {
    credentials: true,
    origin(origin, callback) {
      // Requisições server-to-server e same-origin podem não enviar Origin.
      if (!origin || developmentOpen || allowed.has(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error('Origem não autorizada pelo CORS.'));
    }
  };
}

export default app;
