/*
# Capture membership history for event attendance

1. Modified Table: `public.event_attendance`
- Adds nullable `membership_id` referencing the membership term active when the check-in was created.
- Existing attendance rows are backfilled to the member's first term.

2. New Trigger
- Automatically captures the current active term on every new event check-in.
- A later rejoin cannot change the code attached to an older check-in.

3. Security
- The new reference follows the existing event attendance row access rules.
- No existing attendance row or event data is deleted or changed.
*/

ALTER TABLE public.event_attendance
  ADD COLUMN IF NOT EXISTS membership_id uuid REFERENCES public.memberships(id) ON DELETE SET NULL;

UPDATE public.event_attendance e
SET membership_id = m.id
FROM public.memberships m
WHERE e.membership_id IS NULL
  AND e.member_id = m.member_id;

DROP TRIGGER IF EXISTS capture_event_attendance_membership ON public.event_attendance;
CREATE TRIGGER capture_event_attendance_membership
BEFORE INSERT ON public.event_attendance
FOR EACH ROW
EXECUTE FUNCTION public.capture_current_membership('member_id', 'membership_id');
