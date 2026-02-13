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

## What's Been Implemented

### Phase 1 (2026-02-13)
- Full backend API with user management, transactions, risk engine
- Landing page, Citizen Dashboard, Dealer Portal, Government Dashboard
- AI-powered risk scoring with GPT-5.2
- Silent distress trigger system

### Phase 2 (2026-02-13)
- **Gamification System**: Points, levels (Novice → Legend), badges, daily check-ins, streak tracking
- **Risk Heatmaps**: Temporal (7x24 hour grid) + Geographic (location-based risk analysis)
- **License Expiry Alerts**: Multi-severity warnings (critical, urgent, warning, info)
- **Push Notification Subscription API**: Ready for browser notifications

## Gamification Features
- **10 Badge Types**: First Steps, Perfect Record, Weekly Warrior, Monthly Master, Proactive, Identity Verified, Safe Keeper, Trained & Ready, Community Guardian, Clean Slate
- **7 Levels**: Novice (0) → Apprentice (100) → Guardian (250) → Sentinel (500) → Protector (1000) → Champion (2000) → Legend (5000+)
- **Daily Check-in**: +10 points/day with streak bonuses

## Prioritized Backlog

### P0 (Critical - Next Sprint)
- [ ] SMS Notifications via Twilio (deferred per user request)
- [ ] Real biometric simulation (Face ID / Fingerprint mock)

### P1 (High Priority)
- [ ] Bulk transaction analysis
- [ ] Dealer compliance scoring improvements
- [ ] Hardware certificate validation
- [ ] Push notification delivery system

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
1. Implement Twilio SMS integration when ready
2. Add actual push notification delivery using Web Push API
3. Build safety training module for badges
4. Add community features for "Community Guardian" badge

## Technical Notes
- All MongoDB queries exclude `_id` with projection `{"_id": 0}`
- Datetime stored as ISO strings for JSON compatibility
- Risk weights configurable in backend constants
- EMERGENT_LLM_KEY: sk-emergent-896943c84C812645e2
