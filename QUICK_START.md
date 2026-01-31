
# 🚀 ProxiTask - Quick Start Guide

## 📱 Running the App

```bash
# Install dependencies (if not already done)
npm install

# Start the development server
npm run dev

# Or platform-specific:
npm run web    # Web browser
npm run ios    # iOS simulator
npm run android # Android emulator
```

---

## 🔐 First-Time Setup

### 1. Create a Test Account
1. Launch the app
2. Click "Don't have an account? Sign Up"
3. Enter:
   - **Email:** `demo@proxitask.com`
   - **Password:** `Demo123!`
   - **Name:** `Demo User`
4. Click "Sign Up"

### 2. Grant Permissions
- **Location:** Required for proximity notifications
- **Notifications:** Required for task alerts
- **Background Location:** Optional, for background tracking

---

## ✅ Testing Checklist

### Authentication
- [ ] Sign up with email/password
- [ ] Sign in with existing account
- [ ] Sign out and sign back in
- [ ] Refresh page - should stay signed in
- [ ] Try Google OAuth (web only)

### Task Management
- [ ] Create a task with address
- [ ] View task on map
- [ ] Mark task as complete
- [ ] Delete task (with confirmation)
- [ ] Create task with bullet points

### Location Features
- [ ] See your location on map
- [ ] See distance to tasks
- [ ] Move near a task (< 1 mile)
- [ ] Receive notification

---

## 🧪 Sample Test Data

### Test Addresses (USA):
```
1600 Amphitheatre Parkway, Mountain View, CA
1 Apple Park Way, Cupertino, CA
350 5th Ave, New York, NY
1600 Pennsylvania Avenue NW, Washington, DC
```

### Sample Tasks:
1. **Title:** "Buy groceries"
   **Address:** "123 Main St, San Francisco, CA"
   **Bullets:** Milk, Eggs, Bread

2. **Title:** "Pick up dry cleaning"
   **Address:** "456 Market St, San Francisco, CA"
   **Bullets:** Shirts, Pants

3. **Title:** "Visit library"
   **Address:** "789 Library Ave, San Francisco, CA"
   **Bullets:** Return books, Get new card

---

## 🔍 Debugging

### Check API Calls
Open browser console and look for:
```
[API] Calling: https://...
[API] Success: {...}
[API] Error: ...
```

### Check Authentication
1. Go to Profile tab
2. Verify your email is displayed
3. Try signing out and back in

### Check Location
1. Open browser console
2. Look for location permission prompts
3. Check map shows your location marker

---

## 🎯 Key Features to Test

### ✅ Must Test
- Sign up / Sign in
- Create task with address
- View tasks on map
- Delete task
- Sign out

### 🔄 Should Test
- Mark task complete
- Add bullet points
- View distance to tasks
- Refresh page (session persistence)

### 🌟 Nice to Test
- Google OAuth (web)
- Apple OAuth (iOS)
- Background location (physical device)
- Proximity notifications (physical device)

---

## 📝 Notes

- **Web:** OAuth works via popup windows
- **Native:** OAuth uses deep linking
- **Geocoding:** Requires valid address format
- **Notifications:** Only trigger when < 1 mile from task
- **Session:** Auto-refreshes every 5 minutes

---

## 🐛 Common Issues

### "Authentication token not found"
→ Sign in again

### "Failed to load tasks"
→ Check network connection

### "Geocoding failed"
→ Use more specific address (include city, state)

### Location not showing
→ Grant location permissions in device settings

---

## 🎉 Success Criteria

You've successfully tested the app when:
- [x] You can sign up and sign in
- [x] You can create tasks with addresses
- [x] Tasks appear on the map
- [x] You can complete and delete tasks
- [x] You can sign out
- [x] Session persists after refresh

---

**Happy Testing! 🚀**
