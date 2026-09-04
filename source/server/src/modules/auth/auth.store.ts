import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  AuthStore,
  LocalAccount,
  LocalSession,
  PasswordRecoveryChallenge
} from './auth.types.js';

const currentDirectory = dirname(fileURLToPath(import.meta.url));
const authPath = resolve(currentDirectory, '../../../data/auth.json');
const emptyStore: AuthStore = {
  accounts: [],
  sessions: [],
  passwordRecoveries: []
};

export async function readAuthStore(): Promise<AuthStore> {
  try {
    const content = await readFile(authPath, 'utf8');
    const parsed = JSON.parse(content) as Partial<AuthStore>;

    return {
      accounts: Array.isArray(parsed.accounts) ? parsed.accounts : [],
      sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [],
      passwordRecoveries: Array.isArray(parsed.passwordRecoveries)
        ? parsed.passwordRecoveries
        : []
    };
  } catch (error) {
    const nodeError = error as NodeJS.ErrnoException;
    if (nodeError.code !== 'ENOENT') throw error;
    await saveAuthStore(emptyStore);
    return structuredClone(emptyStore);
  }
}

export async function saveAuthStore(store: AuthStore): Promise<void> {
  await mkdir(dirname(authPath), { recursive: true });
  const temporaryPath = `${authPath}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(temporaryPath, JSON.stringify(store, null, 2), 'utf8');
  await rename(temporaryPath, authPath);
}

export async function findAccountByUsername(
  normalizedUsername: string
): Promise<LocalAccount | undefined> {
  const store = await readAuthStore();
  return store.accounts.find(item => item.normalizedUsername === normalizedUsername);
}

export async function findAccountByEmail(
  normalizedEmail: string
): Promise<LocalAccount | undefined> {
  const store = await readAuthStore();
  return store.accounts.find(item => item.email === normalizedEmail);
}

export async function findBusinessBySlug(slug: string): Promise<{
  account: LocalAccount;
  businessId: string;
} | null> {
  const store = await readAuthStore();

  for (const account of store.accounts) {
    const membership = account.memberships.find(item => (
      item.active && item.businessSlug === slug
    ));

    if (membership) {
      return { account, businessId: membership.businessId };
    }
  }

  return null;
}

export function removeExpiredSessions(store: AuthStore): void {
  const now = Date.now();
  store.sessions = store.sessions.filter(session => (
    new Date(session.expiresAt).getTime() > now
  ));
}

export function removeExpiredPasswordRecoveries(store: AuthStore): void {
  const now = Date.now();
  store.passwordRecoveries = store.passwordRecoveries.filter(item => {
    const expiredLongAgo = new Date(item.expiresAt).getTime() < now - 86_400_000;
    return !expiredLongAgo;
  });
}

export function findSessionByHash(
  sessions: LocalSession[],
  tokenHash: string
): LocalSession | undefined {
  return sessions.find(session => session.tokenHash === tokenHash);
}

export function findActivePasswordRecovery(
  recoveries: PasswordRecoveryChallenge[],
  accountId: string
): PasswordRecoveryChallenge | undefined {
  const now = Date.now();
  return recoveries
    .filter(item => (
      item.accountId === accountId
      && !item.usedAt
      && new Date(item.expiresAt).getTime() > now
    ))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
}

export async function isBusinessSlugAvailable(
  businessId: string,
  slug: string
): Promise<boolean> {
  const store = await readAuthStore();

  return !store.accounts.some(account => account.memberships.some(membership => (
    membership.active
    && membership.businessId !== businessId
    && membership.businessSlug === slug
  )));
}

export async function updateBusinessIdentity(
  businessId: string,
  businessName: string,
  businessSlug: string
): Promise<void> {
  const store = await readAuthStore();

  for (const account of store.accounts) {
    for (const membership of account.memberships) {
      if (membership.businessId !== businessId) continue;
      membership.businessName = businessName;
      membership.businessSlug = businessSlug;
    }
  }

  await saveAuthStore(store);
}
