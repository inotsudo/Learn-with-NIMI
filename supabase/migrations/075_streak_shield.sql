-- Allow streak shields to be purchased multiple times (consumable items).
-- Replace the blanket unique constraint with a partial one that only applies
-- to cosmetic/non-consumable items.

alter table shop_purchases drop constraint shop_purchases_child_id_item_id_key;

create unique index shop_purchases_cosmetics_unique
  on shop_purchases (child_id, item_id)
  where item_id != 'streakShield';
