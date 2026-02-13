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

## Architecture
- **Backend**: FastAPI + MongoDB + Motor (async)
- **Frontend**: React + Tailwind CSS + Shadcn UI
- **Auth**: Emergent Google OAuth with session tokens
- **AI**: GPT-5.2 via emergentintegrations library

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
| 3 | Elite Custodian | 85-100 | Priority Service, Insurance Discounts, Community Mentor Status, Renewal Fee Reduction |

### Responsibility Badges (Non-Aggressive)
- 1-Year Clean Record, 5-Year Clean Record
- Safety Certified, Advanced Safety Certified, Range Certified
- Secure Storage Verified, Zero Incident Milestone
- Community Protector, Certified Mentor
- Punctual Renewal, Emergency Ready, Education Champion

### Anti-Gamification Safeguards
- NO rewards tied to ammo volume
- NO purchase-based rewards  
- NO competitive weapon metrics
- NO social comparison on hardware ownership
- EVERYTHING centered on compliance & safety

## What's Been Implemented

### Phase 1 - Core Platform
- Multi-role auth (member, dealer, admin)
- Transaction verification with AI risk scoring
- Silent distress system
- GPS geofencing

### Phase 2 - Engagement Layer (NEW)
- Risk Heatmaps (temporal + geographic)
- License expiry alerts
- Push notification subscriptions

### Phase 3 - AMMO Responsibility Engine (LATEST)
- Complete rebrand from AEGIS to AMMO
- ARI Score calculation with 5 weighted factors
- 3-tier progression system (Sentinel → Guardian → Elite Custodian)
- 12 responsibility badges (training/safety-focused)
- 6 monthly challenges
- Training hours logging
- Safe storage verification
- Compliance streak tracking
- Training leaderboard (NOT purchase-based)

## Prioritized Backlog

### P0 (Critical)
- [ ] SMS notifications via Twilio
- [ ] Training marketplace integration

### P1 (High Priority)
- [ ] Insurance partner API integration
- [ ] Annual compliance rewards system
- [ ] Advanced analytics subscription tier

### P2 (Medium Priority)
- [ ] Smart safe IoT integration (Digital Safe Health Score)
- [ ] Community mentor matching system
- [ ] Dealer premium verification lane

## Revenue Opportunities
- Premium training marketplace
- Insurance integrations
- Advanced analytics subscription
- Dealer premium verification lane
- Tier certification programs

## Technical Notes
- EMERGENT_LLM_KEY: sk-emergent-896943c84C812645e2
- MongoDB collections: users, citizen_profiles, dealer_profiles, transactions, responsibility_profile, audit_logs
