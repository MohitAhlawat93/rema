do $$
declare defaults jsonb := jsonb_build_object(
  'name', 'Lema Concierge',
  'greeting', 'Welcome. I can help with services, availability and the best way to get in touch.',
  'suggestionOne', 'How can I get in touch?',
  'suggestionOneLabel', 'Get in touch',
  'suggestionTwo', 'Which services are available?',
  'suggestionTwoLabel', 'Services'
);
begin
  update witness_lema_private.site_state
  set draft = jsonb_set(draft, '{assistant}', defaults || coalesce(draft->'assistant', '{}'::jsonb), true),
      published = jsonb_set(published, '{assistant}', defaults || coalesce(published->'assistant', '{}'::jsonb), true),
      updated_at = now()
  where id = 'main';

  update public.witness_lema_published_site
  set payload = jsonb_set(payload, '{assistant}', defaults || coalesce(payload->'assistant', '{}'::jsonb), true),
      updated_at = now()
  where id = 'main';
end $$;
