import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import { readDatabase, saveDatabase } from '../../database/index.js';
import { usesSupabaseAuth } from '../auth/auth.provider.js';
import { createProductionClient, listProductionClients, updateProductionClient } from './client.repository.js';
import type { Client } from '../../domain/types.js';
import { asyncRoute } from '../../middleware/asyncRoute.js';
import { requireRoles } from '../../middleware/authorization.js';
import {
  normalizeOptionalText,
  normalizePhone,
  normalizeText
} from '../../utils/normalizers.js';

const router = Router();
router.use(requireRoles('owner', 'manager', 'receptionist'));

router.get('/', asyncRoute(async (request, response) => {
  if (usesSupabaseAuth()) {
    response.json(await listProductionClients(request.auth));
    return;
  }

  const database = await readDatabase(request.auth.businessId);
  const clients = [...database.clients].sort((a, b) =>
    a.name.localeCompare(b.name, 'pt-BR')
  );

  response.json(clients);
}));

router.post('/', asyncRoute(async (request, response) => {
  const name = normalizeText(request.body.name);
  const phone = normalizeText(request.body.phone);
  const normalizedPhone = normalizePhone(phone);
  const email = normalizeOptionalText(request.body.email);

  if (name.length < 3) {
    response.status(400).json({ error: 'Informe o nome do cliente.' });
    return;
  }

  if (normalizedPhone.length < 10) {
    response.status(400).json({
      error: 'Informe um telefone válido com DDD.'
    });
    return;
  }

  if (usesSupabaseAuth()) {
    response.status(201).json(await createProductionClient(request.auth, { name, phone, email }));
    return;
  }

  const database = await readDatabase(request.auth.businessId);
  const duplicatePhone = database.clients.some(
    client => normalizePhone(client.phone) === normalizedPhone
  );

  if (duplicatePhone) {
    response.status(409).json({
      error: 'Já existe um cliente cadastrado com esse telefone.'
    });
    return;
  }

  const client: Client = {
    id: randomUUID(),
    name,
    phone,
    email,
    lastVisit: null,
    totalSpend: 0,
    appointments: 0,
    createdAt: new Date().toISOString()
  };

  database.clients.push(client);
  await saveDatabase(request.auth.businessId, database);
  response.status(201).json(client);
}));

router.patch('/:clientId', asyncRoute(async (request, response) => {
  const clientId = String(request.params.clientId ?? '');
  const name = normalizeText(request.body.name);
  const phone = normalizeText(request.body.phone);
  const normalizedPhone = normalizePhone(phone);
  const email = normalizeOptionalText(request.body.email);

  if (!/^[a-f0-9-]{36}$/i.test(clientId)) {
    response.status(400).json({ error: 'Cliente inválido.' });
    return;
  }
  if (name.length < 3) {
    response.status(400).json({ error: 'Informe o nome do cliente.' });
    return;
  }
  if (normalizedPhone.length < 10) {
    response.status(400).json({ error: 'Informe um telefone válido com DDD.' });
    return;
  }

  if (usesSupabaseAuth()) {
    response.json(await updateProductionClient(request.auth, clientId, { name, phone, email }));
    return;
  }

  const database = await readDatabase(request.auth.businessId);
  const client = database.clients.find(item => item.id === clientId);
  if (!client) {
    response.status(404).json({ error: 'Cliente não encontrado.' });
    return;
  }
  const duplicatePhone = database.clients.some(item => (
    item.id !== clientId && normalizePhone(item.phone) === normalizedPhone
  ));
  if (duplicatePhone) {
    response.status(409).json({ error: 'Já existe outro cliente cadastrado com esse telefone.' });
    return;
  }
  client.name = name;
  client.phone = phone;
  client.email = email;
  await saveDatabase(request.auth.businessId, database);
  response.json(client);
}));

export { router as clientRouter };
