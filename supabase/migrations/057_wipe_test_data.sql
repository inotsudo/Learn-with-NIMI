-- ═══════════════════════════════════════════════════════════
-- Wipe test/demo content data — keep schema, accounts, products
-- ═══════════════════════════════════════════════════════════

-- Progress & achievements
DELETE FROM subscription_renewals;
DELETE FROM nimipiko_subscriptions;
DELETE FROM content_access;
DELETE FROM orders;
DELETE FROM payment_methods;
DELETE FROM child_progress;
DELETE FROM child_achievements;
DELETE FROM coloring_saves;

-- Community
DELETE FROM likes;
DELETE FROM creations;

-- Story content
DELETE FROM story_page_versions;
DELETE FROM story_pages;
DELETE FROM story_versions;
DELETE FROM story_slots;
DELETE FROM coloring_pages;
DELETE FROM stories;

-- Missions
DELETE FROM mission_versions;
DELETE FROM missions;

-- Weekly challenges
DELETE FROM weekly_challenges;

-- Children (keeps parent accounts)
DELETE FROM children;

-- Notifications
DELETE FROM notifications;
DELETE FROM push_subscriptions;
