-- Alinha o schema PostgreSQL com todos os dados capturados no onboarding v0.6.0.

alter table public.businesses
add column onboarding_completed_at timestamptz;

update public.businesses
set onboarding_completed_at = coalesce(onboarding_completed_at, updated_at)
where onboarding_status = 'completed';

alter table public.businesses
add constraint businesses_onboarding_completion_check
check (
  onboarding_status <> 'completed' or
  onboarding_completed_at is not null
);

alter table public.business_public_profiles
add column phone_public text,
add column email_public text;

alter table public.services
add column recommended_return_days smallint
  check (
    recommended_return_days is null or
    recommended_return_days between 1 and 730
  );

comment on column public.businesses.onboarding_completed_at is
  'Momento em que a configuração inicial da empresa foi concluída.';

comment on column public.business_public_profiles.phone_public is
  'Telefone público exibido na página da empresa quando informado.';

comment on column public.business_public_profiles.email_public is
  'E-mail público exibido na página da empresa quando informado.';

comment on column public.services.recommended_return_days is
  'Intervalo recomendado, em dias, para sugerir retorno do cliente ao serviço.';
