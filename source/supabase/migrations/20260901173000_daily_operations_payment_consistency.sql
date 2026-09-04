-- CYRNEX FLOW V11.7.2
-- Protege a consistência financeira na conclusão de atendimentos.
-- Quando um sinal já foi confirmado, a taxa da forma de pagamento só pode
-- incidir sobre o valor restante a receber.

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'appointments_card_fee_remaining_check'
      and conrelid = 'public.appointments'::regclass
  ) then
    alter table public.appointments
      drop constraint appointments_card_fee_remaining_check;
  end if;
end
$$;

alter table public.appointments
  add constraint appointments_card_fee_remaining_check
  check (
    card_fee <= greatest(
      0::numeric,
      base_price - case
        when deposit_status = 'paid' then deposit_amount
        else 0::numeric
      end
    )
  );
