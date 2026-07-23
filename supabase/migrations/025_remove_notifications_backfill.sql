-- =====================================================================
-- Migration 025: Remove the notifications backfill table/function
-- =====================================================================
-- The missed-progress notification system now computes everything live,
-- client-side, straight from tasks/task_updates — no stored notifications
-- table or backfill RPC to keep in sync (the prior approach silently
-- produced nothing if this migration path was ever missed, which is
-- exactly what happened). The member-facing self-alert is replaced by a
-- personal activity calendar; the admin escalation is now computed on
-- demand instead of relying on this table.
--
-- users.notifications_access is intentionally kept — it still gates
-- whether an admin sees the (now live-computed) alerts at all.

DROP TABLE IF EXISTS public.notifications;
DROP FUNCTION IF EXISTS public.generate_missed_progress_notifications();
