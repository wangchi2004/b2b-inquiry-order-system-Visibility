grant usage on schema public to service_role;
grant select, insert, update, delete on table public.email_templates to service_role;
grant select, insert, update, delete on table public.email_template_products to service_role;
grant select, insert, update, delete on table public.email_send_logs to service_role;

notify pgrst, 'reload schema';
