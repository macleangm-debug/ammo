# AMMO (Accountable Munitions & Mobility Oversight) - PRD

## Original Problem Statement
Build a comprehensive platform for responsible firearm ownership tracking with:
- Multi-tiered user roles (Citizen/Member, Dealer, Admin)
- ARI (Accountability Responsibility Index) scoring system
- Training and certification management
- Marketplace for verified products
- PWA capabilities for mobile access

## Current Status: MVP Complete ✅

### Implemented Features

#### Authentication & User Management
- **Username/Password Login** (Added Feb 16, 2026)
  - `/api/auth/login` endpoint
  - Demo credentials: citizen/demo123, dealer/demo123, admin/admin123
  - Session-based authentication with cookies
- **Demo Quick Login** - One-click access for testing
- **Role-based Access Control** - Citizen, Dealer, Admin portals

#### PWA Features
- Service worker for offline support
- Offline fallback page
- Background sync capabilities
- Responsive mobile-first design

#### Member Portal
- Dashboard with ARI score tracking
- Training hours progress
- Compliance streak monitoring
- Monthly activity charts
- Transaction history

#### Training Center
- Course enrollment system
- Progress tracking
- PDF certificate generation for completed courses
- ARI points earned from training

#### Marketplace
- Product browsing with search/filters
- Category organization
- Order management
- Dealer verification badges

#### Government Portal
- National oversight dashboard
- Risk analytics
- Compliance monitoring
- Alert management

### API Endpoints
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/login` | POST | Username/password login |
| `/api/auth/me` | GET | Get current user |
| `/api/demo/setup` | POST | Initialize demo data |
| `/api/demo/login/{role}` | POST | Quick demo login |
| `/api/members/courses/available` | GET | List available courses |
| `/api/members/courses/enroll/{id}` | POST | Enroll in course |
| `/api/members/courses/certificate/{id}` | GET | Download PDF certificate |
| `/api/notifications/vapid_public_key` | GET | Get VAPID key for push |

### Tech Stack
- **Frontend**: React, Tailwind CSS, Shadcn UI
- **Backend**: FastAPI (Python)
- **Database**: MongoDB
- **PWA**: Service Workers, Web Push (VAPID)
- **PDF**: ReportLab

## Backlog

### P1 - High Priority
- [ ] Smart Safe IoT Integration
- [ ] Insurance Partner API Integration

### P2 - Medium Priority  
- [ ] Community Mentor Matching
- [ ] SMS Notifications (currently mocked)

### P3 - Future Enhancements
- [ ] Backend modularization (break up server.py)
- [ ] Real-time notifications
- [ ] Advanced analytics dashboard

## Credentials Reference

### Demo Accounts
| Username | Password | Role | Access |
|----------|----------|------|--------|
| citizen | demo123 | Citizen | Member Dashboard |
| dealer | demo123 | Dealer | Dealer Portal |
| admin | admin123 | Admin | Government Dashboard |

### Environment Variables
- `MONGO_URL` - MongoDB connection
- `DB_NAME` - Database name
- `VAPID_PRIVATE_KEY` - Push notification key
- `VAPID_PUBLIC_KEY` - Push notification public key
