import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import { readDatabase, saveDatabase } from '../../database/index.js';
import type { Expense } from '../../domain/types.js';
import { asyncRoute } from '../../middleware/asyncRoute.js';
import { requireFinancialAccess } from '../../middleware/authorization.js';
import { normalizeMoney, normalizeText } from '../../utils/normalizers.js';
import { appendAuditEvent } from '../audit/audit.service.js';
import { usesSupabaseAuth } from '../auth/auth.provider.js';
import { isProductionAgendaError } from '../appointments/appointment.production.errors.js';
import {
  createProductionExpense,
  deleteProductionExpense,
  listProductionExpenses
} from './expense.production.repository.js';

const router = Router();
router.use(requireFinancialAccess);

router.get('/', asyncRoute(async (request, response) => {
  if (usesSupabaseAuth()) {
    response.json(await listProductionExpenses(request.auth));
    return;
  }

  const database = await readDatabase(request.auth.businessId);
  const expenses = [...database.expenses].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  response.json(expenses);
}));

router.post('/', asyncRoute(async (request, response) => {
  const description = normalizeText(request.body.description);
  const category = normalizeText(request.body.category);
  const amount = normalizeMoney(request.body.amount);
  const parsedDate = new Date(normalizeText(request.body.date));

  if (
    description.length < 2 ||
    category.length < 2 ||
    Number.isNaN(amount) ||
    amount <= 0 ||
    Number.isNaN(parsedDate.getTime())
  ) {
    response.status(400).json({
      error: 'Preencha descrição, categoria, valor positivo e data corretamente.'
    });
    return;
  }

  if (usesSupabaseAuth()) {
    try {
      const expense = await createProductionExpense(request.auth, {
        description, category, amount, date: parsedDate
      });
      if (!expense) {
        response.status(500).json({ error: 'A despesa foi criada, mas não pôde ser recarregada.' });
        return;
      }
      response.status(201).json(expense);
    } catch (error) {
      sendExpenseProductionError(response, error);
    }
    return;
  }

  const database = await readDatabase(request.auth.businessId);
  const expense: Expense = {
    id: randomUUID(),
    description,
    category,
    amount,
    date: parsedDate.toISOString(),
    createdAt: new Date().toISOString()
  };

  database.expenses.push(expense);
  appendAuditEvent(database, request.auth, {
    action: 'expense.created',
    entityType: 'expense',
    entityId: expense.id,
    metadata: { description, category, amount, date: expense.date }
  });
  await saveDatabase(request.auth.businessId, database);
  response.status(201).json(expense);
}));

router.delete('/:id', asyncRoute(async (request, response) => {
  if (usesSupabaseAuth()) {
    try {
      await deleteProductionExpense(request.auth, request.params.id);
      response.status(204).send();
    } catch (error) {
      sendExpenseProductionError(response, error);
    }
    return;
  }

  const database = await readDatabase(request.auth.businessId);
  const index = database.expenses.findIndex(item => item.id === request.params.id);

  if (index < 0) {
    response.status(404).json({ error: 'Despesa não encontrada.' });
    return;
  }

  const [removed] = database.expenses.splice(index, 1);
  appendAuditEvent(database, request.auth, {
    action: 'expense.deleted',
    entityType: 'expense',
    entityId: removed.id,
    metadata: {
      description: removed.description,
      category: removed.category,
      amount: removed.amount,
      date: removed.date
    }
  });
  await saveDatabase(request.auth.businessId, database);
  response.status(204).send();
}));

function sendExpenseProductionError(
  response: { status(code: number): { json(body: Record<string, unknown>): unknown } },
  error: unknown
): void {
  if (!isProductionAgendaError(error)) throw error;
  response.status(error.status).json({ error: error.message });
}

export { router as expenseRouter };
