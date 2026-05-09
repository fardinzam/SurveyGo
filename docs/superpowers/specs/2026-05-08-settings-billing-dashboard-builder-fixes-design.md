# Design: Settings Billing, Dashboard Icons, Builder Fixes
**Date:** 2026-05-08

---

## Context
Batch of fixes and features across three areas: Settings billing section (show real Stripe data in-app), Dashboard list/grid view improvements (template-specific icons), and Survey Builder fixes (font sizes, card/input bg, native select replacement, AI tab, export labels, asterisk position).

---

## 1. Settings — View Plans: Billing Data In-App

### Problem
The "View Plans" tab in Settings has Payment Methods and Transaction History sections that currently just redirect to the Stripe portal. They need to display real data.

### Solution: New Cloud Function `getStripeBillingData`

**Function** (`functions/src/stripe/getBillingData.ts`):
- Requires authentication (same as other Stripe functions)
- Fetches `stripeCustomerId` from user's Firestore `subscription` field
- Calls `stripe.paymentMethods.list({ customer, type: 'card', limit: 1 })` to get active payment method
- Calls `stripe.invoices.list({ customer, limit: 5 })` to get recent transactions
- Returns:
```ts
{
  paymentMethod: {
    brand: string;        // "visa", "mastercard", etc.
    last4: string;        // "4242"
    expMonth: number;     // 12
    expYear: number;      // 2027
    name: string | null;  // cardholder name
  } | null;
  invoices: {
    id: string;
    date: number;           // Unix timestamp
    amount: number;         // in cents
    currency: string;       // "usd"
    status: string;         // "paid", "open", "void"
    description: string | null;
  }[];
}
```
- If no Stripe customer exists yet (free plan), return `{ paymentMethod: null, invoices: [] }`.

**UI in `SettingsModal.tsx` — `BillingSection`:**

Payment Methods sub-section:
- Shows card brand logo/name + "•••• •••• •••• {last4}" + expiry "Expires MM/YYYY"
- If no payment method: "No payment method on file"
- "Manage payment methods →" button opens Stripe portal (existing `callCreatePortalSession`)

Transaction History sub-section:
- Compact table: Date | Description | Amount | Status badge (green/gray/red)
- 5 rows max
- If no invoices: "No transactions yet"
- "View full history →" button opens Stripe portal

Loading state: skeleton placeholders while the Cloud Function call resolves.
Error state: "Could not load billing info" with a retry button.

---

## 2. Dashboard — Template Icons in List View

### Problem
Every survey shows the same generic icon. Surveys made from a template should show a category-specific icon.

### Schema Change
Add `templateId?: string` to `Survey` and `SurveyClient` types in `src/types/survey.ts`.

Store it in Firestore when creating from a template in `DashboardCreate.tsx`'s `handleTemplate()` function.

### Icon Mapping
Map template category → lucide-react icon in `DashboardHome.tsx`:

| Category (exact string) | Icon | Color class |
|------------------------|------|-------------|
| `'Customers'` | `Users` | `text-blue-500` |
| `'Employees'` | `Briefcase` | `text-amber-500` |
| `'Markets'` | `BarChart2` | `text-green-500` |
| `'Students'` | `GraduationCap` | `text-purple-500` |
| `'Website / App Visitors'` | `Globe` | `text-cyan-500` |
| `'Events & Scheduling'` | `Calendar` | `text-rose-500` |
| `'Community'` | `Heart` | `text-pink-500` |
| (no template / scratch) | `FileText` | `text-brand-black/40` |

`templateId` maps to category via the existing `TEMPLATE_META` array in `src/lib/surveyTemplates.ts`. In `DashboardHome.tsx`, resolve icon like: `TEMPLATE_META.find(t => t.id === survey.templateId)?.category` → look up icon.

The icon container stays the same size (`w-10 h-10 rounded-[10px]`) with `bg-brand-ghost` background. The icon is `w-5 h-5`.

Apply to: list view rows. The search modal in `DashboardLayout.tsx` should also use the same icon resolution.

---

## 3. Profile Dropdown — Edit Button Hover

### Problem
The pen/edit icon on the avatar in the ProfileDropdown has no hover feedback.

### Fix
Add a visible hover ring or background to the edit button (the small `w-5 h-5` circle with the `Pencil` icon). Change from current styling to include `hover:bg-brand-ghost hover:border-brand-black/20 transition-colors`.

---

## 4. Builder — Font Sizes for sm/md/lg

### Problem
The sm/md/lg size buttons set root font size on the container (13/15/17px), and child elements use `text-[0.875em]`/`text-[1.125em]`. This scales correctly on the respondent page but the builder canvas preview doesn't reflect it properly because canvas `QuestionCard` components still use Tailwind rem-based classes.

### Fix
In `DashboardBuilder.tsx` canvas `QuestionCard`, change question title from `text-lg` (rem) to `text-[1.125em]` (em), and input/choice text from `text-sm` to `text-[0.875em]` — same as the respondent page. The canvas container already sets `fontSize` in its inline style, so em units will now scale correctly there too.

---

## 5. Builder — Card Color & Input BG Color Not Working

### Problem
The `--survey-card` and `--survey-input-bg` CSS variables are set correctly on the respondent page but the builder canvas preview doesn't pass them to its container. So changing these in the Design panel has no visible effect on the canvas.

### Fix
In `DashboardBuilder.tsx`, add `--survey-card` and `--survey-input-bg` to the inline style of the canvas container (alongside the existing `--survey-accent`). Then in the canvas `QuestionCard`, change `bg-white` → `style={{ background: 'var(--survey-card)' }}` for the card wrapper, and any input-like elements → `style={{ background: 'var(--survey-input-bg)' }}`.

---

## 6. Builder Edit Panel — Replace Native Selects with CustomDropdown

### Problem
9 native `<select>` elements remain in the `QuestionEditor` section. There is already a `CustomDropdown` component at `src/app/components/CustomDropdown.tsx` built on Radix UI's Select primitive.

### Selects to Replace
All 9 selects in `DashboardBuilder.tsx`:
1. Survey Settings Modal: Collect email (none/optional/required)
2. Survey Settings Modal: Send copy (off/always/whenRequested)
3. QuestionEditor: Question type selector
4. QuestionEditor: Checkbox selection limit (exact/range)
5. QuestionEditor: Rating display style (numeric/star)
6. QuestionEditor: Rating lower bound (0/1)
7. QuestionEditor: Rating upper bound (2–10)
8. QuestionEditor: Date format (MM/DD/YYYY etc.)
9. QuestionEditor: Date divider (slash/dash/period)

Use the existing `CustomDropdown` component. For the font family selector in the Styles tab, keep as-is (styled with `fontFamily` on the option elements — Radix Select doesn't support per-item font styling well).

---

## 7. Builder Sidebar — Required Asterisk Position

### Problem
The red `*` appears to the RIGHT of the question number badge. User wants it on the LEFT.

### Fix
In the sidebar question list in `DashboardBuilder.tsx`, move the `{q.required && <span>*</span>}` element to before the number badge `<div>`, keeping it after the `<GripVertical>` drag handle.

---

## 8. Builder — AI Tab Disabled

### Problem
The AI Assistant tab in the right panel calls `callGenerateQuestions()` and appends AI-generated questions. The feature should be disabled — any user input should return a static "This feature has been disabled" message.

### Fix
In `AIChatPanel` (inside `DashboardBuilder.tsx`), replace the AI call logic with a static response:
- On send: push the user's message to `messages`, then push a bot response: "This feature is currently disabled."
- Remove the `callGenerateQuestions` call and the `onAppendQuestions` side-effect.
- Keep the chat UI intact (input, send button, message history).
- Initial AI greeting message can be updated to: "Hi! The AI Assistant is currently disabled."

---

## 9. Results — Export Labels for Untitled Questions

### Problem
Questions without a title (`q.text = ''`) currently export their internal Firestore ID (e.g., `q_ngaaxue8`) as the column header. This is unreadable.

### Fix
In `BuilderResults.tsx`, replace the column header generation `q.text || q.id` with a helper that produces `untitled_[type]_[N]` where N is the 1-based count of untitled questions of that type:

```ts
function questionLabel(questions: Question[], q: Question, idx: number): string {
  if (q.text?.trim()) return q.text.trim();
  const untitledOfType = questions
    .slice(0, idx + 1)
    .filter(other => !other.text?.trim() && other.type === q.type);
  return `untitled_${q.type}_${untitledOfType.length}`;
}
```

Apply to all 4 export handlers (CSV, Excel, PDF, JSON).

---

## Critical Files

| File | Changes |
|------|---------|
| `functions/src/stripe/getBillingData.ts` | New Cloud Function |
| `functions/src/index.ts` | Register new callable |
| `src/lib/functions.ts` | Add `callGetBillingData` client callable |
| `src/app/components/SettingsModal.tsx` | Billing section redesign |
| `src/types/survey.ts` | Add `templateId?: string` |
| `src/app/components/DashboardCreate.tsx` | Store `templateId` on survey creation |
| `src/app/components/DashboardHome.tsx` | Template icon mapping |
| `src/app/components/DashboardLayout.tsx` | Search modal icon update |
| `src/app/components/DashboardBuilder.tsx` | Canvas CSS vars, QuestionCard em sizes, selects→CustomDropdown, asterisk position, AI tab disabled, preview link |

---

## Verification

1. **Billing**: Open Settings → View Plans. Payment method shows card brand + last 4 + expiry. Transactions show 5 rows. Both "Manage" and "View history" links open Stripe portal.
2. **Template icons**: Create a new survey from an "Employees" template; list view shows Briefcase icon. Scratch survey shows FileText.
3. **Font sizes**: Toggle sm/md/lg in builder; question titles and inputs scale visibly on both the canvas and the live respondent page.
4. **Card/input bg**: Change card color in builder; canvas preview reflects it immediately. Live survey shows updated colors.
5. **Native selects**: All QuestionEditor dropdowns use custom styled selects (no browser chrome).
6. **Asterisk**: Required question shows `*` to the LEFT of the number badge.
7. **AI tab**: Typing in AI Assistant returns "This feature is currently disabled."
8. **Export**: Question with no title exports as `untitled_short_1` not `q_abc123`.
