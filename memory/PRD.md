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

#### Shared Utilities
- **Number Formatting** (Added Feb 18, 2026) - `/utils/formatters.js`
  - formatNumber: Comma separators (15,800)
  - formatCurrency: $ symbol with commas ($4,250,000)
  - formatPercentage: % with decimals (94.2%)
  - formatCompact: K/M/B suffixes (2.4M)

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

#### Member Portal (Professional Analytics Dashboard - Feb 18, 2026)
- **Dashboard** - Welcome banner, colored stat cards (ARI Score, Training Hours, Compliance Streak, Total Spent, Pending)
  - Activity stacked bar chart with Week/Month/Year toggle
  - Spending area chart
  - Purchases by Category donut chart
  - Training Progress horizontal bars
  - Compliance Checklist with completed/pending status
  - **Header Icons with Dropdown Previews** (Added Feb 19, 2026):
    - **Notification Bell**: Shows unread count badge, click to preview recent 4 notifications with title, message preview, time ago, action badges. "See All Notifications" button
    - **Documents Envelope**: Shows unread docs count, click to preview recent 4 documents with type icon, title, excerpt, time ago. "See All Documents" button
- **My License** - License details, expiry, compliance score, biometric status
- **Training Center** - Course enrollment, progress tracking, PDF certificates
  - Mobile: Tab navigation (Browse/My Courses/Completed), card-based course listings
- **Marketplace** - Product browsing, cart, order management
  - Mobile: 2-column product grid, floating cart button, category filter pills
- **History** - Transaction history with search/filters
- **Documents Page** (Added Feb 19, 2026) `/dashboard/documents`
  - Formal letters and certificates inbox (envelope icon)
  - Stats cards: Total, Unread, Certificates, Warnings counts
  - Filter buttons: All, Unread (count), Read, Archived, Type dropdown
  - Document cards with:
    - Type icons (Warning, License Cert, Training Cert, Achievement, etc.)
    - Priority badges (Urgent, Important, Normal, Info)
    - Date, sender, type badge
    - Download PDF and Archive buttons
  - View dialog with full document content
  - PDF download with official seal and watermark
- **Notifications Page** (Enhanced Feb 19, 2026) `/dashboard/notifications`
  - Stats cards: Total, Unread, Urgent, Read counts
  - Filter buttons: All, Unread (with count), Category dropdown
  - Notification cards with:
    - Category icons (System, Compliance, Training, General)
    - Priority badges (Urgent-red, High-amber, Normal, Low)
    - Source badges (Automated for triggers, Government for manual)
    - Action buttons for notifications with action_url
    - Mark as read checkmark button
  - Mark all as read button, Refresh button
  - Clickable bell icon in header with unread count badge
- **Settings** - Profile, security, appearance settings

#### Dealer Portal (Professional Analytics Dashboard)
- **Analytics Dashboard** (Redesigned Feb 18, 2026)
  - Colored stat cards: Total Transactions, Pending, Completed, Rejected, Revenue
  - Transactions stacked bar chart with Week/Month/Year toggle
  - Sales area chart with category filters
  - Popular Categories donut chart
  - Av. Transaction horizontal bar chart
  - Av. Processing Time horizontal bar chart with status colors
  - Recent Activity feed
- **Verify Buyer** - License verification with GPS tracking
- **Transactions** - Transaction history and management
- **Inventory Management** (Added Feb 18, 2026)
  - Stock tracking with quantity and low stock alerts
  - Add/Edit/Delete inventory items with SKU/barcode support
  - Stock adjustments (restock, sale, return, damage, expired, transfer)
  - Movement history and audit trail
  - Automatic reorder alerts for low stock items
  - Inventory valuation reports (by category, profit margins)
  - **CSV/Excel Import & Export** (Added Feb 18, 2026)
    - CSV export with Excel-compatible format
    - CSV import with smart header mapping
    - Preview imported data before confirmation
    - Download template for bulk uploads
  - Barcode/SKU scanning lookup
  - Optional marketplace linking (dealer can choose to list items or not)
- **Settings** - Profile and business settings

#### Government Portal (Professional Analytics Dashboard - Feb 18, 2026)
- **National Oversight Dashboard** - Colored stat cards (Licensed Owners 2.4M, Active Dealers, Compliance Rate, Pending Reviews, Monthly Revenue)
  - License Registrations stacked bar chart (New Licenses, Renewals, Revocations)
  - Revenue Collection area chart
  - Transaction Categories donut chart
  - Regional Compliance horizontal bars
  - Alert Distribution donut chart by severity
  - Recent Alerts section
- Risk analytics
- Compliance monitoring
- Alert management with resolution workflow
- **Pending Reviews Management** (Added Feb 19, 2026) - `/government/reviews`
  - Count cards for all review types (License Apps, Renewals, Dealer Certs, Flagged Txns, Violations, Appeals)
  - Filterable review list (by status, type, region, search)
  - Review detail dialog with full application data
  - Approve/Reject workflow with decision reason
  - Add notes to reviews
  - Audit trail for all review actions
- **Document Templates Management** (Added Feb 19, 2026) - `/government/templates`
  - **Categorized Template UI** with 6 categories: Warning Letters, License Certificates, Training Certificates, Achievement Certificates, Compliance Certificates, Formal Notices
  - 18 standard templates available
  - One-click send with default template per category
  - Create custom templates with:
    - Custom colors (primary/secondary)
    - Logo upload option
    - Official seal toggle
    - Watermark toggle
    - Header, body template with {{placeholders}}, footer
    - Signature title
    - Automation triggers (on training completion, license renewal, etc.)
  - Template preview with PDF generation
  - Send documents to individual users or broadcast to roles
  - Sent Documents tab with delivery tracking
  - Stats: Total Templates, Documents Sent, Read, Pending
- **Certificate Configuration** (Added Feb 20, 2026) - `/government/certificate-config`
  - **Design & Colors Tab**: 4 design templates (Modern Geometric, Classic Diploma, Corporate Professional, Minimalist Official), customizable primary/secondary colors, font selection (Helvetica, Times New Roman, Courier)
  - **Seal Style Tab**: 5 seal options (Official Government Seal, Gold Ribbon Award, Blue Certification Badge, Star Medal, Custom), customizable seal text and organization name
  - **Signature Tab**: Authorized signatory name/designation, signature upload (PNG/JPG) or draw signature on canvas, signature preview
  - Configuration automatically applied when sending certificates
- **Verified Certificate System** (Added Feb 19, 2026)
  - QR codes embedded in PDF certificates for fraud prevention
  - Public verification page at `/verify/{doc_id}?h={hash}` (no login required)
  - Shows: document title, type, recipient, issue date, issuer authority info
  - Invalid/tampered documents show error message

#### Review System (Added Feb 19, 2026)
- **Public Application Forms** - Landing page "Apply or Report" section
  - License Application form (name, email, address, license type, purpose, ID info, region)
  - Dealer Certification form (business info, owner info, tax ID, compliance consent)
  - Violation Report form (type, severity, description, location, anonymous or identified)
- **Citizen Portal Actions**
  - License Renewal request form (reason, address change, training status, incidents)
  - Appeal form (decision type, grounds, evidence, requested outcome)
  - "My Pending Requests" section shows citizen's submitted reviews
- **Admin Review Management**
  - View and filter all pending reviews
  - Approve or reject with documented decision reason
  - Add internal notes for collaboration
  - Track review status through full lifecycle

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
| `/api/public/license-application` | POST | Submit new license application (no auth) |
| `/api/public/dealer-certification` | POST | Submit dealer certification (no auth) |
| `/api/public/report-violation` | POST | Report compliance violation (no auth, anonymous ok) |
| `/api/citizen/license-renewal` | POST | Submit license renewal request |
| `/api/citizen/appeal` | POST | Submit appeal for previous decision |
| `/api/citizen/my-reviews` | GET | Get citizen's submitted review items |
| `/api/reviews/pending-count` | GET | Get counts of pending reviews by type (admin) |
| `/api/reviews` | GET | List reviews with filtering (admin) |
| `/api/reviews/{review_id}` | GET | Get review detail with associated data (admin) |
| `/api/reviews/{review_id}` | PUT | Update review status/notes/assignment (admin) |
| `/api/government/dashboard-summary` | GET | Dashboard summary with real pending reviews count |
| `/api/government/notifications/send` | POST | Send notification to users (manual) |
| `/api/government/notifications` | GET | Get notification history |
| `/api/government/notification-stats` | GET | Get notification statistics |
| `/api/government/notification-triggers` | GET/POST | List/create notification triggers |
| `/api/government/notification-triggers/{id}` | PUT/DELETE | Update/delete notification trigger |
| `/api/government/notification-triggers/{id}/test` | POST | Test a trigger by sending to admin |
| `/api/government/notification-templates` | GET/POST | List/create notification templates |
| `/api/government/notification-templates/{id}` | DELETE | Delete notification template |
| `/api/government/users-list` | GET | Get list of users for targeting |
| `/api/government/triggers/scheduler-status` | GET | Get scheduler running status and trigger info |
| `/api/government/triggers/scheduler/start` | POST | Start the background trigger scheduler |
| `/api/government/triggers/scheduler/stop` | POST | Stop the background trigger scheduler |
| `/api/government/triggers/run-all` | POST | Manually run all enabled triggers |
| `/api/government/triggers/{id}/execute` | POST | Execute single trigger manually |
| `/api/government/triggers/executions` | GET | Get trigger execution history |
| `/api/government/document-templates` | GET/POST | List/create document templates |
| `/api/government/document-templates/{id}` | PUT/DELETE | Update/delete document template |
| `/api/government/document-templates/{id}/preview` | POST | Generate PDF preview |
| `/api/government/formal-documents/send` | POST | Send document to recipients |
| `/api/government/formal-documents` | GET | List all sent documents (admin) |
| `/api/government/formal-documents/stats` | GET | Get document statistics |
| `/api/citizen/documents` | GET | Get citizen's received documents |
| `/api/citizen/documents/{id}` | GET | View document (marks as read) |
| `/api/citizen/documents/{id}/pdf` | GET | Download document as PDF |
| `/api/citizen/documents/{id}/archive` | POST | Archive a document |

### Tech Stack
- **Frontend**: React, Tailwind CSS, Shadcn UI, react-swipeable
- **Backend**: FastAPI (Python)
- **Database**: MongoDB
- **PWA**: Service Workers, Web Push (VAPID)
- **PDF**: ReportLab

## Backlog

### P0 - Completed (Feb 19, 2026)
- [x] Review System - Full implementation with 6 review types
- [x] Public application forms on landing page
- [x] Citizen renewal and appeal forms in portal
- [x] Government pending reviews management page
- [x] Mobile-optimized charts for all three portals:
  - Citizen: ARI Score Gauge, Training Progress Ring, 30-Day Trend Sparkline, Weekly Activity Heatmap
  - Dealer: Revenue Goal Progress, Verification Rate Donut, Sales Velocity Bar, Top Sellers, Stock Level Indicators
  - Government: Review Queue by Priority, Processing Time Trend, Escalation Rate, Regional Compliance, Review Type Breakdown
- [x] Government Notification Management System:
  - Manual notification sending (all users, by role, or individual)
  - Automated notification triggers with event types (license_expiring, training_incomplete, compliance_warning, etc.)
  - Reusable notification templates
  - Notification history and statistics dashboard
  - **Automated Trigger Scheduler** (Tested Feb 19, 2026):
    - Background scheduler for automatic trigger execution (1-hour intervals)
    - Start/Stop scheduler controls
    - Run All Now manual execution
    - Execute single trigger manually
    - Execution history with sent/matched counts
    - Scheduler status dashboard with enabled triggers and next run times
- [x] Citizen Notifications Page with stats, filters, priority badges, source badges
- [x] **Formal Documents & Certificates System** (Added Feb 19, 2026):
  - Government Templates Management (`/government/templates`):
    - 5 standard templates (Warning Letter, License Certificate, Training Certificate, Achievement Certificate, Formal Notice)
    - Custom template creation with colors, logos, seals, watermarks
    - Template preview with PDF generation
    - Send to individuals or broadcast to roles
    - Automation triggers (on training completion, license renewal, etc.)
    - Sent Documents tracking
  - Citizen Documents Inbox (`/dashboard/documents`):
    - Formal letters and certificates inbox (envelope icon in nav)
    - Stats cards: Total, Unread, Certificates, Warnings
    - Filter by status (All/Unread/Read/Archived) and type
    - View dialog with full document content
    - Download PDF with official seal and watermark
    - Archive functionality
    - Execute single trigger manually
    - Execution history with sent/matched counts
    - Scheduler status dashboard with enabled triggers and next run times

### P0 - Completed (Feb 19, 2026 - Session 2)
- [x] **Document Inline Viewer with Social Sharing** (Tested Feb 19, 2026):
  - Inline document detail view (not modal) with full content display
  - Share to WhatsApp button (opens WhatsApp with formatted text)
  - Share to Telegram button (opens Telegram share URL)
  - Copy to clipboard with fallback for older browsers
  - Download PDF button
  - Archive functionality
  - Back to Documents navigation
  - Official seal indicator and signature info
- [x] **Sidebar Navigation Restored**: Documents and Notifications links in citizen sidebar
- [x] **Backend Modularization Foundation** (Feb 19, 2026):
  - Created `/app/backend/models/` directory with separated Pydantic models
  - Created `/app/backend/utils/` directory with database.py and helpers.py
  - Created `/app/backend/routes/` directory structure
  - Documented refactoring plan in `/app/backend/REFACTORING.md`
- [x] **Verified Certificate System with QR Code** (Feb 19, 2026):
  - SHA-256 hashed verification for fraud prevention
  - QR code embedded in certificate PDF
  - Public verification page at `/verify/:documentId` (no login required)
  - Issuing authority signature with name, designation, and organization
  - Verification badge displayed on citizen's document view
  - Hash verification endpoint `/api/verify/{document_id}`
  - Government send dialog updated with signature authority fields

### P0 - Completed (Feb 20, 2026)
- [x] **Policy Enforcement System**: Automated enforcement scheduler with late fees, warnings, suspensions
- [x] **Partner Integration APIs (10 total)**: All partner-ready APIs with Government portal page
  - Smart Safe IoT, Insurance, Training Ranges, Background Check
  - Mental Health Clinics, Gunsmith/Repair, Ammunition Retailers
  - Law Enforcement Databases, Payment Processors, GPS/Location Services
- [x] **Flagged Transaction Auto-Detection**: Complete rule engine with 8 configurable rules, admin UI, test transaction feature
- [x] **Backend Modularization Complete** (Feb 20, 2026):
  - Created modular router structure: /app/backend/routes/ with partners.py, flagging.py, auth.py
  - **server.py reduced from 12,319 → 11,120 lines** (~1,199 lines removed, ~10% reduction)
  - Removed: All duplicate /partner/* endpoints (10 endpoints)
  - Removed: All /government/partner-integrations/* endpoints (3 endpoints)
  - Removed: All /auth/* endpoints (5 endpoints) - now in auth.py
  - Removed: All flagging endpoints and functions
  - Fixed import paths to use absolute imports (utils.*, models.*)
- [x] **Firearm Owners Page Bug Fix** (Feb 20, 2026): Fixed status filter crash

### P1 - High Priority  
- [ ] Continue backend modularization:
  - Create citizen.py router (28 endpoints)
  - Create dealer.py router (20 endpoints)
  - Create government.py router (91 endpoints - largest group)
  - Target: Reduce server.py to under 6,000 lines

### P2 - Medium Priority  
- [ ] Community Mentor Matching
- [ ] SMS Notifications (currently mocked)
- [ ] Email notifications for review status changes

### P3 - Future Enhancements
- [ ] Real-time notifications (WebSocket)
- [ ] Advanced analytics dashboard
- [ ] Connect dashboard charts to real data (currently hardcoded)
- [ ] Onboard actual partners for all 10 integration types

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
- My License (`/dashboard/license`) - includes Renewal & Appeal forms
- Training (`/training`)
- Marketplace (`/marketplace`)
- History (`/dashboard/history`)
- Documents (`/dashboard/documents`) - Formal documents with inline viewer and sharing
- Notifications (`/dashboard/notifications`)
- Settings (`/dashboard/settings`)

Government portal pages:
- Dashboard (`/government`)
- **Owners** (`/government/owners`) - Firearm Owners Registry (Added Feb 20, 2026)
- Reviews (`/government/reviews`) - Pending reviews management
- Templates (`/government/templates`) - Certificate & document templates
- Cert Config (`/government/certificate-config`) - Certificate design configuration
- Notifications (`/government/notifications`) - Manual & automated notifications
- Analytics (`/government/predictive`) - Predictive analytics
- Alerts (`/government/alerts-dashboard`)
- Flagging (`/government/flagging`) - Transaction Auto-Detection Rules
- Partners (`/government/partners`) - Partner Integration Opportunities
- Settings (`/government/settings`)

### Recent Updates (Feb 20, 2026)

- **Flagged Transaction Auto-Detection System** (NEW - Feb 20, 2026):
  - **Rule Engine**: 8 configurable rules for automatic transaction flagging
  - **Default Rules**:
    - High Quantity Purchase (threshold: 50, auto-review)
    - Purchase Frequency Spike (max 2/day, 5/week, auto-review)
    - New Buyer High Value (license < 90 days + qty > 10, auto-review)
    - Low Compliance Score Buyer (score < 60, auto-review)
    - Geographic Anomaly (distance > 200km, disabled by default)
    - After Hours Transaction (outside 6am-10pm, low severity)
    - Dealer Compliance Issue (dealer score < 75, auto-review)
    - High Risk Score (score > 60, auto-review)
  - **Features**:
    - Automatic flagging on transaction creation
    - Auto-creates review items for flagged transactions
    - Test rules against sample transactions
    - Enable/disable rules, adjust thresholds
    - Create custom rules
    - Resolve flags with Clear/Block actions
  - **Backend APIs**:
    - `GET /api/government/flagging-rules` - Get all rules with stats
    - `PUT /api/government/flagging-rules/{rule_id}` - Update a rule
    - `POST /api/government/flagging-rules` - Create custom rule
    - `DELETE /api/government/flagging-rules/{rule_id}` - Delete custom rule
    - `GET /api/government/flagged-transactions` - Get flagged transactions
    - `POST /api/government/flagged-transactions/{flag_id}/resolve` - Resolve flag
    - `POST /api/government/flagging/test-transaction` - Test rules
  - **Frontend** (`/government/flagging`):
    - Stats cards: Total Rules, Active Rules, Unresolved Flags, High Severity, Total Flags
    - Rules tab: View/edit all rules with toggles and conditions
    - Flagged Transactions tab: View and resolve flagged transactions
    - Test Rules dialog: Test against sample transactions
    - Add Rule dialog: Create custom flagging rules

- **Partner Integration Opportunities** (NEW - Feb 20, 2026):
  - **Smart Safe IoT Integration** (Seeking Partner):
    - Purpose: Connect with IoT-enabled gun safes to automatically verify secure storage
    - Benefits: Automated compliance verification, real-time tamper alerts, higher ARI scores
    - API endpoints ready for partner onboarding
  - **Insurance Partner Integration** (Seeking Partner):
    - Purpose: Connect with firearm insurance providers for automatic coverage verification
    - Benefits: Instant verification, automatic renewal reminders, reduced fraud
    - API endpoints ready for partner onboarding
  - **Government Portal Page** (`/government/partners`):
    - Displays all available integrations with layman explanations
    - Shows integration status (Active/Seeking Partner)
    - Technical requirements and data sharing details
    - Contact partnership team CTA
  - **Backend APIs**:
    - `GET /api/government/partner-integrations` - List all integrations
    - `GET /api/government/partner-integrations/{id}` - Integration details
    - `POST /api/partner/smart-safe/status-report` - Partner endpoint for safe reports
    - `POST /api/partner/insurance/policy-update` - Partner endpoint for policy updates
    - `GET /api/government/smart-safe/reports` - Admin view of safe reports
    - `GET /api/government/insurance/records` - Admin view of insurance records

- **Policy Enforcement System** (NEW - Feb 20, 2026):
  - **Automated Enforcement Scheduler**: Runs every 6 hours to check compliance
  - **Enforcement Actions**:
    - Calculates fee due dates based on license/fee_paid_until
    - Applies late fees after grace period (configurable % per month)
    - Sends warning notifications at configured intervals (e.g., days 2, 4, 7 past grace)
    - Auto-suspends licenses after suspension trigger days
    - Blocks dealer transactions for suspended users
    - Flags firearms for repossession (configurable)
  - **Backend APIs**:
    - `GET /api/government/enforcement/status` - Scheduler status and compliance counts
    - `POST /api/government/enforcement/run` - Manual enforcement run
    - `GET /api/government/enforcement/history` - Execution history
    - `POST /api/government/enforcement/scheduler/start` - Start scheduler
    - `POST /api/government/enforcement/scheduler/stop` - Stop scheduler
    - `POST /api/government/enforcement/reinstate/{user_id}` - Reinstate suspended user
    - `GET /api/government/enforcement/user/{user_id}` - User enforcement history
  - **Frontend** (Policy Management page - Enforcement tab):
    - Scheduler status indicator (running/stopped)
    - Start/Stop Scheduler and Run Now buttons
    - Compliance status cards: Total, Paid, Pending, Overdue, Suspended
    - Enforcement Actions summary (shows policy settings)
    - Recent Enforcement Runs history
  - **Testing**: 97% backend tests passed, 100% frontend tests passed

- **Annual Fees & Firearms Tracking System** (NEW):
  - **Member Annual License Fee**: $150/year for holding a firearm license
  - **Per-Firearm Registration Fee**: $50/year per registered firearm
  - Backend APIs:
    - `/api/citizen/firearms` - CRUD for firearm registration
    - `/api/citizen/fees-summary` - User's total annual fees breakdown
    - `/api/government/fees-overview` - Platform-wide fee statistics
    - `/api/government/firearms-registry` - All registered firearms with owner info
  - Frontend updates:
    - Summary cards: "Reg. Firearms" count and "Annual Revenue" total
    - User list shows "$150/yr Annual Fees" per user
    - User detail dialog: 4 tabs (Profile, License, Firearms, Fees)
    - Fees tab: Complete breakdown of license + firearm fees

- **Landing Page Updated** to showcase new backend features:
  - New "National Oversight Capabilities" section with 6 government features
  - Firearm Owners Registry, Verified Certificates, Certificate Designer
  - Review Management, Automated Notifications, Analytics Dashboard
  - "Verify a Certificate" CTA with QR code icon and button
  - Updated "Get Started" section with feature tags (Owners Registry, QR Certificates, CSV Export)

- **Firearm Owners Registry Page** (`/government/owners`):
  - Lists all registered citizens and dealers
  - Summary cards: Citizens count, Dealers count, Active Licenses, Pending
  - Search by name, email, or user ID
  - Filter by role (Citizens/Dealers) and license status
  - User detail dialog with Profile, License, and History tabs
  - **Export CSV** button for downloading user data (Added Feb 20, 2026)
    - Exports to Excel-compatible CSV format
    - Includes 16 columns: User ID, Name, Email, Role, Region, State, License Type, License Number, License Status, License Issued, License Expiry, Compliance Score, Training Hours, Phone, Address, Registered Date
    - Filename format: `firearm_owners_{role}_{timestamp}.csv`
    - Shows success toast with record count
  - Backend APIs: `/api/government/citizen-profiles`, `/api/government/user-profile/{user_id}`, `/api/government/users-export`

- **Navigation Fixes**:
  - Fixed Analytics link redirecting to home page (was pointing to non-existent `/government/analytics`)
  - Now correctly points to `/government/predictive`
  - Added "Owners" link to all government portal navigation sidebars

- **Input Lag Fix in Pending Reviews**:
  - Optimized with `useMemo`, `useCallback`, and `memo`
  - Extracted NoteInput and DecisionInput into memoized subcomponents
  - Input responsiveness verified: no lag in search, note input, or decision textarea

