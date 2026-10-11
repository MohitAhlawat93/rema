-- Public site JSON must never expose draft/unapproved guest feedback.
-- Private owner drafts retain all reviews for editing; public snapshots contain only consented reviews.
create or replace function public.witness_lema_sanitize_public_reviews()
returns trigger language plpgsql set search_path = ''
as $$
begin
  if jsonb_typeof(new.payload) <> 'object' then
    raise exception 'Published payload must be an object';
  end if;
  if new.payload ? 'reviews' then
    if jsonb_typeof(new.payload->'reviews') <> 'array' then
      new.payload := jsonb_set(new.payload, '{reviews}', '[]'::jsonb, true);
    else
      new.payload := jsonb_set(new.payload, '{reviews}', coalesce(
        (select jsonb_agg(item value order by item.ordinality)
           from jsonb_array_elements(new.payload->'reviews') with ordinality as item(value,ordinality)
          where item.value->>'consent' = 'true'
            and item.value->>'published' = 'true'
            and length(trim(coalesce(item.value->>'author', ''))) > 0
            and (length(trim(coalesce(item.value->>'textEn', ''))) > 0
              or length(trim(coalesce(item.value->>'textHi', ''))) > 0)
        ), '[]'::jsonb), true);
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists witness_lema_sanitize_public_reviews_before_write on public.witness_lema_published_site;
create trigger witness_lema_sanitize_public_reviews_before_write
before insert or update of payload on public.witness_lema_published_site
for each row execute function public.witness_lema_sanitize_public_reviews();
