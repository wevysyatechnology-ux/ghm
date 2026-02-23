/*
  # Add Indexes for Foreign Keys

  1. Purpose
    - Add indexes to all foreign key columns to improve query performance
    - Prevents suboptimal query performance at scale
    - Ensures fast JOIN operations and constraint checks

  2. Tables Updated
    - attendance: marked_by, member_id
    - channel_posts: channel_id, user_id
    - core_deals: creator_id, house_id
    - core_house_members: house_id
    - core_i2we: house_id, member_1_id, member_2_id
    - core_links: from_user_id, house_id, to_user_id
    - deal_participants: user_id
    - deals: created_by, from_member_id, house_id, to_member_id
    - houses: created_by
    - i2we_events: created_by, member_id
    - links: created_by, from_member_id, house_id, to_member_id
    - members: house_id, profile_id
    - profiles: house_id

  3. Performance Impact
    - Significantly improves JOIN performance
    - Speeds up foreign key constraint validation
    - Reduces query execution time for related data lookups
*/

-- Attendance table indexes
CREATE INDEX IF NOT EXISTS idx_attendance_marked_by ON attendance(marked_by);
CREATE INDEX IF NOT EXISTS idx_attendance_member_id ON attendance(member_id);

-- Channel posts indexes
CREATE INDEX IF NOT EXISTS idx_channel_posts_channel_id ON channel_posts(channel_id);
CREATE INDEX IF NOT EXISTS idx_channel_posts_user_id ON channel_posts(user_id);

-- Core deals indexes
CREATE INDEX IF NOT EXISTS idx_core_deals_creator_id ON core_deals(creator_id);
CREATE INDEX IF NOT EXISTS idx_core_deals_house_id ON core_deals(house_id);

-- Core house members indexes
CREATE INDEX IF NOT EXISTS idx_core_house_members_house_id ON core_house_members(house_id);

-- Core I2WE indexes
CREATE INDEX IF NOT EXISTS idx_core_i2we_house_id ON core_i2we(house_id);
CREATE INDEX IF NOT EXISTS idx_core_i2we_member_1_id ON core_i2we(member_1_id);
CREATE INDEX IF NOT EXISTS idx_core_i2we_member_2_id ON core_i2we(member_2_id);

-- Core links indexes
CREATE INDEX IF NOT EXISTS idx_core_links_from_user_id ON core_links(from_user_id);
CREATE INDEX IF NOT EXISTS idx_core_links_house_id ON core_links(house_id);
CREATE INDEX IF NOT EXISTS idx_core_links_to_user_id ON core_links(to_user_id);

-- Deal participants indexes
CREATE INDEX IF NOT EXISTS idx_deal_participants_user_id ON deal_participants(user_id);

-- Deals table indexes
CREATE INDEX IF NOT EXISTS idx_deals_created_by ON deals(created_by);
CREATE INDEX IF NOT EXISTS idx_deals_from_member_id ON deals(from_member_id);
CREATE INDEX IF NOT EXISTS idx_deals_house_id ON deals(house_id);
CREATE INDEX IF NOT EXISTS idx_deals_to_member_id ON deals(to_member_id);

-- Houses table indexes
CREATE INDEX IF NOT EXISTS idx_houses_created_by ON houses(created_by);

-- I2WE events indexes
CREATE INDEX IF NOT EXISTS idx_i2we_events_created_by ON i2we_events(created_by);
CREATE INDEX IF NOT EXISTS idx_i2we_events_member_id ON i2we_events(member_id);

-- Links table indexes
CREATE INDEX IF NOT EXISTS idx_links_created_by ON links(created_by);
CREATE INDEX IF NOT EXISTS idx_links_from_member_id ON links(from_member_id);
CREATE INDEX IF NOT EXISTS idx_links_house_id ON links(house_id);
CREATE INDEX IF NOT EXISTS idx_links_to_member_id ON links(to_member_id);

-- Members table indexes
CREATE INDEX IF NOT EXISTS idx_members_house_id ON members(house_id);
CREATE INDEX IF NOT EXISTS idx_members_profile_id ON members(profile_id);

-- Profiles table indexes
CREATE INDEX IF NOT EXISTS idx_profiles_house_id ON profiles(house_id);