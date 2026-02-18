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
- **Native App-Like Mobile UI** (Added Feb 18, 2026)
  - Bottom navigation bar for mobile
  - Swipe gestures for navigation between sections
  - Horizontal scrolling stats cards
  - Card-based layouts optimized for touch

#### Member Portal (All pages have consistent sidebar)
- **Dashboard** - ARI score, training hours, compliance streak, activity charts
  - Mobile: Welcome banner, quick actions, horizontal progress cards
- **My License** - License details, expiry, compliance score, biometric status
- **Training Center** - Course enrollment, progress tracking, PDF certificates
  - Mobile: Tab navigation (Browse/My Courses/Completed), card-based course listings (Feb 18, 2026)
- **Marketplace** - Product browsing, cart, order management
  - Mobile: 2-column product grid, floating cart button, category filter pills (Feb 18, 2026)
- **History** - Transaction history with search/filters
- **Notifications** - Notification management
- **Settings** - Profile, security, appearance settings

#### Dealer Portal
- **Dashboard** - Transaction stats, approval rate, pending verifications
- **Verify Buyer** - License verification with GPS tracking
- **Transactions** - Transaction history and management
- **Inventory Management** (Added Feb 18, 2026)
  - Stock tracking with quantity and low stock alerts
  - Add/Edit/Delete inventory items with SKU/barcode support
  - Stock adjustments (restock, sale, return, damage, expired, transfer)
  - Movement history and audit trail
  - Automatic reorder alerts for low stock items
  - Inventory valuation reports (by category, profit margins)
  - CSV bulk export
  - Barcode/SKU scanning lookup
  - Optional marketplace linking (dealer can choose to list items or not)
- **Settings** - Profile and business settings

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
| `/api/dealer/inventory` | GET/POST | List/Create inventory items |
| `/api/dealer/inventory/{item_id}` | GET/PUT/DELETE | CRUD inventory item |
| `/api/dealer/inventory/{item_id}/adjust` | POST | Adjust stock with movement record |
| `/api/dealer/inventory/movements` | GET | Get movement history |
| `/api/dealer/inventory/alerts` | GET | Get reorder alerts |
| `/api/dealer/inventory/export` | GET | Export inventory to CSV |
| `/api/dealer/inventory/valuation` | GET | Get valuation report |
| `/api/dealer/inventory/scan/{sku}` | GET | SKU/barcode lookup |
| `/api/dealer/inventory/link-marketplace/{item_id}` | POST | Link item to marketplace |
| `/api/dealer/inventory/unlink-marketplace/{item_id}` | POST | Unlink from marketplace |

### Tech Stack
- **Frontend**: React, Tailwind CSS, Shadcn UI, react-swipeable
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
