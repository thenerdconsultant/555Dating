# Render Persistent Disk Setup Guide

## Problem
By default, uploads were being saved to ephemeral storage which gets wiped on every redeploy. You paid for persistent disk storage on Render, but the app wasn't configured to use it!

## Solution
Configure the app to save uploads to Render's persistent disk.

---

## Step 1: Check Your Persistent Disk Configuration on Render

1. Go to https://dashboard.render.com/
2. Click on your service: **five55dating**
3. Click **"Settings"** in the left sidebar
4. Scroll down to **"Disks"**

You should see something like:
- **Name:** data (or similar)
- **Mount Path:** `/opt/render/project/data` (or `/var/data`)
- **Size:** Whatever you paid for

✅ **Take note of the Mount Path** - you'll need it for Step 2!

---

## Step 2: Add UPLOADS_PATH Environment Variable

Still on Render:

1. Go to the **"Environment"** tab
2. Click **"Add Environment Variable"**
3. Add this variable:

**Key:** `UPLOADS_PATH`
**Value:** `<YOUR_MOUNT_PATH>/uploads`

Example:
- If Mount Path is `/opt/render/project/data`
- Set `UPLOADS_PATH=/opt/render/project/data/uploads`

**Important:** Add `/uploads` to the end of your mount path!

4. Click **"Save Changes"**
5. Render will redeploy automatically

---

## Step 3: Verify It's Working

After Render redeploys:

1. Check the logs: Look for this message:
   ```
   Created uploads directory: /opt/render/project/data/uploads
   Serving uploads from: /opt/render/project/data/uploads
   ```

2. Upload a test photo in your app
3. The photo should persist even after redeploying!

---

## What Changed in the Code

The code now:
- ✅ Reads `UPLOADS_PATH` from environment variables
- ✅ Falls back to `server/uploads` for local development
- ✅ Creates the uploads directory if it doesn't exist
- ✅ Saves all photos/selfies to the configured path
- ✅ Serves static files from the persistent disk

---

## Troubleshooting

### "Created uploads directory" message not appearing
- Check that `UPLOADS_PATH` environment variable is set correctly
- Verify your disk mount path matches what's in Render settings

### Photos still disappearing
- Verify persistent disk is actually mounted (check Render settings)
- Make sure you have the paid persistent disk addon
- Check Render logs for any permission errors

### Old photos still broken
- After fixing the UPLOADS_PATH, old photos are gone (they were on ephemeral storage)
- Users will need to re-upload their photos
- The database cleanup endpoint will remove broken photo references

---

## Resetting Everything (If Needed)

If you want to start fresh:

1. Call the cleanup endpoint (requires admin login):
   ```javascript
   fetch('https://five55dating.onrender.com/api/admin/fix-photos', {
     method: 'POST',
     credentials: 'include'
   }).then(r => r.json()).then(console.log);
   ```

2. This will remove all broken photo references from the database
3. Users can then re-upload their photos to the persistent storage

---

## Cost Note

Render persistent disks are billed separately from your web service. Make sure you're aware of the costs!

- Persistent SSD storage: ~$0.25/GB/month
- Check your Render billing dashboard for exact pricing
