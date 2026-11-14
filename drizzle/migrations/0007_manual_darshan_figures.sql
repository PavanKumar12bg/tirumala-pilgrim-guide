ALTER TABLE public.site_status
  ADD COLUMN manual_mode text NOT NULL DEFAULT 'auto' CHECK (manual_mode IN ('auto','manual')),
  ADD COLUMN manual_wait_min_hours numeric CHECK (manual_wait_min_hours IS NULL OR (manual_wait_min_hours >= 0 AND manual_wait_min_hours <= 72)),
  ADD COLUMN manual_wait_max_hours numeric CHECK (manual_wait_max_hours IS NULL OR (manual_wait_max_hours >= 0 AND manual_wait_max_hours <= 72)),
  ADD COLUMN manual_compartments integer CHECK (manual_compartments IS NULL OR (manual_compartments >= 0 AND manual_compartments <= 100)),
  ADD COLUMN manual_updated_at timestamptz;
ALTER TABLE public.site_status ADD CONSTRAINT site_status_manual_range CHECK (manual_wait_min_hours IS NULL OR manual_wait_max_hours IS NULL OR manual_wait_max_hours >= manual_wait_min_hours);