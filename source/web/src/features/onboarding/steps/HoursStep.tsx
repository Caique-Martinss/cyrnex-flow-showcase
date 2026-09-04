import { useMemo, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { DaySchedule, OnboardingState, SchedulePeriod } from '../../../domain/types';
import { weekdayLabels } from '../onboarding.constants';

interface StepProps {
  draft: OnboardingState;
  setDraft: Dispatch<SetStateAction<OnboardingState>>;
}

interface PauseDraft {
  id: string;
  startsAt: string;
  endsAt: string;
}

export function HoursStep({ draft, setDraft }: StepProps) {
  const schedule = draft.settings.businessHours.weeklySchedule;
  const [copyFrom, setCopyFrom] = useState<number | null>(null);
  const [copyTargets, setCopyTargets] = useState<number[]>([]);
  const [feedback, setFeedback] = useState('');

  const enabledDays = useMemo(() => schedule.filter(day => day.enabled), [schedule]);

  function updateDay(weekday: number, updater: (day: DaySchedule) => DaySchedule) {
    setDraft(current => ({
      ...current,
      settings: {
        ...current.settings,
        businessHours: {
          ...current.settings.businessHours,
          weeklySchedule: current.settings.businessHours.weeklySchedule.map(day => (
            day.weekday === weekday ? normalizeDay(updater(day)) : day
          ))
        }
      }
    }));
  }

  function updateSimpleDay(weekday: number, patch: {
    opensAt?: string;
    closesAt?: string;
    pauses?: PauseDraft[];
  }) {
    updateDay(weekday, day => {
      const opensAt = patch.opensAt ?? day.opensAt;
      const closesAt = patch.closesAt ?? day.closesAt;
      const pauses = patch.pauses ?? pausesFromDay(day);
      return buildDayFromSimple(day, opensAt, closesAt, pauses);
    });
  }

  function startCopy(day: DaySchedule) {
    const targets = enabledDays.filter(item => item.weekday !== day.weekday).map(item => item.weekday);
    setCopyFrom(day.weekday);
    setCopyTargets(targets);
    setFeedback('');
  }

  function applyCopy() {
    if (copyFrom === null || copyTargets.length === 0) return;
    const source = schedule.find(day => day.weekday === copyFrom);
    if (!source) return;
    setDraft(current => ({
      ...current,
      settings: {
        ...current.settings,
        businessHours: {
          ...current.settings.businessHours,
          weeklySchedule: current.settings.businessHours.weeklySchedule.map(day => (
            copyTargets.includes(day.weekday)
              ? cloneSchedule(day, source)
              : day
          ))
        }
      }
    }));
    const names = copyTargets.map(day => weekdayLabels[day].replace('-feira', '')).join(', ');
    setFeedback(`✓ Horário aplicado em: ${names}.`);
    setCopyFrom(null);
    setCopyTargets([]);
  }

  return (
    <section className="onboarding-step">
      <header>
        <span className="eyebrow">Etapa 4</span>
        <h1>Quando sua barbearia atende?</h1>
        <p>
          Primeiro escolha os dias. Depois informe apenas a hora que abre, a hora que fecha
          e, se existir, a pausa do dia.
        </p>
      </header>

      <div className="section-card">
        <div className="section-card-header">
          <div>
            <h2>Dias de atendimento</h2>
            <p>Clique nos dias em que normalmente existe atendimento.</p>
          </div>
        </div>
        <div className="weekday-selector">
          {schedule.map(day => (
            <button
              key={day.weekday}
              type="button"
              className={day.enabled ? 'weekday-button active' : 'weekday-button'}
              onClick={() => updateDay(day.weekday, current => ({ ...current, enabled: !current.enabled }))}
            >
              {day.enabled ? '✓ ' : ''}{weekdayLabels[day.weekday].replace('-feira', '')}
            </button>
          ))}
        </div>
      </div>

      <div className="hours-day-list">
        {enabledDays.map(day => {
          const pauses = pausesFromDay(day);
          const copyOpen = copyFrom === day.weekday;
          return (
            <article className="section-card hours-day-card simple-hours-card" key={day.weekday}>
              <div className="section-card-header">
                <div>
                  <span className="eyebrow">{weekdayLabels[day.weekday]}</span>
                  <h2>Horário normal</h2>
                </div>
                <button type="button" className="secondary-button" onClick={() => startCopy(day)}>
                  Usar estes horários em outros dias
                </button>
              </div>

              <div className="simple-hours-grid">
                <label>
                  Abre às
                  <input
                    type="time"
                    value={day.opensAt}
                    onChange={event => updateSimpleDay(day.weekday, { opensAt: event.target.value })}
                  />
                </label>
                <label>
                  Fecha às
                  <input
                    type="time"
                    value={day.closesAt}
                    onChange={event => updateSimpleDay(day.weekday, { closesAt: event.target.value })}
                  />
                </label>
              </div>

              <div className="pause-editor">
                <div className="section-card-header compact-header">
                  <div>
                    <strong>Faz uma pausa durante o dia?</strong>
                    <p>Ex.: almoço das 12:00 às 13:00. Durante a pausa, nenhum horário será oferecido.</p>
                  </div>
                  {pauses.length === 0 ? (
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => updateSimpleDay(day.weekday, {
                        pauses: [defaultPause(day)]
                      })}
                    >
                      + Adicionar pausa
                    </button>
                  ) : null}
                </div>

                {pauses.map((pause, index) => (
                  <div className="pause-row" key={pause.id}>
                    <strong>{pauses.length > 1 ? `Pausa ${index + 1}` : 'Pausa'}</strong>
                    <label>
                      Início
                      <input
                        type="time"
                        value={pause.startsAt}
                        onChange={event => {
                          const next = pauses.map(item => item.id === pause.id
                            ? { ...item, startsAt: event.target.value }
                            : item);
                          updateSimpleDay(day.weekday, { pauses: next });
                        }}
                      />
                    </label>
                    <span>até</span>
                    <label>
                      Fim
                      <input
                        type="time"
                        value={pause.endsAt}
                        onChange={event => {
                          const next = pauses.map(item => item.id === pause.id
                            ? { ...item, endsAt: event.target.value }
                            : item);
                          updateSimpleDay(day.weekday, { pauses: next });
                        }}
                      />
                    </label>
                    <button
                      type="button"
                      className="danger-link"
                      onClick={() => updateSimpleDay(day.weekday, {
                        pauses: pauses.filter(item => item.id !== pause.id)
                      })}
                    >
                      Remover
                    </button>
                  </div>
                ))}

                {pauses.length > 0 ? (
                  <button
                    type="button"
                    className="text-button"
                    onClick={() => updateSimpleDay(day.weekday, {
                      pauses: [...pauses, defaultPause(day, pauses.length)]
                    })}
                  >
                    + Adicionar outra pausa
                  </button>
                ) : null}
              </div>

              {copyOpen ? (
                <div className="copy-hours-panel">
                  <strong>Aplicar o horário de {weekdayLabels[day.weekday]} em quais dias?</strong>
                  <p>Escolha os destinos. Você ainda poderá editar cada dia separadamente depois.</p>
                  <div className="selectable-chip-list">
                    {enabledDays.filter(item => item.weekday !== day.weekday).map(target => {
                      const selected = copyTargets.includes(target.weekday);
                      return (
                        <button
                          type="button"
                          className={selected ? 'selectable-chip active' : 'selectable-chip'}
                          key={target.weekday}
                          onClick={() => setCopyTargets(current => selected
                            ? current.filter(item => item !== target.weekday)
                            : [...current, target.weekday])}
                        >
                          {selected ? '✓ ' : ''}{weekdayLabels[target.weekday].replace('-feira', '')}
                        </button>
                      );
                    })}
                  </div>
                  <div className="inline-actions">
                    <button type="button" className="primary-button" disabled={!copyTargets.length} onClick={applyCopy}>
                      Aplicar horários
                    </button>
                    <button type="button" className="secondary-button" onClick={() => setCopyFrom(null)}>
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : null}
            </article>
          );
        })}
      </div>

      {feedback ? <div className="success-callout"><strong>{feedback}</strong></div> : null}

      <div className="info-callout">
        <strong>Hora extra continua possível</strong>
        <p>
          Este é apenas o horário normal. Depois, na Agenda, o dono poderá estender um dia específico
          ou autorizar um atendimento fora do expediente sem mudar a rotina das próximas semanas.
        </p>
      </div>
    </section>
  );
}

function pausesFromDay(day: DaySchedule): PauseDraft[] {
  const periods = normalizedPeriods(day);
  const pauses: PauseDraft[] = [];
  for (let index = 1; index < periods.length; index += 1) {
    const previous = periods[index - 1];
    const current = periods[index];
    if (previous.endsAt < current.startsAt) {
      pauses.push({ id: `pause-${previous.id}-${current.id}`, startsAt: previous.endsAt, endsAt: current.startsAt });
    }
  }
  return pauses;
}

function buildDayFromSimple(
  day: DaySchedule,
  opensAt: string,
  closesAt: string,
  pauses: PauseDraft[]
): DaySchedule {
  const usablePauses = pauses
    .filter(pause => pause.startsAt < pause.endsAt)
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const periods: SchedulePeriod[] = [];
  let cursor = opensAt;
  usablePauses.forEach(pause => {
    if (pause.startsAt > cursor) {
      periods.push({ id: crypto.randomUUID(), startsAt: cursor, endsAt: pause.startsAt });
    }
    if (pause.endsAt > cursor) cursor = pause.endsAt;
  });
  if (closesAt > cursor) {
    periods.push({ id: crypto.randomUUID(), startsAt: cursor, endsAt: closesAt });
  }
  if (periods.length === 0 && opensAt < closesAt) {
    periods.push({ id: crypto.randomUUID(), startsAt: opensAt, endsAt: closesAt });
  }
  return normalizeDay({ ...day, opensAt, closesAt, periods });
}

function defaultPause(day: DaySchedule, index = 0): PauseDraft {
  if (index === 0 && day.opensAt <= '12:00' && day.closesAt >= '13:00') {
    return { id: crypto.randomUUID(), startsAt: '12:00', endsAt: '13:00' };
  }
  return { id: crypto.randomUUID(), startsAt: '15:00', endsAt: '15:15' };
}

function normalizedPeriods(day: DaySchedule): SchedulePeriod[] {
  const periods = day.periods?.length
    ? day.periods
    : [{ id: crypto.randomUUID(), startsAt: day.opensAt, endsAt: day.closesAt }];
  return [...periods].sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}

function cloneSchedule(target: DaySchedule, source: DaySchedule): DaySchedule {
  return normalizeDay({
    ...target,
    opensAt: source.opensAt,
    closesAt: source.closesAt,
    periods: source.periods.map(period => ({ ...period, id: crypto.randomUUID() }))
  });
}

function normalizeDay(day: DaySchedule): DaySchedule {
  const ordered = normalizedPeriods(day);
  const first = ordered[0] ?? { startsAt: day.opensAt, endsAt: day.closesAt };
  const last = ordered[ordered.length - 1] ?? first;
  const pauses = pausesFromPeriods(ordered);
  return {
    ...day,
    opensAt: first.startsAt,
    closesAt: last.endsAt,
    breakEnabled: pauses.length > 0,
    breakStartsAt: pauses[0]?.startsAt ?? null,
    breakEndsAt: pauses[0]?.endsAt ?? null,
    periods: ordered
  };
}

function pausesFromPeriods(periods: SchedulePeriod[]): PauseDraft[] {
  const pauses: PauseDraft[] = [];
  for (let index = 1; index < periods.length; index += 1) {
    const previous = periods[index - 1];
    const current = periods[index];
    if (previous.endsAt < current.startsAt) {
      pauses.push({ id: crypto.randomUUID(), startsAt: previous.endsAt, endsAt: current.startsAt });
    }
  }
  return pauses;
}
