# XP System Implementation Guide

## ✅ COMPLETED

### Database
- [x] `xp` column added to profiles table
- [x] `level` column added to profiles table
- [x] `last_post_time` column added to profiles table for post cooldown tracking

### Frontend - Profile Pages (/profile & /profile/[username])
- [x] Profile interface updated with `xp` and `last_post_time` fields
- [x] XP configuration object with all rules defined
- [x] XP calculation functions:
  - `calculateXpForLevel()` - Get XP needed for current level
  - `calculateTotalXpForLevel()` - Get cumulative XP for level
  - `getLevelFromXp()` - Calculate level, progress bar percentage from total XP
- [x] XP bar display in profile header showing:
  - Current XP / Required XP for next level
  - Progress percentage
  - Animated gradient bar (red-orange)
- [x] Profile edit XP rewards integrated:
  - Avatar change: 10 XP
  - Banner change: 10 XP
  - About Me edit: 30 XP
  - XP awarded on save, updates profile and level automatically

### Frontend - Post Creation (src/app/post/page.tsx)
- [x] XP config added with cooldown and action values
- [x] Post cooldown check implemented:
  - 1 hour cooldown between posts
  - Shows countdown timer if cooldown is active
  - Button disabled during cooldown with message: "⏱️ Post cooldown: X minute(s) remaining"
- [x] Post creation XP reward:
  - +10 XP awarded when post is created
  - `last_post_time` updated to current timestamp
  - Success message shows: "Post created successfully! 🎉 +10 XP"
  - Console logs XP earned for debugging

### Frontend - Hub Page Comments (src/app/hub/page.tsx)
- [x] XP config added with cooldown and action values
- [x] Comment cooldown check implemented:
  - `checkCommentCooldown()` function queries last 20 minutes of comments
  - If 5 comments in 20 minutes: Shows alert "⏱️ You've reached the comment limit (5 comments per 20 minutes)"
  - Prevents comment submission while on cooldown
- [x] Comment XP reward:
  - +3 XP awarded when comment is posted
  - XP immediately added to user profile
  - Console logs XP earned for debugging

### Frontend - Profile Page Comments (src/app/profile/page.tsx)
- [x] XP config added with cooldown and action values
- [x] Comment cooldown check implemented:
  - Same cooldown logic as hub page
  - 5 comments per 20 minutes limit
  - Cooldown alert shown to users
- [x] Comment XP reward:
  - +3 XP awarded when commenting on own posts
  - Profile XP updated in database
  - Console logs XP earned

### Build Status
✅ **Compiled successfully** - No errors (12.9s)

---

## ⏳ REMAINING IMPLEMENTATION

### 1. Public Profile Page Comments (src/app/profile/[username]/page.tsx)
**Status:** Page exists but needs verification if comments are enabled

**If comments are enabled:**
- Add XP config constant
- Add `checkCommentCooldown()` function
- Update `addComment()` function with cooldown check and XP reward
- Same implementation as profile/page.tsx

### 2. Follower XP System (Optional - More Complex)
**Concept:** Every new follower = 5 XP

**Current Status:** Not implemented

**Challenges:**
- Need to track when followers were added (followers table needs created_at timestamp)
- Could be real-time via triggers or batch processed
- Requires trigger or manual update when follow relationship is created

**Recommendation:** Implement after core system is working and stable

---

## XP/Level Structure

### XP Earning ✅
- Avatar Change: 10 XP ✅
- Banner Change: 10 XP ✅
- About Me: 30 XP ✅
- Create Post: 10 XP (1 hour cooldown) ✅
- Comment: 3 XP (5 per 20 minutes max) ✅
- Per Follower: 5 XP ⏳ (Not yet implemented)

### Level Requirements ✅
- Levels 1-10: 50 XP/level
- Levels 10-30: 125 XP/level
- Levels 30-50: 300 XP/level
- Levels 50-80: 700 XP/level
- Levels 80-90: 1,500 XP/level
- Levels 90-100: 2,000 XP/level

### Total XP to Reach Levels
- Level 10: 450 XP
- Level 20: 1,700 XP
- Level 30: 3,450 XP
- Level 50: 8,450 XP
- Level 80: 28,450 XP
- Level 100: 53,450 XP

---

## Implementation Details

### Post Cooldown Flow
1. User tries to create post
2. Check if `profile.last_post_time` exists
3. If exists, calculate minutes since last post
4. If less than 60 minutes, show alert and disable posting
5. If allowed, create post and set `last_post_time` to now
6. Award 10 XP and update profile

### Comment Cooldown Flow
1. User tries to comment
2. Query `post_comments` table for comments from this user in last 20 minutes
3. Count results
4. If count >= 5, show alert and prevent comment
5. If allowed, insert comment
6. Award 3 XP to user profile

### XP Calculation (Dynamic Based on Total XP)
- `getLevelFromXp()` calculates current level from total XP
- Level starts at 1
- For each level, add required XP until total XP exceeds threshold
- Returns: { level, currentLevelXp, nextLevelXp, progress: 0-100% }
- XP bar shows progress to next level

---

## Testing Checklist

- [x] Create new post → verify 10 XP added and cooldown starts
- [x] Try posting again immediately → verify 1-hour cooldown message
- [x] Add comment → verify 3 XP added
- [x] Add 5 comments in 20 minutes → verify cooldown on 5th attempt
- [x] Edit avatar → verify 10 XP added
- [x] Edit banner → verify 10 XP added
- [x] Edit about me → verify 30 XP added
- [ ] Verify level increases when XP threshold reached
- [ ] Verify XP bar updates in real-time
- [ ] Test cooldown timer countdown

---

## Code Locations

### Configuration & Utilities
- All pages: `XP_CONFIG` constant defined at top of file
- Profile pages: `calculateXpForLevel()`, `calculateTotalXpForLevel()`, `getLevelFromXp()`
- Profile pages: `addXp()` helper function

### Cooldown Functions
- Hub page: `checkCommentCooldown()` async function
- Profile page: `checkCommentCooldown()` async function
- Post page: Cooldown check inline in `handleSubmit()`

### XP Reward Integration
- Post page: In `handleSubmit()` after post database insert
- Hub page: In `addComment()` after comment insert
- Profile page: In `addComment()` after comment insert

### UI Components
- Profile pages: XP bar JSX in profile header (shows current/max XP and percentage)
- Post page: Cooldown message JSX replaces submit button when active
- Hub page: Alert shown when comment cooldown triggered
- Profile page: Alert shown when comment cooldown triggered

---

## Notes

- All XP calculations are client-side for instant feedback
- Database updates happen asynchronously (post creation, comment, profile save)
- Cooldown checks query database to prevent cheating
- Success messages show XP earned: "Post created successfully! 🎉 +10 XP"
- Console logs include emojis for visual debugging: ✨ Earned X XP
- XP bar uses gradient: `from-[#ff4234] to-[#ff6b52]` (red-orange)
- Consider adding XP notification toast/badge when earning XP
- Consider adding XP milestone notifications ("Level Up!" when advancing)
