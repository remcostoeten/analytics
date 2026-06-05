DO $$
BEGIN
	IF to_regclass('public.resume') IS NOT NULL AND to_regclass('public.old_resume') IS NULL THEN
		ALTER TABLE public.resume RENAME TO old_resume;
	END IF;

	IF to_regclass('public.visitor_events') IS NOT NULL AND to_regclass('public.old_visitor_events') IS NULL THEN
		ALTER TABLE public.visitor_events RENAME TO old_visitor_events;
	END IF;
END $$;
