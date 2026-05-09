# Connect & Results Pages Redesign

**Date:** 2026-05-03  
**Branch:** logic-overhaul  
**Source designs:** `/Users/far.zam/Desktop/SurveyGoResults/src/app/components/DashboardConnect.tsx` and `DashboardResults.tsx`

---

## Goal

Replace the Connect and Results tab content components in the survey builder (`BuilderConnect.tsx` and the deleted `BuilderResults.tsx`) with updated designs from the SurveyGoResults prototype repo. Functionality from the existing components must be preserved and wired into the new layouts. The missing `BuilderResults.tsx` (deleted by a partial Codex run) must be recreated — its absence is currently a TypeScript error.

---

## Scope

Two files to update in `src/app/components/`:

| File | Action |
|---|---|
| `BuilderConnect.tsx` | Replace with new design, merge in existing app list + Request modal |
| `BuilderResults.tsx` | Update with new design — file now restored, data logic carried forward |

No routing changes. No new dependencies. The components are used as tab content inside `DashboardBuilder.tsx` which renders them as-is.

---

## Connect Page (`BuilderConnect.tsx`)

### Layout
Adopt the new visual structure from `DashboardConnect.tsx`:
- Full-height flex column with `bg-brand-ghost` background
- Centered container (`max-w-5xl`)
- Header row: "Connect & Automate" title + subtitle, with Apps/Webhooks pill toggle on the right
- White card body (`bg-white rounded-3xl border border-black/5 shadow-sm`) containing the tab content

### Apps Tab
- Search input with leading `Search` icon, `bg-brand-ghost` styling
- Category filter pills (horizontal scroll, `bg-brand-black text-white` active state)
- 3-column app grid (responsive: 1→2→3)
- Each card: icon in `bg-brand-ghost` rounded box + app name + description + hover-reveal Connect button
- Empty state with clear-filters button
- **Keep:** "Can't find the app you're looking for?" request section at the bottom, triggering the existing `RequestModal`

### App Data
Use the **existing 20-app list** from `BuilderConnect.tsx` with colored text-logo badges. The new design uses lucide icons for 10 apps — these don't cover all 20, so keep the current logo approach for consistency. Visual style of the card matches the new design.

### Webhooks Tab
Use the new design's webhooks panel:
- Webhook icon, "Add a Webhook" heading, description copy
- "Add Endpoint" button (no-op for now — functionality TBD)
- "Active Webhooks" section showing "0 configured" badge and a dashed empty state

### State
Same local state as current: `tab`, `search`, `category`, `requestOpen`.

---

## Results Page (`BuilderResults.tsx`)

### Starting point
The file has been restored. It uses `useResponses`, `useSurvey`, and `useSubscription`. It currently has no tabs — just a stats row, a 7-day chart, and a per-question summary list. The new design adds a 4-tab layout and an Insights tab shell on top of this existing data logic.

### Props
```ts
interface BuilderResultsProps {
  surveyId: string;
}
```
(No change — prop is non-optional as in the restored file.)

### Data — carry forward unchanged
- `useResponses(surveyId)` → response list  
- `useSurvey(surveyId)` → survey metadata (title, status, questions)
- `useSubscription()` → `limits.canExport` for export gating
- `stats` computation: total, recent (last 7 days), avgPerDay, uniqueDays
- `chartData` computation: last 7 days by day-of-week
- `questionSummaries` computation: per-question answer count + top answer summary
- `downloadCsv` helper and `handleExport` (plan-gated, CSV only)
- Loading state with `Loader2` spinner

### Layout
Adopt the new two-section layout from `DashboardResults.tsx`:
- **Top header** (white, `border-b`): survey title + status badge, subtitle, Export button (existing logic), Share button (no-op placeholder)
- **Tab bar** (underline style, 4 tabs): Overview | Questions | Responses | Insights
- **Scrollable content area** below

### Overview Tab
- 4 metric cards: Total Responses (live from `stats.total`), Completion Rate (`—` placeholder), Avg. Time (`—` placeholder), Views (`—` placeholder)
- Response Volume area chart — existing `chartData` + `AreaChart`, restyled to match new design (dark stroke, gradient fill, chart footer showing peak day and avg daily from `stats`)
- Empty state if no responses

### Questions Tab
Render the `questionSummaries` list in the new card style from the design — numbered cards with question text, type label, answer count, and top-answer summary. This is lighter than the full `QuestionAnalyticsCard` approach, consistent with the restored file's existing computation.

### Responses Tab
Simple responses list: date + first answer per response, using `useResponses` data. No sorting, pagination, or detail modal in this pass — those are deferred. Show empty state if no responses.

### Insights Tab
Static placeholder content for now:
- Purple gradient "AI Summary" card with placeholder copy
- "Top Keywords" card (static example tags)
- "Notable Quotes" card (static example quotes)
All content is hardcoded. This tab is a design shell — backend work (AI analysis, NLP) is deferred.

### Export
Keep existing plan-gated CSV export (`handleExport` / `downloadCsv`). Wire to the Export button in the new header. Share button is a no-op placeholder.

---

## New Features (deferred — noted for later)

These UI elements exist in the new design but have no backend yet:

1. **Insights tab** — AI-generated summary, keyword extraction, notable quotes
2. **Completion Rate** — requires view tracking on the respondent page
3. **Avg. Time** — requires start/end timestamp tracking on respondent page  
4. **Views** — requires a view counter in Firestore
5. **Webhooks: Add Endpoint** — requires webhook registration backend
6. **Share button** — share results link / embed (not scoped)

---

## Error Fix

~~`DashboardBuilder.tsx:20` has `import { BuilderResults } from './BuilderResults'` which currently errors because the file was deleted.~~  
`BuilderResults.tsx` has been restored by the user — the TypeScript error is already resolved. No action needed here.
