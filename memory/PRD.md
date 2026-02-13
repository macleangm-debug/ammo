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

### Phase 5 - Enhanced Government Dashboard ✅ (February 2026)
**Government Command Center - Complete Overhaul:**
- **6 Tabbed Views**: Overview, Revenue, Training, Dealers, Compliance, Alerts
- **Critical Alert Banner**: Real-time notification of critical alerts requiring intervention

**Overview Tab:**
- Key metrics: Total Citizens, Active Dealers, Monthly Revenue, Active Alerts
- Revenue Trends chart (6 months)
- Quick Insights panel (Training Completion, License Renewal Rate, Expiring Licenses, Overdue Enrollments)
- Regional Compliance Overview with ARI scores per region

**Revenue Tab:**
- Revenue by type: Course Fees, License Fees, Membership Fees, Certification Fees, Penalty Fees
- Revenue by region breakdown
- Monthly revenue trends
- Total revenue tracking

**Training Tab:**
- Course management system with Create Course functionality
- Course types: Compulsory vs Optional
- ARI impact (+boost, -penalty for skipping)
- Regional targeting for courses
- Training compliance rates by region
- Active courses table with cost, duration, ARI impact

**Dealers Tab:**
- Dealer activity analytics (total dealers, firearm/ammunition sales)
- Top dealers by transaction volume
- Dealers distribution by region
- Flagged dealers requiring review (avg risk score > 40 or compliance < 80)

**Compliance Tab:**
- ARI tier distribution (Elite Custodian, Guardian, Sentinel)
- License statistics (active, expired, suspended, expiring soon)
- Average ARI by region chart

### Phase 6 - Dedicated Alerts & Red Flags Dashboard ✅ (February 2026)
**Comprehensive Alert Monitoring Center at `/government/alerts-dashboard`:**

**Percentage-Based Metrics:**
- Flagged Citizens percentage (X% of total population)
- Alert rate per 10,000 members
- Unique flagged users count

**Trend Analysis:**
- Current vs Previous period comparison with trend percentage
- Resolution velocity (resolved vs new alerts)
- Average resolution time in hours
- Resolution rate percentage

**Alert Categories Breakdown:**
- Visual progress bars by category (Compliance Drop, Training Overdue, Suspicious Activity, Threshold Breach)
- Percentage distribution per category

**Regional Alert Heat Map:**
- Alert rate per 10,000 citizens by region
- Health status badges (Critical, Warning, Elevated, Healthy)
- Active alerts and total citizens per region

**Priority Queue:**
- Critical alerts open > 24 hours
- High priority alerts open > 48 hours
- Unacknowledged critical alerts
- Oldest unresolved alerts list

**Risk Monitoring:**
- Citizens in Watch status (compliance < 50 or suspended)
- Citizens approaching threshold (compliance 40-60)
- Overall resolution rate

**Advanced Filters:**
- Time period: 24h, 7d, 30d, 90d, All time
- Severity: Critical, High, Medium, Low
- Category: Compliance Drop, Training Overdue, Suspicious Activity, Threshold Breach
- Region: Northeast, Southeast, Midwest, Southwest, West
- Status: Active, Acknowledged, Resolved

**Intervention Actions:**
- Acknowledge alerts
- Send Warning (notifies user)
- Suspend License
- Block License (with notification to user)
- All actions require intervention notes
- Full audit logging

**Alerts Tab (In main Government Dashboard):
- Active alerts by severity (Critical, High, Medium, Low)
- Red flag visualization
- Alert actions: Acknowledge, Intervene
- Intervention options: Send Warning, Suspend License, Block License
- Automated alerts based on configurable thresholds

### Phase 7 - Predictive Analytics & Automated Threshold Alerts ✅ (February 2026)
**AI-Powered Risk Forecasting at `/government/predictive`:**

**Predictive Risk Calculation:**
- Multi-factor risk analysis per citizen:
  - Purchase frequency trends (30-day comparison)
  - Training completion status (completed vs overdue)
  - Compliance score trajectory
  - Violation history
  - License expiry status
  - Safe storage verification
- Confidence score based on available data
- Risk trajectory: Improving, Stable, Declining, Critical Decline
- Predicted risk score (30-day forecast)

**Overview Tab:**
- Summary cards: Citizens Analyzed, High Risk, Declining, Needs Intervention
- Risk Trajectory Distribution (Improving/Stable/Declining/Critical Decline)
- Predicted Risk Distribution (Low 0-29, Medium 30-49, High 50-69, Critical 70+)
- Most Common Risk Factors with percentage bars
- High Risk Citizens list with top factors
- Approaching Critical Threshold list with days-to-threshold estimate
- Regional Risk Analysis (avg score, high risk count, declining count per region)

**Thresholds Tab:**
- Configure automated monitoring thresholds
- Threshold fields: Name, Metric, Operator, Critical Value, Warning Value (pre-alert), Severity, Auto Action, Custom Message
- Supported metrics: Compliance Score, ARI Score, Training Hours, Violations, Purchase Count (30d)
- Auto actions: Send Preventive Warning, Send Critical Alert, Flag for Review, Block License
- Create/Edit/Delete threshold operations

**Warnings Tab:**
- Preventive warnings sent to citizens approaching thresholds
- Warning status: Pending, Acknowledged, Action Taken
- Warning details: User, Type, Current Value, Threshold, Message, Days to Threshold

**Run Analysis Actions:**
- "Run Predictive Analysis" - Analyzes all citizens, generates warnings for declining compliance
- "Run Threshold Check" - Checks all citizens against active thresholds, sends preventive warnings

**Citizen Warning Access:**
- Citizens can view their own warnings via /citizen/my-warnings
- Acknowledge warnings to mark as seen

**Shared Components:**
- DashboardLayout with responsive sidebar
- StatCard, BarChart, DonutChart, ProgressBar, Sparkline, ChartLegend
- Theme toggle (light/dark)
- PWA support (manifest.json, service worker)

### Testing: ✅ 100% Pass Rate
- Phase 4: 42/42 tests passed
- Phase 5: 14/14 backend + 25 frontend tests passed
- Phase 6: 18/18 backend + 100% frontend tests passed
- Phase 7: 23/23 backend + 100% frontend tests passed

## API Endpoints

### Predictive Analytics APIs (New in Phase 7)
- `GET /api/government/predictive/dashboard` - Comprehensive analytics dashboard
- `GET /api/government/predictive/citizen/{user_id}` - Individual citizen prediction
- `POST /api/government/predictive/run-analysis` - Run analysis for all citizens
- `GET /api/government/thresholds` - Get all configured thresholds
- `POST /api/government/thresholds` - Create threshold
- `PUT /api/government/thresholds/{threshold_id}` - Update threshold
- `DELETE /api/government/thresholds/{threshold_id}` - Delete threshold
- `POST /api/government/thresholds/run-check` - Run threshold check for all citizens
- `GET /api/government/preventive-warnings` - Get all preventive warnings (admin)
- `GET /api/citizen/my-warnings` - Get citizen's own warnings
- `POST /api/citizen/acknowledge-warning/{warning_id}` - Acknowledge warning

### Government Dashboard APIs (New in Phase 5)
- `GET /api/government/dashboard-summary` - Overview stats
- `GET /api/government/analytics/revenue` - Revenue breakdown by type, region, trends
- `GET /api/government/analytics/training` - Training compliance and course stats
- `GET /api/government/analytics/dealers` - Dealer activity and flagged dealers
- `GET /api/government/analytics/compliance` - ARI distribution and license stats
- `GET /api/government/alerts/active` - Active alerts by severity
- `POST /api/government/alerts/acknowledge/{alert_id}` - Acknowledge alert
- `POST /api/government/alerts/resolve/{alert_id}` - Resolve alert with notes
- `POST /api/government/alerts/intervene/{alert_id}` - Take intervention action
- `GET /api/government/alerts/thresholds` - Get alert thresholds
- `POST /api/government/alerts/thresholds` - Create alert threshold
- `GET /api/government/courses` - Get all training courses
- `POST /api/government/courses` - Create new course
- `PUT /api/government/courses/{course_id}` - Update course
- `DELETE /api/government/courses/{course_id}` - Archive course

### Database Collections (New/Updated)
- `training_courses` - Course definitions with region, cost, ARI impact
- `course_enrollments` - User enrollments with status and progress
- `revenue_records` - Revenue tracking by type, region
- `member_alerts` - Active alerts with severity and intervention history
- `alert_thresholds` - Configurable thresholds for automated alerts
- `risk_predictions` - Stored risk predictions per citizen
- `preventive_warnings` - Warnings sent to citizens approaching thresholds

## Prioritized Backlog

### P0 (Critical - Next Up)
- [ ] Full PWA Implementation (offline support, caching strategies, installability)
- [ ] Dealer Marketplace (members-only)

### P1 (High Priority)
- [ ] Real-time Push Notifications (browser-based)
- [ ] SMS notifications via Twilio (deferred by user)
- [ ] Course enrollment flow for citizens

### P2 (Medium Priority)
- [ ] Insurance partner API integration
- [ ] Smart safe IoT integration
- [ ] Community mentor matching system

## Technical Notes
- EMERGENT_LLM_KEY: sk-emergent-896943c84C812645e2
- MongoDB collections: users, citizen_profiles, dealer_profiles, transactions, responsibility_profile, audit_logs, training_courses, course_enrollments, revenue_records, member_alerts, alert_thresholds
- PWA icons: /app/frontend/public/icons/
- Service worker: /app/frontend/public/sw.js
- Regions: northeast, southeast, midwest, southwest, west
