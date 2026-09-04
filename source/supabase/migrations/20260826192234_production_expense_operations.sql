-- Finance writes are audited and transactional in production.
revoke insert, update, delete on public.expenses from authenticated;

create or replace function app_private.create_expense_internal(
  p_business_id uuid,
  p_description text,
  p_category text,
  p_amount numeric,
  p_expense_date date
)
returns uuid
language plpgsql
volatile
security definer
set search_path = pg_catalog, public, auth, app_private, extensions
set row_security = off
as $$
declare
  v_expense_id uuid := extensions.gen_random_uuid();
  v_actor_name text;
begin
  if not app_private.has_business_role(
    p_business_id,
    array['owner','manager']::public.member_role[]
  ) then
    raise exception 'Sem permissão para alterar o financeiro.'
      using errcode = '42501';
  end if;

  if char_length(trim(coalesce(p_description, ''))) < 2
    or char_length(trim(coalesce(p_category, ''))) < 2
    or p_amount is null
    or p_amount <= 0
    or p_expense_date is null then
    raise exception 'Preencha descrição, categoria, valor positivo e data corretamente.'
      using errcode = '22023';
  end if;

  v_actor_name := app_private.agenda_actor_name(p_business_id);
  insert into public.expenses (
    id,
    business_id,
    description,
    category,
    amount,
    expense_date,
    created_by
  ) values (
    v_expense_id,
    p_business_id,
    trim(p_description),
    trim(p_category),
    p_amount,
    p_expense_date,
    auth.uid()
  );

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
    'expense.created',
    'expense',
    v_expense_id,
    auth.uid(),
    v_actor_name,
    jsonb_build_object(
      'description', trim(p_description),
      'category', trim(p_category),
      'amount', p_amount,
      'date', p_expense_date
    )
  );

  return v_expense_id;
end;
$$;

create or replace function public.create_expense(
  p_business_id uuid,
  p_description text,
  p_category text,
  p_amount numeric,
  p_expense_date date
)
returns uuid
language sql
volatile
security invoker
set search_path = pg_catalog, public, app_private
as $$
  select app_private.create_expense_internal(
    p_business_id,
    p_description,
    p_category,
    p_amount,
    p_expense_date
  );
$$;

create or replace function app_private.delete_expense_internal(
  p_business_id uuid,
  p_expense_id uuid
)
returns uuid
language plpgsql
volatile
security definer
set search_path = pg_catalog, public, auth, app_private
set row_security = off
as $$
declare
  v_expense public.expenses%rowtype;
  v_actor_name text;
begin
  if not app_private.has_business_role(
    p_business_id,
    array['owner','manager']::public.member_role[]
  ) then
    raise exception 'Sem permissão para alterar o financeiro.'
      using errcode = '42501';
  end if;

  select *
  into v_expense
  from public.expenses e
  where e.business_id = p_business_id
    and e.id = p_expense_id
  for update;

  if not found then
    raise exception 'Despesa não encontrada.' using errcode = 'P0002';
  end if;

  v_actor_name := app_private.agenda_actor_name(p_business_id);
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
    'expense.deleted',
    'expense',
    p_expense_id,
    auth.uid(),
    v_actor_name,
    jsonb_build_object(
      'description', v_expense.description,
      'category', v_expense.category,
      'amount', v_expense.amount,
      'date', v_expense.expense_date
    )
  );

  delete from public.expenses
  where business_id = p_business_id
    and id = p_expense_id;

  return p_expense_id;
end;
$$;

create or replace function public.delete_expense(
  p_business_id uuid,
  p_expense_id uuid
)
returns uuid
language sql
volatile
security invoker
set search_path = pg_catalog, public, app_private
as $$
  select app_private.delete_expense_internal(p_business_id, p_expense_id);
$$;

revoke all on function app_private.create_expense_internal(
  uuid, text, text, numeric, date
) from public, anon;
revoke all on function app_private.delete_expense_internal(
  uuid, uuid
) from public, anon;
revoke all on function public.create_expense(
  uuid, text, text, numeric, date
) from public, anon;
revoke all on function public.delete_expense(
  uuid, uuid
) from public, anon;

grant execute on function app_private.create_expense_internal(
  uuid, text, text, numeric, date
) to authenticated;
grant execute on function app_private.delete_expense_internal(
  uuid, uuid
) to authenticated;
grant execute on function public.create_expense(
  uuid, text, text, numeric, date
) to authenticated;
grant execute on function public.delete_expense(
  uuid, uuid
) to authenticated;
