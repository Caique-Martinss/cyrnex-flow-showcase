import assert from 'node:assert/strict';

function occupiedEnd(start, durationMinutes, bufferMinutes) {
  return new Date(start.getTime() + (durationMinutes + bufferMinutes) * 60_000);
}

function overlaps(startA, endA, startB, endB) {
  return startA < endB && endA > startB;
}

function countedStatus(status) {
  return ['scheduled', 'confirmed', 'arrived', 'in_service', 'completed'].includes(status);
}

function intersectSegments(businessSegments, professionalSegments) {
  const result = [];
  for (const business of businessSegments) {
    for (const professional of professionalSegments) {
      const startMinutes = Math.max(business.startMinutes, professional.startMinutes);
      const endMinutes = Math.min(business.endMinutes, professional.endMinutes);
      if (startMinutes < endMinutes) result.push({ startMinutes, endMinutes });
    }
  }
  return result;
}

function dateTextInZone(date, timeZone) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date);
  const values = Object.fromEntries(
    parts.filter(part => part.type !== 'literal').map(part => [part.type, part.value])
  );
  return `${values.year}-${values.month}-${values.day}`;
}

// Buffer: o atendimento visual termina 10:30, mas o recurso continua ocupado até 10:40.
const start = new Date('2026-08-25T13:00:00.000Z');
const reservedEnd = occupiedEnd(start, 30, 10);
assert.equal(reservedEnd.toISOString(), '2026-08-25T13:40:00.000Z');
assert.equal(
  overlaps(
    new Date('2026-08-25T13:35:00.000Z'),
    new Date('2026-08-25T14:05:00.000Z'),
    start,
    reservedEnd
  ),
  true,
  'Um horário dentro do buffer não pode aparecer como livre.'
);
assert.equal(
  overlaps(
    new Date('2026-08-25T13:40:00.000Z'),
    new Date('2026-08-25T14:10:00.000Z'),
    start,
    reservedEnd
  ),
  false,
  'O próximo horário pode começar exatamente após o buffer.'
);

// Status terminais continuam no histórico, mas não entram na contagem operacional normal.
assert.equal(countedStatus('scheduled'), true);
assert.equal(countedStatus('confirmed'), true);
assert.equal(countedStatus('arrived'), true);
assert.equal(countedStatus('in_service'), true);
assert.equal(countedStatus('completed'), true);
assert.equal(countedStatus('missed'), false);
assert.equal(countedStatus('cancelled'), false);

// Horário do profissional nunca amplia o expediente da empresa.
assert.deepEqual(
  intersectSegments(
    [{ startMinutes: 9 * 60, endMinutes: 20 * 60 }],
    [{ startMinutes: 12 * 60, endMinutes: 18 * 60 }]
  ),
  [{ startMinutes: 12 * 60, endMinutes: 18 * 60 }]
);
assert.deepEqual(intersectSegments([{ startMinutes: 540, endMinutes: 1200 }], []), []);
assert.deepEqual(
  intersectSegments(
    [
      { startMinutes: 540, endMinutes: 720 },
      { startMinutes: 780, endMinutes: 1200 }
    ],
    [{ startMinutes: 600, endMinutes: 1020 }]
  ),
  [
    { startMinutes: 600, endMinutes: 720 },
    { startMinutes: 780, endMinutes: 1020 }
  ]
);

// O dia comercial deve vir do fuso da empresa, não do computador do usuário.
const instant = new Date('2026-08-26T02:30:00.000Z');
assert.equal(dateTextInZone(instant, 'America/Sao_Paulo'), '2026-08-25');
assert.equal(dateTextInZone(instant, 'UTC'), '2026-08-26');

console.log('✅ Cenários de regressão da Agenda aprovados.');
console.log('   Buffer: horário livre começa somente após o tempo de preparação.');
console.log('   Status: faltas/cancelamentos não inflam a operação normal.');
console.log('   Profissionais: agenda individual respeita o expediente da empresa.');
console.log('   Fuso: data da empresa independe do fuso do dispositivo.');
