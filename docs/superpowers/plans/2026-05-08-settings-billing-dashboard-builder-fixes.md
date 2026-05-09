# Settings Billing, Dashboard Icons & Builder Fixes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add in-app Stripe billing data, template-specific survey icons, profile dropdown hover fix, and several builder/results fixes (font sizes, card/input bg, native select replacement, asterisk position, AI tab disabled, export labels).

**Architecture:** Stripe data is fetched via a new Cloud Function (same pattern as `createPortalSession`). Template icons use a new `templateId` field stored at survey creation. All builder fixes are targeted edits to `DashboardBuilder.tsx` and `SurveyRespondentPage.tsx`. Export label fix is in `BuilderResults.tsx`.

**Tech Stack:** React + TypeScript + Tailwind CSS v4, Firebase Cloud Functions v2 (Node), Stripe Node SDK, lucide-react icons, Radix UI Select (existing `CustomDropdown`).

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `functions/src/stripe/getBillingData.ts` | Create | New Cloud Function: fetch payment method + last 5 invoices from Stripe |
| `functions/src/index.ts` | Modify | Export `getBillingData` |
| `src/lib/functions.ts` | Modify | Add `callGetBillingData` callable + types |
| `src/app/components/SettingsModal.tsx` | Modify | Replace placeholder billing sections with real data |
| `src/types/survey.ts` | Modify | Add `templateId?: string` to `Survey` and `SurveyClient` |
| `src/app/components/DashboardCreate.tsx` | Modify | Pass `templateId` when creating from template |
| `src/app/components/DashboardHome.tsx` | Modify | Template icon mapping in list view |
| `src/app/components/DashboardLayout.tsx` | Modify | Search modal icon uses same template mapping |
| `src/app/components/CustomDropdown.tsx` | Modify | Support `{ value: string; label: string }[]` option type |
| `src/app/components/DashboardBuilder.tsx` | Modify | Canvas CSS vars, em font sizes, selects→CustomDropdown, asterisk, AI tab |
| `src/app/components/BuilderResults.tsx` | Modify | Export label helper for untitled questions |

---

## Task 1: Cloud Function — `getBillingData`

**Files:**
- Create: `functions/src/stripe/getBillingData.ts`
- Modify: `functions/src/index.ts`

- [ ] **Step 1: Create the Cloud Function**

`functions/src/stripe/getBillingData.ts`:
```typescript
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { getFirestore } from 'firebase-admin/firestore';
import Stripe from 'stripe';

const stripeSecretKey = defineSecret('STRIPE_SECRET_KEY');

export const getBillingData = onCall(
  { secrets: [stripeSecretKey], cors: true, invoker: 'public' },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be signed in.');
    }

    const db = getFirestore();
    const userDoc = await db.collection('users').doc(request.auth.uid).get();
    const stripeCustomerId = userDoc.data()?.subscription?.stripeCustomerId as string | undefined;

    if (!stripeCustomerId) {
      return { paymentMethod: null, invoices: [] };
    }

    const stripe = new Stripe(stripeSecretKey.value());

    const [paymentMethods, invoiceList] = await Promise.all([
      stripe.paymentMethods.list({ customer: stripeCustomerId, type: 'card', limit: 1 }),
      stripe.invoices.list({ customer: stripeCustomerId, limit: 5 }),
    ]);

    const pm = paymentMethods.data[0]?.card ?? null;
    const paymentMethod = pm
      ? {
          brand: pm.brand,
          last4: pm.last4,
          expMonth: pm.exp_month,
          expYear: pm.exp_year,
          name: paymentMethods.data[0].billing_details.name,
        }
      : null;

    const invoices = invoiceList.data.map((inv) => ({
      id: inv.id,
      date: inv.created,
      amount: inv.amount_paid,
      currency: inv.currency,
      status: inv.status ?? 'unknown',
      description: inv.description ?? inv.lines.data[0]?.description ?? null,
    }));

    return { paymentMethod, invoices };
  }
);
```

- [ ] **Step 2: Export from index**

In `functions/src/index.ts`, add:
```typescript
export { getBillingData } from './stripe/getBillingData';
```

---

## Task 2: Client Callable + Types

**Files:**
- Modify: `src/lib/functions.ts`

- [ ] **Step 1: Add types and callable to `src/lib/functions.ts`**

Add after the existing `SentimentResult` block, before the callable wrappers section:
```typescript
export interface BillingPaymentMethod {
    brand: string;
    last4: string;
    expMonth: number;
    expYear: number;
    name: string | null;
}

export interface BillingInvoice {
    id: string;
    date: number;
    amount: number;
    currency: string;
    status: string;
    description: string | null;
}

export interface BillingDataResponse {
    paymentMethod: BillingPaymentMethod | null;
    invoices: BillingInvoice[];
}
```

Add callable at the end of the file:
```typescript
export const callGetBillingData = httpsCallable<void, BillingDataResponse>(
    functions,
    'getBillingData'
);
```

---

## Task 3: SettingsModal — Billing Section with Real Data

**Files:**
- Modify: `src/app/components/SettingsModal.tsx`

- [ ] **Step 1: Import the new callable and types**

At the top of `SettingsModal.tsx`, find the `functions` import line and add:
```typescript
import { callCreateCheckoutSession, callCreatePortalSession, callGetBillingData, type BillingDataResponse } from '../../lib/functions';
```
(Replace the existing `callCreateCheckoutSession, callCreatePortalSession` import.)

- [ ] **Step 2: Add billing data state and fetch inside `BillingSection`**

Replace the `BillingSection` function with this updated version. Key changes: fetch billing data on mount when `stripeCustomerId` is present; display payment method card and invoice table; show skeleton while loading; keep existing "Current plan" section unchanged:

```typescript
function BillingSection({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const { plan, status, currentPeriodEnd, stripeCustomerId, cancelAtPeriodEnd } = useSubscription();
  const [portalLoading, setPortalLoading] = useState(false);
  const [billingData, setBillingData] = useState<BillingDataResponse | null>(null);
  const [billingLoading, setBillingLoading] = useState(false);
  const [billingError, setBillingError] = useState(false);
  const planInfo = PLAN_DISPLAY[plan as PlanId] ?? PLAN_DISPLAY.basic;

  useEffect(() => {
    if (!stripeCustomerId) return;
    setBillingLoading(true);
    callGetBillingData()
      .then(res => { setBillingData(res.data); })
      .catch(() => setBillingError(true))
      .finally(() => setBillingLoading(false));
  }, [stripeCustomerId]);

  const handlePortal = async () => {
    setPortalLoading(true);
    try {
      const res = await callCreatePortalSession();
      window.location.href = res.data.url;
    } catch {
      toast.error('Could not open billing portal');
      setPortalLoading(false);
    }
  };

  const pm = billingData?.paymentMethod;
  const invoices = billingData?.invoices ?? [];

  return (
    <div className="space-y-8 max-w-lg">
      {/* Section 1: Current plan — unchanged */}
      <div>
        <SectionHeader title="Current plan" />
        <div className="bg-brand-ghost rounded-xl p-4 mt-3">
          <p className="text-lg font-semibold text-brand-black">{planInfo.name}</p>
          {status && <p className="text-xs text-brand-black/50 mt-1 capitalize">Status: {status}</p>}
          {cancelAtPeriodEnd && currentPeriodEnd && (
            <p className="text-xs text-red-600 mt-1">Cancels on {currentPeriodEnd.toLocaleDateString()}</p>
          )}
          {!cancelAtPeriodEnd && currentPeriodEnd && (
            <p className="text-xs text-brand-black/50 mt-1">Renews {currentPeriodEnd.toLocaleDateString()}</p>
          )}
          <div className="mt-3 space-y-1">
            {planInfo.features.map(f => (
              <div key={f} className="flex items-center gap-2 text-sm text-brand-black/70">
                <Check className="w-3.5 h-3.5 text-green-600 shrink-0" />
                {f}
              </div>
            ))}
          </div>
        </div>
        <div className="flex gap-2 mt-3">
          {plan === 'basic' ? (
            <button onClick={() => { onClose(); navigate('/dashboard/pricing'); }} className="px-4 py-2 bg-brand-black text-white rounded-lg text-sm font-semibold hover:bg-black/90 transition-colors">
              Upgrade plan
            </button>
          ) : (
            <>
              <button onClick={() => { onClose(); navigate('/dashboard/pricing'); }} className="px-4 py-2 bg-brand-black text-white rounded-lg text-sm font-semibold hover:bg-black/90 transition-colors">
                Change plan
              </button>
              <button onClick={handlePortal} disabled={portalLoading}
                className="px-4 py-2 bg-brand-ghost border border-black/10 text-brand-black rounded-lg text-sm font-semibold hover:bg-white transition-colors disabled:opacity-60 flex items-center gap-2">
                {portalLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                Cancel subscription
              </button>
            </>
          )}
        </div>
      </div>

      {/* Section 2: Payment methods */}
      <div>
        <SectionHeader title="Payment methods" />
        {!stripeCustomerId ? (
          <p className="text-sm text-brand-black/50 mt-3">No payment method on file. Upgrade to add one.</p>
        ) : billingLoading ? (
          <div className="mt-3 h-14 bg-brand-ghost animate-pulse rounded-xl" />
        ) : billingError ? (
          <div className="mt-3 flex items-center justify-between">
            <p className="text-sm text-brand-black/50">Could not load payment info.</p>
            <button onClick={() => { setBillingError(false); setBillingLoading(true); callGetBillingData().then(r => setBillingData(r.data)).catch(() => setBillingError(true)).finally(() => setBillingLoading(false)); }}
              className="text-xs text-brand-black underline">Retry</button>
          </div>
        ) : pm ? (
          <div className="mt-3 bg-brand-ghost rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-brand-black capitalize">{pm.brand} •••• {pm.last4}</p>
              {pm.name && <p className="text-xs text-brand-black/50 mt-0.5">{pm.name}</p>}
              <p className="text-xs text-brand-black/50 mt-0.5">Expires {String(pm.expMonth).padStart(2,'0')}/{pm.expYear}</p>
            </div>
            <button onClick={handlePortal} disabled={portalLoading}
              className="text-xs font-medium text-brand-black/70 hover:text-brand-black underline transition-colors flex items-center gap-1">
              {portalLoading && <Loader2 className="w-3 h-3 animate-spin" />}
              Manage →
            </button>
          </div>
        ) : (
          <div className="mt-3 flex items-center justify-between">
            <p className="text-sm text-brand-black/50">No payment method on file.</p>
            <button onClick={handlePortal} disabled={portalLoading}
              className="text-xs font-medium text-brand-black/70 hover:text-brand-black underline transition-colors flex items-center gap-1">
              {portalLoading && <Loader2 className="w-3 h-3 animate-spin" />}
              Add payment method →
            </button>
          </div>
        )}
      </div>

      {/* Section 3: Transaction history */}
      <div>
        <SectionHeader title="Transaction history" />
        {!stripeCustomerId ? (
          <p className="text-sm text-brand-black/50 mt-3">No transactions yet.</p>
        ) : billingLoading ? (
          <div className="mt-3 space-y-2">
            {[1,2,3].map(i => <div key={i} className="h-8 bg-brand-ghost animate-pulse rounded-lg" />)}
          </div>
        ) : billingError ? null : invoices.length === 0 ? (
          <p className="text-sm text-brand-black/50 mt-3">No transactions yet.</p>
        ) : (
          <div className="mt-3">
            <div className="divide-y divide-black/5 rounded-xl border border-black/5 overflow-hidden">
              {invoices.map(inv => (
                <div key={inv.id} className="flex items-center justify-between px-4 py-2.5 bg-white text-sm">
                  <div className="min-w-0">
                    <p className="text-brand-black/80 truncate">{inv.description ?? 'Subscription'}</p>
                    <p className="text-xs text-brand-black/40">{new Date(inv.date * 1000).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-4">
                    <span className="text-sm font-medium text-brand-black">
                      {(inv.amount / 100).toLocaleString('en-US', { style: 'currency', currency: inv.currency.toUpperCase() })}
                    </span>
                    <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full ${
                      inv.status === 'paid' ? 'bg-green-50 text-green-700' :
                      inv.status === 'open' ? 'bg-amber-50 text-amber-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>{inv.status}</span>
                  </div>
                </div>
              ))}
            </div>
            <button onClick={handlePortal} disabled={portalLoading}
              className="mt-3 text-xs font-medium text-brand-black/70 hover:text-brand-black underline transition-colors flex items-center gap-1">
              {portalLoading && <Loader2 className="w-3 h-3 animate-spin" />}
              View full history →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
```

---

## Task 4: Add `templateId` to Survey Types

**Files:**
- Modify: `src/types/survey.ts`

- [ ] **Step 1: Add `templateId` to Survey and SurveyClient interfaces**

In `src/types/survey.ts`, in the `Survey` interface (after `headerImageUrl`):
```typescript
    templateId?: string;           // template used at creation, e.g. 'csat', 'nps'
```

In the `SurveyClient` interface (same position):
```typescript
    templateId?: string;
```

---

## Task 5: Store `templateId` on Survey Creation

**Files:**
- Modify: `src/app/components/DashboardCreate.tsx`

- [ ] **Step 1: Pass `templateId` in `handleTemplate`**

Find `handleTemplate` (~line 112). The current `createMut.mutateAsync` call:
```typescript
const id = await createMut.mutateAsync({
  title: tpl.title,
  description: tpl.description,
  questions: tpl.questions,
});
```

Change to:
```typescript
const id = await createMut.mutateAsync({
  title: tpl.title,
  description: tpl.description,
  questions: tpl.questions,
  templateId,
});
```

- [ ] **Step 2: Accept `templateId` in the create payload**

In `src/types/survey.ts`, in the `CreateSurveySchema` object, add:
```typescript
templateId: z.string().optional(),
```

In the `CreateSurveyInput` interface (already inferred from schema — no change needed since schema drives the type).

- [ ] **Step 3: Persist `templateId` in Firestore `createSurvey`**

In `src/lib/firestore.ts`, find `createSurvey`. The `addDoc` call builds the document object. Add `templateId` to that object:
```typescript
// existing fields...
templateId: data.templateId ?? null,
```

---

## Task 6: Template Icon Mapping in Dashboard List View

**Files:**
- Modify: `src/app/components/DashboardHome.tsx`
- Modify: `src/app/components/DashboardLayout.tsx`

- [ ] **Step 1: Add icon helper to `DashboardHome.tsx`**

Import the needed icons at the top (add to existing lucide-react import):
```typescript
import {
  // ...existing...
  Users, Briefcase, BarChart2, GraduationCap, Globe, Calendar, Heart,
} from 'lucide-react';
```

Also import the template meta:
```typescript
import { templateMeta } from '../../lib/surveyTemplates';
```

Add this helper just before the `DashboardHome` component definition:
```typescript
function surveyIcon(survey: SurveyClient): { Icon: React.ElementType; color: string } {
  if (!survey.templateId) return { Icon: FileText, color: 'text-brand-black/40' };
  const meta = templateMeta.find(t => t.id === survey.templateId);
  if (!meta) return { Icon: FileText, color: 'text-brand-black/40' };
  const MAP: Record<string, { Icon: React.ElementType; color: string }> = {
    'Customers':              { Icon: Users,          color: 'text-blue-500' },
    'Employees':              { Icon: Briefcase,      color: 'text-amber-500' },
    'Markets':                { Icon: BarChart2,      color: 'text-green-500' },
    'Students':               { Icon: GraduationCap, color: 'text-purple-500' },
    'Website / App Visitors': { Icon: Globe,          color: 'text-cyan-500' },
    'Events & Scheduling':    { Icon: Calendar,       color: 'text-rose-500' },
    'Community':              { Icon: Heart,          color: 'text-pink-500' },
  };
  return MAP[meta.category] ?? { Icon: FileText, color: 'text-brand-black/40' };
}
```

- [ ] **Step 2: Use `surveyIcon` in list view rows**

In the list view row (look for the existing icon div — `bg-brand-ghost flex items-center justify-center text-brand-black/40`):
```tsx
{(() => { const { Icon, color } = surveyIcon(survey); return (
  <div className="w-10 h-10 rounded-[10px] bg-brand-ghost flex items-center justify-center shrink-0">
    <Icon className={`w-5 h-5 ${color}`} />
  </div>
); })()}
```

- [ ] **Step 3: Export `surveyIcon` and use it in search modal in `DashboardLayout.tsx`**

In `DashboardLayout.tsx`, import the helper:
```typescript
import { surveyIcon } from './DashboardHome';
```
Also import the needed icon components from lucide-react in this file:
```typescript
import { Users, Briefcase, BarChart2, GraduationCap, Globe, Calendar, Heart } from 'lucide-react';
```

In the `SearchModal` results list, replace the current icon div:
```tsx
{(() => { const { Icon, color } = surveyIcon(s); return (
  <div className="w-9 h-9 rounded-xl bg-brand-ghost flex items-center justify-center shrink-0">
    <Icon className={`w-4 h-4 ${color}`} />
  </div>
); })()}
```

Note: make `surveyIcon` an exported function in `DashboardHome.tsx` (`export function surveyIcon`).

---

## Task 7: Profile Dropdown Edit Button Hover

**Files:**
- Modify: `src/app/components/DashboardLayout.tsx`

- [ ] **Step 1: Add hover feedback to the edit pencil button on the avatar**

In the shared `ProfileDropdown` component (the one at top of `DashboardLayout.tsx`, ~line 115), find the edit button:
```tsx
<button onClick={() => openSettings('profile')} className="absolute bottom-0 right-0 w-5 h-5 bg-white border border-black/10 rounded-full flex items-center justify-center shadow-sm">
```

Change to:
```tsx
<button onClick={() => openSettings('profile')} className="absolute bottom-0 right-0 w-5 h-5 bg-white border border-black/10 rounded-full flex items-center justify-center shadow-sm hover:bg-brand-ghost hover:border-brand-black/20 transition-colors">
```

Apply the same change to the equivalent button in the sidebar's inline dropdown (~line 456 area).

---

## Task 8: Extend `CustomDropdown` to Support Value/Label Pairs

**Files:**
- Modify: `src/app/components/CustomDropdown.tsx`

- [ ] **Step 1: Update `CustomDropdown` to accept `{ value: string; label: string }[]` options**

Replace the full content of `src/app/components/CustomDropdown.tsx`:
```typescript
import * as React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';

type OptionItem = string | { value: string; label: string };

interface CustomDropdownProps {
  value: string;
  onChange: (value: string) => void;
  options: OptionItem[];
  placeholder?: string;
  className?: string;
}

export function CustomDropdown({
  value,
  onChange,
  options,
  placeholder,
  className = '',
}: CustomDropdownProps) {
  const items = options.map(o =>
    typeof o === 'string' ? { value: o, label: o } : o
  );
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder || 'Select...'} />
      </SelectTrigger>
      <SelectContent>
        {items.map((item) => (
          <SelectItem key={item.value} value={item.value}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
```

---

## Task 9: Replace Native Selects in `DashboardBuilder.tsx` with `CustomDropdown`

**Files:**
- Modify: `src/app/components/DashboardBuilder.tsx`

- [ ] **Step 1: Import `CustomDropdown`**

Add to imports at top of `DashboardBuilder.tsx`:
```typescript
import { CustomDropdown } from './CustomDropdown';
```

- [ ] **Step 2: Replace the 2 selects in `SurveySettingsModal`**

Find the two selects inside `SurveySettingsModal` (~lines 113, 115). Replace each:

**Collect email:**
```tsx
<CustomDropdown
  value={settings.collectEmail}
  onChange={v => set('collectEmail', v)}
  options={[
    { value: 'none', label: 'None' },
    { value: 'optional', label: 'Optional' },
    { value: 'required', label: 'Required' },
  ]}
  className="w-36"
/>
```

**Send copy:**
```tsx
<CustomDropdown
  value={settings.sendCopy}
  onChange={v => set('sendCopy', v)}
  options={[
    { value: 'off', label: 'No' },
    { value: 'always', label: 'Yes' },
    { value: 'whenRequested', label: 'Upon request' },
  ]}
  className="w-36"
/>
```

- [ ] **Step 3: Replace 7 selects in `QuestionEditor`**

**Question type selector** (the full `<div className="relative"><select ...` wrapper, ~line 320). Replace wrapper + select with:
```tsx
<CustomDropdown
  value={t}
  onChange={v => { const nt = v as QuestionType; const r = makeQuestion(nt); onChange({ ...r, id: question.id, text: question.text, required: question.required }); }}
  options={QUESTION_TYPES.map(qt => ({ value: qt.type, label: qt.label }))}
  className="w-full"
/>
```
(`t` is `question.type` aliased at the top of `QuestionEditor`. `makeQuestion`, `QUESTION_TYPES` are already defined in the file.)

**Selection limit** (~line 344):
```tsx
<CustomDropdown
  value={o.selectionLimit ?? 'exact'}
  onChange={v => setOpt({ selectionLimit: v as 'exact' | 'range' })}
  options={[
    { value: 'exact', label: 'Exact number' },
    { value: 'range', label: 'Range' },
  ]}
  className="w-full"
/>
```

**Rating style** (~line 356):
```tsx
<CustomDropdown
  value={o.ratingStyle ?? 'numeric'}
  onChange={v => setOpt({ ratingStyle: v as 'numeric' | 'star' })}
  options={[
    { value: 'numeric', label: 'Numbers' },
    { value: 'star', label: 'Stars' },
  ]}
  className="w-full"
/>
```

**Rating lower** (~line 358):
```tsx
<CustomDropdown
  value={String(o.ratingLow ?? 1)}
  onChange={v => setOpt({ ratingLow: parseInt(v) })}
  options={[
    { value: '0', label: '0' },
    { value: '1', label: '1' },
  ]}
  className="w-full"
/>
```

**Rating upper** (~line 359):
```tsx
<CustomDropdown
  value={String(o.ratingHigh ?? 5)}
  onChange={v => setOpt({ ratingHigh: parseInt(v) })}
  options={Array.from({ length: 9 }, (_, i) => ({
    value: String(i + 2),
    label: String(i + 2),
  }))}
  className="w-full"
/>
```

**Date format** (~line 367):
```tsx
<CustomDropdown
  value={o.dateFormat ?? 'MMDDYYYY'}
  onChange={v => setOpt({ dateFormat: v })}
  options={[
    { value: 'MMDDYYYY', label: 'MM/DD/YYYY' },
    { value: 'DDMMYYYY', label: 'DD/MM/YYYY' },
    { value: 'YYYYMMDD', label: 'YYYY/MM/DD' },
  ]}
  className="w-full"
/>
```

**Date divider** (~line 368):
```tsx
<CustomDropdown
  value={o.dateDivider ?? 'slash'}
  onChange={v => setOpt({ dateDivider: v })}
  options={[
    { value: 'slash', label: 'Slash (/)' },
    { value: 'dash', label: 'Dash (-)' },
    { value: 'period', label: 'Period (.)' },
  ]}
  className="w-full"
/>
```

Note: For each replacement, remove the outer `<div className="relative">` wrapper and the `<ChevronDown>` overlay icon — the Radix Select provides its own chevron.

---

## Task 10: Builder Canvas — CSS Variables & Em Font Sizes

**Files:**
- Modify: `src/app/components/DashboardBuilder.tsx`

- [ ] **Step 1: Add `--survey-card` and `--survey-input-bg` to canvas container**

Find the canvas container div with `ref={canvasRef}` (~line 786). Its current inline style has `'--survey-accent': surveySettings.accentColor`. Add:
```tsx
style={{
  fontFamily: surveySettings.fontFamily,
  background: ..., // existing
  '--survey-accent': surveySettings.accentColor,
  '--survey-card': surveySettings.cardColor ?? '#ffffff',
  '--survey-input-bg': surveySettings.inputBackgroundColor ?? '#F6F5FA',
  fontSize: surveySettings.fontSize === 'sm' ? '13px' : surveySettings.fontSize === 'lg' ? '17px' : '15px',
} as React.CSSProperties}
```

- [ ] **Step 2: Apply CSS variables to canvas `QuestionCard`**

In the canvas `QuestionCard` component (~line 412), change:
```tsx
className={`relative group bg-white dark:bg-neutral-900 rounded-xl p-5 border ...`}
```
to use a style for the background:
```tsx
className={`relative group rounded-xl p-5 border transition-all duration-200 ${selected ? 'shadow-md' : 'border-border shadow-sm hover:border-brand-black/15'}`}
style={{ ...(selected ? { borderColor: 'var(--survey-accent)', boxShadow: `0 0 0 1px var(--survey-accent)40` } : {}), background: 'var(--survey-card)' }}
```

- [ ] **Step 3: Scale canvas question text with em units**

In the same canvas `QuestionCard`, the question title textarea (~line 431) uses `text-sm`. Change the font size portion of that class to `text-[0.875em]`:
```tsx
className={`w-full bg-transparent outline-none ... ${isScreen ? 'text-[1.125em] font-display font-semibold' : 'text-[0.875em] font-medium'} text-brand-black`}
```

---

## Task 11: Required Asterisk — Move to Left of Number Badge

**Files:**
- Modify: `src/app/components/DashboardBuilder.tsx`

- [ ] **Step 1: Reorder elements in sidebar question list**

Find the sidebar button (~line 729). Current order:
```tsx
<GripVertical ... />
<div className="w-4 h-4 rounded-full ...">...</div>  {/* number badge */}
{q.required && <span className="text-destructive text-[9px] font-bold shrink-0">*</span>}
<span className="truncate flex-1">...</span>
```

Change to (asterisk before number badge, after grip):
```tsx
<GripVertical ... />
{q.required && <span className="text-destructive text-[9px] font-bold shrink-0">*</span>}
<div className="w-4 h-4 rounded-full ...">...</div>  {/* number badge */}
<span className="truncate flex-1">...</span>
```

---

## Task 12: AI Tab — Show Disabled Message

**Files:**
- Modify: `src/app/components/DashboardBuilder.tsx`

- [ ] **Step 1: Replace `AIChatPanel` logic with disabled stub**

Find `AIChatPanel` (~line 271). Replace its `handleSend` and initial message with a disabled version. Replace the entire function body:

```typescript
function AIChatPanel({ survey: _survey, existingQuestions: _eq, onAppendQuestions: _oaq }: { survey: SurveyClient | null; existingQuestions: Question[]; onAppendQuestions: (q: Question[]) => void; }) {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMsg[]>([
    { id: 1, sender: 'ai', text: 'Hi! The AI Assistant is currently disabled.' },
  ]);

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;
    setMessages(p => [
      ...p,
      { id: Date.now(), sender: 'user', text },
      { id: Date.now() + 1, sender: 'ai', text: 'This feature is currently disabled.' },
    ]);
    setInput('');
  };

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-minimal">
        {messages.map(m => (
          <div key={m.id} className={`flex gap-2 ${m.sender === 'user' ? 'flex-row-reverse' : ''}`}>
            {m.sender === 'ai' && (
              <div className="w-6 h-6 rounded-full bg-brand-vanilla/40 flex items-center justify-center shrink-0 mt-0.5">
                <Sparkles className="w-3 h-3 text-brand-black" />
              </div>
            )}
            <div className={`rounded-xl px-3 py-2 text-xs max-w-[85%] leading-relaxed ${m.sender === 'user' ? 'bg-brand-black text-white' : 'bg-brand-ghost text-brand-black border border-border'}`}>
              {m.text}
            </div>
          </div>
        ))}
      </div>
      <div className="p-3 border-t border-border shrink-0">
        <div className="relative">
          <MessageSquare className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder="Message AI..."
            className="w-full bg-input-background border border-border rounded-lg py-2 pl-8 pr-9 text-xs placeholder:text-muted-foreground outline-none focus:border-brand-black/20"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className="absolute right-1 top-1/2 -translate-y-1/2 w-6 h-6 rounded-lg bg-brand-black text-white flex items-center justify-center disabled:opacity-40 hover:bg-black/90"
          >
            <Send className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
}
```

Remove the `callGenerateQuestions` import from line 14 if it's no longer used elsewhere in the file. Check first with a grep.

---

## Task 13: Export Labels for Untitled Questions

**Files:**
- Modify: `src/app/components/BuilderResults.tsx`

- [ ] **Step 1: Add `questionLabel` helper**

In `BuilderResults.tsx`, add this helper just above the `downloadCsv` function:
```typescript
function questionLabel(allQuestions: Question[], q: Question, idx: number): string {
  if (q.text?.trim()) return q.text.trim();
  const sameTypeUntitled = allQuestions
    .slice(0, idx + 1)
    .filter(other => !other.text?.trim() && other.type === q.type);
  return `untitled_${q.type}_${sameTypeUntitled.length}`;
}
```

- [ ] **Step 2: Apply to all 4 export handlers**

In `handleExport` (CSV), replace:
```typescript
const header = ['Submitted At', ...survey.questions.map(q => q.text || q.id)];
```
with:
```typescript
const header = ['Submitted At', ...survey.questions.map((q, i) => questionLabel(survey.questions, q, i))];
```

Apply the same change in `handleExportXlsx`, `handleExportPdf`, and `handleExportJson` — each has the same header/column building logic. Replace every `q.text || q.id` occurrence in those functions with `questionLabel(survey.questions, q, i)` (where `i` is the map index).

---

## Verification Checklist

- [ ] **Billing**: Open Settings → View Plans. Payment method shows "Visa •••• 4242, Expires 12/2027". Transactions table shows 5 rows with date, amount, status badge. "Manage →" and "View full history →" links open Stripe portal.
- [ ] **Template icons**: Create survey from "Employees" template → list view shows amber Briefcase. Create from scratch → shows grey FileText. Search modal shows same icons.
- [ ] **Profile dropdown hover**: Hover over pen icon on avatar — background changes to brand-ghost.
- [ ] **Canvas CSS vars**: Change "Card" color in design panel → question card color updates in builder canvas immediately.
- [ ] **Em font sizes**: Toggle sm/md/lg in builder → question title text scales visibly in both canvas and live respondent page.
- [ ] **Native selects**: Open a checkbox question in builder edit panel → "Selection limit" uses styled Radix dropdown, not browser native select.
- [ ] **Asterisk**: Mark a question required → `*` appears to the LEFT of the question number in the sidebar.
- [ ] **AI tab**: Type anything in AI Assistant → response is "This feature is currently disabled."
- [ ] **Export labels**: Create question with empty title (type: short) → export CSV shows `untitled_short_1` not `q_abc123`.
