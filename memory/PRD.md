# AMMO - Accountable Munitions & Mobility Oversight

## Brand Definition
**AMMO** = **A**ccountable **M**unitions & **M**obility **O**versight

This reframes the platform from "bullets" to **accountability infrastructure** — a **National Responsible Ownership Ecosystem**.

## Original Problem Statement
Build a National-grade responsible ownership platform with verification, accountability, engagement, and compliance systems.

## User Choices
- **Scope**: Full system with all 5 components
- **AI/Risk Engine**: OpenAI GPT-5.2 for intelligent risk analysis
- **Authentication**: Emergent-managed Google OAuth + JWT hybrid
- **Database**: MongoDB (cost-effective)
- **Gamification Philosophy**: Rewards SAFETY, TRAINING, COMPLIANCE - NEVER purchase volume
- **Design**: Modern analytics dashboard style (like reference image provided)
- **Theme**: Light and Dark mode support
- **PWA**: Full PWA capabilities

## Architecture
- **Backend**: FastAPI + MongoDB + Motor (async)
- **Frontend**: React + Tailwind CSS + Shadcn UI
- **Auth**: Emergent Google OAuth with session tokens
- **AI**: GPT-5.2 via emergentintegrations library
- **PWA**: Service worker + manifest.json with offline support

## Design System (December 2025)
Modern analytics dashboard design with:
- **Layout**: Fixed sidebar navigation + main content area
- **Components**: StatCard, BarChart, DonutChart, ProgressBar, DataTable
- **Colors**: Purple primary (#8B5CF6), Success (#10B981), Warning (#F59E0B), Danger (#EF4444), Info (#3B82F6)
- **Typography**: Inter (body), Plus Jakarta Sans (headings)
- **Theme Toggle**: Light/Dark mode with localStorage persistence

## What's Been Implemented

### Phase 1-7 (Prior Implementation)
- Multi-role auth (member, dealer, admin)
- Transaction verification with AI risk scoring
- Silent distress system
- GPS geofencing
- Risk Heatmaps & License alerts
- ARI Score calculation with 5 weighted factors
- 3-tier progression system
- Government Dashboard with 6 tabs
- Alerts & Red Flags Dashboard
- Predictive Analytics with thresholds

### Phase 8 - New Features (February 2026)

#### 1. Full PWA Implementation ✅
- Enhanced service worker (/sw.js) with:
  - Network-first with cache fallback strategy
  - Offline page support (/offline.html)
  - Background sync for offline transactions
  - Push notification handlers
  - Dynamic API caching
  - Periodic cache updates
- Offline page with retry functionality
- Install prompt support

#### 2. Marketplace Enhancements ✅ (Members Only)
- Product browsing with search/filters
- Category-based navigation
- Shopping cart functionality
- Order placement and tracking
- Dealer product management
- 8 demo products across categories

#### 3. Real-time Push Notifications ✅
- Browser push notification subscription
- Notification preferences component
- Push/Email/SMS channel selection
- Alert type preferences (transactions, training, license, etc.)
- Service worker push event handling

#### 4. Course Enrollment Flow ✅ (For Members)
- Training Center page (/training)
- Browse available courses with filters
- Course enrollment with deadlines
- Progress tracking (start -> progress -> complete)
- Certificate generation on completion
- ARI points awarded automatically
- 8 demo courses with different categories

#### 5. SMS Environment Preparation ✅ (MOCKED)
- SMS Notification model
- `/api/sms/send` endpoint (admin only, mocked)
- `/api/sms/history` endpoint
- `/api/sms/configure-provider` endpoint
- Environment variables ready for local provider integration

## API Endpoints (New in Phase 8)

### Member Course Enrollment
- `GET /api/member/courses` - Get available training courses
- `GET /api/member/courses/{course_id}` - Get course details
- `POST /api/member/courses/{course_id}/enroll` - Enroll in course
- `GET /api/member/enrollments` - Get my enrollments
- `POST /api/member/enrollments/{id}/start` - Start course
- `POST /api/member/enrollments/{id}/progress` - Update progress
- `POST /api/member/enrollments/{id}/complete` - Complete course

### Push Notifications
- `GET /api/notifications/status` - Get subscription status
- `POST /api/notifications/subscribe` - Subscribe to push
- `POST /api/notifications/unsubscribe` - Unsubscribe

### SMS (Mocked)
- `POST /api/sms/send` - Send SMS (admin only)
- `GET /api/sms/history` - Get SMS history (admin only)
- `POST /api/sms/configure-provider` - Configure SMS provider

### PWA Sync
- `POST /api/sync/offline-transactions` - Sync offline transactions
- `GET /api/sync/pending` - Get pending sync items

## New Frontend Pages
- `/training` - Training Center with course catalog
- `/marketplace` - Members-only marketplace
- NotificationSettings component for push preferences

## Testing Results
- Backend: 94.7% pass rate (18/19 tests)
- Frontend: 95% pass rate
- All major features working

## Prioritized Backlog

### P0 (Critical - Completed ✅)
- [x] Full PWA Implementation
- [x] Dealer Marketplace (members-only)
- [x] Course Enrollment Flow

### P1 (High Priority - Next Up)
- [ ] Real-time Push Notifications (browser-based) - UI ready, backend done
- [ ] SMS integration with local provider (environment prepared)

### P2 (Medium Priority)
- [ ] Insurance partner API integration
- [ ] Smart safe IoT integration
- [ ] Community mentor matching system

## Technical Notes
- EMERGENT_LLM_KEY: (configured in backend .env)
- SMS_PROVIDER: local (ready for integration)
- MongoDB collections: users, citizen_profiles, dealer_profiles, transactions, responsibility_profile, audit_logs, training_courses, course_enrollments, revenue_records, member_alerts, alert_thresholds, marketplace_products, marketplace_orders, sms_notifications
- PWA icons: /app/frontend/public/icons/
- Service worker: /app/frontend/public/sw.js v2
- Offline page: /app/frontend/public/offline.html

## Date Log
- Feb 16, 2026: Phase 8 - PWA enhancements, Course Enrollment, Marketplace improvements, Push Notifications, SMS preparation
