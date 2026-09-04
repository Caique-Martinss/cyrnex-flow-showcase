import { Router } from 'express';
import { readDatabase } from '../../database/index.js';
import type { BusinessSettings } from '../../domain/types.js';
import { asyncRoute } from '../../middleware/asyncRoute.js';
import { usesSupabaseAuth } from '../auth/auth.provider.js';
import { loadProductionSettings } from './settings.repository.js';

const router = Router();

router.get('/', asyncRoute(async (request, response) => {
  if (usesSupabaseAuth()) {
    const settings = await loadProductionSettings(request.auth);
    response.json(sanitizeSettingsForRole(settings, request.auth.role));
    return;
  }
  const database = await readDatabase(request.auth.businessId);
  response.json(sanitizeSettingsForRole(database.settings, request.auth.role));
}));

function sanitizeSettingsForRole(
  settings: BusinessSettings,
  role: 'owner' | 'manager' | 'professional' | 'receptionist'
): BusinessSettings {
  if (role === 'owner' || role === 'manager') return settings;

  return {
    ...settings,
    paymentPreferences: {
      ...settings.paymentPreferences,
      pixKey: '',
      pixReceiverName: '',
      cardMachineName: ''
    },
    rules: settings.rules.map(item => ({
      ...item,
      config: {}
    }))
  };
}

export { router as settingsRouter };
