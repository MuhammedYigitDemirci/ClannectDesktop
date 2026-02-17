-- Backfill level column for all existing accounts based on their XP
-- This creates a function that mimics the calculateLevelFromXp logic and applies it to all profiles

CREATE OR REPLACE FUNCTION calculate_level_from_xp(total_xp INTEGER)
RETURNS INTEGER AS $$
DECLARE
  level INTEGER := 1;
  xp_used INTEGER := 0;
  xp_needed INTEGER;
BEGIN
  WHILE level < 100 LOOP
    -- Determine XP cost based on tier (matches XP_CONFIG in app)
    IF level >= 1 AND level < 10 THEN
      xp_needed := 50;
    ELSIF level >= 10 AND level < 30 THEN
      xp_needed := 125;
    ELSIF level >= 30 AND level < 50 THEN
      xp_needed := 300;
    ELSIF level >= 50 AND level < 80 THEN
      xp_needed := 700;
    ELSIF level >= 80 AND level < 90 THEN
      xp_needed := 1500;
    ELSIF level >= 90 AND level < 101 THEN
      xp_needed := 2000;
    ELSE
      EXIT;
    END IF;
    
    IF xp_used + xp_needed > total_xp THEN
      EXIT;
    END IF;
    
    xp_used := xp_used + xp_needed;
    level := level + 1;
  END LOOP;
  
  RETURN level;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Update all profiles with calculated level based on their XP
UPDATE profiles 
SET level = calculate_level_from_xp(xp)
WHERE xp > 0;

-- Also handle the case where XP is 0 (should be level 1)
UPDATE profiles
SET level = 1
WHERE xp = 0 AND level IS NULL;
