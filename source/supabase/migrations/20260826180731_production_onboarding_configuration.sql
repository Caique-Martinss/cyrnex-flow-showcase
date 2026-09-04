create or replace function app_private.is_business_slug_available_internal(
  p_business_id uuid,
  p_slug text
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, auth
set row_security = off
as $$
  select app_private.is_business_member(p_business_id)
    and not exists (
      select 1
      from public.businesses b
      where lower(b.slug) = lower(p_slug)
        and b.id <> p_business_id
        and b.archived_at is null
    );
$$;

revoke all on function app_private.is_business_slug_available_internal(uuid, text)
from public, anon;
grant execute on function app_private.is_business_slug_available_internal(uuid, text)
to authenticated;

create or replace function public.is_business_slug_available(
  p_business_id uuid,
  p_slug text
)
returns boolean
language sql
stable
security invoker
set search_path = pg_catalog, public, app_private
as $$
  select app_private.is_business_slug_available_internal(p_business_id, p_slug);
$$;

revoke all on function public.is_business_slug_available(uuid, text)
from public, anon;
grant execute on function public.is_business_slug_available(uuid, text)
to authenticated;

create or replace function app_private.save_business_configuration_internal(
  p_business_id uuid,
  p_payload jsonb,
  p_completed boolean
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, auth, app_private, extensions
set row_security = off
as $$
declare
  v_settings jsonb := p_payload -> 'settings';
  v_profile jsonb := p_payload #> '{settings,profile}';
  v_contact jsonb := p_payload #> '{settings,contact}';
  v_rules jsonb := p_payload #> '{settings,bookingRules}';
  v_item jsonb;
  v_day jsonb;
  v_period jsonb;
  v_professional_id text;
  v_business_timezone text;
  v_previous_completed_at timestamptz;
  v_local_start timestamp;
  v_local_end timestamp;
  v_weekday smallint;
  v_appointment record;
  v_custom_schedule boolean;
begin
  if not app_private.has_business_role(
    p_business_id,
    array['owner', 'manager']::public.member_role[]
  ) then
    raise exception 'Sem permissão para alterar esta barbearia.'
      using errcode = '42501';
  end if;

  if jsonb_typeof(v_settings) <> 'object' then
    raise exception 'Configuração inválida.' using errcode = '22023';
  end if;

  if not app_private.is_business_slug_available_internal(
    p_business_id,
    v_settings ->> 'bookingSlug'
  ) then
    raise exception 'Esse endereço público já está em uso.'
      using errcode = '23505';
  end if;

  select onboarding_completed_at
  into v_previous_completed_at
  from public.businesses
  where id = p_business_id;

  update public.businesses
  set name = v_settings ->> 'businessName',
      slug = v_settings ->> 'bookingSlug',
      timezone = coalesce(nullif(v_settings ->> 'timezone', ''), 'America/Sao_Paulo'),
      operation_mode = (v_settings ->> 'operationMode')::public.operation_mode,
      onboarding_status = case
        when p_completed or v_previous_completed_at is not null
          then 'completed'::public.onboarding_status
        else 'in_progress'::public.onboarding_status
      end,
      onboarding_step = (p_payload ->> 'currentStep')::smallint,
      onboarding_completed_at = case
        when p_completed then coalesce(v_previous_completed_at, now())
        else v_previous_completed_at
      end
  where id = p_business_id;

  insert into public.business_settings (
    business_id,
    booking_slot_interval_minutes,
    min_booking_notice_minutes,
    max_booking_days_ahead,
    cancellation_notice_minutes,
    allow_client_reschedule,
    allow_client_cancel,
    allow_waitlist,
    require_deposit,
    default_deposit_percent,
    confirmation_mode,
    require_client_name,
    require_client_phone,
    require_client_email,
    allow_client_notes,
    allow_manual_overtime,
    cancellation_policy,
    payment_preferences
  ) values (
    p_business_id,
    (v_settings #>> '{businessHours,slotIntervalMinutes}')::smallint,
    (v_rules ->> 'minBookingNoticeMinutes')::integer,
    (v_rules ->> 'maxBookingDaysAhead')::integer,
    (v_rules ->> 'cancellationNoticeMinutes')::integer,
    (v_rules ->> 'allowClientReschedule')::boolean,
    (v_rules ->> 'allowClientCancel')::boolean,
    (v_rules ->> 'allowWaitlist')::boolean,
    (v_rules ->> 'requireDeposit')::boolean,
    (v_settings ->> 'defaultDepositPercent')::numeric,
    v_rules ->> 'confirmationMode',
    (v_rules ->> 'requireClientName')::boolean,
    (v_rules ->> 'requireClientPhone')::boolean,
    (v_rules ->> 'requireClientEmail')::boolean,
    (v_rules ->> 'allowClientNotes')::boolean,
    (v_rules ->> 'allowManualOvertime')::boolean,
    v_settings ->> 'cancellationPolicy',
    coalesce(v_settings -> 'paymentPreferences', '{}'::jsonb)
  )
  on conflict (business_id) do update
  set booking_slot_interval_minutes = excluded.booking_slot_interval_minutes,
      min_booking_notice_minutes = excluded.min_booking_notice_minutes,
      max_booking_days_ahead = excluded.max_booking_days_ahead,
      cancellation_notice_minutes = excluded.cancellation_notice_minutes,
      allow_client_reschedule = excluded.allow_client_reschedule,
      allow_client_cancel = excluded.allow_client_cancel,
      allow_waitlist = excluded.allow_waitlist,
      require_deposit = excluded.require_deposit,
      default_deposit_percent = excluded.default_deposit_percent,
      confirmation_mode = excluded.confirmation_mode,
      require_client_name = excluded.require_client_name,
      require_client_phone = excluded.require_client_phone,
      require_client_email = excluded.require_client_email,
      allow_client_notes = excluded.allow_client_notes,
      allow_manual_overtime = excluded.allow_manual_overtime,
      cancellation_policy = excluded.cancellation_policy,
      payment_preferences = excluded.payment_preferences;

  insert into public.business_public_profiles (
    business_id,
    headline,
    about_text,
    founded_year,
    phone_public,
    email_public,
    address_line,
    city,
    state,
    postal_code,
    instagram_url,
    whatsapp_public,
    public_page_enabled,
    origin_story,
    experience_text,
    style_description,
    differentiator_text,
    specialties,
    differentials,
    public_sections,
    section_order,
    primary_action,
    location_visibility,
    page_theme,
    accent_color,
    publish_on_complete
  ) values (
    p_business_id,
    v_profile ->> 'headline',
    v_profile ->> 'aboutText',
    nullif(v_profile ->> 'foundedYear', '')::smallint,
    v_contact ->> 'phone',
    v_contact ->> 'email',
    v_contact ->> 'addressLine',
    v_contact ->> 'city',
    v_contact ->> 'state',
    v_contact ->> 'postalCode',
    v_contact ->> 'instagram',
    v_contact ->> 'whatsapp',
    (v_profile ->> 'publicPageEnabled')::boolean,
    v_profile ->> 'originStory',
    v_profile ->> 'experienceText',
    v_profile ->> 'styleDescription',
    v_profile ->> 'differentiatorText',
    coalesce(v_profile -> 'specialties', '[]'::jsonb),
    coalesce(v_profile -> 'differentials', '[]'::jsonb),
    coalesce(v_profile -> 'publicSections', '[]'::jsonb),
    coalesce(v_profile -> 'sectionOrder', '[]'::jsonb),
    v_profile ->> 'primaryAction',
    v_profile ->> 'locationVisibility',
    v_profile ->> 'theme',
    coalesce(nullif(v_profile ->> 'accentColor', ''), '#b78945'),
    (v_profile ->> 'publishOnComplete')::boolean
  )
  on conflict (business_id) do update
  set headline = excluded.headline,
      about_text = excluded.about_text,
      founded_year = excluded.founded_year,
      phone_public = excluded.phone_public,
      email_public = excluded.email_public,
      address_line = excluded.address_line,
      city = excluded.city,
      state = excluded.state,
      postal_code = excluded.postal_code,
      instagram_url = excluded.instagram_url,
      whatsapp_public = excluded.whatsapp_public,
      public_page_enabled = excluded.public_page_enabled,
      origin_story = excluded.origin_story,
      experience_text = excluded.experience_text,
      style_description = excluded.style_description,
      differentiator_text = excluded.differentiator_text,
      specialties = excluded.specialties,
      differentials = excluded.differentials,
      public_sections = excluded.public_sections,
      section_order = excluded.section_order,
      primary_action = excluded.primary_action,
      location_visibility = excluded.location_visibility,
      page_theme = excluded.page_theme,
      accent_color = excluded.accent_color,
      publish_on_complete = excluded.publish_on_complete;

  delete from public.business_hours where business_id = p_business_id;
  for v_day in
    select value
    from jsonb_array_elements(
      coalesce(v_settings #> '{businessHours,weeklySchedule}', '[]'::jsonb)
    )
  loop
    if coalesce((v_day ->> 'enabled')::boolean, false) then
      if jsonb_array_length(coalesce(v_day -> 'periods', '[]'::jsonb)) > 0 then
        for v_period in
          select value from jsonb_array_elements(v_day -> 'periods')
        loop
          insert into public.business_hours (
            business_id,
            weekday,
            opens_at,
            closes_at
          ) values (
            p_business_id,
            (v_day ->> 'weekday')::smallint,
            (v_period ->> 'startsAt')::time,
            (v_period ->> 'endsAt')::time
          );
        end loop;
      else
        insert into public.business_hours (
          business_id,
          weekday,
          opens_at,
          closes_at
        ) values (
          p_business_id,
          (v_day ->> 'weekday')::smallint,
          (v_day ->> 'opensAt')::time,
          (v_day ->> 'closesAt')::time
        );
      end if;
    end if;
  end loop;

  delete from public.business_payment_methods where business_id = p_business_id;
  for v_item in
    select value
    from jsonb_array_elements(coalesce(v_settings -> 'paymentMethods', '[]'::jsonb))
  loop
    insert into public.business_payment_methods (
      business_id,
      method,
      label,
      active,
      fee_type,
      fee_value,
      display_order
    ) values (
      p_business_id,
      (v_item ->> 'method')::public.payment_method,
      v_item ->> 'label',
      (v_item ->> 'active')::boolean,
      (v_item ->> 'feeType')::public.fee_type,
      (v_item ->> 'feeValue')::numeric,
      coalesce((v_item ->> 'displayOrder')::smallint, 0)
    );
  end loop;

  delete from public.business_modules where business_id = p_business_id;
  for v_item in
    select value
    from jsonb_array_elements(coalesce(v_settings -> 'modules', '[]'::jsonb))
  loop
    insert into public.business_modules (
      business_id,
      module_key,
      enabled
    ) values (
      p_business_id,
      v_item ->> 'key',
      (v_item ->> 'enabled')::boolean
    );
  end loop;

  delete from public.business_rules where business_id = p_business_id;
  for v_item in
    select value
    from jsonb_array_elements(coalesce(v_settings -> 'rules', '[]'::jsonb))
  loop
    insert into public.business_rules (
      business_id,
      rule_key,
      enabled,
      config
    ) values (
      p_business_id,
      v_item ->> 'key',
      (v_item ->> 'enabled')::boolean,
      coalesce(v_item -> 'config', '{}'::jsonb)
    );
  end loop;

  for v_item in
    select value
    from jsonb_array_elements(coalesce(p_payload -> 'professionals', '[]'::jsonb))
  loop
    v_custom_schedule := jsonb_typeof(v_item -> 'weeklySchedule') = 'array';
    insert into public.professionals (
      id,
      business_id,
      member_id,
      name,
      professional_name,
      onboarding_role,
      phone,
      email,
      serves_clients,
      receives_commission,
      commission_percent,
      accepts_online_booking,
      public_visible,
      is_owner,
      active,
      uses_custom_schedule
    ) values (
      (v_item ->> 'id')::uuid,
      p_business_id,
      case
        when coalesce((v_item ->> 'isOwner')::boolean, false) then (
          select bm.id
          from public.business_members bm
          where bm.business_id = p_business_id
            and bm.user_id = auth.uid()
            and bm.role = 'owner'
            and bm.active
          limit 1
        )
        else null
      end,
      v_item ->> 'name',
      nullif(v_item ->> 'professionalName', ''),
      v_item ->> 'role',
      nullif(v_item ->> 'phone', ''),
      nullif(v_item ->> 'email', ''),
      (v_item ->> 'servesClients')::boolean,
      (v_item ->> 'receivesCommission')::boolean,
      (v_item ->> 'commissionPercent')::numeric,
      (v_item ->> 'acceptsOnlineBooking')::boolean,
      (v_item ->> 'publicVisible')::boolean,
      (v_item ->> 'isOwner')::boolean,
      (v_item ->> 'active')::boolean,
      v_custom_schedule
    )
    on conflict (business_id, id) do update
    set name = excluded.name,
        professional_name = excluded.professional_name,
        onboarding_role = excluded.onboarding_role,
        phone = excluded.phone,
        email = excluded.email,
        serves_clients = excluded.serves_clients,
        receives_commission = excluded.receives_commission,
        commission_percent = excluded.commission_percent,
        accepts_online_booking = excluded.accepts_online_booking,
        public_visible = excluded.public_visible,
        is_owner = excluded.is_owner,
        active = excluded.active,
        uses_custom_schedule = excluded.uses_custom_schedule,
        member_id = coalesce(public.professionals.member_id, excluded.member_id);
  end loop;

  update public.professionals p
  set active = false
  where p.business_id = p_business_id
    and not exists (
      select 1
      from jsonb_array_elements(coalesce(p_payload -> 'professionals', '[]'::jsonb)) x
      where (x ->> 'id')::uuid = p.id
    );

  delete from public.professional_hours where business_id = p_business_id;
  for v_item in
    select value
    from jsonb_array_elements(coalesce(p_payload -> 'professionals', '[]'::jsonb))
  loop
    if jsonb_typeof(v_item -> 'weeklySchedule') = 'array' then
      for v_day in
        select value from jsonb_array_elements(v_item -> 'weeklySchedule')
      loop
        if coalesce((v_day ->> 'enabled')::boolean, false) then
          if jsonb_array_length(coalesce(v_day -> 'periods', '[]'::jsonb)) > 0 then
            for v_period in
              select value from jsonb_array_elements(v_day -> 'periods')
            loop
              insert into public.professional_hours (
                business_id,
                professional_id,
                weekday,
                starts_at,
                ends_at
              ) values (
                p_business_id,
                (v_item ->> 'id')::uuid,
                (v_day ->> 'weekday')::smallint,
                (v_period ->> 'startsAt')::time,
                (v_period ->> 'endsAt')::time
              );
            end loop;
          else
            insert into public.professional_hours (
              business_id,
              professional_id,
              weekday,
              starts_at,
              ends_at
            ) values (
              p_business_id,
              (v_item ->> 'id')::uuid,
              (v_day ->> 'weekday')::smallint,
              (v_day ->> 'opensAt')::time,
              (v_day ->> 'closesAt')::time
            );
          end if;
        end if;
      end loop;
    end if;
  end loop;

  for v_item in
    select value
    from jsonb_array_elements(coalesce(p_payload -> 'services', '[]'::jsonb))
  loop
    insert into public.services (
      id,
      business_id,
      category,
      name,
      description,
      duration_minutes,
      buffer_after_minutes,
      base_price,
      price_type,
      public_price_visible,
      deposit_percent_override,
      online_booking_enabled,
      recommended_return_days,
      active
    ) values (
      (v_item ->> 'id')::uuid,
      p_business_id,
      nullif(v_item ->> 'category', ''),
      v_item ->> 'name',
      nullif(v_item ->> 'description', ''),
      (v_item ->> 'durationMinutes')::smallint,
      (v_item ->> 'bufferAfterMinutes')::smallint,
      (v_item ->> 'price')::numeric,
      (v_item ->> 'priceType'),
      (v_item ->> 'publicPriceVisible')::boolean,
      nullif(v_item ->> 'depositPercent', '')::numeric,
      (v_item ->> 'onlineBookingEnabled')::boolean,
      nullif(v_item ->> 'recommendedReturnDays', '')::smallint,
      (v_item ->> 'active')::boolean
    )
    on conflict (business_id, id) do update
    set category = excluded.category,
        name = excluded.name,
        description = excluded.description,
        duration_minutes = excluded.duration_minutes,
        buffer_after_minutes = excluded.buffer_after_minutes,
        base_price = excluded.base_price,
        price_type = excluded.price_type,
        public_price_visible = excluded.public_price_visible,
        deposit_percent_override = excluded.deposit_percent_override,
        online_booking_enabled = excluded.online_booking_enabled,
        recommended_return_days = excluded.recommended_return_days,
        active = excluded.active;
  end loop;

  update public.services s
  set active = false
  where s.business_id = p_business_id
    and not exists (
      select 1
      from jsonb_array_elements(coalesce(p_payload -> 'services', '[]'::jsonb)) x
      where (x ->> 'id')::uuid = s.id
    );

  delete from public.professional_services where business_id = p_business_id;
  for v_item in
    select value
    from jsonb_array_elements(coalesce(p_payload -> 'services', '[]'::jsonb))
  loop
    for v_professional_id in
      select value
      from jsonb_array_elements_text(coalesce(v_item -> 'professionalIds', '[]'::jsonb))
    loop
      insert into public.professional_services (
        business_id,
        professional_id,
        service_id,
        active
      ) values (
        p_business_id,
        v_professional_id::uuid,
        (v_item ->> 'id')::uuid,
        true
      );
    end loop;
  end loop;

  delete from public.service_addons where business_id = p_business_id;
  for v_item in
    select value
    from jsonb_array_elements(coalesce(p_payload -> 'services', '[]'::jsonb))
  loop
    for v_period in
      select value
      from jsonb_array_elements(coalesce(v_item -> 'addons', '[]'::jsonb))
    loop
      insert into public.service_addons (
        id,
        business_id,
        service_id,
        name,
        price_delta,
        duration_delta_minutes,
        active
      ) values (
        (v_period ->> 'id')::uuid,
        p_business_id,
        (v_item ->> 'id')::uuid,
        v_period ->> 'name',
        (v_period ->> 'priceDelta')::numeric,
        (v_period ->> 'durationDeltaMinutes')::smallint,
        (v_period ->> 'active')::boolean
      );
    end loop;
  end loop;

  select timezone into v_business_timezone
  from public.businesses
  where id = p_business_id;

  for v_appointment in
    select a.*
    from public.appointments a
    where a.business_id = p_business_id
      and a.status in ('scheduled', 'confirmed', 'arrived', 'in_service')
      and not a.recurrence_paused
      and a.starts_at >= now()
  loop
    if not exists (
      select 1
      from public.services s
      where s.business_id = p_business_id
        and s.id = v_appointment.service_id
        and s.active
    ) then
      raise exception 'Há atendimento futuro usando um serviço removido ou desativado.'
        using errcode = '23514';
    end if;

    if not exists (
      select 1
      from public.professionals p
      where p.business_id = p_business_id
        and p.id = v_appointment.professional_id
        and p.active
        and p.serves_clients
    ) then
      raise exception 'Há atendimento futuro com profissional removido ou indisponível.'
        using errcode = '23514';
    end if;

    if exists (
      select 1
      from public.professional_services ps
      where ps.business_id = p_business_id
        and ps.service_id = v_appointment.service_id
    ) and not exists (
      select 1
      from public.professional_services ps
      where ps.business_id = p_business_id
        and ps.service_id = v_appointment.service_id
        and ps.professional_id = v_appointment.professional_id
        and ps.active
    ) then
      raise exception 'Há atendimento futuro com combinação serviço/profissional removida.'
        using errcode = '23514';
    end if;

    v_local_start := v_appointment.starts_at at time zone v_business_timezone;
    v_local_end := v_appointment.occupied_until at time zone v_business_timezone;
    v_weekday := extract(dow from v_local_start)::smallint;

    if v_local_start::date <> v_local_end::date or not exists (
      select 1
      from public.business_hours h
      where h.business_id = p_business_id
        and h.weekday = v_weekday
        and h.opens_at <= v_local_start::time
        and h.closes_at >= v_local_end::time
    ) then
      raise exception 'A nova configuração de horário conflita com atendimento futuro.'
        using errcode = '23514';
    end if;

    select p.uses_custom_schedule
    into v_custom_schedule
    from public.professionals p
    where p.business_id = p_business_id
      and p.id = v_appointment.professional_id;

    if v_custom_schedule and not exists (
      select 1
      from public.professional_hours ph
      where ph.business_id = p_business_id
        and ph.professional_id = v_appointment.professional_id
        and ph.weekday = v_weekday
        and ph.starts_at <= v_local_start::time
        and ph.ends_at >= v_local_end::time
    ) then
      raise exception 'O novo horário do profissional conflita com atendimento futuro.'
        using errcode = '23514';
    end if;
  end loop;

  insert into public.audit_logs (
    business_id,
    action,
    entity_type,
    entity_id,
    actor_user_id,
    actor_name,
    metadata
  ) values (
    p_business_id,
    case
      when p_completed then 'business_configuration.completed'
      else 'business_configuration.updated'
    end,
    'business_settings',
    p_business_id,
    auth.uid(),
    coalesce(
      (
        select bm.display_name
        from public.business_members bm
        where bm.business_id = p_business_id
          and bm.user_id = auth.uid()
          and bm.active
        limit 1
      ),
      'Usuário'
    ),
    jsonb_build_object(
      'currentStep', (p_payload ->> 'currentStep')::integer,
      'services', jsonb_array_length(coalesce(p_payload -> 'services', '[]'::jsonb)),
      'professionals', jsonb_array_length(coalesce(p_payload -> 'professionals', '[]'::jsonb)),
      'publicPageEnabled', (v_profile ->> 'publicPageEnabled')::boolean
    )
  );
end;
$$;

revoke all on function app_private.save_business_configuration_internal(
  uuid,
  jsonb,
  boolean
) from public, anon;
grant execute on function app_private.save_business_configuration_internal(
  uuid,
  jsonb,
  boolean
) to authenticated;

create or replace function public.save_business_configuration(
  p_business_id uuid,
  p_payload jsonb,
  p_completed boolean
)
returns void
language sql
security invoker
set search_path = pg_catalog, public, app_private
as $$
  select app_private.save_business_configuration_internal(
    p_business_id,
    p_payload,
    p_completed
  );
$$;

revoke all on function public.save_business_configuration(uuid, jsonb, boolean)
from public, anon;
grant execute on function public.save_business_configuration(uuid, jsonb, boolean)
to authenticated;
