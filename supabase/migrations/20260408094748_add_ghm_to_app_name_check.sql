/*
  # Add GHM to product_requests app_name check constraint

  1. Changes
    - Drops the existing `product_requests_app_name_check` constraint
    - Recreates it with 'GHM' included as a valid app_name value
*/

ALTER TABLE product_requests
  DROP CONSTRAINT IF EXISTS product_requests_app_name_check;

ALTER TABLE product_requests
  ADD CONSTRAINT product_requests_app_name_check
  CHECK (app_name IN ('WeVysya AI', 'WeVysya Social', 'WeVysya Meeting Companion', 'GHM'));
