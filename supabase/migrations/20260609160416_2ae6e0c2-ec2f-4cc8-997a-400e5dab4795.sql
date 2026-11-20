
DROP POLICY IF EXISTS "properties public read" ON public.properties;
DROP POLICY IF EXISTS "permits public read" ON public.permits;
DROP POLICY IF EXISTS "crm_contacts public read" ON public.crm_contacts;
DROP POLICY IF EXISTS "property_photos public read" ON public.property_photos;

CREATE POLICY "properties authenticated read" ON public.properties FOR SELECT TO authenticated USING (true);
CREATE POLICY "permits authenticated read" ON public.permits FOR SELECT TO authenticated USING (true);
CREATE POLICY "crm_contacts authenticated read" ON public.crm_contacts FOR SELECT TO authenticated USING (true);
CREATE POLICY "property_photos authenticated read" ON public.property_photos FOR SELECT TO authenticated USING (true);

REVOKE SELECT ON public.properties FROM anon;
REVOKE SELECT ON public.permits FROM anon;
REVOKE SELECT ON public.crm_contacts FROM anon;
REVOKE SELECT ON public.property_photos FROM anon;

GRANT SELECT ON public.properties TO authenticated;
GRANT SELECT ON public.permits TO authenticated;
GRANT SELECT ON public.crm_contacts TO authenticated;
GRANT SELECT ON public.property_photos TO authenticated;
