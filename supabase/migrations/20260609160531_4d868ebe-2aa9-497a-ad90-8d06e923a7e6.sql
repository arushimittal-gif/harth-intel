
GRANT SELECT ON public.properties TO anon;
GRANT SELECT ON public.permits TO anon;
GRANT SELECT ON public.crm_contacts TO anon;
GRANT SELECT ON public.property_photos TO anon;

CREATE POLICY "properties public read" ON public.properties FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "permits public read" ON public.permits FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "crm_contacts public read" ON public.crm_contacts FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "property_photos public read" ON public.property_photos FOR SELECT TO anon, authenticated USING (true);
