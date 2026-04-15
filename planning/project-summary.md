# AI Customer Feedback Survey Tool - Project Summary

## Product Overview

An AI-powered **B2C survey platform** that helps individual consumers and small teams create surveys, distribute them, collect responses, and analyze feedback using AI-powered sentiment analysis and theme extraction. Think of it as the modern, consumer-friendly alternative to Google Forms — polished, intelligent, and delightful to use.

**Target Users:** Individual consumers, freelancers, small business owners, students, and small teams who need to collect and analyze feedback.

---

## Core Features (MVP → Phase 4)

### Phase 1: Foundation (Weeks 1-2)

#### 1. Authentication & User Management
- **OAuth Social Login**: Google via Firebase Auth
  - ~~Apple~~ (removed — requires paid Apple Developer subscription)
  - ~~Facebook~~ (removed — verification process takes weeks)
- **Email/Password**: Traditional authentication option
- ~~**Magic Links**: Passwordless authentication~~ (removed — unnecessary)
- **Auto-provisioned Personal Workspace**: Every user gets their own workspace on signup
- **User Profile Management**: Basic profile settings and preferences

#### 2. Survey Creation
- **Visual Survey Builder**: Drag-and-drop interface for question creation
- **Question Types**:
  - Rating scales (Likert, star ratings, NPS, CSAT, CES)
  - Open-ended (short text, long text)
  - Multiple choice (single/multi-select)
  - Matrix/grid questions
  - Ranking questions
  - Sliders
- **AI-Assisted Question Generation**: 
  - Suggest questions based on survey goals
  - Optimize question wording for clarity
  - Question quality scoring
- **Branching Logic**: Conditional question routing
- **Survey Templates**: Pre-built templates organized by category (Customers, Employees, Markets, Students, Website/App Visitors)
- **AI Template Generation**: Chatbot-style input for AI-generated custom survey templates
- **Preview Mode**: Integrated editor/preview toggle within the survey builder (sliding segmented control)
- **Branding Customization**: Colors, logos, custom styling

#### 3. Response Collection
- **Multi-Channel Distribution** (accessed via Publish page in survey builder breadcrumb flow):
  - Share link (copy URL)
  - Embed code (HTML snippet)
  - Email invitations
  - Direct shareable links
  - QR codes
  - Website embeds
- **Mobile-Optimized**: Responsive survey experience
- **Auto-save Progress**: Partial response saving
- **Anonymous vs Identified**: Configurable response tracking
- **Real-time Response Tracking**: Live response count

### Phase 2: AI Analysis & Dashboard (Weeks 3-4)

#### 4. AI-Powered Analysis (Hybrid Model)
- **Intelligent Model Routing**:
  - GPT-4o mini for 90% of responses (cost-effective)
  - Claude Sonnet for VIP customers, complex responses, urgent issues
- **Sentiment Analysis**:
  - Real-time sentiment scoring (-1.0 to 1.0)
  - Sentiment labels (very negative → very positive)
  - Confidence scores
- **Emotion Detection**: Joy, anger, frustration, satisfaction, etc.
- **Theme Extraction**:
  - Automatic topic clustering
  - Keyword extraction
  - Theme prevalence tracking
- **Urgency Detection**:
  - AI urgency scoring (0-10)
  - Automatic flagging of critical issues
  - Keyword-based escalation triggers

#### 5. Real-Time Dashboard
- **Live Metrics**:
  - Response count & completion rates
  - Overall sentiment gauge with trends
  - NPS/CSAT scores
- **Urgent Issue Feed**: Real-time stream of flagged responses
- **Top Themes Widget**: Most mentioned topics
- **Visual Analytics**:
  - Sentiment over time (line charts)
  - Theme word clouds
  - Response distribution histograms
  - Heat maps
- **Auto-refresh**: Configurable update intervals
- **Mobile Dashboard**: Responsive design

#### 6. Response Management
- **Unified Inbox**: All responses in one feed
- **Advanced Filtering**:
  - By sentiment, theme, date range, urgency
  - Saved filter combinations
  - Full-text search
- **Tagging System**: Custom tags with auto-suggestions
- **Internal Notes**: Team collaboration on responses
- **Follow-Up Actions**:
  - Create tasks directly from responses
  - Assignment to team members
  - Status tracking
- **Export Options**: CSV, Excel, PDF with metadata

### Phase 3: Multi-Tenancy (Weeks 5-6)

#### 7. Team Collaboration
- **Organization Management**:
  - Personal workspaces (auto-created)
  - Team workspaces (user-created)
  - Organization switcher in UI
- **Team Invitations**:
  - Email-based invite system
  - Invitation tokens with expiry
  - Pending invite management
- **Role-Based Access Control**:
  - **Owner**: Full control, billing, delete organization
  - **Admin**: Manage members, create/edit surveys
  - **Member**: Create surveys, view responses
  - **Viewer**: Read-only access to surveys and responses
- **Member Management**:
  - Add/remove team members
  - Change roles
  - View activity logs

#### 8. Reporting & Analytics
- **Custom Reports**: Drag-and-drop report builder
- **Scheduled Reports**: Automated email delivery (daily, weekly, monthly)
- **Comparative Analysis**:
  - Period-over-period comparisons
  - Segment comparisons
  - Statistical significance testing
- **Export Formats**: PDF, Excel, PowerPoint
- **Benchmark Comparisons**: Industry standards (when data available)

### Phase 4: Advanced Features (Month 2+)

#### 9. Custom Domains (Premium Feature)
- **Custom Survey URLs**: feedback.customer-company.com
- **DNS Verification**: Automated setup flow
- **Free SSL Certificates**: Via AWS Certificate Manager
- **CloudFront Distribution**: Global CDN delivery
- **Domain Management Dashboard**: Status tracking, DNS configuration help

#### 10. Advanced Distribution
- **Audience Segmentation**: Target specific customer groups
- **Scheduled Sends**: One-time and recurring campaigns
- **Automated Reminders**: Smart follow-up system
- **Response Quotas**: Auto-close surveys at target
- **API Triggers**: Event-driven survey distribution
- **Webhook Integration**: Connect to external systems

#### 11. Integration Ecosystem (Future)
- **CRM**: Salesforce, HubSpot
- **Support Tools**: Zendesk, Intercom
- **Communication**: Slack, Microsoft Teams
- **Marketing**: Mailchimp, Marketo
- **Analytics**: Google Analytics, Mixpanel

### Deferred Features (Post-MVP)
- Payments & subscriptions (Stripe integration ready)
- Multi-language support (schema prepared)
- SAML SSO for enterprise
- Advanced AI features (predictive analytics, root cause analysis)
- Mobile apps (iOS, Android)
- White-label options
- API for developers
- Webhooks for custom integrations

---

## UI Architecture & Navigation

### Layout: Sidebar-Only (No Top Navigation)

The application uses a **left sidebar + main content** layout with NO top navigation bar.

**Left Sidebar (240px expanded, 64px collapsed):**
- **Top**: SurveyGo logo + wordmark (collapsed = icon only)
- **Collapse toggle**: Chevron button to expand/collapse sidebar
- **Nav items**: Dashboard, My Surveys, Templates, Team
- **Bottom section** (below divider): Theme toggle (dark/light), Notifications bell (with badge), Profile button (avatar + name)

**Profile Dropdown** (clicking profile button at bottom of sidebar):
1. User avatar + display name + email (header row)
2. Upgrade Plan (sparkle icon)
3. Personalization (palette icon)
4. Settings (gear icon)
5. Log Out (log-out icon)

**Note**: Settings is NOT a sidebar nav item — it's accessed via the profile dropdown.

### Pages & Routes

| Route | Page | Sidebar State |
|---|---|---|
| `/` | Landing Page (public, no sidebar) | — |
| `/login` | Login | — |
| `/signup` | Sign Up | — |
| `/dashboard` | Dashboard | Dashboard active |
| `/surveys` | My Surveys | My Surveys active |
| `/templates` | Templates (AI input + categories) | Templates active |
| `/surveys/new/builder` | Survey Builder (Edit step) | My Surveys active |
| `/surveys/:id/edit` | Survey Builder (Edit step) | My Surveys active |
| `/surveys/:id/publish` | Survey Publish (Publish step) | My Surveys active |
| `/surveys/:id/responses` | Survey Responses (Responses step) | My Surveys active |
| `/team` | Team Management | Team active |
| `/settings` | Settings (via profile dropdown) | None active |

### Survey Builder Breadcrumb Flow

The survey builder uses a **breadcrumb stepper**: **Edit** → **Publish** → **Responses**
- Edit: Question editor with editor/preview toggle
- Publish: Distribution options (share link, embed, email, QR)
- Responses: Analytics and individual response viewing

### Theme Support

- Light mode (default) and dark mode
- Toggle accessible from sidebar (sun/moon icon) and Personalization settings

---

## Technical Architecture

### Frontend Stack

**Core Framework:**
- **React 18** with TypeScript
- **Vite** for build tooling
- **React Router** for navigation

**State Management:**
- **TanStack Query (React Query)**: Server state, caching, data synchronization
- **Zustand**: Client state (UI preferences, sidebar collapsed state, theme, etc.)
- **React Context**: Auth state

**UI & Styling:**
- **Tailwind CSS**: Utility-first styling
- **shadcn/ui**: Copy-paste component library built on Radix UI (all dropdowns/selects are custom-styled, no browser defaults)
- **Radix UI**: Accessible, unstyled component primitives
- **Recharts**: Data visualization
- **D3.js**: Complex visualizations (when needed)

**Form & Validation:**
- **React Hook Form**: Form state management
- **Zod**: Runtime type validation and schemas

**Deployment:**
- **CloudFront + S3**: Global CDN delivery
- **GitHub Actions**: CI/CD pipeline

### Backend Stack

**Primary Database & Backend:**
- **Firebase** (Google Cloud Platform)
  - **Firestore**: NoSQL document database with real-time sync
  - **Firebase Security Rules**: Multi-tenant data isolation
  - **Realtime subscriptions**: Built-in real-time listeners
  - **Firebase Auth**: Built-in authentication (JWT-based)
  - **Cloud Storage for Firebase**: File storage
  - **Cloud Functions**: Node.js serverless runtime

**Serverless Compute:**
- **AWS Lambda** (Node.js 20.x)
  - AI analysis processing
  - Scheduled jobs (reminders, reports)
  - Email/SMS sending
  - Data exports
  - Domain verification

**AI/ML Services:**
- **OpenAI GPT-4o mini** (Primary - 90% of analysis)
  - Cost: $0.15/1M input tokens, $0.60/1M output tokens
  - Use case: Standard sentiment analysis, theme extraction
- **Anthropic Claude 3.5 Sonnet** (Premium - 10% of analysis)
  - Cost: $3/1M input tokens, $15/1M output tokens
  - Use case: VIP customers, complex responses, urgent issues
- **Intelligent Routing**: Automatic model selection based on response characteristics

**Supporting AWS Services:**
- **Amazon SES**: Email delivery ($0.10/1,000 emails)
- **Amazon SNS**: SMS notifications
- **Amazon SQS**: Asynchronous job queue
- **Amazon EventBridge**: Scheduled tasks and event routing
- **Amazon S3**: File storage and exports
- **AWS Certificate Manager**: Free SSL certificates
- **Lambda@Edge**: Custom domain routing

**Monitoring & Error Tracking:**
- **Sentry**: Frontend and backend error tracking (free tier: 5,000 errors/month)
- **AWS CloudWatch**: Logs, metrics, alarms

### Database Schema (Key Tables)

```
organizations
├── id, name, type (personal/team), owner_id
├── plan, plan_limits, stripe_customer_id
└── settings (JSONB), data_region

organization_members
├── organization_id, user_id, role
└── invited_by, joined_at

user_profiles
├── id (references auth.users), organization_id
├── email, full_name, avatar_url
└── preferences (JSONB)

surveys
├── id, organization_id, created_by
├── title, description, status
├── questions (JSONB), logic (JSONB)
├── settings (JSONB), distribution_config (JSONB)
└── response_count, published_at

responses
├── id, survey_id
├── respondent_id, respondent_email, respondent_metadata
├── answers (JSONB), status
├── sentiment_score, sentiment_label, emotions
├── themes (JSONB), urgency_score, is_urgent
└── source, device_type, completed_at

themes
├── id, survey_id, organization_id
├── name, description, keywords[]
├── mention_count, avg_sentiment
└── parent_theme_id (hierarchical)

response_themes (many-to-many)
├── response_id, theme_id, confidence

response_actions
├── id, response_id, action_type
├── assigned_to, status, details (JSONB)
└── created_by, completed_at

custom_domains (Phase 4)
├── id, organization_id, domain
├── status, verification_token
├── ssl_certificate_arn, cloudfront_distribution_id
└── verified_at, activated_at

distribution_queue
├── id, survey_id
├── recipient_email, recipient_phone
├── channel, status, scheduled_for
└── sent_at, error_message
```

### Security Architecture

**Authentication:**
- Firebase Auth with JWT tokens
- OAuth 2.0 (Google, Apple, Facebook)
- Automatic token refresh
- Session management

**Authorization:**
- Firebase Security Rules on all collections
- Organization-based data isolation
- Role-based access control (Owner, Admin, Member, Viewer)
- API key authentication for public survey endpoints

**Data Protection:**
- Encryption at rest (Firebase/GCP default)
- Encryption in transit (TLS 1.3)
- PII anonymization options
- Configurable data retention policies

**Compliance Ready:**
- GDPR-compliant data handling
- CCPA support (data export, deletion)
- Audit logs for data access
- Configurable consent management

### Infrastructure & DevOps

**Environments:**
- Development: Firebase Emulators + LocalStack
- Staging: Firebase staging project + AWS staging account
- Production: Firebase production + AWS production account

**CI/CD Pipeline:**
```
GitHub Push → GitHub Actions
  ├── Run Tests (Vitest)
  ├── Lint & Type Check (ESLint, TypeScript)
  ├── Build Frontend (Vite)
  ├── Deploy to S3/CloudFront
  ├── Deploy Lambda Functions (CDK)
  └── Deploy Firebase (Firestore rules, Cloud Functions)
```

**Infrastructure as Code:**
- AWS CDK (TypeScript) for Lambda, SQS, EventBridge, CloudFront
- Firebase CLI for Firestore rules, indexes, and Cloud Functions
- Version-controlled infrastructure

---

## Data Flow Examples

### Survey Response Submission Flow
```
1. User submits survey → POST /api/surveys/{id}/responses
2. Cloud Function validates & saves response to Firestore
3. Message sent to SQS queue (async)
4. Lambda triggered (batch of 10 responses)
5. For each response:
   a. Extract open-ended text
   b. Route to GPT-4o mini or Claude (based on routing logic)
   c. Receive AI analysis (sentiment, themes, urgency)
   d. Update response record in Firestore
   e. Create/link themes
   f. If urgent → send alerts (Slack, email)
6. Firestore real-time listeners broadcast update to dashboard
7. Dashboard auto-refreshes with new data
```

### Custom Domain Setup Flow (Phase 4)
```
1. User enters domain → feedback.acme.com
2. System generates verification token
3. User adds DNS records:
   - TXT: _acme-challenge.feedback.acme.com → [token]
   - CNAME: feedback.acme.com → [cloudfront-domain]
4. Background job verifies DNS (every 5 min)
5. Request SSL certificate from ACM
6. Wait for certificate issuance (~5-10 minutes)
7. Update CloudFront distribution with new domain + cert
8. Mark domain as active
9. Lambda@Edge routes custom domain requests to correct org
```

### Real-Time Dashboard Update Flow
```
1. New response submitted
2. Firestore document created/updated
3. Firestore onSnapshot listeners detect change
4. Frontend subscribed to responses collection receives event
5. TanStack Query cache invalidated
6. Dashboard components re-fetch data
7. Charts update with new sentiment/theme data
8. Notification badge increments
```

---

## Cost Estimates

### Monthly Operating Costs

**Tier 1: MVP Launch (0-100 responses/month)**
- Firebase Blaze (pay as you go): ~$5-10
- AWS Lambda: $0 (within free tier)
- OpenAI API: $0.03
- Amazon SES: $0.01
- S3 + CloudFront: $1
- **Total: ~$7-12/month**

**Tier 2: Early Growth (1,000 responses/month)**
- Firebase Blaze: ~$15-25
- AWS Lambda: $5
- OpenAI API (900 responses): $0.30
- Claude API (100 responses): $0.75
- Amazon SES (5,000 emails): $0.50
- S3 + CloudFront: $5
- Sentry: $0 (free tier)
- **Total: ~$27-37/month**

**Tier 3: Scaling (10,000 responses/month)**
- Firebase Blaze: ~$50-80
- AWS Lambda: $30
- OpenAI API: $3
- Claude API: $7.50
- Amazon SES: $5
- S3 + CloudFront: $15
- Sentry: $0 (free tier)
- **Total: ~$111-141/month**

**Tier 4: High Volume (100,000 responses/month)**
- Firebase Blaze: ~$300-500
- AWS Lambda: $200
- OpenAI API: $30
- Claude API: $75
- Amazon SES: $50
- S3 + CloudFront: $100
- Sentry Pro: $26
- **Total: ~$780-980/month**

### Custom Domain Costs (Phase 4)
- Per domain: $0.50/month (Route 53 hosted zone)
- Can charge customers $5-10/month per domain

---

## Performance Targets

**Frontend:**
- Initial page load: < 2 seconds
- Time to interactive: < 3 seconds
- Lighthouse score: > 90

**Survey Response:**
- Form submission: < 500ms
- Auto-save: < 200ms (debounced)
- Mobile-optimized: < 1s load on 3G

**AI Analysis:**
- Sentiment analysis: < 5 seconds per response
- Theme extraction: < 10 seconds per response
- Batch processing: 100 responses in < 2 minutes
- Dashboard updates: Real-time (< 1 second latency)

**Database:**
- Query response: < 100ms (p95)
- Concurrent users: 1,000+ supported
- Realtime subscriptions: < 500ms latency

---

## Development Roadmap

### Phase 1: Foundation (2 weeks)
**Week 1:**
- [ ] Project setup (React + Vite + TypeScript)
- [ ] Firebase project setup
- [ ] Firestore schema/collections design
- [ ] Authentication implementation (Google OAuth via Firebase Auth)
- [ ] Landing page (public marketing page)
- [ ] Basic UI layout: collapsible sidebar, page routing, dark/light theme toggle

**Week 2:**
- [ ] Survey builder UI with editor/preview toggle and breadcrumb stepper (Edit → Publish → Responses)
- [ ] Survey publish page (share link, embed, email, QR)
- [ ] Templates page (AI chatbot input + category grid)
- [ ] Survey response collection (public endpoint)
- [ ] Basic response/analytics viewing

### Phase 2: AI & Analytics (2 weeks)
**Week 3:**
- [ ] OpenAI integration
- [ ] Claude integration
- [ ] Hybrid routing logic
- [ ] Lambda function setup (AI analysis)
- [ ] SQS queue configuration

**Week 4:**
- [ ] Real-time dashboard
- [ ] Sentiment charts
- [ ] Theme extraction display
- [ ] Urgent issue feed
- [ ] Response management UI

### Phase 3: Multi-Tenancy (2 weeks)
**Week 5:**
- [ ] Organization schema updates
- [ ] Team creation flow
- [ ] Invitation system
- [ ] Organization context/switcher
- [ ] Role-based UI elements

**Week 6:**
- [ ] Member management
- [ ] Permission enforcement
- [ ] Audit logs
- [ ] Team activity feed

### Phase 4: Advanced Features (Ongoing)
**Month 2:**
- [ ] Custom domain setup flow
- [ ] Lambda@Edge domain routing
- [ ] DNS verification automation
- [ ] Advanced reporting
- [ ] Scheduled reports

**Month 3+:**
- [ ] Stripe integration (payments)
- [ ] API for developers
- [ ] Webhook system
- [ ] Mobile apps
- [ ] Additional integrations

---

## Key Architectural Decisions & Rationale

### 1. Firebase as Primary Backend
**Why:** 
- Complete backend solution (database, auth, storage, realtime)
- Reduces operational complexity
- Built-in Security Rules for multi-tenant isolation
- Generous free tier, scalable pricing
- Excellent developer experience and Google ecosystem integration
- Superior real-time sync with offline support

**Alternative considered:** Supabase (PostgreSQL-based)
**Rejected because:** Encountered reliability/connectivity issues during development

### 2. Hybrid AI Model (GPT-4o mini + Claude)
**Why:**
- 86% cost savings vs using Claude for everything
- Maintains quality for important customers
- Flexible routing based on response characteristics

**Alternative considered:** Only GPT-4o mini
**Rejected because:** Some responses require deeper analysis, customer differentiation

### 3. Serverless Architecture (Lambda)
**Why:**
- Pay only for actual usage
- Auto-scaling
- No server maintenance
- Perfect for variable workloads (AI analysis spikes)

**Alternative considered:** Always-on EC2 instances
**Rejected because:** Higher base cost, manual scaling, maintenance burden

### 4. shadcn/ui over Component Libraries
**Why:**
- Copy-paste approach (you own the code)
- No bundle bloat
- Full customization
- Built on accessible Radix primitives

**Alternative considered:** Material-UI, Chakra
**Rejected because:** Larger bundle size, harder to customize deeply

### 5. TanStack Query for Server State
**Why:**
- Automatic caching and refetching
- Optimistic updates
- Background synchronization
- Excellent DX with TypeScript

**Alternative considered:** Redux, Apollo Client
**Rejected because:** Too much boilerplate (Redux), unnecessary for REST (Apollo)

### 6. US-Only Data Residency (Phase 1)
**Why:**
- Simpler architecture
- Lower costs
- Faster development
- Can add EU later when needed

**Alternative considered:** Multi-region from day 1
**Rejected because:** 2x cost, 2x complexity, premature optimization

### 7. Custom Domains via Lambda@Edge
**Why:**
- Serverless (no infrastructure to manage)
- Scales automatically
- Low latency globally
- Cost-effective

**Alternative considered:** Application Load Balancer with host-based routing
**Rejected because:** Higher base cost (~$20/month), less flexible

---

## Risk Mitigation

### Technical Risks
1. **AI Cost Overruns**: Mitigated by hybrid model, batching, caching
2. **Database Performance**: Proper Firestore indexing, composite indexes, caching layer
3. **Realtime Scalability**: Firebase Realtime/Firestore tested to millions of concurrent connections
4. **Lambda Cold Starts**: Mitigated by reserved concurrency for critical functions

### Business Risks
1. **Competitive Market**: Focus on AI differentiation and superior UX
2. **Customer Acquisition**: Start with niche (specific industry) then expand
3. **Pricing Strategy**: Freemium model with clear upgrade path

### Security Risks
1. **Data Breaches**: RLS, encryption, audit logs, regular security audits
2. **DDoS**: CloudFront + WAF, rate limiting
3. **Injection Attacks**: Parameterized queries, input validation, Zod schemas

---

## Success Metrics

### Product Metrics (First 6 Months)
- 1,000 registered users
- 10,000 surveys created
- 100,000 responses collected
- 50,000 AI analyses performed
- 90%+ customer satisfaction (NPS)

### Technical Metrics
- 99.9% uptime
- < 2s average page load
- < 100ms API response time (p95)
- < 5s AI analysis time (p95)

### Business Metrics
- CAC < $50
- Monthly churn < 5%
- Free-to-paid conversion > 2%
- MRR growth > 20% month-over-month

---

## Next: UX Design Discussion

Now that we have the comprehensive technical foundation, let's discuss the **user experience (UX)** of the application.

Key questions to explore:
1. **Information Architecture**: How should users navigate between surveys, responses, analytics?
2. **Onboarding Flow**: What should new users see first?
3. **Survey Builder UX**: How can we make survey creation intuitive and fast?
4. **Dashboard Layout**: What should the main dashboard prioritize?
5. **Response Management**: How should users triage and act on feedback?
6. **Mobile Experience**: What features are critical for mobile?

Ready to dive into UX!