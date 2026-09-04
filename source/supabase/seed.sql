-- Development seed only. Never use production customer data here.
-- Fixed UUIDs keep automated/manual tests reproducible.

insert into public.businesses (
  id,
  name,
  slug,
  operation_mode,
  onboarding_status,
  onboarding_step,
  onboarding_completed_at
)
values (
  '10000000-0000-0000-0000-000000000001',
  'Barbearia Demo',
  'barbearia-demo',
  'solo',
  'completed',
  9,
  now()
)
on conflict (id) do nothing;

insert into public.business_settings (
  business_id,
  booking_slot_interval_minutes,
  min_booking_notice_minutes,
  max_booking_days_ahead,
  cancellation_notice_minutes,
  allow_waitlist,
  require_deposit,
  default_deposit_percent,
  cancellation_policy
)
values (
  '10000000-0000-0000-0000-000000000001',
  15,
  30,
  60,
  360,
  true,
  true,
  50,
  'Cancelamentos e reagendamentos seguem as regras configuradas pela barbearia.'
)
on conflict (business_id) do nothing;

insert into public.business_modules (business_id, module_key, enabled)
values
  ('10000000-0000-0000-0000-000000000001', 'finance', true),
  ('10000000-0000-0000-0000-000000000001', 'waitlist', true),
  ('10000000-0000-0000-0000-000000000001', 'prosthesis', true),
  ('10000000-0000-0000-0000-000000000001', 'products', true),
  ('10000000-0000-0000-0000-000000000001', 'partnerships', true)
on conflict (business_id, module_key) do nothing;

insert into public.business_rules (business_id, rule_key, enabled, config)
values
  (
    '10000000-0000-0000-0000-000000000001',
    'groom_courtesy',
    true,
    '{"discount_percent":100,"deposit_required":false}'::jsonb
  ),
  (
    '10000000-0000-0000-0000-000000000001',
    'repeat_no_show_deposit',
    true,
    '{"threshold":2,"require_deposit":true}'::jsonb
  )
on conflict (business_id, rule_key) do nothing;


insert into public.business_payment_methods (
  business_id,
  method,
  label,
  active,
  fee_type,
  fee_value,
  display_order
)
values
  ('10000000-0000-0000-0000-000000000001', 'pix', 'Pix', true, 'none', 0, 1),
  ('10000000-0000-0000-0000-000000000001', 'cash', 'Dinheiro', true, 'none', 0, 2),
  ('10000000-0000-0000-0000-000000000001', 'debit', 'Débito', true, 'percent', 1.5, 3),
  ('10000000-0000-0000-0000-000000000001', 'credit', 'Crédito', true, 'percent', 3.5, 4)
on conflict (business_id, method, label) do nothing;

insert into public.business_public_profiles (
  business_id,
  headline,
  about_text,
  founded_year,
  city,
  state,
  instagram_url,
  whatsapp_public,
  public_page_enabled
)
values (
  '10000000-0000-0000-0000-000000000001',
  'Cuidado, estilo e atendimento com hora marcada.',
  'Barbearia de demonstração do CYRNEX FLOW.',
  2020,
  'São Paulo',
  'SP',
  '@barbearia_demo',
  '(11) 99999-9999',
  true
)
on conflict (business_id) do nothing;

insert into public.business_hours (business_id, weekday, opens_at, closes_at)
values
  ('10000000-0000-0000-0000-000000000001', 1, '09:00', '20:00'),
  ('10000000-0000-0000-0000-000000000001', 2, '09:00', '20:00'),
  ('10000000-0000-0000-0000-000000000001', 3, '09:00', '20:00'),
  ('10000000-0000-0000-0000-000000000001', 4, '09:00', '20:00'),
  ('10000000-0000-0000-0000-000000000001', 5, '09:00', '20:00'),
  ('10000000-0000-0000-0000-000000000001', 6, '09:00', '18:00')
on conflict do nothing;

insert into public.professionals (
  id,
  business_id,
  name,
  commission_percent,
  accepts_online_booking,
  active
)
values (
  '20000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  'Profissional Demo',
  0,
  true,
  true
)
on conflict (id) do nothing;

insert into public.services (
  id,
  business_id,
  category,
  name,
  duration_minutes,
  buffer_after_minutes,
  base_price,
  deposit_percent_override,
  online_booking_enabled
)
values
  (
    '30000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    'Barbearia',
    'Corte',
    45,
    5,
    50,
    50,
    true
  ),
  (
    '30000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000001',
    'Barbearia',
    'Pezinho',
    20,
    0,
    20,
    0,
    true
  )
on conflict (id) do nothing;

insert into public.expense_categories (business_id, name, display_order)
values
  ('10000000-0000-0000-0000-000000000001', 'Contas', 1),
  ('10000000-0000-0000-0000-000000000001', 'Materiais', 2),
  ('10000000-0000-0000-0000-000000000001', 'Produtos', 3),
  ('10000000-0000-0000-0000-000000000001', 'Manutenção', 4)
on conflict do nothing;
