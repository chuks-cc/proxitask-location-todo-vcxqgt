
# 🧪 ProxiTask Testing Guide

## 📋 Overview

This guide will help you test the ProxiTask application after the backend authentication fix. The backend was updated to properly configure Better Auth with OAuth providers and email/password authentication.

---

## 🔐 Authentication Testing

### Test 1: Email Sign Up

**Steps:**
1. Launch the app (you'll be redirected to the auth screen)
2. Click "Don't have an account? Sign Up"
3. Enter the following:
   - **Name:** Test User
   - **Email:** test@example.com
   - **Password:** password123
4. Click "Sign Up"

**Expected Result:**
- ✅ Account is created successfully
- ✅ You're automatically signed in
- ✅ Redirected to the home screen
- ✅ No errors or "authentication cancelled" messages

**If it fails:**
- Check console logs for error messages
- Verify backend is running at: https://2866sc2ucfrrp8nf5fvke56cet4smzdj.app.specular.dev
- Try a different email address

---

### Test 2: Email Sign In

**Steps:**
1. If you're signed in, sign out first (Profile tab → Sign Out)
2. On the auth screen, enter:
   - **Email:** test@example.com
   - **Password:** password123
3. Click "Sign In"

**Expected Result:**
- ✅ Successfully signed in
- ✅ Redirected to home screen
- ✅ Your tasks load automatically

**If it fails:**
- Verify you used the correct credentials
- Check if the account was created in Test 1
- Check console logs for error messages

---

### Test 3: Google OAuth (Web Only)

**Steps:**
1. Open the app in a web browser
2. On the auth screen, click "Continue with Google"
3. A popup window should open
4. Complete the Google sign-in flow
5. The popup should close automatically

**Expected Result:**
- ✅ Popup opens successfully
- ✅ Google sign-in flow completes
- ✅ Popup closes and you're signed in
- ✅ Redirected to home screen

**If it fails:**
- Check if popups are blocked in your browser
- Verify Google OAuth credentials are configured in backend
- Check console logs in both main window and popup

**Note:** If Google OAuth credentials are not configured in the backend, the provider will gracefully not be available rather than causing 500 errors.

---

### Test 4: Apple OAuth (iOS Only)

**Steps:**
1. Open the app on an iOS device or simulator
2. On the auth screen, click "Continue with Apple"
3. Complete the Apple sign-in flow
4. Return to the app

**Expected Result:**
- ✅ Apple sign-in flow starts
- ✅ Successfully signed in
- ✅ Redirected to home screen

**If it fails:**
- Verify Apple OAuth credentials are configured in backend
- Check if Apple Sign In is enabled in your Apple Developer account
- Check console logs for error messages

---

### Test 5: Session Persistence

**Steps:**
1. Sign in to the app
2. **On Web:** Refresh the page
3. **On Native:** Close and reopen the app

**Expected Result:**
- ✅ You remain signed in
- ✅ No redirect to auth screen
- ✅ Tasks load automatically
- ✅ No "authentication cancelled" errors

**If it fails:**
- Check if tokens are being stored correctly
- Look for errors in console about token retrieval
- Try signing out and back in

---

### Test 6: Sign Out

**Steps:**
1. Go to the Profile tab
2. Click "Sign Out"
3. Confirm in the modal

**Expected Result:**
- ✅ Confirmation modal appears
- ✅ Successfully signed out
- ✅ Redirected to auth screen
- ✅ Tokens cleared from storage

**If it fails:**
- Check console logs for sign out errors
- Verify you're redirected to auth screen
- Try refreshing the app

---

## 📝 Task Management Testing

### Test 7: Create a Task

**Steps:**
1. Sign in to the app
2. Click the blue "+" button (bottom right)
3. Enter:
   - **Title:** Buy groceries
   - **Address:** 1600 Amphitheatre Parkway, Mountain View, CA
   - **Bullet Points:** 
     - Milk
     - Eggs
     - Bread
4. Click "Save Task"

**Expected Result:**
- ✅ Address is geocoded successfully
- ✅ Task is created and appears in the list
- ✅ Task marker appears on the map
- ✅ Distance is calculated and displayed

**If it fails:**
- Check if you're signed in
- Verify the address is valid
- Check console logs for API errors
- Try a simpler address (e.g., "San Francisco, CA")

---

### Test 8: Mark Task as Complete

**Steps:**
1. Find a task in the list
2. Click the checkbox at the bottom
3. Observe the task

**Expected Result:**
- ✅ Task becomes semi-transparent
- ✅ Checkbox shows a checkmark
- ✅ Label changes to "Completed"
- ✅ Backend is updated (check by refreshing)

**If it fails:**
- Check console logs for PUT request errors
- Verify you're signed in
- Check if the task belongs to your account

---

### Test 9: Delete a Task

**Steps:**
1. Click the trash icon on a task
2. A confirmation modal should appear
3. Click "Delete"

**Expected Result:**
- ✅ Confirmation modal appears
- ✅ Task is removed from the list
- ✅ Task marker is removed from the map
- ✅ Backend is updated (check by refreshing)

**If it fails:**
- Check console logs for DELETE request errors
- Verify you're signed in
- Check if the task belongs to your account

---

### Test 10: Load Tasks on App Start

**Steps:**
1. Create a few tasks
2. Refresh the app (web) or close and reopen (native)

**Expected Result:**
- ✅ All your tasks load automatically
- ✅ Tasks appear in the list
- ✅ Task markers appear on the map
- ✅ Distances are calculated

**If it fails:**
- Check console logs for GET request errors
- Verify you're signed in
- Check if session persistence is working

---

## 📍 Location Testing

### Test 11: Location Permissions

**Steps:**
1. Launch the app for the first time
2. Grant location permissions when prompted

**Expected Result:**
- ✅ Foreground location permission requested
- ✅ Background location permission requested
- ✅ Notification permission requested
- ✅ Your location appears on the map

**If it fails:**
- Check device settings for location permissions
- Try uninstalling and reinstalling the app
- Check console logs for permission errors

---

### Test 12: Distance Calculation

**Steps:**
1. Create a task with a known address
2. Observe the distance badge on the task

**Expected Result:**
- ✅ Distance is displayed in miles
- ✅ Distance updates as you move
- ✅ Distance is accurate

**If it fails:**
- Check if location permissions are granted
- Verify your location is being tracked
- Check console logs for calculation errors

---

### Test 13: Proximity Notifications

**Steps:**
1. Create a task near your current location (within 1 mile)
2. Wait a few seconds

**Expected Result:**
- ✅ Notification appears
- ✅ Notification shows task title and distance
- ✅ Notification only appears once per task

**If it fails:**
- Check if notification permissions are granted
- Verify you're within 1 mile of the task
- Check console logs for notification errors
- Try moving closer to the task location

---

## 🐛 Error Handling Testing

### Test 14: Invalid Address

**Steps:**
1. Try to create a task with an invalid address
2. Enter: "asdfghjkl12345"
3. Click "Save Task"

**Expected Result:**
- ✅ Error modal appears
- ✅ Message: "Failed to save task. Please check the address and try again."
- ✅ Task is not created

---

### Test 15: Network Error

**Steps:**
1. Turn off your internet connection
2. Try to create a task
3. Turn internet back on

**Expected Result:**
- ✅ Error modal appears
- ✅ User-friendly error message
- ✅ App doesn't crash
- ✅ Can retry after reconnecting

---

### Test 16: Unauthorized Access

**Steps:**
1. Sign out of the app
2. Try to access the home screen directly

**Expected Result:**
- ✅ Redirected to auth screen
- ✅ No crash or error
- ✅ Can sign in again

---

## 🎯 Cross-Platform Testing

### Web Testing

**Browsers to test:**
- ✅ Chrome
- ✅ Firefox
- ✅ Safari
- ✅ Edge

**Features to verify:**
- ✅ OAuth popup works
- ✅ Session persistence (localStorage)
- ✅ Map displays correctly
- ✅ Modals display correctly
- ✅ No Alert.alert() crashes

---

### iOS Testing

**Devices to test:**
- ✅ iPhone (physical device)
- ✅ iOS Simulator

**Features to verify:**
- ✅ Apple Sign In works
- ✅ Session persistence (SecureStore)
- ✅ Background location tracking
- ✅ Push notifications
- ✅ Deep linking for OAuth

---

### Android Testing

**Devices to test:**
- ✅ Android phone (physical device)
- ✅ Android Emulator

**Features to verify:**
- ✅ Google Sign In works
- ✅ Session persistence (SecureStore)
- ✅ Background location tracking
- ✅ Push notifications
- ✅ Deep linking for OAuth

---

## 📊 Performance Testing

### Test 17: Large Task List

**Steps:**
1. Create 20+ tasks
2. Scroll through the list
3. Observe performance

**Expected Result:**
- ✅ List scrolls smoothly
- ✅ Map renders all markers
- ✅ No lag or stuttering
- ✅ Distance calculations are fast

---

### Test 18: Rapid Task Creation

**Steps:**
1. Create 5 tasks in quick succession
2. Observe the UI

**Expected Result:**
- ✅ All tasks are created
- ✅ No duplicate tasks
- ✅ UI remains responsive
- ✅ No race conditions

---

## 🔍 Console Log Verification

### Expected Log Messages

**On App Start:**
```
ProxiTask HomeScreen rendered
Initializing ProxiTask...
Requesting permissions...
Starting location tracking...
Loading tasks...
[API] Loading tasks from backend...
[API] Calling: https://2866sc2ucfrrp8nf5fvke56cet4smzdj.app.specular.dev/api/tasks GET
[API] Success: [...]
```

**On Task Creation:**
```
[API] Saving new task: {...}
[API] Geocoding address: 1600 Amphitheatre Parkway, Mountain View, CA
[API] Calling: https://2866sc2ucfrrp8nf5fvke56cet4smzdj.app.specular.dev/api/geocode POST
[API] Geocode result: {...}
[API] Creating task: {...}
[API] Calling: https://2866sc2ucfrrp8nf5fvke56cet4smzdj.app.specular.dev/api/tasks POST
[API] Task created: {...}
```

**On Sign In:**
```
[Auth] Signing in with email...
[Auth] Sign in successful
[Auth] Fetching user session...
[Auth] User session retrieved
```

---

## ✅ Final Checklist

Before considering testing complete, verify:

- [ ] Can sign up with email/password
- [ ] Can sign in with email/password
- [ ] Can sign in with Google (web)
- [ ] Can sign in with Apple (iOS)
- [ ] Session persists across app reloads
- [ ] Can create tasks
- [ ] Can mark tasks as complete
- [ ] Can delete tasks
- [ ] Tasks load on app start
- [ ] Location tracking works
- [ ] Distance calculation works
- [ ] Proximity notifications work
- [ ] Can sign out
- [ ] Error handling works
- [ ] No "authentication cancelled" errors
- [ ] No 500 errors from backend
- [ ] Custom modals work (no Alert.alert)
- [ ] Works on web
- [ ] Works on iOS
- [ ] Works on Android

---

## 🆘 Troubleshooting

### "Authentication cancelled" error
- **Cause:** OAuth provider not configured or popup blocked
- **Solution:** Check backend OAuth credentials or allow popups

### "Failed to load tasks"
- **Cause:** Not signed in or network error
- **Solution:** Sign in again or check network connection

### "Location permission required"
- **Cause:** Location permissions denied
- **Solution:** Grant permissions in device settings

### Tasks not loading
- **Cause:** Session expired or not signed in
- **Solution:** Sign out and sign in again

### Map not displaying
- **Cause:** Location permissions denied or map API issue
- **Solution:** Grant location permissions and check console logs

---

## 📞 Support

If you encounter issues not covered in this guide:
1. Check console logs for error messages
2. Verify backend is running and accessible
3. Try signing out and back in
4. Clear app data and try again
5. Check the BACKEND_INTEGRATION_COMPLETE.md for more details

---

**Happy Testing! 🎉**
