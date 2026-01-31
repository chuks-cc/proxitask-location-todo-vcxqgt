
# 🔗 API Integration Details - ProxiTask

## 📡 Backend Configuration

**Backend URL:** `https://2866sc2ucfrrp8nf5fvke56cet4smzdj.app.specular.dev`

**Configuration Location:** `app.json` → `expo.extra.backendUrl`

**Read By:** `utils/api.ts` using `Constants.expoConfig?.extra?.backendUrl`

---

## 🔐 Authentication

### Better Auth Integration

**Library:** `better-auth` + `@better-auth/expo`

**Client Configuration:** `lib/auth.ts`

**Auth Context:** `contexts/AuthContext.tsx`

### Authentication Methods

1. **Email/Password**
   - Sign up: `authClient.signUp.email({ email, password, name })`
   - Sign in: `authClient.signIn.email({ email, password })`

2. **Google OAuth**
   - Web: Opens popup window
   - Native: Uses deep linking with `ProxiTask://` scheme

3. **Apple OAuth** (iOS only)
   - Native: Uses deep linking

### Token Management

**Storage:**
- **Web:** `localStorage.getItem('ProxiTask_bearer_token')`
- **Native:** `SecureStore.getItemAsync('ProxiTask_bearer_token')`

**Auto-Refresh:** Token refreshed every 5 minutes via polling

**Header Format:** `Authorization: Bearer <token>`

---

## 🛠️ API Wrapper Functions

### Location: `utils/api.ts`

### Unauthenticated Calls

```typescript
// GET request
const data = await apiGet<ResponseType>('/endpoint');

// POST request
const data = await apiPost<ResponseType>('/endpoint', { body });

// PUT request
const data = await apiPut<ResponseType>('/endpoint', { body });

// DELETE request
const data = await apiDelete<ResponseType>('/endpoint', { body });
```

### Authenticated Calls

```typescript
// GET request (with auth token)
const data = await authenticatedGet<ResponseType>('/endpoint');

// POST request (with auth token)
const data = await authenticatedPost<ResponseType>('/endpoint', { body });

// PUT request (with auth token)
const data = await authenticatedPut<ResponseType>('/endpoint', { body });

// DELETE request (with auth token)
const data = await authenticatedDelete<ResponseType>('/endpoint', { body });
```

---

## 📋 API Endpoints

### 1. Authentication Endpoints

**Base Path:** `/api/auth/*`

**Handled By:** Better Auth library

**Methods:** GET, POST

**Examples:**
- `POST /api/auth/sign-in/email`
- `POST /api/auth/sign-up/email`
- `GET /api/auth/session`
- `POST /api/auth/sign-out`

---

### 2. GET /api/tasks

**Purpose:** Fetch all tasks for authenticated user

**Authentication:** Required

**Request:**
```typescript
const tasks = await authenticatedGet<Task[]>('/api/tasks');
```

**Response:**
```typescript
[
  {
    id: "uuid",
    title: "Buy groceries",
    address: "123 Main St, San Francisco, CA",
    latitude: 37.7749,
    longitude: -122.4194,
    bulletPoints: ["Milk", "Eggs", "Bread"],
    completed: false,
    createdAt: "2024-01-15T10:30:00Z"
  },
  // ... more tasks
]
```

**Error Handling:**
```typescript
try {
  const tasks = await authenticatedGet<Task[]>('/api/tasks');
  setTasks(tasks);
} catch (error) {
  console.error('[API] Error loading tasks:', error);
  setErrorMessage('Failed to load tasks. Please try again.');
}
```

**Used In:**
- `app/(tabs)/(home)/index.tsx` → `loadTasks()`
- `app/(tabs)/(home)/index.ios.tsx` → `loadTasks()`

---

### 3. POST /api/geocode

**Purpose:** Convert address to coordinates

**Authentication:** Not required (public endpoint)

**Request:**
```typescript
const result = await apiPost<GeocodeResponse>('/api/geocode', {
  address: "1600 Amphitheatre Parkway, Mountain View, CA"
});
```

**Request Body:**
```json
{
  "address": "1600 Amphitheatre Parkway, Mountain View, CA"
}
```

**Response:**
```typescript
{
  latitude: 37.4220,
  longitude: -122.0841,
  formattedAddress: "1600 Amphitheatre Pkwy, Mountain View, CA 94043, USA"
}
```

**Error Handling:**
```typescript
try {
  const geocodeResponse = await apiPost('/api/geocode', { 
    address: newTask.address 
  });
  console.log('[API] Geocode result:', geocodeResponse);
} catch (error) {
  console.error('[API] Geocoding failed:', error);
  setErrorMessage('Failed to geocode address. Please check the address.');
}
```

**Used In:**
- `app/(tabs)/(home)/index.tsx` → `saveTask()`
- `app/(tabs)/(home)/index.ios.tsx` → `saveTask()`

---

### 4. POST /api/tasks

**Purpose:** Create a new task

**Authentication:** Required

**Request:**
```typescript
const task = await authenticatedPost<Task>('/api/tasks', {
  title: "Buy groceries",
  address: "123 Main St, San Francisco, CA",
  latitude: 37.7749,
  longitude: -122.4194,
  bulletPoints: ["Milk", "Eggs", "Bread"]
});
```

**Request Body:**
```json
{
  "title": "Buy groceries",
  "address": "123 Main St, San Francisco, CA",
  "latitude": 37.7749,
  "longitude": -122.4194,
  "bulletPoints": ["Milk", "Eggs", "Bread"]
}
```

**Response:**
```typescript
{
  id: "uuid",
  title: "Buy groceries",
  address: "123 Main St, San Francisco, CA",
  latitude: 37.7749,
  longitude: -122.4194,
  bulletPoints: ["Milk", "Eggs", "Bread"],
  completed: false,
  createdAt: "2024-01-15T10:30:00Z"
}
```

**Error Handling:**
```typescript
try {
  const createdTask = await authenticatedPost<Task>('/api/tasks', taskData);
  setTasks([...tasks, createdTask]);
  setModalVisible(false);
} catch (error) {
  console.error('[API] Error creating task:', error);
  setErrorMessage('Failed to save task. Please try again.');
}
```

**Used In:**
- `app/(tabs)/(home)/index.tsx` → `saveTask()`
- `app/(tabs)/(home)/index.ios.tsx` → `saveTask()`

---

### 5. PUT /api/tasks/:id

**Purpose:** Update a task (e.g., mark as complete)

**Authentication:** Required (must own the task)

**Request:**
```typescript
await authenticatedPut(`/api/tasks/${taskId}`, {
  completed: true
});
```

**Request Body:**
```json
{
  "completed": true
}
```

**Supported Fields:**
- `title` (string)
- `address` (string)
- `latitude` (number)
- `longitude` (number)
- `bulletPoints` (string[])
- `completed` (boolean)

**Response:**
```typescript
{
  id: "uuid",
  title: "Buy groceries",
  address: "123 Main St, San Francisco, CA",
  latitude: 37.7749,
  longitude: -122.4194,
  bulletPoints: ["Milk", "Eggs", "Bread"],
  completed: true,
  createdAt: "2024-01-15T10:30:00Z"
}
```

**Error Handling:**
```typescript
// Optimistic update
const updatedTasks = tasks.map(t =>
  t.id === taskId ? { ...t, completed: !t.completed } : t
);
setTasks(updatedTasks);

try {
  await authenticatedPut(`/api/tasks/${taskId}`, { completed: !task.completed });
} catch (error) {
  // Revert on error
  setTasks(tasks);
  setErrorMessage('Failed to update task. Please try again.');
}
```

**Used In:**
- `app/(tabs)/(home)/index.tsx` → `toggleTaskCompletion()`
- `app/(tabs)/(home)/index.ios.tsx` → `toggleTaskCompletion()`

---

### 6. DELETE /api/tasks/:id

**Purpose:** Delete a task

**Authentication:** Required (must own the task)

**Request:**
```typescript
await authenticatedDelete(`/api/tasks/${taskId}`);
```

**Request Body:**
```json
{}
```
*Note: Empty body sent to avoid FST_ERR_CTP_EMPTY_JSON_BODY error*

**Response:**
```typescript
{
  success: true
}
```

**Error Handling:**
```typescript
// Optimistic update
const originalTasks = [...tasks];
setTasks(tasks.filter(task => task.id !== taskId));

try {
  await authenticatedDelete(`/api/tasks/${taskId}`);
} catch (error) {
  // Revert on error
  setTasks(originalTasks);
  setErrorMessage('Failed to delete task. Please try again.');
}
```

**Used In:**
- `app/(tabs)/(home)/index.tsx` → `deleteTask()`
- `app/(tabs)/(home)/index.ios.tsx` → `deleteTask()`

---

## 🔄 Request/Response Flow

### Creating a Task (Full Flow)

```typescript
// 1. User enters task details
const newTask = {
  title: "Buy groceries",
  address: "123 Main St, San Francisco, CA",
  bulletPoints: ["Milk", "Eggs"]
};

// 2. Geocode the address
const geocodeResponse = await apiPost('/api/geocode', { 
  address: newTask.address 
});
// Response: { latitude: 37.7749, longitude: -122.4194, formattedAddress: "..." }

// 3. Create the task with coordinates
const taskData = {
  title: newTask.title,
  address: geocodeResponse.formattedAddress,
  latitude: geocodeResponse.latitude,
  longitude: geocodeResponse.longitude,
  bulletPoints: newTask.bulletPoints
};

const createdTask = await authenticatedPost<Task>('/api/tasks', taskData);
// Response: { id: "uuid", title: "...", ... }

// 4. Update UI
setTasks([...tasks, createdTask]);
```

---

## 🛡️ Error Handling Strategy

### 1. Network Errors
```typescript
try {
  const data = await apiGet('/endpoint');
} catch (error) {
  if (error.message.includes('Network request failed')) {
    setErrorMessage('No internet connection. Please check your network.');
  }
}
```

### 2. Authentication Errors (401)
```typescript
try {
  const data = await authenticatedGet('/endpoint');
} catch (error) {
  if (error.message.includes('401')) {
    // Token expired or invalid
    await signOut();
    router.replace('/auth');
  }
}
```

### 3. Authorization Errors (403)
```typescript
try {
  await authenticatedDelete(`/api/tasks/${taskId}`);
} catch (error) {
  if (error.message.includes('403')) {
    setErrorMessage('You do not have permission to delete this task.');
  }
}
```

### 4. Validation Errors (400)
```typescript
try {
  await authenticatedPost('/api/tasks', taskData);
} catch (error) {
  if (error.message.includes('400')) {
    setErrorMessage('Invalid task data. Please check your inputs.');
  }
}
```

---

## 📊 Logging

All API calls are logged with the `[API]` prefix:

```typescript
console.log('[API] Calling:', url, method);
console.log('[API] Fetch options:', fetchOptions);
console.log('[API] Success:', data);
console.error('[API] Error response:', status, text);
console.error('[API] Request failed:', error);
```

**Example Console Output:**
```
[API] Calling: https://.../api/tasks GET
[API] Fetch options: { method: 'GET', headers: {...} }
[API] Success: [{ id: '...', title: '...' }]
```

---

## 🔒 Security Considerations

1. **Bearer Token Storage**
   - Native: SecureStore (encrypted)
   - Web: localStorage (not encrypted, but HTTPS only)

2. **Token Transmission**
   - Always sent via `Authorization` header
   - Never in URL query parameters

3. **CORS**
   - Backend must allow requests from app domain
   - Credentials included for cookie-based auth

4. **Token Refresh**
   - Auto-refreshed every 5 minutes
   - Prevents token expiration during active use

---

## 🧪 Testing API Integration

### Manual Testing

```typescript
// Test unauthenticated endpoint
const geocode = await apiPost('/api/geocode', { 
  address: '1600 Amphitheatre Parkway, Mountain View, CA' 
});
console.log('Geocode result:', geocode);

// Test authenticated endpoint
const tasks = await authenticatedGet('/api/tasks');
console.log('Tasks:', tasks);

// Test error handling
try {
  await authenticatedGet('/api/invalid-endpoint');
} catch (error) {
  console.log('Expected error:', error.message);
}
```

### Automated Testing (Future)

```typescript
describe('API Integration', () => {
  it('should fetch tasks', async () => {
    const tasks = await authenticatedGet('/api/tasks');
    expect(Array.isArray(tasks)).toBe(true);
  });

  it('should create task', async () => {
    const task = await authenticatedPost('/api/tasks', {
      title: 'Test',
      address: 'Test Address',
      latitude: 0,
      longitude: 0,
      bulletPoints: []
    });
    expect(task.id).toBeDefined();
  });
});
```

---

## 📝 Type Definitions

```typescript
interface Task {
  id: string;
  title: string;
  address: string;
  latitude: number;
  longitude: number;
  bulletPoints: string[];
  completed: boolean;
  createdAt: string;
}

interface GeocodeResponse {
  latitude: number;
  longitude: number;
  formattedAddress: string;
}

interface User {
  id: string;
  email: string;
  name?: string;
  image?: string;
}
```

---

**API Integration Complete! 🎉**
