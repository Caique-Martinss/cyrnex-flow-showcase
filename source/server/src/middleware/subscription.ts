import type { NextFunction, Request, Response } from 'express';
import {
  loadBusinessSubscription,
  loadBusinessSubscriptionBySlug
} from '../modules/subscription/subscription.repository.js';

export function requireActiveBusinessSubscription(
  request: Request,
  response: Response,
  next: NextFunction
): void {
  void loadBusinessSubscription(request.auth.businessId)
    .then(subscription => {
      if (subscription.allowed) {
        next();
        return;
      }
      response.status(402).json(blockedPayload(subscription));
    })
    .catch(next);
}

export function requirePublicBookingSubscription(
  request: Request,
  response: Response,
  next: NextFunction
): void {
  const slug = String(request.method === 'POST' ? request.body?.slug ?? '' : request.query.slug ?? '')
    .trim();
  if (!slug) {
    next();
    return;
  }

  void loadBusinessSubscriptionBySlug(slug)
    .then(subscription => {
      if (!subscription || subscription.allowed) {
        next();
        return;
      }
      response.status(423).json({
        error: 'Os agendamentos online desta empresa estão temporariamente indisponíveis.',
        code: 'public_booking_unavailable'
      });
    })
    .catch(next);
}

function blockedPayload(subscription: Awaited<ReturnType<typeof loadBusinessSubscription>>) {
  const message = subscription.status === 'cancelled'
    ? 'A assinatura desta empresa foi cancelada.'
    : subscription.effectiveStatus === 'trial_expired'
      ? 'O período de teste desta empresa terminou.'
      : 'A assinatura desta empresa está suspensa ou possui uma pendência vencida.';

  return {
    error: message,
    code: 'subscription_blocked',
    subscription
  };
}
