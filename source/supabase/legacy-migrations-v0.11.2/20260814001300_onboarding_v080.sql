-- Onboarding v0.8.0: identidade guiada, equipe, serviços, pagamentos e página pública.

alter table public.business_settings
add column confirmation_mode text not null default 'automatic'
  check (confirmation_mode in ('automatic', 'manual')),
add column require_client_name boolean not null default true,
add column require_client_phone boolean not null default true,
add column require_client_email boolean not null default false,
add column allow_client_notes boolean not null default true,
add column allow_manual_overtime boolean not null default true,
add column payment_preferences jsonb not null default '{}'::jsonb
  check (jsonb_typeof(payment_preferences) = 'object');

alter table public.business_public_profiles
add column origin_story text,
add column experience_text text,
add column style_description text,
add column differentiator_text text,
add column specialties jsonb not null default '[]'::jsonb
  check (jsonb_typeof(specialties) = 'array'),
add column differentials jsonb not null default '[]'::jsonb
  check (jsonb_typeof(differentials) = 'array'),
add column public_sections jsonb not null default '[]'::jsonb
  check (jsonb_typeof(public_sections) = 'array'),
add column section_order jsonb not null default '[]'::jsonb
  check (jsonb_typeof(section_order) = 'array'),
add column primary_action text not null default 'booking'
  check (primary_action in ('booking', 'whatsapp', 'services')),
add column location_visibility text not null default 'full'
  check (location_visibility in ('full', 'area', 'hidden')),
add column page_theme text not null default 'auto'
  check (page_theme in ('light', 'dark', 'auto')),
add column accent_color text not null default '#b78945',
add column publish_on_complete boolean not null default true;

alter table public.professionals
add column professional_name text,
add column onboarding_role text not null default 'barber'
  check (
    onboarding_role in (
      'owner', 'barber', 'manager', 'receptionist', 'assistant', 'other'
    )
  ),
add column email text,
add column serves_clients boolean not null default true,
add column receives_commission boolean not null default false,
add column public_visible boolean not null default true,
add column is_owner boolean not null default false;

alter table public.services
add column price_type text not null default 'fixed'
  check (price_type in ('fixed', 'from', 'consult')),
add column public_price_visible boolean not null default true;

comment on column public.business_settings.payment_preferences is
  'Preferências de Pix, maquininha, sinal, gorjeta, recibo e pagamento posterior.';
comment on column public.business_settings.allow_manual_overtime is
  'Permite exceções de hora extra autorizadas pela barbearia, nunca pelo cliente.';
comment on column public.business_public_profiles.public_sections is
  'Seções que podem aparecer na página pública.';
comment on column public.business_public_profiles.section_order is
  'Ordem visual das seções da página pública.';
comment on column public.professionals.is_owner is
  'Marca o profissional proprietário protegido durante o onboarding.';
comment on column public.services.price_type is
  'Define se o preço é fixo, a partir de um valor ou sob consulta.';

create table public.business_public_media (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  media_kind text not null check (media_kind in ('space', 'portfolio')),
  media_type text not null default 'image' check (media_type in ('image', 'video')),
  asset_id uuid not null,
  service_id uuid,
  title text,
  description text,
  category text,
  public_visible boolean not null default true,
  display_order smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, id),
  constraint business_public_media_asset_fk
    foreign key (business_id, asset_id)
    references public.file_assets (business_id, id)
    on delete cascade,
  constraint business_public_media_service_fk
    foreign key (business_id, service_id)
    references public.services (business_id, id)
    on delete set null (service_id)
);

create index business_public_media_page_idx
  on public.business_public_media (
    business_id,
    media_kind,
    public_visible,
    display_order
  );

create trigger business_public_media_set_updated_at
before update on public.business_public_media
for each row execute function public.set_updated_at();

alter table public.business_public_media enable row level security;

create policy business_public_media_member_read
on public.business_public_media
for select
to authenticated
using (app_private.is_business_member(business_id));

create policy business_public_media_manager_write
on public.business_public_media
for all
to authenticated
using (
  app_private.has_business_role(
    business_id,
    array['owner', 'manager']::public.member_role[]
  )
)
with check (
  app_private.has_business_role(
    business_id,
    array['owner', 'manager']::public.member_role[]
  )
);

comment on table public.business_public_media is
  'Fotos e vídeos públicos do espaço e portfólio, ligados aos arquivos do Storage.';
