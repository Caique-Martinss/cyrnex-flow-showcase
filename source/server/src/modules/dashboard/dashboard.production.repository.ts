import type { AuthContext } from '../auth/auth.types.js';
import { listProductionAppointments } from '../appointments/appointment.production.repository.js';
import { listProductionClients } from '../clients/client.repository.js';
import { listProductionExpenses } from '../expenses/expense.production.repository.js';
import { buildDashboard } from './dashboard.service.js';

export async function loadProductionDashboard(auth: AuthContext) {
  const [appointments, clients, expenses] = await Promise.all([
    listProductionAppointments(auth),
    listProductionClients(auth),
    listProductionExpenses(auth)
  ]);
  return buildDashboard({ appointments, clients, expenses });
}
