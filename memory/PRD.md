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

#### Member Portal (All pages have consistent sidebar)
- **Dashboard** - ARI score, training hours, compliance streak, activity charts
- **My License** - License details, expiry, compliance score, biometric status (Added Feb 16, 2026)
- **Training Center** - Course enrollment, progress tracking, PDF certificates
- **Marketplace** - Product browsing, cart, order management
- **History** - Transaction history with search/filters (Added Feb 16, 2026)
- **Notifications** - Notification management (Added Feb 16, 2026)
- **Settings** - Profile, security, appearance settings (Added Feb 16, 2026)

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
| `/api/citizen/profile` | GET | Get citizen profile with license info |
| `/api/citizen/transactions` | GET | Get transaction history |
| `/api/member/courses` | GET | List available courses |
| `/api/member/courses/{id}/enroll` | POST | Enroll in course |
| `/api/member/enrollments/{id}/complete` | POST | Complete course, get certificate |
| `/api/marketplace/products` | GET | List marketplace products |

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

### Pages with Sidebar Navigation
All member portal pages now have consistent sidebar:
- Dashboard (`/dashboard`)
- My License (`/dashboard/license`)
- Training (`/training`)
- Marketplace (`/marketplace`)
- History (`/dashboard/history`)
- Notifications (`/dashboard/notifications`)
- Settings (`/dashboard/settings`)
