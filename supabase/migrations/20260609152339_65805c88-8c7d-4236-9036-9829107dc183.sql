
-- properties
CREATE TABLE public.properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  data_source text NOT NULL,
  owner_name text,
  owner_type text,
  address text NOT NULL,
  city text,
  state text,
  zip text,
  county text,
  municipality text,
  street_address text,
  street_city text,
  street_state text,
  street_zip text,
  beds numeric,
  baths numeric,
  sq_ft numeric,
  lot_size text,
  lot_size_acres numeric,
  year_built integer,
  property_class text,
  building_description text,
  land_description text,
  market_value numeric,
  assessed_value numeric,
  net_value numeric,
  land_value numeric,
  improvement_value numeric,
  tax_bill numeric,
  last_sale_date date,
  last_sale_price numeric,
  apn text,
  gis_pin text,
  deed_book text,
  deed_page text,
  zoning text,
  no_of_units numeric,
  permit_count integer DEFAULT 0,
  permit_details text,
  lat double precision,
  lng double precision,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX properties_data_source_idx ON public.properties(data_source);
CREATE INDEX properties_city_idx ON public.properties(city);
CREATE INDEX properties_zip_idx ON public.properties(zip);
CREATE INDEX properties_year_built_idx ON public.properties(year_built);

GRANT SELECT ON public.properties TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.properties TO authenticated;
GRANT ALL ON public.properties TO service_role;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
CREATE POLICY "properties public read" ON public.properties FOR SELECT USING (true);

-- permits
CREATE TABLE public.permits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid REFERENCES public.properties(id) ON DELETE CASCADE,
  property_address text NOT NULL,
  permit_number text,
  effective_date date,
  job_value numeric,
  status text,
  permit_type text,
  sub_type text,
  business_name text,
  home_owner text,
  fees numeric,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX permits_property_id_idx ON public.permits(property_id);
CREATE INDEX permits_property_address_idx ON public.permits(property_address);

GRANT SELECT ON public.permits TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.permits TO authenticated;
GRANT ALL ON public.permits TO service_role;
ALTER TABLE public.permits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "permits public read" ON public.permits FOR SELECT USING (true);

-- crm_contacts
CREATE TABLE public.crm_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name text,
  last_name text,
  email text,
  phone text,
  address text,
  city text,
  state text,
  zip text,
  linkedin_url text,
  lat double precision,
  lng double precision,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX crm_contacts_city_idx ON public.crm_contacts(city);
CREATE INDEX crm_contacts_zip_idx ON public.crm_contacts(zip);
CREATE INDEX crm_contacts_email_idx ON public.crm_contacts(email);

GRANT SELECT ON public.crm_contacts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_contacts TO authenticated;
GRANT ALL ON public.crm_contacts TO service_role;
ALTER TABLE public.crm_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "crm_contacts public read" ON public.crm_contacts FOR SELECT USING (true);

-- property_photos
CREATE TABLE public.property_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid REFERENCES public.properties(id) ON DELETE CASCADE,
  url text NOT NULL,
  source text,
  caption text,
  is_primary boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX property_photos_property_id_idx ON public.property_photos(property_id);

GRANT SELECT ON public.property_photos TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.property_photos TO authenticated;
GRANT ALL ON public.property_photos TO service_role;
ALTER TABLE public.property_photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "property_photos public read" ON public.property_photos FOR SELECT USING (true);

-- saved_views (per user)
CREATE TABLE public.saved_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  filters jsonb NOT NULL DEFAULT '{}'::jsonb,
  map_state jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX saved_views_user_id_idx ON public.saved_views(user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_views TO authenticated;
GRANT ALL ON public.saved_views TO service_role;
ALTER TABLE public.saved_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "saved_views own" ON public.saved_views FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- search_history (per user)
CREATE TABLE public.search_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX search_history_user_id_idx ON public.search_history(user_id);
CREATE INDEX search_history_created_at_idx ON public.search_history(created_at DESC);

GRANT SELECT, INSERT ON public.search_history TO authenticated;
GRANT ALL ON public.search_history TO service_role;
ALTER TABLE public.search_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "search_history own" ON public.search_history FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
