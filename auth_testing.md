# Auth Testing Playbook for AEGIS Platform

## Step 1: Create Test User & Session

```bash
mongosh --eval "
use('test_database');
var userId = 'test-user-' + Date.now();
var sessionToken = 'test_session_' + Date.now();
db.users.insertOne({
  user_id: userId,
  email: 'test.user.' + Date.now() + '@example.com',
  name: 'Test User',
  picture: 'https://via.placeholder.com/150',
  role: 'citizen',
  created_at: new Date()
});
db.user_sessions.insertOne({
  user_id: userId,
  session_token: sessionToken,
  expires_at: new Date(Date.now() + 7*24*60*60*1000),
  created_at: new Date()
});
print('Session token: ' + sessionToken);
print('User ID: ' + userId);
"
```

## Step 2: Create Test Admin User

```bash
mongosh --eval "
use('test_database');
var adminId = 'admin-' + Date.now();
var sessionToken = 'admin_session_' + Date.now();
db.users.insertOne({
  user_id: adminId,
  email: 'admin.' + Date.now() + '@aegis.gov',
  name: 'Test Admin',
  role: 'admin',
  created_at: new Date()
});
db.user_sessions.insertOne({
  user_id: adminId,
  session_token: sessionToken,
  expires_at: new Date(Date.now() + 7*24*60*60*1000),
  created_at: new Date()
});
print('Admin Session token: ' + sessionToken);
print('Admin ID: ' + adminId);
"
```

## Step 3: Create Test Dealer User

```bash
mongosh --eval "
use('test_database');
var dealerId = 'dealer-' + Date.now();
var sessionToken = 'dealer_session_' + Date.now();
db.users.insertOne({
  user_id: dealerId,
  email: 'dealer.' + Date.now() + '@aegis.gov',
  name: 'Test Dealer',
  role: 'dealer',
  created_at: new Date()
});
db.user_sessions.insertOne({
  user_id: dealerId,
  session_token: sessionToken,
  expires_at: new Date(Date.now() + 7*24*60*60*1000),
  created_at: new Date()
});
print('Dealer Session token: ' + sessionToken);
print('Dealer ID: ' + dealerId);
"
```

## Step 4: Test Backend API

```bash
# Test auth endpoint
API_URL=$(grep REACT_APP_BACKEND_URL /app/frontend/.env | cut -d '=' -f2)
curl -X GET "$API_URL/api/auth/me" -H "Authorization: Bearer YOUR_SESSION_TOKEN"

# Test health endpoint
curl -X GET "$API_URL/api/health"

# Setup demo data
curl -X POST "$API_URL/api/demo/setup"
```

## Step 5: Browser Testing with Session Cookie

```python
# Set cookie and navigate
await page.context.add_cookies([{
    "name": "session_token",
    "value": "YOUR_SESSION_TOKEN",
    "domain": "your-app.com",
    "path": "/",
    "httpOnly": True,
    "secure": True,
    "sameSite": "None"
}])
await page.goto("https://your-app.com/dashboard")
```

## Quick Debug Commands

```bash
# Check data format
mongosh --eval "
use('test_database');
db.users.find().limit(2).pretty();
db.user_sessions.find().limit(2).pretty();
db.citizen_profiles.find().limit(2).pretty();
db.transactions.find().limit(2).pretty();
"

# Clean test data
mongosh --eval "
use('test_database');
db.users.deleteMany({email: /test\.user\./});
db.user_sessions.deleteMany({session_token: /test_session/});
"
```

## Checklist
- [ ] User document has user_id field (custom UUID, MongoDB's _id is separate)
- [ ] Session user_id matches user's user_id exactly
- [ ] All queries use `{"_id": 0}` projection to exclude MongoDB's _id
- [ ] Backend queries use user_id (not _id or id)
- [ ] API returns user data with user_id field (not 401/404)
- [ ] Browser loads dashboard (not login page)

## Success Indicators
✅ /api/auth/me returns user data
✅ Dashboard loads without redirect
✅ CRUD operations work
✅ Transactions can be created and verified

## Failure Indicators
❌ "User not found" errors
❌ 401 Unauthorized responses
❌ Redirect to login page
❌ ObjectId serialization errors
