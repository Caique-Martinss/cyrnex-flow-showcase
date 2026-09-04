import type { Client, Database } from '../../domain/types.js';
import { roundMoney } from '../../utils/money.js';

export function buildDashboard(
  database: Pick<Database, 'appointments' | 'clients' | 'expenses'>
) {
  const completed = database.appointments.filter(
    appointment => appointment.status === 'completed'
  );
  const scheduled = database.appointments.filter(appointment => (
    ['scheduled', 'confirmed', 'arrived', 'in_service'].includes(appointment.status) &&
    !appointment.recurrencePaused
  ));

  const grossRevenue = roundMoney(
    completed.reduce((sum, appointment) => sum + appointment.price, 0)
  );
  const cardFees = roundMoney(
    completed.reduce((sum, appointment) => sum + appointment.cardFee, 0)
  );
  const commissions = roundMoney(
    completed.reduce(
      (sum, appointment) => sum + appointment.commissionAmount,
      0
    )
  );
  const expenses = roundMoney(
    database.expenses.reduce((sum, expense) => sum + expense.amount, 0)
  );
  const netRevenue = roundMoney(
    grossRevenue - cardFees - commissions - expenses
  );
  const scheduledRevenue = roundMoney(
    scheduled.reduce((sum, appointment) => sum + appointment.price, 0)
  );
  const receivedDeposits = roundMoney(
    database.appointments
      .filter(appointment => appointment.depositStatus === 'paid')
      .reduce((sum, appointment) => sum + appointment.depositAmount, 0)
  );

  const activeCutoff = Date.now() - 90 * 24 * 60 * 60 * 1000;
  const activeClients = database.clients.filter(
    client => client.lastVisit && new Date(client.lastVisit).getTime() >= activeCutoff
  ).length;

  const missingCustomers = database.clients.filter(client => {
    if (!client.lastVisit) return true;

    const daysSinceLastVisit =
      (Date.now() - new Date(client.lastVisit).getTime()) / 86_400_000;

    return daysSinceLastVisit > 45;
  }).length;

  const bestClient = database.clients.reduce<Client | null>(
    (best, client) => (
      !best || client.totalSpend > best.totalSpend ? client : best
    ),
    null
  );

  const now = Date.now();
  const upcomingAppointments = scheduled.filter(
    appointment => new Date(appointment.date).getTime() >= now
  ).length;
  const absences = database.appointments.filter(
    appointment => appointment.status === 'missed'
  ).length;
  const cancellations = database.appointments.filter(
    appointment => appointment.status === 'cancelled'
  ).length;
  const lostRate = database.appointments.length
    ? Math.round(
        ((absences + cancellations) / database.appointments.length) * 100
      )
    : 0;

  return {
    grossRevenue,
    cardFees,
    commissions,
    expenses,
    netRevenue,
    scheduledRevenue,
    receivedDeposits,
    activeClients,
    totalClients: database.clients.length,
    bestClient,
    missingCustomers,
    upcomingAppointments,
    topService: getMostFrequent(completed, 'serviceName'),
    topProfessional: getMostFrequent(completed, 'professionalName'),
    lostRate
  };
}

function getMostFrequent(
  appointments: Database['appointments'],
  key: 'serviceName' | 'professionalName'
): string {
  const counts = new Map<string, number>();

  appointments.forEach(appointment => {
    counts.set(
      appointment[key],
      (counts.get(appointment[key]) ?? 0) + 1
    );
  });

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'Sem dados';
}
