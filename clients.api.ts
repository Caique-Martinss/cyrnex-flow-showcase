import type { DashboardData, Expense } from '../domain/types';
import { api } from './http';

export async function loadExpenses(): Promise<Expense[]> {
  const response = await api.get<Expense[]>('/expenses');
  return response.data;
}

export async function createExpense(input: {
  description: string;
  category: string;
  amount: number;
  date: string;
}): Promise<Expense> {
  const response = await api.post<Expense>('/expenses', input);
  return response.data;
}

export async function deleteExpense(id: string): Promise<void> {
  await api.delete(`/expenses/${id}`);
}

export async function loadDashboard(): Promise<DashboardData> {
  const response = await api.get<DashboardData>('/dashboard');
  return response.data;
}
