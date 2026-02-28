# Authentication & Remaining Tech Stack Decisions

## Authentication Strategy

### Firebase Auth - RECOMMENDED ✅

**Why Firebase Auth is perfect for your use case:**

Firebase has **built-in authentication** that handles everything you need out of the box:

#### Supported OAuth Providers (Ready to use):
- ✅ Google OAuth
- ✅ Facebook OAuth  
- ✅ Apple OAuth
- ✅ GitHub, Twitter, and more

#### Additional Auth Methods:
- Email/Password (with email verification)
- Email Links (passwordless email login)
- Phone/SMS authentication
- SAML SSO (for Enterprise customers via Firebase/GCP Identity Platform)

#### Built-in Features:
- **Firebase Security Rules**: Database-level access control
- **JWT tokens**: Automatic token management via Firebase Admin SDK
- **Session management**: Refresh tokens, expiry handling
- **Email templates**: Customizable verification/reset emails
- **Multi-factor authentication (MFA)**: SMS and TOTP support
- **User metadata**: Store custom user properties via custom claims

### Setup Example:

```typescript
// lib/firebase.ts
import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider, FacebookAuthProvider, OAuthProvider, signInWithPopup, signInWithRedirect, onAuthStateChanged } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

export const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)

// Sign in with Google
export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider()
  provider.addScope('profile')
  provider.addScope('email')
  try {
    const result = await signInWithPopup(auth, provider)
    return result.user
  } catch (error) {
    console.error('Google sign-in error:', error)
    throw error
  }
}

// Sign in with Apple
export async function signInWithApple() {
  const provider = new OAuthProvider('apple.com')
  provider.addScope('email')
  provider.addScope('name')
  try {
    const result = await signInWithPopup(auth, provider)
    return result.user
  } catch (error) {
    console.error('Apple sign-in error:', error)
    throw error
  }
}

// Sign in with Facebook
export async function signInWithFacebook() {
  const provider = new FacebookAuthProvider()
  provider.addScope('email')
  try {
    const result = await signInWithPopup(auth, provider)
    return result.user
  } catch (error) {
    console.error('Facebook sign-in error:', error)
    throw error
  }
}

// Check current user
export function getCurrentUser() {
  return auth.currentUser
}

// Listen to auth state changes
onAuthStateChanged(auth, (user) => {
  if (user) {
    console.log('User signed in:', user)
  } else {
    console.log('User signed out')
  }
})
```

### Configuration in Firebase Console:

1. **Enable OAuth providers** (Firebase Console → Authentication → Sign-in method)
2. **Add OAuth credentials**:
   - Google: Enabled by default for Firebase projects
   - Apple: Service ID + Key from Apple Developer
   - Facebook: App ID + Secret from Meta for Developers
3. **Add authorized domains** (Firebase Console → Authentication → Settings)
4. **Customize email templates** (Firebase Console → Authentication → Templates)

### React Auth Hook:

```typescript
// hooks/useAuth.ts
import { useEffect, useState } from 'react'
import { User, onAuthStateChanged } from 'firebase/auth'
import { auth } from '@/lib/firebase'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Listen for auth changes
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  return { user, loading }
}
```

### User Profile Extension:

```typescript
// Cloud Function to create user profile on signup
import * as functions from 'firebase-functions'
import * as admin from 'firebase-admin'

admin.initializeApp()
const db = admin.firestore()

export const onUserCreated = functions.auth.user().onCreate(async (user) => {
  // Create user profile document
  await db.collection('user_profiles').doc(user.uid).set({
    id: user.uid,
    email: user.email,
    full_name: user.displayName || '',
    avatar_url: user.photoURL || '',
    created_at: admin.firestore.FieldValue.serverTimestamp(),
  })
  
  // Create personal organization for the user
  const orgRef = db.collection('organizations').doc()
  await orgRef.set({
    name: `${user.email}'s Workspace`,
    type: 'personal',
    owner_id: user.uid,
    plan: 'free',
    settings: {},
    created_at: admin.firestore.FieldValue.serverTimestamp(),
  })
  
  // Add user as owner of their org
  await db.collection('organization_members').add({
    organization_id: orgRef.id,
    user_id: user.uid,
    role: 'owner',
    joined_at: admin.firestore.FieldValue.serverTimestamp(),
  })
  
  // Update user profile with organization_id
  await db.collection('user_profiles').doc(user.uid).update({
    organization_id: orgRef.id,
  })
})
```

---

## Other Critical Tech Stack Decisions

### 1. **Frontend State Management** 

#### Recommended: TanStack Query + Zustand

```typescript
// Zustand for client state (UI, preferences)
import { create } from 'zustand'

interface AppStore {
  sidebarOpen: boolean
  toggleSidebar: () => void
  theme: 'light' | 'dark'
  setTheme: (theme: 'light' | 'dark') => void
}

export const useAppStore = create<AppStore>((set) => ({
  sidebarOpen: true,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  theme: 'light',
  setTheme: (theme) => set({ theme }),
}))

// TanStack Query for server state (surveys, responses)
import { useQuery, useMutation } from '@tanstack/react-query'
import { collection, query, orderBy, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'

function useSurveys() {
  return useQuery({
    queryKey: ['surveys'],
    queryFn: async () => {
      const surveysRef = collection(db, 'surveys')
      const q = query(surveysRef, orderBy('created_at', 'desc'))
      const snapshot = await getDocs(q)
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    }
  })
}
```

**Why this combo:**
- TanStack Query: Caching, auto-refetch, optimistic updates
- Zustand: Lightweight, simple, no boilerplate
- Clear separation: Server state vs UI state

---

### 2. **UI Component Library**

#### Recommended: shadcn/ui (with Radix UI + Tailwind)

**Why shadcn/ui:**
- ✅ Copy-paste components (you own the code)
- ✅ Built on Radix UI (accessible primitives)
- ✅ Tailwind styling (customizable)
- ✅ TypeScript-first
- ✅ No runtime bundle bloat

```bash
npx shadcn-ui@latest init
npx shadcn-ui@latest add button
npx shadcn-ui@latest add dialog
npx shadcn-ui@latest add dropdown-menu
```

**Alternative if you want pre-built:**
- Mantine (more opinionated, heavier)
- Chakra UI (good but larger bundle)

---

### 3. **Form Handling**

#### Recommended: React Hook Form + Zod

```typescript
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const surveySchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().optional(),
  questions: z.array(z.object({
    text: z.string(),
    type: z.enum(['short_text', 'long_text', 'rating', 'multiple_choice'])
  })).min(1, 'At least one question required')
})

type SurveyForm = z.infer<typeof surveySchema>

function SurveyBuilder() {
  const form = useForm<SurveyForm>({
    resolver: zodResolver(surveySchema),
    defaultValues: {
      title: '',
      questions: []
    }
  })

  const onSubmit = (data: SurveyForm) => {
    // Handle submission
  }

  return <form onSubmit={form.handleSubmit(onSubmit)}>...</form>
}
```

**Why:**
- Type-safe forms with Zod schemas
- Excellent performance (minimal re-renders)
- Great DX with TypeScript

---

### 4. **Data Visualization**

#### Recommended: Recharts (primary) + D3.js (complex cases)

```typescript
import { LineChart, Line, XAxis, YAxis, Tooltip } from 'recharts'

function SentimentTrendChart({ data }: { data: Array<{ date: string; sentiment: number }> }) {
  return (
    <LineChart width={600} height={300} data={data}>
      <XAxis dataKey="date" />
      <YAxis />
      <Tooltip />
      <Line type="monotone" dataKey="sentiment" stroke="#8884d8" />
    </LineChart>
  )
}
```

**Why Recharts:**
- ✅ React-friendly API
- ✅ Responsive by default
- ✅ Good enough for 90% of charts

**When to use D3.js:**
- Custom interactive visualizations
- Theme network graphs
- Complex data transformations

---

### 5. **Real-time Updates**

#### Recommended: Firestore Real-time Listeners (built-in)

```typescript
import { useEffect } from 'react'
import { collection, query, where, onSnapshot } from 'firebase/firestore'
import { db } from '@/lib/firebase'

// Subscribe to new responses in real-time
function useRealtimeResponses(surveyId: string) {
  useEffect(() => {
    const responsesRef = collection(db, 'responses')
    const q = query(responsesRef, where('survey_id', '==', surveyId))
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          console.log('New response:', change.doc.data())
          // Update UI
        }
        if (change.type === 'modified') {
          console.log('Modified response:', change.doc.data())
        }
      })
    })

    return () => unsubscribe()
  }, [surveyId])
}
```

**Built-in features:**
- Real-time document/collection listeners
- Offline persistence and sync
- Automatic reconnection
- Low latency

---

### 6. **Email Service**

#### Recommended: Amazon SES (cost) + React Email (templates)

**React Email for templates:**
```typescript
import { Button, Html } from '@react-email/components'

export function SurveyInvite({ surveyLink, recipientName }) {
  return (
    <Html>
      <h1>Hi {recipientName},</h1>
      <p>We'd love your feedback!</p>
      <Button href={surveyLink}>Take Survey</Button>
    </Html>
  )
}
```

**Send via SES:**
```typescript
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses'
import { render } from '@react-email/render'

const ses = new SESClient({ region: 'us-east-1' })

const html = render(<SurveyInvite surveyLink="..." recipientName="John" />)

await ses.send(new SendEmailCommand({
  Source: 'noreply@yourapp.com',
  Destination: { ToAddresses: ['user@example.com'] },
  Message: {
    Subject: { Data: 'We need your feedback!' },
    Body: { Html: { Data: html } }
  }
}))
```

**Cost:** $0.10 per 1,000 emails (vs $15-30/mo for SendGrid/Mailgun)

---

### 7. **Background Jobs / Task Queue**

#### Recommended: AWS SQS + EventBridge

**SQS for async processing:**
- AI analysis jobs
- Bulk email sending
- Report generation

**EventBridge for scheduled tasks:**
- Daily analytics aggregation
- Reminder emails
- Cleanup old exports

```typescript
// Schedule daily analytics job
import { EventBridgeClient, PutRuleCommand, PutTargetsCommand } from '@aws-sdk/client-eventbridge'

const eventBridge = new EventBridgeClient({ region: 'us-east-1' })

// Run every day at 2 AM UTC
await eventBridge.send(new PutRuleCommand({
  Name: 'daily-analytics-aggregation',
  ScheduleExpression: 'cron(0 2 * * ? *)',
  State: 'ENABLED'
}))
```

---

### 8. **Error Tracking & Monitoring**

#### Recommended: Sentry (errors) + AWS CloudWatch (logs)

```typescript
// sentry.ts
import * as Sentry from '@sentry/react'

Sentry.init({
  dsn: process.env.VITE_SENTRY_DSN,
  environment: process.env.VITE_ENV,
  tracesSampleRate: 0.1, // 10% of transactions
  integrations: [
    new Sentry.BrowserTracing(),
    new Sentry.Replay()
  ]
})

// Catch errors in components
import { ErrorBoundary } from '@sentry/react'

function App() {
  return (
    <ErrorBoundary fallback={<ErrorFallback />}>
      <YourApp />
    </ErrorBoundary>
  )
}
```

**Free tier:** 5,000 errors/month

---

### 9. **Testing Strategy**

#### Recommended Setup:
- **Unit tests**: Vitest (faster than Jest)
- **Integration tests**: React Testing Library
- **E2E tests**: Playwright (skip for MVP, add later)

```typescript
// Example: Testing survey submission
import { render, screen, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import { SurveyForm } from './SurveyForm'

vi.mock('@/lib/firebase', () => ({
  db: {
    collection: () => ({
      add: vi.fn().mockResolvedValue({ id: 'test-id' })
    })
  }
}))

test('submits survey response', async () => {
  render(<SurveyForm />)
  
  // Fill form and submit
  // Assert success
  
  await waitFor(() => {
    expect(screen.getByText('Thank you!')).toBeInTheDocument()
  })
})
```

---

### 10. **CI/CD Pipeline**

#### Recommended: GitHub Actions

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm test
      
      - name: Build frontend
        run: npm run build
      
      - name: Deploy to S3/CloudFront
        run: |
          aws s3 sync dist/ s3://your-bucket
          aws cloudfront create-invalidation --distribution-id XXX --paths "/*"
      
      - name: Deploy Lambda functions
        run: |
          cd lambda
          npm run deploy
      
      - name: Deploy Firebase
        run: npx firebase deploy
```

---

## Final Tech Stack Summary

| Layer | Technology | Why |
|-------|-----------|-----|
| **Frontend** | React + Vite + TypeScript | Fast, modern, type-safe |
| **State Management** | TanStack Query + Zustand | Server state + UI state |
| **UI Components** | shadcn/ui + Tailwind | Accessible, customizable |
| **Forms** | React Hook Form + Zod | Type-safe, performant |
| **Backend** | Firebase (Firestore + Auth + Cloud Storage + Cloud Functions) | All-in-one, scalable, great DX |
| **Serverless** | AWS Lambda (Node.js) + Cloud Functions | Scalable, pay-per-use |
| **AI/ML** | OpenAI GPT-4o mini + Claude Sonnet | Cost-optimized hybrid |
| **Email** | Amazon SES + React Email | $0.10/1000 emails |
| **Queue** | AWS SQS + EventBridge | Async jobs + scheduling |
| **Charts** | Recharts + D3.js | React-friendly + flexible |
| **Error Tracking** | Sentry + CloudWatch | Free tier + AWS native |
| **Testing** | Vitest + React Testing Library | Fast, modern |
| **CI/CD** | GitHub Actions | Free for public repos |

---

## Setup Checklist for Launch

### Week 1: Foundation
- [ ] Set up Firebase project (Firestore, Auth, Cloud Functions)
- [ ] Configure OAuth providers (Google, Apple, Facebook)
- [ ] Set up AWS account + configure SES, Lambda, SQS
- [ ] Initialize React app with Vite
- [ ] Install core dependencies (TanStack Query, shadcn/ui, etc.)

### Week 2: Core Features
- [ ] Build authentication flow
- [ ] Create Firestore collections + Security Rules
- [ ] Build survey builder UI
- [ ] Implement survey response collection

### Week 3: AI Integration
- [ ] Set up OpenAI + Claude API keys
- [ ] Implement hybrid routing logic
- [ ] Build analysis Lambda functions
- [ ] Connect SQS for async processing

### Week 4: Dashboard & Analytics
- [ ] Build real-time dashboard
- [ ] Implement sentiment charts
- [ ] Add theme extraction display
- [ ] Create response management UI

### Week 5: Testing & Polish
- [ ] Write critical tests
- [ ] Set up error tracking
- [ ] Configure CI/CD pipeline
- [ ] Performance optimization

### Week 6: Launch Prep
- [ ] Security audit
- [ ] Load testing
- [ ] Documentation
- [ ] Soft launch to beta users

---

## Estimated Initial Costs

**Development (one-time):**
- Domain: $12/year
- SSL via AWS: Free
- Development tools: Free (mostly)

**Monthly Operating Costs (first 1,000 users):**
- Firebase Blaze: ~$15-25/mo
- AWS Lambda: $5-10/mo
- OpenAI API: $1-2/mo
- SES emails: $0.50/mo
- S3 + CloudFront: $5/mo
- Sentry: Free tier
- **Total: ~$27-43/mo**

**Scaling (10,000 users):**
- Firebase Blaze: ~$50-80/mo
- AWS Lambda: $20-40/mo
- OpenAI API: $10-20/mo
- SES: $5/mo
- **Total: ~$85-145/mo**

---

## Your Specific Requirements - Implementation Details

### 1. Multi-Tenancy (Individuals + Teams) ✅

**Firestore Collections Structure:**

```typescript
// Firestore Collection Schema (TypeScript interfaces)

// organizations collection
interface Organization {
  id: string // document ID
  name: string
  type: 'personal' | 'team'
  owner_id: string // user UID
  plan: 'free' | 'pro' | 'team' | 'enterprise'
  settings: Record<string, any>
  created_at: Timestamp
}

// organization_members collection
interface OrganizationMember {
  id: string // document ID
  organization_id: string
  user_id: string
  role: 'owner' | 'admin' | 'member' | 'viewer'
  invited_by: string
  invited_at: Timestamp
  joined_at: Timestamp | null
}

// organization_invitations collection
interface OrganizationInvitation {
  id: string // document ID
  organization_id: string
  email: string
  role: 'admin' | 'member' | 'viewer'
  invited_by: string
  token: string // unique invitation token
  expires_at: Timestamp
  accepted_at: Timestamp | null
  created_at: Timestamp
}
```

**Firestore Security Rules:**

```javascript
// firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Helper functions
    function isSignedIn() {
      return request.auth != null;
    }
    
    function isMemberOf(orgId) {
      return exists(/databases/$(database)/documents/organization_members/$(request.auth.uid + '_' + orgId));
    }
    
    function hasRole(orgId, roles) {
      let member = get(/databases/$(database)/documents/organization_members/$(request.auth.uid + '_' + orgId));
      return member != null && member.data.role in roles;
    }
    
    // Organizations rules
    match /organizations/{orgId} {
      allow read: if isSignedIn() && isMemberOf(orgId);
      allow create: if isSignedIn();
      allow update, delete: if isSignedIn() && hasRole(orgId, ['owner', 'admin']);
    }
    
    // Members rules
    match /organization_members/{memberId} {
      allow read: if isSignedIn() && isMemberOf(resource.data.organization_id);
      allow write: if isSignedIn() && hasRole(resource.data.organization_id, ['owner', 'admin']);
    }
    
    // Surveys rules
    match /surveys/{surveyId} {
      allow read: if isSignedIn() && isMemberOf(resource.data.organization_id);
      allow create: if isSignedIn() && hasRole(request.resource.data.organization_id, ['owner', 'admin', 'member']);
      allow update, delete: if isSignedIn() && hasRole(resource.data.organization_id, ['owner', 'admin', 'member']);
    }
    
    // Responses rules
    match /responses/{responseId} {
      allow read: if isSignedIn() && isMemberOf(resource.data.organization_id);
      allow create: if true; // Public survey responses
    }
  }
}
```

-- Auto-create personal org on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $
DECLARE
  new_org_id UUID;
BEGIN
  -- Create personal organization
  INSERT INTO public.organizations (name, type, owner_id)
  VALUES (NEW.email || '''s Workspace', 'personal', NEW.id)
  RETURNING id INTO new_org_id;
  
  -- Add user as owner
  INSERT INTO public.organization_members (organization_id, user_id, role, joined_at)
  VALUES (new_org_id, NEW.id, 'owner', NOW());
  
  -- Create user profile
  INSERT INTO public.user_profiles (id, organization_id, email)
  VALUES (NEW.id, new_org_id, NEW.email);
  
  RETURN NEW;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;
```

**React Context for Organization Switching:**

```typescript
// contexts/OrganizationContext.tsx
import { createContext, useContext, useState, useEffect } from 'react'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/hooks/useAuth'

interface Organization {
  id: string
  name: string
  type: 'personal' | 'team'
  role: string
}

interface OrgContextType {
  currentOrg: Organization | null
  organizations: Organization[]
  switchOrganization: (orgId: string) => void
  loading: boolean
}

const OrgContext = createContext<OrgContextType | undefined>(undefined)

export function OrganizationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [currentOrg, setCurrentOrg] = useState<Organization | null>(null)
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    if (user) {
      loadOrganizations()
    }
  }, [user])
  
  async function loadOrganizations() {
    if (!user) return
    
    // Get all memberships for current user
    const membersRef = collection(db, 'organization_members')
    const q = query(membersRef, where('user_id', '==', user.uid))
    const snapshot = await getDocs(q)
    
    const orgs: Organization[] = []
    for (const doc of snapshot.docs) {
      const membership = doc.data()
      // Get the organization details
      const orgDoc = await db.collection('organizations').doc(membership.organization_id).get()
      if (orgDoc.exists) {
        orgs.push({
          id: orgDoc.id,
          ...orgDoc.data() as any,
          role: membership.role,
        })
      }
    }
    
    setOrganizations(orgs)
    
    // Set current org from localStorage or default to first
    const savedOrgId = localStorage.getItem('currentOrgId')
    const org = orgs.find(o => o.id === savedOrgId) || orgs[0]
    setCurrentOrg(org || null)
    setLoading(false)
  }
  
  function switchOrganization(orgId: string) {
    const org = organizations.find(o => o.id === orgId)
    if (org) {
      setCurrentOrg(org)
      localStorage.setItem('currentOrgId', orgId)
    }
  }
  
  return (
    <OrgContext.Provider value={{ currentOrg, organizations, switchOrganization, loading }}>
      {children}
    </OrgContext.Provider>
  )
}

export const useOrganization = () => {
  const context = useContext(OrgContext)
  if (!context) throw new Error('useOrganization must be used within OrganizationProvider')
  return context
}
```

**UI: Organization Switcher Component:**

```typescript
import { Select } from '@/components/ui/select'
import { useOrganization } from '@/contexts/OrganizationContext'

function OrganizationSwitcher() {
  const { currentOrg, organizations, switchOrganization } = useOrganization()
  
  return (
    <Select
      value={currentOrg?.id}
      onValueChange={switchOrganization}
    >
      {organizations.map(org => (
        <option key={org.id} value={org.id}>
          {org.name} {org.type === 'personal' ? '(Personal)' : '(Team)'}
        </option>
      ))}
      <option value="create-new">+ Create Team</option>
    </Select>
  )
}
```

---

### 2. Monetization (Later) - Architecture Prep ✅

**Prepare Schema Now, Implement Later:**

```sql
-- Add to organizations table
ALTER TABLE organizations ADD COLUMN stripe_customer_id TEXT;
ALTER TABLE organizations ADD COLUMN stripe_subscription_id TEXT;
ALTER TABLE organizations ADD COLUMN plan_limits JSONB DEFAULT '{
  "max_surveys": 3,
  "max_responses_per_month": 100,
  "max_team_members": 1,
  "ai_analysis_enabled": false
}';

-- Usage tracking
CREATE TABLE usage_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id),
  metric_type TEXT NOT NULL, -- 'surveys_created', 'responses_collected', 'ai_analyses'
  count INT DEFAULT 0,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, metric_type, period_start)
);
```

**When you're ready, just add:**
- Stripe API integration (takes ~2 days)
- Checkout flow
- Webhook handler for subscription updates
- Usage enforcement middleware

---

### 3. Custom Domains - Full Implementation ✅

**Architecture:**

```
User's Survey URL Flow:
feedback.customer-company.com → CloudFront → Lambda@Edge (domain lookup) → S3/Origin
                                                    ↓
                                            Inject org branding & settings
```

**Database Schema:**

```sql
-- Custom domains
CREATE TABLE custom_domains (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  domain TEXT UNIQUE NOT NULL, -- e.g., 'feedback.acme.com'
  status TEXT DEFAULT 'pending', -- 'pending', 'verified', 'active', 'failed'
  
  -- DNS verification
  verification_token TEXT UNIQUE NOT NULL,
  dns_configured BOOLEAN DEFAULT FALSE,
  ssl_certificate_arn TEXT, -- AWS Certificate Manager ARN
  
  -- CloudFront distribution
  cloudfront_distribution_id TEXT,
  cloudfront_domain TEXT, -- xxx.cloudfront.net
  
  -- Settings
  is_primary BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  verified_at TIMESTAMPTZ,
  activated_at TIMESTAMPTZ
);

-- Audit log
CREATE TABLE domain_verification_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  custom_domain_id UUID REFERENCES custom_domains(id),
  check_type TEXT NOT NULL, -- 'dns', 'ssl', 'cloudfront'
  status TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**AWS Infrastructure (CDK):**

```typescript
// cdk/lib/custom-domain-stack.ts
import * as cdk from 'aws-cdk-lib'
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront'
import * as acm from 'aws-cdk-lib/aws-certificatemanager'
import * as route53 from 'aws-cdk-lib/aws-route53'
import * as lambda from 'aws-cdk-lib/aws-lambda'

export class CustomDomainStack extends cdk.Stack {
  constructor(scope: Construct, id: string) {
    super(scope, id)
    
    // Lambda@Edge for domain routing
    const domainRouter = new lambda.Function(this, 'DomainRouter', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda/domain-router'),
      // Must be in us-east-1 for Lambda@Edge
    })
    
    // Main CloudFront distribution with origin access
    const distribution = new cloudfront.Distribution(this, 'MainDistribution', {
      defaultBehavior: {
        origin: new origins.S3Origin(surveyAppBucket),
        edgeLambdas: [
          {
            functionVersion: domainRouter.currentVersion,
            eventType: cloudfront.LambdaEdgeEventType.VIEWER_REQUEST,
          }
        ],
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      },
      // Support multiple domains
      additionalBehaviors: {
        '/api/*': {
          origin: new origins.HttpOrigin('api.yourapp.com'),
        }
      }
    })
  }
}
```

**Lambda@Edge Domain Router:**

```typescript
// lambda/domain-router/index.ts
import { CloudFrontRequestEvent, CloudFrontRequestHandler } from 'aws-lambda'
import * as admin from 'firebase-admin'

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT!))
  })
}
const db = admin.firestore()

export const handler: CloudFrontRequestHandler = async (event) => {
  const request = event.Records[0].cf.request
  const host = request.headers.host[0].value
  
  // Default domain (yourapp.com)
  if (host === 'yourapp.com' || host === 'www.yourapp.com') {
    return request // Normal flow
  }
  
  // Custom domain - lookup organization
  const domainsSnapshot = await db
    .collection('custom_domains')
    .where('domain', '==', host)
    .where('status', '==', 'active')
    .limit(1)
    .get()
  
  if (domainsSnapshot.empty) {
    // Domain not found - return 404
    return {
      status: '404',
      statusDescription: 'Not Found',
      body: 'Domain not configured'
    }
  }
  
  const customDomain = domainsSnapshot.docs[0].data()
  
  // Add organization context to request headers
  request.headers['x-organization-id'] = [{ 
    key: 'X-Organization-ID', 
    value: customDomain.organization_id 
  }]
  
  request.headers['x-custom-domain'] = [{ 
    key: 'X-Custom-Domain', 
    value: host 
  }]
  
  return request
}
```

**Domain Setup Flow (User-Facing):**

```typescript
// features/custom-domains/DomainSetup.tsx
function CustomDomainSetup() {
  const [domain, setDomain] = useState('')
  const [step, setStep] = useState<'input' | 'dns' | 'verify' | 'complete'>('input')
  const [verificationToken, setVerificationToken] = useState('')
  
  async function initiateSetup() {
    // 1. Create domain record in Firestore
    const verificationToken = generateToken()
    const docRef = await addDoc(collection(db, 'custom_domains'), {
      organization_id: currentOrg.id,
      domain: domain,
      verification_token: verificationToken,
      status: 'pending',
      created_at: serverTimestamp(),
    })
    
    setVerificationToken(verificationToken)
    setStep('dns')
    
    // 2. Request SSL certificate from ACM
    await fetch('/api/domains/request-certificate', {
      method: 'POST',
      body: JSON.stringify({ domain_id: docRef.id })
    })
  }
  
  return (
    <div>
      {step === 'input' && (
        <div>
          <Input 
            placeholder="feedback.your-company.com"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
          />
          <Button onClick={initiateSetup}>Add Domain</Button>
        </div>
      )}
      
      {step === 'dns' && (
        <div>
          <h3>Add these DNS records:</h3>
          <code>
            TXT Record:
            _acme-challenge.{domain} → {verificationToken}
            
            CNAME Record:
            {domain} → d111111abcdef8.cloudfront.net
          </code>
          <Button onClick={verifyDNS}>Verify DNS</Button>
        </div>
      )}
      
      {step === 'verify' && (
        <div>
          <Spinner /> Verifying DNS and provisioning SSL certificate...
          <p>This usually takes 5-10 minutes</p>
        </div>
      )}
      
      {step === 'complete' && (
        <Alert>
          ✅ Domain active! Your surveys are now available at {domain}
        </Alert>
      )}
    </div>
  )
}
```

**Backend: Domain Verification Lambda:**

```typescript
// lambda/domain-verification/handler.ts
import { SQSHandler } from 'aws-lambda'
import { Route53Client, ListResourceRecordSetsCommand } from '@aws-sdk/client-route53'
import { ACMClient, DescribeCertificateCommand, RequestCertificateCommand } from '@aws-sdk/client-acm'
import { CloudFrontClient, CreateDistributionCommand, UpdateDistributionCommand } from '@aws-sdk/client-cloudfront'
import * as admin from 'firebase-admin'

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT!))
  })
}
const db = admin.firestore()

export const handler: SQSHandler = async (event) => {
  for (const record of event.Records) {
    const { domain_id } = JSON.parse(record.body)
    
    // 1. Check DNS configuration
    const dnsConfigured = await verifyDNS(domain_id)
    
    if (!dnsConfigured) {
      await updateDomainStatus(domain_id, 'dns_pending')
      continue
    }
    
    // 2. Request or check SSL certificate
    const certificateArn = await ensureSSLCertificate(domain_id)
    
    // 3. Update CloudFront distribution
    await updateCloudFrontDistribution(domain_id, certificateArn)
    
    // 4. Mark domain as active
    await updateDomainStatus(domain_id, 'active')
  }
}

async function verifyDNS(domainId: string): Promise<boolean> {
  // Check if TXT and CNAME records exist
  const domainDoc = await db.collection('custom_domains').doc(domainId).get()
  const domain = domainDoc.data()
  
  if (!domain) return false
  
  const route53 = new Route53Client({})
  
  // Check TXT record for verification
  const txtRecords = await route53.send(new ListResourceRecordSetsCommand({
    HostedZoneId: getHostedZoneId(domain.domain),
    StartRecordName: `_acme-challenge.${domain.domain}`,
    StartRecordType: 'TXT'
  }))
  
  const hasCorrectTXT = txtRecords.ResourceRecordSets?.some(record => 
    record.ResourceRecords?.some(rr => rr.Value?.includes(domain.verification_token))
  )
  
  return hasCorrectTXT ?? false
}

async function ensureSSLCertificate(domainId: string): Promise<string> {
  const domainDoc = await db.collection('custom_domains').doc(domainId).get()
  const domain = domainDoc.data()
  
  if (!domain) throw new Error('Domain not found')
  
  if (domain.ssl_certificate_arn) {
    // Certificate already exists, check status
    const acm = new ACMClient({ region: 'us-east-1' }) // Must be us-east-1 for CloudFront
    const cert = await acm.send(new DescribeCertificateCommand({
      CertificateArn: domain.ssl_certificate_arn
    }))
    
    if (cert.Certificate?.Status === 'ISSUED') {
      return domain.ssl_certificate_arn
    }
  }
  
  // Request new certificate
  const acm = new ACMClient({ region: 'us-east-1' })
  const result = await acm.send(new RequestCertificateCommand({
    DomainName: domain.domain,
    ValidationMethod: 'DNS',
    SubjectAlternativeNames: [`*.${domain.domain}`] // Support subdomains
  }))
  
  // Save certificate ARN
  await db.collection('custom_domains').doc(domainId).update({
    ssl_certificate_arn: result.CertificateArn
  })
  
  return result.CertificateArn!
}
```

**Cost for Custom Domains:**
- Route 53 Hosted Zone: $0.50/month per domain
- CloudFront: $0.085 per GB (first 10TB)
- ACM SSL Certificate: **FREE**
- Lambda@Edge: $0.60 per 1M requests

**For 100 custom domains:**
- Route 53: $50/month (can be passed to customer)
- CloudFront + Lambda@Edge: ~$10-30/month depending on traffic

---

### 4. Data Residency Options ✅

**Why This Matters:**
- GDPR (EU): Data must stay in EU for EU citizens
- Data sovereignty: Some companies require data in specific regions
- Latency: Data closer to users = faster

**Your Options:**

#### Option A: Single Region (Simplest for MVP)
**Recommendation:** Start with US (us-central1)
- Firebase: US Central region
- AWS: us-east-1
- Most cost-effective
- Covers 70%+ of users

**Cost:** Standard pricing

#### Option B: Multi-Region (EU + US)
**Setup:**
- Firebase: Separate projects for EU and US
- AWS Lambda: Deploy to both regions
- Route53: Geographic routing

```typescript
// Route users based on location
const region = getUserRegion(request) // 'us' or 'eu'
const firebaseConfig = region === 'eu' 
  ? JSON.parse(process.env.FIREBASE_EU_CONFIG!)
  : JSON.parse(process.env.FIREBASE_US_CONFIG!)

const app = initializeApp(firebaseConfig)
```

**Cost:** 2x Firebase projects, 2x Lambda (~$10/mo extra)

#### Option C: Hybrid (Customer Choice)
**Premium Feature:**
- Default: US region (included)
- Upgrade: EU region (+$10/mo)
- Enterprise: Dedicated region

```typescript
// Firestore document pattern
interface Organization {
  // ...
  data_region: 'us' | 'eu' | 'ap' // Default: 'us'
}
```

**Implementation:**

```typescript
function getFirebaseApp(organization: Organization) {
  const region = organization.data_region || 'us'
  
  const configs = {
    us: JSON.parse(process.env.FIREBASE_US_CONFIG!),
    eu: JSON.parse(process.env.FIREBASE_EU_CONFIG!),
  }
  
  const config = configs[region]
  return initializeApp(config, region)
}
```

**My Recommendation for Launch:**
Start with **Option A** (US only), then add **Option C** (customer choice) when you have paying customers who need it.

**Available Firebase/GCP Regions:**
- 🇺🇸 US Central (Iowa)
- 🇺🇸 US East (South Carolina)
- 🇪🇺 EU Central (Frankfurt)
- 🇪🇺 EU West (Belgium)
- 🇦🇺 Southeast Asia (Singapore)
- 🇦🇺 Australia (Sydney)
- 🇧🇷 South America (São Paulo)

---

## Updated Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        USER LAYER                            │
│  • Individual Users → Personal Workspace                     │
│  • Team Users → Shared Team Workspace                        │
│  • Custom Domain Users → feedback.their-company.com          │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                     ROUTING LAYER                            │
│  CloudFront + Lambda@Edge                                    │
│  • Default domain (yourapp.com) → Standard flow              │
│  • Custom domains → Organization context injection           │
│  • Geographic routing (future: US vs EU)                     │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                  APPLICATION LAYER                           │
│  React SPA                                                   │
│  • OrganizationContext (personal vs team)                    │
│  • Role-based permissions (owner, admin, member, viewer)     │
│  • Firebase Auth (Google, Apple, Facebook)                   │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    DATA LAYER                                │
│  Firebase (Firestore + Cloud Storage + Auth)                 │
│  • Multi-tenant collections (organization_id on all docs)    │
│  • Security Rules (users only see their org data)            │
│  • Data region: US (now) → EU option (later)                 │
└─────────────────────────────────────────────────────────────┘
```

---

## MVP Priority: What to Build First

### Phase 1 (Weeks 1-2): Core Foundation
1. ✅ Auth (Firebase with Google OAuth only)
2. ✅ Personal workspace (auto-created)
3. ✅ Basic survey builder
4. ✅ Response collection
5. ⏸️ Skip: Teams, custom domains (add later)

### Phase 2 (Weeks 3-4): AI & Analytics
6. ✅ AI analysis (OpenAI GPT-4o mini)
7. ✅ Dashboard
8. ✅ Response management

### Phase 3 (Weeks 5-6): Multi-Tenancy
9. ✅ Team creation & invites
10. ✅ Organization switcher
11. ✅ Role-based permissions

### Phase 4 (Month 2): Premium Features
12. ✅ Custom domains
13. ✅ Advanced analytics
14. ⏸️ Payments (when needed)

---

Does this address everything? Should we start building the MVP now, or do you want to discuss the custom domain implementation in more detail?