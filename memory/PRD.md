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
- **PWA**: Service worker + manifest.json

## Design System (December 2025)
Modern analytics dashboard design with:
- **Layout**: Fixed sidebar navigation + main content area
- **Components**: StatCard, BarChart, DonutChart, ProgressBar, DataTable
- **Colors**: Purple primary (#8B5CF6), Success (#10B981), Warning (#F59E0B), Danger (#EF4444), Info (#3B82F6)
- **Typography**: Inter (body), Plus Jakarta Sans (headings)
- **Theme Toggle**: Light/Dark mode with localStorage persistence

## The AMMO Engagement Engine

### ARI Score System (0-100)
AMMO Responsibility Index based on:
- **License Renewal** (20%) - On-time renewal history
- **Training Hours** (25%) - Safety training participation
- **Safe Storage** (20%) - Verified safe storage compliance
- **Violation-Free** (20%) - No violation record
- **Community** (15%) - Community engagement

### Tier System
| Tier | Name | ARI Range | Benefits |
|------|------|-----------|----------|
| 1 | Sentinel | 0-59 | Licensed & Compliant, Standard Verification |
| 2 | Guardian | 60-84 | Faster Verification, Training Discounts, Recognition Badge |
| 3 | Elite Custodian | 85-100 | Priority Service, Insurance Discounts, Community Mentor Status |

## What's Been Implemented

### Phase 1 - Core Platform ✅
- Multi-role auth (member, dealer, admin)
- Transaction verification with AI risk scoring
- Silent distress system
- GPS geofencing

### Phase 2 - Engagement Layer ✅
- Risk Heatmaps (temporal + geographic)
- License expiry alerts
- Push notification subscriptions

### Phase 3 - AMMO Responsibility Engine ✅
- Complete rebrand from AEGIS to AMMO
- ARI Score calculation with 5 weighted factors
- 3-tier progression system
- 12 responsibility badges
- 6 monthly challenges
- Training hours logging
- Safe storage verification
- Compliance streak tracking

### Phase 4 - Modern Dashboard Redesign ✅ (December 2025)
**Landing Page:**
- Hero section with dashboard preview mockup
- Stats bar (2.4M+ Members, 99.9% Rate, 15K+ Dealers, 24/7 Monitoring)
- 6 feature cards
- 3-tier showcase
- 3 access cards (Member, Dealer, Government)

**Citizen Dashboard:**
- Sidebar navigation (Dashboard, License, Training, History, Notifications, Settings)
- 4 stat cards (ARI Score, Training Hours, Compliance Streak, Badges)
- Monthly activity bar chart
- Recent transactions table
- Tier progress donut chart
- Transaction summary panel
- License info card

**Dealer Portal:**
- Sidebar navigation (Dashboard, Verify Buyer, Transactions, Inventory, Settings)
- GPS status banner
- 4 stat cards (Today's Transactions, Approval Rate, Pending, Total Processed)
- Verification form
- Weekly activity chart
- Status distribution donut chart
- Recent transactions table

**Government Dashboard:**
- Sidebar navigation (Overview, Transactions, Citizens, Dealers, Analytics, Map, Settings)
- Distress alert banner
- 4 stat cards (Total Citizens, Active Dealers, Today's Transactions, Total Processed)
- Transaction trends bar chart
- Risk distribution donut chart
- Regional overview panel
- Live transaction feed with filters
- Review dialog for flagged transactions

**Shared Components:**
- DashboardLayout with responsive sidebar
- StatCard, BarChart, DonutChart, ProgressBar, Sparkline, ChartLegend
- Theme toggle (light/dark)
- PWA support (manifest.json, service worker)

### Testing: ✅ 100% Pass Rate (42/42 tests)

## Prioritized Backlog

### P0 (Critical - Next Up)
- [ ] Dealer Marketplace (members-only)

### P1 (High Priority)
- [ ] Real-time Push Notifications (browser-based)
- [ ] SMS notifications via Twilio (deferred by user)

### P2 (Medium Priority)
- [ ] Insurance partner API integration
- [ ] Smart safe IoT integration
- [ ] Community mentor matching system

## Technical Notes
- EMERGENT_LLM_KEY: sk-emergent-896943c84C812645e2
- MongoDB collections: users, citizen_profiles, dealer_profiles, transactions, responsibility_profile, audit_logs
- PWA icons: /app/frontend/public/icons/
- Service worker: /app/frontend/public/sw.js
