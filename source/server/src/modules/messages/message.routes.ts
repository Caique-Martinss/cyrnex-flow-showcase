import { Router } from 'express';
import { readDatabase } from '../../database/index.js';
import { asyncRoute } from '../../middleware/asyncRoute.js';
import { requireRoles } from '../../middleware/authorization.js';
import { normalizeText } from '../../utils/normalizers.js';

const router = Router();
router.use(requireRoles('owner', 'manager', 'receptionist'));

router.post('/send', asyncRoute(async (request, response) => {
  const clientId = normalizeText(request.body.clientId);
  const message = normalizeText(request.body.message);
  const database = await readDatabase(request.auth.businessId);
  const client = database.clients.find(item => item.id === clientId);

  if (!client) {
    response.status(404).json({ error: 'Cliente não encontrado.' });
    return;
  }

  if (message.length < 5) {
    response.status(400).json({
      error: 'Escreva uma mensagem antes de enviar.'
    });
    return;
  }

  response.json({
    success: true,
    client,
    message,
    sentAt: new Date().toISOString(),
    simulated: true
  });
}));

export { router as messageRouter };
