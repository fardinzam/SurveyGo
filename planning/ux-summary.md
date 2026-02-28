# User App UX Summary & Screen Flow

## UX Philosophy

**Core Principles:**
1. **Action-First**: Get users creating value immediately
2. **Progressive Disclosure**: Show complexity only when needed
3. **AI as Assistant**: Visible but not intrusive
4. **Data-Driven**: Surface insights prominently
5. **Mobile-First**: Critical features fully functional on mobile

**Design Inspiration:**
- **Google Forms**: Traditional, list-based survey building structure
- **Notion**: Clean, minimal styling and intuitive editor experience
- **Linear**: Fast, keyboard-first workflows
- **Vercel Dashboard**: Beautiful analytics, clear hierarchy

**Survey Builder Philosophy:**
- Traditional list-based structure like Google Forms (familiar, efficient)
- Clean, minimal styling inspired by Notion (modern, uncluttered)
- Template selection before entering editor (quick start)
- AI assistance available but non-intrusive

---

## Information Architecture

**Persistent Left Sidebar + Profile Dropdown**

```
┌──────────────┬──────────────────────────────────────────────────┐
│   SIDEBAR    │                                                  │
│  (persistent)│            MAIN CONTENT AREA                     │
│              │                                                  │
│  Dashboard   │   Page-specific content                          │
│  My Surveys  │                                                  │
│  Templates   │                                                  │
│  Team        │                                                  │
│              │                                                  │
│  ──────────  │                                                  │
│  [Profile ▼] │                                                  │
│   └ Settings │                                                  │
│   └ Dark Mode│                                                  │
│   └ Logout   │                                                  │
└──────────────┴──────────────────────────────────────────────────┘
```

**Sidebar Navigation Items:**
- **Dashboard** — Overview and quick actions
- **My Surveys** — Survey management, builder, and per-survey analytics
- **Templates** — Browse and use survey templates
- **Team** — Team management (visible in team workspaces)

**Profile Dropdown (bottom of sidebar):**
- **Settings** — Account, workspace, team, notifications, integrations
- **Dark Mode** toggle
- **Logout**

> **Note:** Responses and Analytics are accessed per-survey (within each survey's detail view), not as standalone top-level pages.

**Additional Navigation:**
- **Breadcrumbs** in Survey Builder: Edit → Publish → Connect Apps → Analytics
- **Command Palette** (⌘K) for power users (future)
- **Floating Action Button** on mobile for primary actions (future)

---

## Screen Flow Map

### Authentication Flow
```
Landing Page
    ↓
Sign Up / Sign In
    ↓
OAuth (Google/Apple/Facebook) or Email
    ↓
[New User] → Onboarding
[Returning User] → Dashboard
```

### Main Application Flow
```
Dashboard (Home)
    ├→ Create Survey → Survey Builder → Publish → Connect Apps → Analytics
    ├→ View Survey → Survey Detail → Survey Analytics
    └→ Settings (via Profile Dropdown)

Survey Builder (Breadcrumb Flow)
    Edit → Publish → Connect Apps → Analytics
    ├→ Add Questions (AI suggestions available)
    ├→ Configure Logic
    ├→ Customize Branding
    └→ Preview
```

> **Note:** Response viewing and analytics are accessed within each individual survey, not as standalone pages. Cross-survey analytics is deferred.

---

## Detailed Screen Breakdown

### Survey Respondent Experience (Public Survey UI)

**Purpose:** The experience for customers/respondents filling out surveys

**Philosophy:**
- Clean, distraction-free interface
- Fast loading, mobile-optimized
- One question at a time for focused responses (with option for all-on-page)
- Branded to match survey creator's company
- Accessible and WCAG compliant

#### Survey Landing/Welcome Screen
```
┌─────────────────────────────────────────┐
│                                         │
│         [Company Logo]                  │
│                                         │
│   ─────────────────────────────────    │
│                                         │
│   Customer Feedback Survey              │
│                                         │
│   Help us improve! This survey takes    │
│   about 3 minutes to complete.          │
│                                         │
│   Your responses are anonymous.         │
│                                         │
│   ┌─────────────────────────────────┐  │
│   │        [Start Survey →]         │  │
│   └─────────────────────────────────┘  │
│                                         │
│   ─────────────────────────────────    │
│   Powered by SurveyGo                   │
│                                         │
└─────────────────────────────────────────┘
```

#### Question Display (One-at-a-Time Mode)
```
┌─────────────────────────────────────────┐
│  [Progress: ████████░░░░░░░░] 3 of 8    │
├─────────────────────────────────────────┤
│                                         │
│   Question 3                            │
│                                         │
│   How satisfied are you with our        │
│   customer service?                     │
│                                         │
│   ┌─────────────────────────────────┐  │
│   │  😡   😕   😐   🙂   😄         │  │
│   │  1    2    3    4    5          │  │
│   │       Very   Neutral  Very      │  │
│   │       Poor           Good       │  │
│   └─────────────────────────────────┘  │
│                                         │
│   ┌─────────┐         ┌─────────────┐  │
│   │ ← Back  │         │  Next →     │  │
│   └─────────┘         └─────────────┘  │
│                                         │
└─────────────────────────────────────────┘
```

#### Question Types Visual Examples

**Rating Scale (Stars)**
```
How would you rate our product?
⭐⭐⭐⭐☆  (4 of 5 selected)
```

**NPS Question**
```
How likely are you to recommend us?
[0] [1] [2] [3] [4] [5] [6] [7] [8] [9] [10]
 Not at all likely          Extremely likely
```

**Multiple Choice**
```
What feature do you use most?
○ Dashboard
● Analytics  ← selected
○ Reporting
○ Integrations
```

**Open-Ended Text**
```
What could we improve?
┌─────────────────────────────────────┐
│ I think the mobile app could be    │
│ faster when loading reports...     │
│                                    │
│                                    │
└─────────────────────────────────────┘
[Character count: 47/500]
```

**Matrix/Grid**
```
Rate each aspect:          Poor  Fair  Good  Great
─────────────────────────────────────────────────
Speed                       ○     ○     ●     ○
Reliability                 ○     ○     ○     ●
Ease of use                 ○     ●     ○     ○
```

#### Progress Indicator Options
```
Option A: Progress Bar
[████████████░░░░░░░░░░░░] 50%

Option B: Step Counter
Question 4 of 8

Option C: Combined (Recommended)
[████████░░░░░░░░] 4 of 8
```

#### Mobile Survey Experience
```
┌─────────────────────┐
│ ████████░░░░ 4/8    │
├─────────────────────┤
│                     │
│  How satisfied      │
│  are you with       │
│  our product?       │
│                     │
│  ┌───────────────┐  │
│  │ 😡 😕 😐 🙂 😄 │  │
│  │ 1  2  3  4  5  │  │
│  └───────────────┘  │
│                     │
│  ┌───────────────┐  │
│  │    Next →     │  │
│  └───────────────┘  │
│                     │
│  [← Back]           │
│                     │
└─────────────────────┘
```

#### Completion/Thank You Screen
```
┌─────────────────────────────────────────┐
│                                         │
│         [Company Logo]                  │
│                                         │
│   ─────────────────────────────────    │
│                                         │
│         ✓ Thank You!                   │
│                                         │
│   Your feedback has been submitted.     │
│   We appreciate your time!              │
│                                         │
│   ─────────────────────────────────    │
│                                         │
│   [Follow us on Twitter]                │
│   [Visit our website]                   │
│                                         │
│   ─────────────────────────────────    │
│   Powered by SurveyGo                   │
│                                         │
└─────────────────────────────────────────┘
```

#### Branding Application
- **Logo**: Displayed at top of survey
- **Primary Color**: Applied to buttons, progress bar, selections
- **Background**: Customizable (white, light gray, or custom)
- **Font**: Default or custom Google Font
- **Footer**: "Powered by SurveyGo" (removable on paid plans)

#### Survey Display Modes
| Mode | Description | Best For |
|------|-------------|----------|
| **One-at-a-time** | Single question per page | Mobile, focused responses |
| **All-on-page** | All questions visible | Short surveys, desktop |
| **Paginated** | Groups of questions per page | Medium-length surveys |

#### Accessibility Features
- Keyboard navigation (Tab, Enter, Arrow keys)
- Screen reader compatible
- High contrast mode option
- Focus indicators on all interactive elements
- Alt text for all images

---

### 1. Landing Page (Public, Not Logged In)

**Purpose:** Convert visitors to sign-ups

**Layout:**
- Hero section with clear value proposition
- Demo video or interactive example
- Feature highlights (AI analysis, real-time insights, easy setup)
- Social proof (testimonials, logos)
- Clear CTA: "Start Free" / "Sign Up"

**Key Elements:**
- Value proposition: "AI-powered feedback analysis in minutes"
- Sub-heading: "Create surveys, collect responses, get insights automatically"
- Primary CTA: Large "Get Started Free" button
- Secondary CTA: "See Demo" or "Watch Video"

---

### 2. Sign Up / Sign In

**Layout:** Centered card on gradient background

**Sign Up:**
```
┌─────────────────────────────────────┐
│   [Logo]                            │
│                                     │
│   Create your account               │
│   ─────────────────────             │
│                                     │
│   [Continue with Google]            │
│   [Continue with Apple]             │
│   [Continue with Facebook]          │
│                                     │
│   ────── or ──────                  │
│                                     │
│   Email: [________________]         │
│   Password: [________________]      │
│                                     │
│   [Create Account]                  │
│                                     │
│   Already have an account? Sign in  │
└─────────────────────────────────────┘
```

**Key UX Decisions:**
- OAuth first (faster, fewer friction points)
- Email/password as alternative
- No separate "name" field (get from OAuth or profile later)
- Clear link to sign in for existing users

---

### 3. Onboarding (First-Time Users Only)

**Goal:** Introduce platform features clearly and concisely without overwhelming new users

**Philosophy:**
- Welcome wizard format (not forced survey creation)
- Concise, clear explanations of each feature
- Minimal complexity — show value, not everything
- Users can skip at any time

**Step 1: Welcome**
```
┌─────────────────────────────────────┐
│   Welcome to SurveyGo! 👋           │
│                                     │
│   Let's take a quick tour of        │
│   how we can help you understand    │
│   your customers better.            │
│                                     │
│   [Get Started →]    [Skip Tour]    │
└─────────────────────────────────────┘
```

**Step 2: Feature - Survey Creation**
```
┌─────────────────────────────────────┐
│   📝 Create Surveys Easily          │
│   ─────────────────────────────     │
│                                     │
│   Build beautiful surveys in        │
│   minutes with our intuitive        │
│   editor. Start from scratch or     │
│   choose from ready-made templates. │
│                                     │
│   [Illustration of survey builder]  │
│                                     │
│   [← Back]  [Next →]  [Skip]        │
└─────────────────────────────────────┘
```

**Step 3: Feature - AI Analysis**
```
┌─────────────────────────────────────┐
│   🤖 AI-Powered Insights            │
│   ─────────────────────────────     │
│                                     │
│   Our AI automatically analyzes     │
│   responses to detect sentiment,    │
│   extract themes, and flag urgent   │
│   issues — so you can focus on      │
│   what matters most.                │
│                                     │
│   [Illustration of AI analysis]     │
│                                     │
│   [← Back]  [Next →]  [Skip]        │
└─────────────────────────────────────┘
```

**Step 4: Feature - Real-Time Dashboard**
```
┌─────────────────────────────────────┐
│   📊 Monitor in Real-Time           │
│   ─────────────────────────────     │
│                                     │
│   Watch responses come in live.     │
│   See trends, spot issues early,    │
│   and take action instantly.        │
│                                     │
│   [Illustration of dashboard]       │
│                                     │
│   [← Back]  [Next →]  [Skip]        │
└─────────────────────────────────────┘
```

**Step 5: Ready to Start**
```
┌─────────────────────────────────────┐
│   ✓ You're all set!                 │
│   ─────────────────────────────     │
│                                     │
│   Ready to collect your first       │
│   feedback?                         │
│                                     │
│   [Create Your First Survey]        │
│                                     │
│   or                                │
│                                     │
│   [Explore the Dashboard →]         │
└─────────────────────────────────────┘
```

**Key UX Decisions:**
- 4-5 quick slides focused on feature explanation
- Clean illustrations for each feature
- Skip option always visible (respect user's time)
- No forced actions — user chooses next step
- Progressive dots showing progress

---

### 4. Dashboard (Main Home Screen)

**Purpose:** Command center for all survey activity

**Layout:** Modern dashboard with cards and widgets

```
┌──────────────────────────────────────────────────────────────┐
│ Top Nav: [Dashboard] [Surveys] [Analytics] [⌘K] [Org] [👤] │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│ Dashboard                                    [+ New Survey]   │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐            │
│ │ 🚨 Urgent   │ │ 📊 Responses│ │ 😊 Sentiment│            │
│ │ 3 Issues    │ │ 247 Today   │ │ 7.2/10      │            │
│ │ ↑ +2 today  │ │ ↑ +12%      │ │ ↑ +0.3      │            │
│ └─────────────┘ └─────────────┘ └─────────────┘            │
│                                                               │
│ ┌───────────────────────────────────────────────────────┐   │
│ │ 🚨 Urgent Issues                    [View All →]      │   │
│ ├───────────────────────────────────────────────────────┤   │
│ │ ⚠️ "Payment system down for 2 hours"               │   │
│ │    Product Feedback Survey • 5 min ago              │   │
│ │    Sentiment: Very Negative • Urgency: 9/10         │   │
│ │    [View Response]                                   │   │
│ ├───────────────────────────────────────────────────────┤   │
│ │ ⚠️ "Considering switching to competitor"            │   │
│ │    NPS Survey • 15 min ago                          │   │
│ │    Sentiment: Negative • Urgency: 7/10              │   │
│ │    [View Response]                                   │   │
│ └───────────────────────────────────────────────────────┘   │
│                                                               │
│ ┌─────────────────────────┐ ┌─────────────────────────────┐ │
│ │ 📈 Sentiment Trend      │ │ 🏷️ Top Themes Today        │ │
│ │                         │ │                             │ │
│ │ [Line chart showing     │ │ 1. Shipping delays (45%)    │ │
│ │  sentiment over         │ │ 2. Pricing (32%)            │ │
│ │  last 7 days]           │ │ 3. Product quality (28%)    │ │
│ │                         │ │ 4. Customer support (18%)   │ │
│ └─────────────────────────┘ │ [View All Themes →]         │ │
│                              └─────────────────────────────┘ │
│                                                               │
│ ┌───────────────────────────────────────────────────────┐   │
│ │ Recent Surveys                        [View All →]    │   │
│ ├───────────────────────────────────────────────────────┤   │
│ │ Product Feedback Survey                               │   │
│ │ 247 responses • Active • Last response 2 min ago      │   │
│ │ Sentiment: Positive (7.2/10) • 3 urgent issues        │   │
│ ├───────────────────────────────────────────────────────┤   │
│ │ NPS Survey Q4 2024                                    │   │
│ │ 89 responses • Active • Last response 1 hour ago      │   │
│ │ NPS Score: 42 • Sentiment: Neutral (6.1/10)           │   │
│ └───────────────────────────────────────────────────────┘   │
└───────────────────────────────────────────────────────────────┘
```

**Dashboard Priority (matches current Figma Make implementation):**

1. **Stats Cards** (top row)
   - Total Surveys, Active Surveys, Total Responses, Avg. Satisfaction
   - Each card with trend indicators

2. **Charts Row**
   - Sentiment Trend (line chart, last 7 days)
   - Top Themes (horizontal bar chart)

3. **Recent Surveys** (table)
   - Latest surveys with status badges
   - Key metrics: response count, sentiment score
   - Quick access to edit, view responses, share

4. **Quick Actions**
   - Prominent "+ New Survey" button
   - "View All Surveys" shortcut

**Key UX Decisions:**
- Clean, scannable layout
- Action-first: Quick actions always accessible
- Empty states with helpful onboarding CTAs
- Real-time updates (new response indicator)
- Prominent "+ New Survey" button (top right)

---

### 5. Surveys List

**Purpose:** Manage all surveys

**Layout:** Table view with filters

```
┌──────────────────────────────────────────────────────────────┐
│ Surveys                      [Filter ▼] [Search] [+ New]     │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│ [All] [Active] [Paused] [Draft] [Closed]                     │
│                                                               │
│ ┌───────────────────────────────────────────────────────┐   │
│ │ Product Feedback Survey                               │   │
│ │ 247 responses • Active • Updated 2 min ago            │   │
│ │ 😊 Sentiment: 7.2/10 • 3 🚨 urgent                    │   │
│ │ [View] [Edit] [Share] [•••]                           │   │
│ ├───────────────────────────────────────────────────────┤   │
│ │ NPS Survey Q4 2024                                    │   │
│ │ 89 responses • Active • Updated 1 hour ago            │   │
│ │ 😐 NPS: 42 • 1 🚨 urgent                              │   │
│ │ [View] [Edit] [Share] [•••]                           │   │
│ ├───────────────────────────────────────────────────────┤   │
│ │ Customer Onboarding Survey                            │   │
│ │ 12 responses • Draft • Updated 2 days ago             │   │
│ │ [Continue Editing]                                    │   │
│ └───────────────────────────────────────────────────────┘   │
└───────────────────────────────────────────────────────────────┘
```

**Key Features:**
- Status filter tabs
- Search by survey name
- Sort by: Recent, Most responses, Sentiment
- Quick actions: View, Edit, Share, Duplicate, Archive
- Bulk actions (checkbox selection)

---

### 6. Survey Builder

**Purpose:** Create and edit surveys with AI assistance

**Layout:** Clean, focused editor (Notion-style)

```
┌──────────────────────────────────────────────────────────────┐
│ ← Back to Surveys          [Preview] [Save] [Distribute →]  │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│                                                               │
│  Untitled Survey [edit]                                      │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                               │
│  Add a description... (optional)                             │
│                                                               │
│  ──────────────────────────────────────────────────────────  │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ 1. How satisfied are you with our product?          │    │
│  │    Rating Scale • Required                          │    │
│  │                                                      │    │
│  │    ⭐️⭐️⭐️⭐️⭐️                                         │    │
│  │                                                      │    │
│  │    [⚙️ Settings] [🗑️ Delete] [⋮⋮ Move]              │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ 2. What do you like most about our product?         │    │
│  │    Long Text • Optional                             │    │
│  │                                                      │    │
│  │    [Your answer here...]                            │    │
│  │                                                      │    │
│  │    [⚙️ Settings] [🗑️ Delete] [⋮⋮ Move]              │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  [+ Add Question ▼]  [✨ AI Suggest Questions]               │
│                                                               │
│  ──────────────────────────────────────────────────────────  │
│                                                               │
│  Settings                                                     │
│  [🎨 Branding] [🔗 Share] [⚡ Logic] [🌐 Languages]          │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

**Add Question Dropdown:**
```
[+ Add Question ▼]
  └→ Short Text
     Long Text
     Multiple Choice
     Rating Scale
     NPS Question
     ───────────
     Matrix
     Ranking
     Slider
     File Upload
```

**AI Suggestions Panel (slide-in):**
```
┌─────────────────────────────────────┐
│ ✨ AI Question Suggestions          │
├─────────────────────────────────────┤
│                                     │
│ Based on your survey type, we      │
│ recommend adding:                   │
│                                     │
│ ☐ How likely are you to            │
│   recommend us to a friend?        │
│   [+ Add Question]                  │
│                                     │
│ ☐ What could we improve?           │
│   [+ Add Question]                  │
│                                     │
│ ☐ How would you rate our           │
│   customer service?                 │
│   [+ Add Question]                  │
│                                     │
│ [Generate More Suggestions]         │
└─────────────────────────────────────┘
```

**Key UX Decisions:**
- Inline editing (click to edit)
- Drag-and-drop reordering
- AI suggestions available but not intrusive
- Live preview of questions
- Auto-save (no explicit save button needed)
- Settings in expandable sections (progressive disclosure)

---

### Branching Logic Builder

**Purpose:** Create conditional question routing based on responses

**Access:** Via "⚡ Logic" button in Survey Builder settings

**Layout:** Modal overlay with visual logic builder

#### Logic Overview Screen
```
┌──────────────────────────────────────────────────────────────┐
│ Survey Logic                                           [✕]   │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│ [+ Add Logic Rule]                                           │
│                                                               │
│ ┌────────────────────────────────────────────────────────┐  │
│ │ Rule 1: Skip to Thank You                               │  │
│ │ ─────────────────────────────────────────────────────── │  │
│ │ IF "How satisfied are you?" = 5 (Very Satisfied)        │  │
│ │ THEN skip to → "Any additional comments?" (Q7)          │  │
│ │                                                         │  │
│ │ [Edit] [Delete]                                [Active ✓]│  │
│ └────────────────────────────────────────────────────────┘  │
│                                                               │
│ ┌────────────────────────────────────────────────────────┐  │
│ │ Rule 2: Show follow-up for dissatisfied                 │  │
│ │ ─────────────────────────────────────────────────────── │  │
│ │ IF "How satisfied are you?" ≤ 2 (Poor/Very Poor)        │  │
│ │ THEN show → "What went wrong?" (Q3)                     │  │
│ │                                                         │  │
│ │ [Edit] [Delete]                                [Active ✓]│  │
│ └────────────────────────────────────────────────────────┘  │
│                                                               │
│ ┌────────────────────────────────────────────────────────┐  │
│ │ Rule 3: Product-specific questions                      │  │
│ │ ─────────────────────────────────────────────────────── │  │
│ │ IF "Which product did you use?" = "Mobile App"          │  │
│ │ THEN show → "Rate the mobile experience" (Q5)           │  │
│ │                                                         │  │
│ │ [Edit] [Delete]                                [Active ✓]│  │
│ └────────────────────────────────────────────────────────┘  │
│                                                               │
│ ─────────────────────────────────────────────────────────    │
│ [Preview Logic Flow]                              [Done]     │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

#### Logic Rule Editor
```
┌──────────────────────────────────────────────────────────────┐
│ Edit Logic Rule                                        [✕]   │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│ CONDITION                                                     │
│ ┌──────────────────────────────────────────────────────────┐ │
│ │                                                          │ │
│ │  IF   [Question 1: Satisfaction ▼]                      │ │
│ │                                                          │ │
│ │       [equals ▼]                                        │ │
│ │                                                          │ │
│ │       [1 - Very Dissatisfied ▼]                         │ │
│ │                                                          │ │
│ │  [+ Add AND condition]   [+ Add OR condition]           │ │
│ │                                                          │ │
│ └──────────────────────────────────────────────────────────┘ │
│                                                               │
│ ACTION                                                        │
│ ┌──────────────────────────────────────────────────────────┐ │
│ │                                                          │ │
│ │  THEN  [Show question ▼]                                │ │
│ │                                                          │ │
│ │        [Question 3: What went wrong? ▼]                 │ │
│ │                                                          │ │
│ └──────────────────────────────────────────────────────────┘ │
│                                                               │
│ ─────────────────────────────────────────────────────────    │
│ [Cancel]                                         [Save Rule] │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

#### Condition Types
| Operator | Applies To | Example |
|----------|-----------|---------|
| equals | All types | Rating = 5 |
| not equals | All types | Choice ≠ "Other" |
| greater than | Numbers, ratings | Rating > 3 |
| less than | Numbers, ratings | Rating < 3 |
| contains | Text, multi-select | Choices contain "Mobile" |
| is empty | Text fields | Comment is empty |
| is not empty | Text fields | Comment is not empty |

#### Action Types
| Action | Description |
|--------|-------------|
| Show question | Display a specific question |
| Hide question | Skip a specific question |
| Skip to question | Jump to a later question |
| Skip to end | End survey early |
| Show section | Display an entire section |
| Hide section | Skip an entire section |

#### Visual Logic Flow Preview
```
┌──────────────────────────────────────────────────────────────┐
│ Logic Flow Preview                                     [✕]   │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────┐                                             │
│  │ Q1: Rating  │                                             │
│  └──────┬──────┘                                             │
│         │                                                     │
│    ┌────┴────┐                                               │
│    │         │                                               │
│   ≤2        ≥4                                               │
│    │         │                                               │
│    ▼         ▼                                               │
│ ┌────────┐ ┌────────┐                                       │
│ │Q3: What│ │Skip to │                                       │
│ │went    │ │Q7      │                                       │
│ │wrong?  │ │        │                                       │
│ └────┬───┘ └────┬───┘                                       │
│      │          │                                             │
│      └────┬─────┘                                             │
│           │                                                   │
│           ▼                                                   │
│     ┌───────────┐                                            │
│     │ Q7: Final │                                            │
│     │ Comments  │                                            │
│     └───────────┘                                            │
│           │                                                   │
│           ▼                                                   │
│     ┌───────────┐                                            │
│     │ Thank You │                                            │
│     └───────────┘                                            │
│                                                               │
│ ─────────────────────────────────────────────────────────    │
│ Legend: ──▶ Always  ╌╌▶ Conditional                         │
│                                              [Close]         │
└──────────────────────────────────────────────────────────────┘
```

#### Quick Logic (Inline in Question Editor)
```
┌─────────────────────────────────────────────────────┐
│ 3. What went wrong?                                  │
│    Long Text • Optional                             │
│                                                      │
│    ┌─────────────────────────────────────────────┐  │
│    │ ⚡ Show only if:                            │  │
│    │    Q1 Rating ≤ 2                            │  │
│    │    [Edit] [Remove]                          │  │
│    └─────────────────────────────────────────────┘  │
│                                                      │
│    [⚙️ Settings] [🗑️ Delete] [⋮⋮ Move]            │
└─────────────────────────────────────────────────────┘
```

#### Mobile Logic Editor
```
┌─────────────────────┐
│ Logic Rule    [✕]   │
├─────────────────────┤
│                     │
│ IF                  │
│ ┌─────────────────┐ │
│ │ Q1: Rating    ▼ │ │
│ └─────────────────┘ │
│ ┌─────────────────┐ │
│ │ equals        ▼ │ │
│ └─────────────────┘ │
│ ┌─────────────────┐ │
│ │ 1 - Very Poor ▼ │ │
│ └─────────────────┘ │
│                     │
│ THEN                │
│ ┌─────────────────┐ │
│ │ Show question ▼ │ │
│ └─────────────────┘ │
│ ┌─────────────────┐ │
│ │ Q3: What...   ▼ │ │
│ └─────────────────┘ │
│                     │
│ ┌─────────────────┐ │
│ │   Save Rule     │ │
│ └─────────────────┘ │
│                     │
└─────────────────────┘
```

**Key UX Decisions:**
- Progressive disclosure: Basic rules inline, complex logic in modal
- Visual flow diagram for understanding complex surveys
- Warning if logic creates unreachable questions
- Test mode to simulate different response paths
- Copy/duplicate rules for similar conditions

---

### 7. Survey Distribution

**Purpose:** Get survey in front of respondents

**Layout:** Modal or dedicated screen

```
┌──────────────────────────────────────────────────────────────┐
│ Distribute Survey                                      [✕]   │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│ Share Link                                                    │
│ ┌─────────────────────────────────────────────────────┐     │
│ │ https://app.example.com/s/abc123def           [Copy] │     │
│ └─────────────────────────────────────────────────────┘     │
│                                                               │
│ QR Code                                                       │
│ ┌─────────┐                                                  │
│ │ [QR]    │  [Download QR Code]                              │
│ └─────────┘                                                  │
│                                                               │
│ Email Invitations                                             │
│ ┌─────────────────────────────────────────────────────┐     │
│ │ Recipients: [email@example.com, john@...]           │     │
│ │ Subject: [We'd love your feedback!]                 │     │
│ │ Message: [Hi {name}, ...]                           │     │
│ │                                                      │     │
│ │ [Send Invitations]                                   │     │
│ └─────────────────────────────────────────────────────┘     │
│                                                               │
│ Embed on Website                                              │
│ [View Embed Code]                                             │
│                                                               │
│ Advanced Options                                              │
│ [Schedule Send] [Set Response Limit] [Configure Reminders]   │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

---

### 8. Response List

**Purpose:** View and manage all responses

**Layout:** Filterable table with preview

```
┌──────────────────────────────────────────────────────────────┐
│ Product Feedback Survey → Responses (247)          [Export]  │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│ [All] [Urgent] [Positive] [Negative] [Unanswered]            │
│                                                               │
│ Search: [_________________] [Filters ▼] [Sort ▼]             │
│                                                               │
│ ┌───────────────────────────────────────────────────────┐   │
│ │ ☐ john@example.com                    2 minutes ago   │   │
│ │    😊 Positive (8.5/10) • 🏷️ Product Quality         │   │
│ │    "The new features are amazing! Especially the..."  │   │
│ │    [View Full Response]                               │   │
│ ├───────────────────────────────────────────────────────┤   │
│ │ ☐ sarah@company.com    🚨              15 minutes ago │   │
│ │    😡 Very Negative (2.1/10) • 🏷️ Bug, Payment       │   │
│ │    "System has been down for 2 hours. This is..."    │   │
│ │    [View Full Response]                               │   │
│ └───────────────────────────────────────────────────────┘   │
│                                                               │
│ [←] Page 1 of 25 [→]                                         │
└───────────────────────────────────────────────────────────────┘
```

**Filters Panel (slide-in):**
```
Filters
├─ Sentiment
│  ☐ Very Positive
│  ☐ Positive
│  ☐ Neutral
│  ☐ Negative
│  ☐ Very Negative
├─ Urgency
│  ☐ Critical (8-10)
│  ☐ High (5-7)
│  ☐ Low (0-4)
├─ Themes
│  ☐ Shipping
│  ☐ Pricing
│  ☐ Quality
├─ Date Range
│  [Last 7 days ▼]
└─ [Apply] [Clear]
```

---

### 9. Individual Response Detail

**Purpose:** Deep dive into single response with context

**Layout:** Full screen detail view

```
┌──────────────────────────────────────────────────────────────┐
│ ← Back to Responses                                  [⋯ More]│
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│                                                               │
│ Response from john@example.com                                │
│ Submitted: Dec 31, 2024 at 2:45 PM                          │
│                                                               │
│ ┌───────────────────────────────────────────────────────┐   │
│ │ AI Analysis                                           │   │
│ ├───────────────────────────────────────────────────────┤   │
│ │ Sentiment: 😊 Positive (8.5/10)                       │   │
│ │ Emotions: Joy, Satisfaction, Excitement               │   │
│ │ Themes: Product Quality (95%), New Features (87%)     │   │
│ │ Urgency: Low (2/10)                                   │   │
│ │                                                        │   │
│ │ 💡 Key Insight:                                        │   │
│ │ Customer is highly satisfied with recent updates      │   │
│ │ and specifically mentions the dashboard redesign.     │   │
│ └───────────────────────────────────────────────────────┘   │
│                                                               │
│ ──────────────────────────────────────────────────────────   │
│                                                               │
│ Q1: How satisfied are you with our product?                  │
│ A: ⭐️⭐️⭐️⭐️⭐️ (5/5)                                          │
│                                                               │
│ Q2: What do you like most about our product?                 │
│ A: "The new features are amazing! Especially the             │
│     dashboard redesign makes everything so much easier       │
│     to find. The AI suggestions have saved me hours."        │
│     🏷️ Product Quality, New Features, Dashboard              │
│                                                               │
│ Q3: What could we improve?                                   │
│ A: "Mobile app could use some work, sometimes slow."         │
│     🏷️ Mobile Experience, Performance                        │
│                                                               │
│ ──────────────────────────────────────────────────────────   │
│                                                               │
│ Actions                                                       │
│ [📝 Add Note] [🏷️ Add Tag] [✓ Create Follow-up] [📧 Email]  │
│                                                               │
│ Internal Notes (2)                                            │
│ ├─ @sarah: This is great feedback for our Q1 roadmap!       │
│ │  2 hours ago                                              │
│ └─ @mike: Shared with mobile team                           │
│    1 hour ago                                               │
│                                                               │
│ [Add Note...]                                                 │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

---

### 10. Analytics Dashboard

**Purpose:** Deep insights into survey performance

**Layout:** Data-heavy dashboard with multiple visualizations

```
┌──────────────────────────────────────────────────────────────┐
│ Analytics → Product Feedback Survey        [Export Report]   │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│ [Overview] [Sentiment] [Themes] [Trends]                     │
│                                                               │
│ Date Range: [Last 30 days ▼]  Compare to: [Previous period ▼]│
│                                                               │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐            │
│ │ Avg         │ │ NPS Score   │ │ Response    │            │
│ │ Sentiment   │ │ 45          │ │ Rate        │            │
│ │ 7.2/10      │ │ ↑ +3        │ │ 68%         │            │
│ │ ↑ +0.4      │ └─────────────┘ │ ↓ -2%       │            │
│ └─────────────┘                 └─────────────┘            │
│                                                               │
│ ┌───────────────────────────────────────────────────────┐   │
│ │ Sentiment Over Time                                   │   │
│ │ [Line chart: 30-day sentiment trend]                  │   │
│ │                                                        │   │
│ └───────────────────────────────────────────────────────┘   │
│                                                               │
│ ┌──────────────────────┐ ┌────────────────────────────┐     │
│ │ Sentiment Breakdown  │ │ Top Themes                 │     │
│ │ [Donut chart]        │ │ 1. Product Quality (45%)   │     │
│ │ • Very Positive: 32% │ │    Avg Sentiment: 8.1/10   │     │
│ │ • Positive: 28%      │ │                            │     │
│ │ • Neutral: 25%       │ │ 2. Pricing (32%)           │     │
│ │ • Negative: 10%      │ │    Avg Sentiment: 6.5/10   │     │
│ │ • Very Negative: 5%  │ │                            │     │
│ └──────────────────────┘ │ 3. Customer Support (28%)  │     │
│                          │    Avg Sentiment: 7.8/10   │     │
│                          │                            │     │
│                          │ [View All Themes →]        │     │
│                          └────────────────────────────┘     │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

---

### 11. Theme Deep Dive

**Purpose:** Analyze specific theme in detail

```
┌──────────────────────────────────────────────────────────────┐
│ ← Back to Analytics                                          │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│ Theme: Product Quality                                        │
│ 112 mentions (45% of responses) • Avg Sentiment: 8.1/10      │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│ ┌───────────────────────────────────────────────────────┐   │
│ │ Mention Trend                                         │   │
│ │ [Line chart showing mentions over time]               │   │
│ │ ↑ Trending up 27% this week                           │   │
│ └───────────────────────────────────────────────────────┘   │
│                                                               │
│ Related Keywords                                              │
│ [quality] [reliable] [features] [design] [performance]        │
│                                                               │
│ Sub-Themes                                                    │
│ • Dashboard redesign (48 mentions)                            │
│ • AI features (32 mentions)                                   │
│ • Export functionality (18 mentions)                          │
│                                                               │
│ ┌───────────────────────────────────────────────────────┐   │
│ │ AI Summary                                            │   │
│ ├───────────────────────────────────────────────────────┤   │
│ │ Customers are highly satisfied with recent product   │   │
│ │ quality improvements, particularly:                   │   │
│ │                                                        │   │
│ │ ✅ Positives:                                          │   │
│ │ • Dashboard redesign praised for improved UX          │   │
│ │ • AI features saving users significant time           │   │
│ │ • Reliability and uptime improvements noted           │   │
│ │                                                        │   │
│ │ ⚠️ Areas for improvement:                              │   │
│ │ • Export feature still has occasional bugs            │   │
│ │ • Mobile app performance lags behind web              │   │
│ │                                                        │   │
│ │ 💡 Recommended Actions:                                │   │
│ │ 1. Prioritize mobile app performance                  │   │
│ │ 2. Fix export functionality bugs                      │   │
│ │ 3. Highlight AI features in marketing                 │   │
│ └───────────────────────────────────────────────────────┘   │
│                                                               │
│ Representative Responses                                      │
│ [List of 5-10 sample responses mentioning this theme]         │
│                                                               │
│ [View All Responses with this Theme →]                        │
└───────────────────────────────────────────────────────────────┘
```

---

### 12. Settings

**Layout:** Tabbed settings screen with context sidebar showing setting categories

```
┌──────────────────────────────────────────────────────────────┐
│ Settings                                                      │
├──────────────┬───────────────────────────────────────────────┤
│              │                                               │
│  Account     │  Account Settings                             │
│  ──────────  │  ─────────────────────────────────────────   │
│  Profile     │                                               │
│  Security    │  Profile                                      │
│  ──────────  │  ┌─────────────────────────────────────────┐ │
│  Workspace   │  │ [Avatar]  Full Name: [John Doe_____]    │ │
│  Team        │  │           Email: john@example.com       │ │
│  ──────────  │  │           [Change Avatar]               │ │
│  Notifications│  └─────────────────────────────────────────┘ │
│  Integrations│                                               │
│  ──────────  │  Password & Security                          │
│  Billing     │  ┌─────────────────────────────────────────┐ │
│              │  │ Password: ••••••••  [Change Password]   │ │
│              │  │ Two-Factor Auth: Disabled [Enable]      │ │
│              │  │ Sessions: 2 active  [View All]          │ │
│              │  └─────────────────────────────────────────┘ │
│              │                                               │
│              │  Connected Accounts                           │
│              │  ┌─────────────────────────────────────────┐ │
│              │  │ ✓ Google: john@gmail.com  [Disconnect]  │ │
│              │  │ + Connect Apple                         │ │
│              │  │ + Connect Facebook                      │ │
│              │  └─────────────────────────────────────────┘ │
│              │                                               │
│              │  Danger Zone                                  │
│              │  ┌─────────────────────────────────────────┐ │
│              │  │ [Delete Account]                        │ │
│              │  └─────────────────────────────────────────┘ │
│              │                                               │
└──────────────┴───────────────────────────────────────────────┘
```

**Settings Categories:**

#### Account Settings
- **Profile**: Name, email, avatar, timezone, language preference
- **Security**: Password change, 2FA setup, active sessions, connected OAuth accounts
- **Danger Zone**: Delete account (with confirmation)

#### Workspace Settings
- **General**: Workspace name, default survey settings
- **Branding**: Default colors, logo, thank-you page defaults
- **Data & Privacy**: Data retention policy, export all data, GDPR options

#### Team Settings (Team Workspaces Only)
- **Members**: View/invite/remove team members
- **Roles**: Assign roles (Owner, Admin, Member, Viewer)
- **Pending Invites**: Manage outstanding invitations

```
┌───────────────────────────────────────────────────────────┐
│  Team Members                          [+ Invite Member]  │
├───────────────────────────────────────────────────────────┤
│  👤 John Doe (you)                                        │
│     john@example.com • Owner                              │
├───────────────────────────────────────────────────────────┤
│  👤 Sarah Smith                                           │
│     sarah@company.com • Admin           [Change Role ▼]   │
├───────────────────────────────────────────────────────────┤
│  👤 Mike Johnson                                          │
│     mike@company.com • Member           [Change Role ▼]   │
├───────────────────────────────────────────────────────────┤
│  Pending Invitations                                      │
│  ┌───────────────────────────────────────────────────┐   │
│  │ alex@company.com • Invited 2 days ago • [Resend]  │   │
│  └───────────────────────────────────────────────────┘   │
└───────────────────────────────────────────────────────────┘
```

#### Notifications Settings
- **Email Notifications**: 
  - New responses (immediate, daily digest, off)
  - Urgent issues (always on, configurable)
  - Weekly summary reports
- **Push Notifications** (mobile):
  - Urgent issues
  - New responses
  - Team mentions
- **In-App Notifications**:
  - Response milestones
  - Survey status changes

```
┌───────────────────────────────────────────────────────────┐
│  Notification Preferences                                 │
├───────────────────────────────────────────────────────────┤
│                                                           │
│  Email Notifications                                      │
│  ┌───────────────────────────────────────────────────┐   │
│  │ New responses      [Immediately ▼]                │   │
│  │ Urgent issues      [Always ✓]                     │   │
│  │ Weekly summary     [○ On  ● Off]                  │   │
│  │ Team activity      [Daily digest ▼]               │   │
│  └───────────────────────────────────────────────────┘   │
│                                                           │
│  Push Notifications (Mobile)                              │
│  ┌───────────────────────────────────────────────────┐   │
│  │ Urgent issues      [✓]                            │   │
│  │ New responses      [✓]                            │   │
│  │ Team mentions      [✓]                            │   │
│  │ Survey milestones  [ ]                            │   │
│  └───────────────────────────────────────────────────┘   │
│                                                           │
└───────────────────────────────────────────────────────────┘
```

#### Integrations Settings
- **Connected Apps**: Slack, Microsoft Teams, Zapier, etc.
- **API Access**: API keys, usage, documentation link
- **Webhooks**: Configure webhook endpoints

```
┌───────────────────────────────────────────────────────────┐
│  Integrations                                             │
├───────────────────────────────────────────────────────────┤
│                                                           │
│  Connected Apps                                           │
│  ┌───────────────────────────────────────────────────┐   │
│  │ 🔗 Slack           Connected    [Configure]       │   │
│  │ + Microsoft Teams  [Connect]                      │   │
│  │ + Zapier           [Connect]                      │   │
│  │ + HubSpot          [Connect]                      │   │
│  └───────────────────────────────────────────────────┘   │
│                                                           │
│  API Access                                               │
│  ┌───────────────────────────────────────────────────┐   │
│  │ API Key: sk-••••••••••••  [Show] [Regenerate]     │   │
│  │ Usage this month: 1,247 / 10,000 requests         │   │
│  │ [View API Documentation →]                        │   │
│  └───────────────────────────────────────────────────┘   │
│                                                           │
│  Webhooks                                                 │
│  ┌───────────────────────────────────────────────────┐   │
│  │ + Add Webhook Endpoint                            │   │
│  └───────────────────────────────────────────────────┘   │
│                                                           │
└───────────────────────────────────────────────────────────┘
```

#### Billing Settings (Future - When Payments Added)
- **Current Plan**: Plan name, features, usage
- **Upgrade/Downgrade**: Plan selection
- **Payment Method**: Card on file, update payment
- **Billing History**: Past invoices, receipts
- **Usage**: Response count, AI analyses, team seats

---

## Mobile Experience

**Philosophy:** Mobile is not a secondary experience — critical workflows must be fully functional on mobile devices.

### Critical Mobile Features (Priority Order)

#### 1. Create Surveys on Mobile ✅
**Full survey creation capability on mobile:**
- Start from templates (quick mobile-first option)
- Add/edit questions using mobile-optimized controls
- Drag-to-reorder with touch gestures
- Preview in mobile format
- Publish and share directly from mobile

**Mobile Adaptations:**
- Larger touch targets for question type selection
- Bottom sheet for question properties (vs sidebar on desktop)
- Swipe actions for delete/duplicate questions
- Collapsible sections to manage screen real estate

#### 2. Response Triage & Follow-Up ✅
**Manage and act on responses anywhere:**
- View response inbox with filtering
- Quick sentiment/urgency indicators
- Read full response details
- Add notes and tags
- Assign to team members
- Create follow-up tasks
- One-tap actions: Flag, Archive, Escalate

**Mobile Optimizations:**
- Swipe gestures: Left to archive, right to flag
- Pull-to-refresh for new responses
- Push notifications for urgent issues
- Quick reply/note composition

#### 3. Dashboard Monitoring & Viewing Responses ✅
**Stay informed on the go:**
- View key metrics: response count, sentiment, urgent issues
- Sentiment trend chart (touch to explore)
- Recent surveys overview
- Tap into any survey for details
- View individual responses

**Mobile Dashboard Layout:**
```
┌─────────────────────────────────────┐
│  SurveyGo          [🔔] [👤]       │
├─────────────────────────────────────┤
│                                     │
│  📊 Today: 47 responses   ↑ +12%   │
│  😊 Sentiment: 7.4/10     ↑ +0.2   │
│  🚨 2 Urgent Issues                 │
│                                     │
├─────────────────────────────────────┤
│  Urgent Issues                      │
│  ┌─────────────────────────────┐   │
│  │ ⚠️ "Payment issue..."       │   │
│  │    5 min ago • Urgency: 9   │   │
│  └─────────────────────────────┘   │
├─────────────────────────────────────┤
│  Recent Surveys                     │
│  ┌─────────────────────────────┐   │
│  │ Product Feedback            │   │
│  │ 247 responses • Active      │   │
│  └─────────────────────────────┘   │
├─────────────────────────────────────┤
│                                     │
│  [+ New Survey]    (FAB)           │
│                                     │
├─────────────────────────────────────┤
│ [Home] [Surveys] [Responses] [👤]  │
└─────────────────────────────────────┘
```

### Mobile Navigation
- **Bottom tab bar** for primary navigation (Dashboard, Surveys, Responses, Profile)
- **Floating Action Button (FAB)** for "New Survey" quick action
- **Swipe gestures** for common actions
- **Pull-to-refresh** everywhere
- **Deep links** from push notifications

### Push Notifications
- New responses (configurable)
- Urgent issues (always on)
- Survey milestones (e.g., "100 responses!")
- Team mentions/assignments

---

## Email Templates

### Survey Invitation Email
```
Subject: We'd love your feedback! [Survey Name]

┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  [Company Logo]                                             │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  Hi {FirstName},                                            │
│                                                             │
│  We value your opinion! Please take a moment to share      │
│  your feedback with us.                                     │
│                                                             │
│  This survey takes approximately {EstimatedTime} to        │
│  complete.                                                  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              [Take the Survey →]                    │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Your responses help us improve our products and           │
│  services for you.                                          │
│                                                             │
│  Thank you for your time!                                   │
│                                                             │
│  Best,                                                      │
│  The {CompanyName} Team                                     │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│  If the button doesn't work, copy this link:               │
│  {SurveyURL}                                               │
│                                                             │
│  [Unsubscribe] | [Privacy Policy]                          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Reminder Email
```
Subject: Reminder: Your feedback matters! [Survey Name]

┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  [Company Logo]                                             │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  Hi {FirstName},                                            │
│                                                             │
│  We noticed you haven't completed our survey yet.          │
│  We'd really appreciate hearing from you!                   │
│                                                             │
│  It only takes {EstimatedTime}.                            │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              [Complete Survey →]                    │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Your feedback helps us serve you better.                   │
│                                                             │
│  Thank you!                                                 │
│  The {CompanyName} Team                                     │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│  [Unsubscribe] | [Privacy Policy]                          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Completion Confirmation Email
```
Subject: Thank you for your feedback!

┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  [Company Logo]                                             │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  Hi {FirstName},                                            │
│                                                             │
│  ✓ Your response has been received!                        │
│                                                             │
│  Thank you for taking the time to share your feedback      │
│  with us. Your input is invaluable in helping us           │
│  improve.                                                   │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  Want to stay connected?                                    │
│  [Follow us on Twitter] [Visit our Website]                 │
│                                                             │
│  Best,                                                      │
│  The {CompanyName} Team                                     │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│  [Unsubscribe] | [Privacy Policy]                          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Email Template Variables
| Variable | Description |
|----------|-------------|
| `{FirstName}` | Recipient's first name |
| `{CompanyName}` | Survey creator's company |
| `{SurveyName}` | Name of the survey |
| `{SurveyURL}` | Direct link to survey |
| `{EstimatedTime}` | Estimated completion time |

---

## Empty States

### Dashboard Empty State (No Surveys Yet)
```
┌───────────────────────────────────────────────────────────┐
│                                                           │
│                     📊                                    │
│                                                           │
│         Welcome to SurveyGo!                              │
│                                                           │
│   You haven't created any surveys yet.                    │
│   Start collecting feedback in just a few minutes.       │
│                                                           │
│   ┌─────────────────────────────────────────────────┐    │
│   │          [+ Create Your First Survey]           │    │
│   └─────────────────────────────────────────────────┘    │
│                                                           │
│   or                                                      │
│                                                           │
│   [Browse Templates] to get started quickly               │
│                                                           │
└───────────────────────────────────────────────────────────┘
```

### Surveys List Empty State
```
┌───────────────────────────────────────────────────────────┐
│                                                           │
│                     📝                                    │
│                                                           │
│         No surveys yet                                    │
│                                                           │
│   Create your first survey to start collecting           │
│   valuable customer feedback.                             │
│                                                           │
│   ┌─────────────────────────────────────────────────┐    │
│   │            [+ New Survey]                       │    │
│   └─────────────────────────────────────────────────┘    │
│                                                           │
└───────────────────────────────────────────────────────────┘
```

### Responses Empty State (Survey Has No Responses)
```
┌───────────────────────────────────────────────────────────┐
│                                                           │
│                     📬                                    │
│                                                           │
│         No responses yet                                  │
│                                                           │
│   Share your survey to start collecting responses.        │
│                                                           │
│   ┌─────────────────────────────────────────────────┐    │
│   │   [Copy Link]  [Send via Email]  [Get QR Code]  │    │
│   └─────────────────────────────────────────────────┘    │
│                                                           │
└───────────────────────────────────────────────────────────┘
```

### Analytics Empty State
```
┌───────────────────────────────────────────────────────────┐
│                                                           │
│                     📈                                    │
│                                                           │
│         Not enough data yet                               │
│                                                           │
│   Analytics will appear once you have at least           │
│   5 responses. Keep sharing your survey!                  │
│                                                           │
│   Current responses: 2 / 5 needed                        │
│                                                           │
└───────────────────────────────────────────────────────────┘
```

### Team Members Empty State (Solo User)
```
┌───────────────────────────────────────────────────────────┐
│                                                           │
│                     👥                                    │
│                                                           │
│         You're working solo                               │
│                                                           │
│   Invite team members to collaborate on surveys          │
│   and share insights.                                     │
│                                                           │
│   ┌─────────────────────────────────────────────────┐    │
│   │            [+ Invite Team Member]               │    │
│   └─────────────────────────────────────────────────┘    │
│                                                           │
└───────────────────────────────────────────────────────────┘
```

---

## Error States & Edge Cases

### AI Analysis Failure
**When:** AI service (OpenAI/Claude) is unavailable or returns an error

**User Experience:**
- Response is still saved successfully
- Analysis is queued for automatic retry
- Dashboard shows "Analysis pending" badge
- User can manually trigger re-analysis

```
┌───────────────────────────────────────────────────────────┐
│  ⚠️ AI Analysis Pending                                  │
│                                                           │
│  We couldn't analyze this response right now.            │
│  It's been queued for automatic retry.                   │
│                                                           │
│  [Retry Now]  [View Raw Response]                        │
└───────────────────────────────────────────────────────────┘
```

**Backend Handling:**
- Exponential backoff retry (1min, 5min, 15min, 1hr)
- Max 5 retries before marking as "failed"
- Admin notification after 3 failures
- Manual retry always available

### Network Error (User Side)
**When:** User loses internet connection while using the app

**User Experience:**
- Toast notification appears
- Offline indicator in header
- Actions are queued locally
- Auto-sync when connection restores

```
┌───────────────────────────────────────────────────────────┐
│  ⚠️ You're offline                                       │
│  Changes will sync when you're back online.              │
│                                      [Dismiss]           │
└───────────────────────────────────────────────────────────┘
```

### Network Error (Survey Respondent)
**When:** Respondent loses connection while filling survey

**User Experience:**
- Answers auto-saved locally
- "Connection lost" message
- Auto-resume when connection returns
- Manual "Save & Exit" option

```
┌───────────────────────────────────────────────────────────┐
│  ⚠️ Connection Lost                                      │
│                                                           │
│  Don't worry - your answers are saved locally.           │
│  We'll submit them when you're back online.              │
│                                                           │
│  [Try Again]  [Save & Exit]                              │
└───────────────────────────────────────────────────────────┘
```

### Rate Limiting
**When:** User exceeds API rate limits

**User Experience:**
- Graceful degradation
- Informative message
- Automatic retry after cooldown
- No data loss

```
┌───────────────────────────────────────────────────────────┐
│  ⏳ Please slow down                                     │
│                                                           │
│  You're making requests too quickly.                     │
│  Please wait a moment before trying again.               │
│                                                           │
│  Ready to retry in: 30 seconds                           │
└───────────────────────────────────────────────────────────┘
```

### Survey Not Found
**When:** Respondent accesses invalid or deleted survey link

```
┌───────────────────────────────────────────────────────────┐
│                                                           │
│                     🔍                                    │
│                                                           │
│         Survey Not Found                                  │
│                                                           │
│   This survey may have been closed or the link          │
│   may be incorrect.                                       │
│                                                           │
│   [Contact the survey owner for help]                    │
│                                                           │
└───────────────────────────────────────────────────────────┘
```

### Survey Closed
**When:** Respondent accesses a closed/expired survey

```
┌───────────────────────────────────────────────────────────┐
│                                                           │
│                     🔒                                    │
│                                                           │
│         This Survey is Closed                             │
│                                                           │
│   Thank you for your interest, but this survey          │
│   is no longer accepting responses.                       │
│                                                           │
│   [Visit {CompanyName} website]                          │
│                                                           │
└───────────────────────────────────────────────────────────┘
```

### Permission Denied
**When:** User tries to access resource they don't have permission for

```
┌───────────────────────────────────────────────────────────┐
│  🔒 Access Denied                                        │
│                                                           │
│  You don't have permission to view this resource.        │
│  Contact your team admin for access.                     │
│                                                           │
│  [Go to Dashboard]                                       │
└───────────────────────────────────────────────────────────┘
```

### Error Handling Philosophy
1. **Never lose user data** - Always save locally first
2. **Be informative** - Explain what happened and what to do
3. **Offer solutions** - Provide retry, contact support, or alternatives
4. **Fail gracefully** - Degrade functionality rather than crash
5. **Log everything** - Track errors for debugging and improvement

---

## Summary of User Design Decisions
| Decision Area | Choice |
|---------------|--------|
| **Navigation** | Hybrid: Top nav for page switching + Collapsible context sidebar for task-specific tools |
| **Main Nav Items** | Dashboard/Home, Surveys, Responses/Analytics, Team (if applicable), Settings |
| **Onboarding** | Welcome wizard explaining features (not forced survey creation), skip-friendly |
| **Survey Builder Style** | List-based like Google Forms + Clean/minimal like Notion |
| **Template Selection** | Users choose from templates before entering editor |
| **Dashboard Priority** | 1. Recent surveys, 2. Today's responses, 3. Sentiment trend, 4. Urgent issues, 5. Quick actions |
| **Mobile Critical Features** | 1. Create surveys, 2. Response triage/follow-up, 3. Dashboard monitoring |
| **Mobile Navigation** | Bottom tab bar + Floating Action Button for new survey |
| **Design Inspiration** | Google Forms (structure) + Notion (style) + Linear (speed) + Vercel (analytics) |

