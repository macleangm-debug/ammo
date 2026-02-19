# Backend Refactoring Plan - AMMO Server

## Current State
- `server.py`: 8210 lines - monolithic file containing all endpoints
- Models, helpers, and routes all in one file

## Target Architecture

```
/app/backend/
├── server.py              # Main app entry point (minimal - imports routers)
├── models/
│   ├── __init__.py        # Export all models ✅ CREATED
│   ├── user.py            # User, CitizenProfile, DealerProfile ✅ CREATED
│   ├── audit.py           # AuditLog ✅ CREATED
│   ├── transaction.py     # Transaction models ✅ CREATED
│   ├── notification.py    # Notification, Trigger models ✅ CREATED
│   ├── document.py        # DocumentTemplate, FormalDocument ✅ CREATED
│   ├── review.py          # ReviewItem, Applications ✅ CREATED
│   ├── government.py      # Training, Alerts, Thresholds ✅ CREATED
│   └── marketplace.py     # Products, Orders, Inventory ✅ CREATED
├── utils/
│   ├── __init__.py        # Export utilities ✅ CREATED
│   ├── database.py        # MongoDB connection ✅ CREATED
│   └── helpers.py         # Common helpers ✅ CREATED
└── routes/
    ├── __init__.py        # Router registration ✅ CREATED
    ├── auth.py            # /api/auth/* endpoints ✅ CREATED (partial)
    ├── citizen.py         # /api/citizen/* endpoints
    ├── dealer.py          # /api/dealer/* endpoints
    ├── admin.py           # /api/admin/* endpoints
    ├── government.py      # /api/government/* endpoints
    ├── marketplace.py     # /api/marketplace/* endpoints
    ├── notifications.py   # /api/notifications/* endpoints
    ├── documents.py       # Document template & formal doc endpoints
    ├── reviews.py         # Review system endpoints
    ├── training.py        # Course & enrollment endpoints
    ├── push.py            # Push notification endpoints
    └── demo.py            # Demo data setup
```

## Migration Strategy

### Phase 1: Foundation (COMPLETED)
- [x] Create models/ directory with all Pydantic models
- [x] Create utils/ directory with database.py and helpers.py
- [x] Create routes/ directory structure

### Phase 2: Incremental Migration (NEXT)
- [ ] Extract auth routes to routes/auth.py
- [ ] Extract citizen routes to routes/citizen.py
- [ ] Extract dealer routes to routes/dealer.py
- [ ] Update server.py to import from new modules

### Phase 3: Full Migration
- [ ] Extract remaining routes
- [ ] Update server.py to be minimal entry point
- [ ] Add tests for each module

## Current Endpoints by Domain

### Auth (lines 963-1080)
- POST /api/auth/session
- GET /api/auth/me
- POST /api/auth/logout
- POST /api/auth/set-role
- POST /api/auth/login

### Citizen (lines 1081-1223)
- GET /api/citizen/profile
- POST /api/citizen/profile
- GET /api/citizen/transactions
- GET /api/citizen/notifications
- POST /api/citizen/notifications/{id}/read
- POST /api/citizen/verify/{id}
- GET /api/citizen/documents
- GET /api/citizen/documents/{id}
- GET /api/citizen/documents/{id}/pdf
- POST /api/citizen/documents/{id}/archive

### Dealer (lines 1224-1369)
- GET /api/dealer/profile
- POST /api/dealer/profile
- POST /api/dealer/initiate-transaction
- GET /api/dealer/transactions
- GET /api/dealer/transaction/{id}
- GET /api/dealer/inventory
- POST /api/dealer/inventory
- PUT /api/dealer/inventory/{id}
- DELETE /api/dealer/inventory/{id}
- POST /api/dealer/inventory/{id}/adjust

### Government (lines 1370-7812+)
- Dashboard, analytics, alerts, reviews, notifications, documents

## Notes
- The models/ and utils/ directories are ready for use
- Routes can be migrated incrementally without breaking existing functionality
- Each route file should use: `from ..utils import db, serialize_doc, require_auth`
- Each route file should use: `from ..models import <ModelName>`
