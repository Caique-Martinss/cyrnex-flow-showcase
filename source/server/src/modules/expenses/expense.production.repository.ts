import type { Expense } from '../../domain/types.js';
import {
  requireProductionAccessToken,
  userSupabaseRest
} from '../../database/postgres/restClient.js';
import type { AuthContext } from '../auth/auth.types.js';
import { translateAgendaError } from '../appointments/appointment.production.errors.js';

interface ExpenseRow {
  id: string;
  description: string;
  category: string;
  amount: number | string;
  expense_date: string;
  created_at: string;
}

const expenseSelect = 'id,description,category,amount,expense_date,created_at';

export async function listProductionExpenses(auth: AuthContext): Promise<Expense[]> {
  const token = requireProductionAccessToken(auth.accessToken);
  const rows = await userSupabaseRest<ExpenseRow[]>(token, '/rest/v1/expenses', {
    query: {
      select: expenseSelect,
      business_id: `eq.${auth.businessId}`,
      order: 'expense_date.desc,created_at.desc'
    }
  });
  return rows.map(mapExpense);
}

export async function createProductionExpense(
  auth: AuthContext,
  input: { description: string; category: string; amount: number; date: Date }
): Promise<Expense | null> {
  const token = requireProductionAccessToken(auth.accessToken);
  try {
    const id = await userSupabaseRest<string>(token, '/rest/v1/rpc/create_expense', {
      method: 'POST',
      body: {
        p_business_id: auth.businessId,
        p_description: input.description,
        p_category: input.category,
        p_amount: input.amount,
        p_expense_date: input.date.toISOString().slice(0, 10)
      }
    });
    return await getProductionExpense(auth, id);
  } catch (error) {
    throw translateAgendaError(error);
  }
}

export async function deleteProductionExpense(
  auth: AuthContext,
  id: string
): Promise<void> {
  const token = requireProductionAccessToken(auth.accessToken);
  try {
    await userSupabaseRest<string>(token, '/rest/v1/rpc/delete_expense', {
      method: 'POST',
      body: { p_business_id: auth.businessId, p_expense_id: id }
    });
  } catch (error) {
    throw translateAgendaError(error);
  }
}

async function getProductionExpense(auth: AuthContext, id: string): Promise<Expense | null> {
  const token = requireProductionAccessToken(auth.accessToken);
  const rows = await userSupabaseRest<ExpenseRow[]>(token, '/rest/v1/expenses', {
    query: {
      select: expenseSelect,
      business_id: `eq.${auth.businessId}`,
      id: `eq.${id}`,
      limit: '1'
    }
  });
  return rows[0] ? mapExpense(rows[0]) : null;
}

function mapExpense(row: ExpenseRow): Expense {
  return {
    id: row.id,
    description: row.description,
    category: row.category,
    amount: Number(row.amount),
    date: `${row.expense_date}T00:00:00.000Z`,
    createdAt: row.created_at
  };
}
