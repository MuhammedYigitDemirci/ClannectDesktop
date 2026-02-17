# 🔴 CRITICAL: Enable Realtime on Messages Table

Real-time message deletion requires **Realtime to be ENABLED on the `messages` table** in Supabase. Without this, the other user won't see deleted messages until they refresh the page.

## Steps to Enable Realtime:

### 1. Go to Supabase Dashboard
- Navigate to your Supabase project: https://app.supabase.com

### 2. Enable Realtime on the Messages Table
- Go to **Database** → **Tables**
- Find the **`messages`** table
- Click on the table
- Go to the **"Realtime"** tab at the top
- Toggle **"Realtime Enabled"** to **ON**
- Click **"Save"**

### 3. Verify Postgres Changes Events are Enabled
Make sure these events are enabled:
- ✅ **SELECT** (for fetching messages)
- ✅ **INSERT** (for new messages - should already work)
- ✅ **UPDATE** (for potential future message edits)
- ✅ **DELETE** (for message deletions - CRITICAL)

### 4. Test Real-Time Deletion

1. Open a conversation in **two browser tabs/windows**
2. Send a message in Tab 1
3. Verify the message appears in Tab 2 in real-time
4. Delete the message in Tab 1
5. **Without refreshing Tab 2**, the message should disappear immediately

## Why This Is Required

The application uses **Supabase Realtime** to broadcast database changes to all connected clients. When you delete a message:

```typescript
// 1. You delete the message from your side
setMessages(prev => prev.filter(m => m.id !== messageId))

// 2. Database is updated
await supabase.from('messages').delete().eq('id', messageId)

// 3. Supabase broadcasts DELETE event to all listeners
// (Only works if Realtime is ENABLED on the table)

// 4. Other user's client receives the event and updates their UI
setMessages(prev => prev.filter(m => m.id !== payload.old.id))
```

## Check Console Logs

Open the browser **Developer Console** (F12) and look for:

```
🔌 Setting up real-time subscription for conversation: [ID]
⚠️ IMPORTANT: Realtime must be ENABLED on the messages table in Supabase Dashboard!
📡 ===== CHANNEL SUBSCRIPTION STATUS =====
✅ Real-time subscription ACTIVE for conversation: [ID]
✅ Will now receive DELETE events in real-time
✅ Other users will see your deletions immediately
```

If you see **CHANNEL_ERROR** instead, Realtime is not enabled.

## If Still Not Working

1. **Hard refresh the page** (Ctrl+F5 or Cmd+Shift+R)
2. **Check browser console** for errors (F12)
3. **Verify the conversation ID** is consistent in both tabs
4. **Check RLS Policies** on the messages table are correct:
   - DELETE policy: `auth.uid() = sender_id` ✅
5. **Check Supabase status** at https://status.supabase.io

---

**After enabling Realtime, message deletion will work in real-time! 🚀**
