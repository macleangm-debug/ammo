# AEGIS - National Firearm Digital Verification Platform

## Original Problem Statement
Build a National-grade Firearm Digital Verification Platform with:
1. Citizen Mobile App - Biometric login, License wallet, Real-time purchase approval notifications, Random security challenges, Silent distress trigger, Purchase history, Compliance score dashboard
2. Dealer Verification App - Secure dealer login, GPS-based geofencing, Buyer ID entry, Real-time eligibility request, Instant approval/rejection, Transaction logging
3. Central Verification Engine - Identity verification API, License validation, Ammunition quota management, Risk scoring engine, Immutable audit logging
4. Risk & AI Engine - Detect purchase anomalies, Monitor frequency spikes, Dynamic risk score (0-100), Output approval state (Green/Amber/Red)
5. Government Oversight Dashboard - Live transaction feed, Risk heat maps, Compliance metrics, Dealer audit reports, Incident flags

## User Choices
- **Scope**: Full system with all 5 components
- **AI/Risk Engine**: OpenAI GPT-5.2 for intelligent risk analysis
- **Authentication**: Emergent-managed Google OAuth + JWT hybrid
- **Database**: MongoDB (cost-effective)
- **UI/UX**: Modern "Digital Fortress" theme with hybrid light/dark modes

## Architecture
- **Backend**: FastAPI + MongoDB + Motor (async)
- **Frontend**: React + Tailwind CSS + Shadcn UI
- **Auth**: Emergent Google OAuth with session tokens
- **AI**: GPT-5.2 via emergentintegrations library
- **Design**: AEGIS Digital Fortress theme (dark for dealers/gov, light for citizens)

## User Personas
1. **Citizens**: Licensed firearm owners needing digital verification for purchases
2. **Dealers**: Authorized retailers initiating buyer verification requests
3. **Government Admins**: Regulatory bodies monitoring compliance and reviewing flagged transactions

## Core Requirements (Static)
- [x] Multi-role authentication (citizen, dealer, admin)
- [x] Real-time transaction verification
- [x] AI-powered risk scoring (GPT-5.2)
- [x] Silent distress signal system
- [x] GPS geofencing for dealers
- [x] Immutable audit logging
- [x] Compliance score tracking
- [x] License wallet display

## What's Been Implemented (2026-02-13)

### Backend (server.py)
- User management with role-based access (citizen, dealer, admin)
- Citizen profile CRUD with license management
- Dealer profile CRUD with GPS tracking
- Transaction verification system with status flow (pending → approved/rejected/review_required)
- AI Risk Engine with GPT-5.2 integration for pattern analysis
- Weighted risk scoring (frequency, quantity, location, compliance, time, dealer risk)
- Audit logging system (immutable)
- Notification system for verification requests
- Silent distress trigger endpoint
- Demo data setup endpoint

### Frontend
- Landing page with tactical "Digital Fortress" design
- Three access portals (Citizen, Dealer, Government)
- Citizen Dashboard (light theme) with license wallet, transaction history
- Dealer Portal (dark theme) with verification initiation, GPS status
- Government Dashboard (dark command center) with live feed, risk distribution, audit logs
- Profile setup page for citizens and dealers
- Verification dialog with approve/reject/distress options
- Transaction review dialog for admins

### Security Features
- Emergent Google OAuth integration
- Session token management (7-day expiry)
- Role-based route protection
- httpOnly secure cookies

## Prioritized Backlog

### P0 (Critical - Next Sprint)
- [ ] Real biometric simulation (Face ID / Fingerprint mock)
- [ ] Push notification integration (real-time alerts)
- [ ] License expiry auto-alerts

### P1 (High Priority)
- [ ] Risk heatmap visualization on dashboard
- [ ] Bulk transaction analysis
- [ ] Dealer compliance scoring improvements
- [ ] Hardware certificate validation

### P2 (Medium Priority)
- [ ] NFC smart membership cards integration
- [ ] Smart safe IoT integration
- [ ] Cross-border tracking API
- [ ] Insurance integration

### P3 (Future)
- [ ] Ballistics reference database
- [ ] Mobile native apps (React Native)
- [ ] Blockchain audit ledger

## Next Tasks
1. Implement real biometric simulation for enhanced demo
2. Add push notifications via Emergent or third-party service
3. Build risk heatmap visualization component
4. Add export functionality for audit logs
5. Implement license renewal workflow

## Technical Notes
- All MongoDB queries exclude `_id` with projection `{"_id": 0}`
- Datetime stored as ISO strings for JSON compatibility
- Risk weights configurable in backend constants
- EMERGENT_LLM_KEY: sk-emergent-896943c84C812645e2
