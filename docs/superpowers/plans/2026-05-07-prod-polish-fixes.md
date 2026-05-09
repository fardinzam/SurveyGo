# SurveyGo Prod Polish Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the dashboard, account menu, builder design/settings, respondent theming, share URL, and results export polish issues before production.

**Architecture:** Keep changes scoped to the existing React/Vite/Firebase app. Extend the existing `SurveySettings` object for new theme fields, normalize settings when loading surveys, and make the builder canvas, respondent page, and dashboard preview consume the same settings helpers so visual behavior stays consistent.

**Tech Stack:** React 18, Vite, TypeScript, Tailwind CSS v4, Firebase Auth/Firestore/Functions, Vitest, React Testing Library, `xlsx`.

---

## Scope Notes

- The request contains an `AI` section with no concrete items. Treat AI as regression-only: do not change AI behavior unless a failing test or existing bug is found while touching adjacent builder/results code.
- The repo is currently dirty, including files this plan touches. Before executing, inspect `git diff -- <file>` for each modified file and preserve user changes.
- `DashboardBuilder.tsx` is the active builder route. `SurveyBuilderPageNew.tsx` appears to be older/unrouted; only touch it if verification proves it is still used somewhere outside `src/app/App.tsx`.
- Firebase Auth only supports one active user per app instance. “Switch account” can store known account profiles and streamline switching, but it cannot silently log into another account without Firebase credentials/session. The implementation should keep a local account list, show it in the menu, and on switch sign out then send the user to login with the selected email remembered.
- Dashboard completion currently returns `100` whenever a survey has responses even though no per-response completion field is stored. Do not show fake completion. Either return `null` and display `--`, or add a real `completionRate` field in a separate backend/data migration. For this production polish pass, remove the fake 100% indicator.
- Share links use `window.location.origin`, so they become live links when the app is served from the production domain. Add optional `VITE_PUBLIC_APP_URL` support so production can force the public origin if admin/builder and respondent domains diverge.

## Files

- Modify: `src/types/survey.ts`
  Add `cardColor` and `inputBackgroundColor` to `SurveySettings`, defaults, and client-side normalization helper.
- Modify: `src/app/components/DashboardHome.tsx`
  Dashboard list/grid icons, menu z-index, completion display, and builder deep-link query params.
- Modify: `src/app/components/DashboardLayout.tsx`
  Only if needed for the profile dropdown import/props and account/settings navigation.
- Modify: `src/app/components/ProfileDropdown.tsx`
  Narrow/smaller account menu, grouping, theme/settings placement, and account switcher.
- Modify: `src/lib/auth.ts`
  Add local known-account helpers and optional sign-in hooks to remember signed-in users.
- Modify: `src/contexts/AuthContext.tsx`
  Optionally expose known accounts or call the account-recording helper when `user` changes.
- Modify: `src/app/components/DashboardBuilder.tsx`
  Query-param tab sync, design panel revert/colors/font size, required markers in question nav, preview-submit prevention, settings modal cleanup, dropdown borders.
- Modify: `src/app/components/SurveyRespondentPage.tsx`
  Apply settings to respondent page: accent color, card color, input background, font size, show question numbers, collect email, no preview submission path.
- Modify: `src/app/components/BuilderShare.tsx`
  Centralize public survey URL using `VITE_PUBLIC_APP_URL || window.location.origin`.
- Modify: `src/app/components/BuilderResults.tsx`
  Custom export dropdown with CSV, XLSX, PDF, JSON; replace AI Insights system select with custom select.
- Modify: `src/app/components/CustomDropdown.tsx`
  If Radix trigger border defaults are insufficient, make bordered trigger the default.
- Create: `src/lib/surveySettings.ts`
  Shared `normalizeSurveySettings`, `fontSizeClass/fontSizeStyle`, `getPublicSurveyUrl`, and theme style helpers.
- Create/modify tests:
  `src/app/components/DashboardHome.test.tsx`
  `src/app/components/ProfileDropdown.test.tsx`
  `src/app/components/DashboardBuilder.test.tsx`
  `src/app/components/SurveyRespondentPage.test.tsx`
  `src/app/components/BuilderShare.test.tsx`
  `src/app/components/BuilderResults.test.tsx`
  `src/lib/surveySettings.test.ts`

---

### Task 1: Shared Survey Settings Model

**Files:**
- Modify: `src/types/survey.ts`
- Create: `src/lib/surveySettings.ts`
- Test: `src/lib/surveySettings.test.ts`

- [ ] Add `cardColor: string` and `inputBackgroundColor: string` to `SurveySettings`.
- [ ] Add defaults:
  - `cardColor: '#FFFFFF'`
  - `inputBackgroundColor: '#F6F5FA'`
- [ ] Create `normalizeSurveySettings(settings?: Partial<SurveySettings> | null): SurveySettings` that merges missing legacy settings over `DEFAULT_SURVEY_SETTINGS`.
- [ ] Use `normalizeSurveySettings` in `toSurveyClient` so every loaded survey has complete settings.
- [ ] Create `fontSizeToPx(size)` returning `13px`, `15px`, `17px`.
- [ ] Create `getPublicSurveyUrl(surveyId, origin?)` that uses `import.meta.env.VITE_PUBLIC_APP_URL` first, then supplied origin, then `window.location.origin`.
- [ ] Test legacy settings normalization, font-size mapping, and URL origin fallback.
- [ ] Run: `npm test -- src/lib/surveySettings.test.ts`

### Task 2: Dashboard Cards, Menus, and Deep Links

**Files:**
- Modify: `src/app/components/DashboardHome.tsx`
- Test: `src/app/components/DashboardHome.test.tsx`

- [ ] Replace list-view purple gradient survey icon with a neutral/document-style icon using existing brand neutrals (`bg-brand-ghost`, `border-black/5`, `Inbox` or `FileText`).
- [ ] Remove hardcoded purple stroke from grid completion circle. Use `#D4E157`/brand vanilla or the survey accent only if a real completion rate exists.
- [ ] Change `completionRate` so it does not return fake `100`. With current data, return `null`; display `--` in list and hide or empty the circle stroke in grid.
- [ ] Increase grid/card menu and tooltip stacking to avoid overlap:
  - Row menu content: `z-[100]`.
  - Card wrappers must not create a higher stacking context over open menus.
  - Tooltip: `z-[110]`.
- [ ] Fix builder deep links:
  - Logic action should navigate to `/builder/${survey.id}?tab=Logic`.
  - Share action should navigate to `/builder/${survey.id}?tab=Share`.
- [ ] Add/adjust tests for the deep-link buttons and completion display.
- [ ] Run: `npm test -- src/app/components/DashboardHome.test.tsx`

### Task 3: Builder Query Param Sync

**Files:**
- Modify: `src/app/components/DashboardBuilder.tsx`
- Test: `src/app/components/DashboardBuilder.test.tsx`

- [ ] Normalize incoming `tab` query params case-insensitively into the `BuilderTab` union: `Build`, `Logic`, `Share`, `Results`, `Connect`.
- [ ] Add an effect that reacts when `searchParams` changes after mount so a dashboard menu click to `?tab=Share` or `?tab=Logic` selects the correct builder page.
- [ ] Keep URL writes canonical: `Build` removes `tab`, all other tabs write title-case tab names.
- [ ] If `tab=Results` is requested for a draft survey, route to `Share` or `Build` consistently rather than leaving blank content.
- [ ] Test `?tab=Logic` and `?tab=Share` initial render.
- [ ] Run: `npm test -- src/app/components/DashboardBuilder.test.tsx`

### Task 4: Profile Dropdown Account Menu

**Files:**
- Modify: `src/app/components/ProfileDropdown.tsx`
- Modify: `src/lib/auth.ts`
- Modify: `src/contexts/AuthContext.tsx`
- Test: `src/app/components/ProfileDropdown.test.tsx`

- [ ] Add a local known account type:
  - `uid`, `email`, `displayName`, `photoURL`, `providerIds`, `lastSeenAt`.
- [ ] Record the current user into `localStorage` key `surveygo:known-accounts` whenever AuthContext sees a non-null user.
- [ ] Narrow the expanded profile dropdown from `240px` to about `220px`, and reduce item/avatar spacing one notch.
- [ ] Move Theme and Settings into the first group by placing the divider after Settings.
- [ ] Add a “Switch account” group below the first divider.
- [ ] Show known accounts in that group; current account is disabled/checked.
- [ ] On selecting another account:
  - Store `surveygo:login-email` with the selected email.
  - Sign out the current user.
  - Navigate to `/auth/login`.
  - Show a small note/action that re-authentication is required.
- [ ] Keep Log Out as the final group.
- [ ] Test grouping order, narrower width style, and switch-account click behavior with mocked auth.
- [ ] Run: `npm test -- src/app/components/ProfileDropdown.test.tsx`

### Task 5: Builder Design Panel Settings

**Files:**
- Modify: `src/app/components/DashboardBuilder.tsx`
- Test: `src/app/components/DashboardBuilder.test.tsx`

- [ ] Revert button should always reset all design settings to `DEFAULT_SURVEY_SETTINGS`, not `survey?.settings`.
- [ ] In the Colors tab, add:
  - `Question card` color swatch bound to `surveySettings.cardColor`.
  - `Text input background` color swatch bound to `surveySettings.inputBackgroundColor`.
- [ ] Apply `surveySettings.cardColor` to builder canvas question cards.
- [ ] Apply `surveySettings.inputBackgroundColor` to text inputs/placeholders in the builder canvas.
- [ ] Make font size visible in the canvas by setting inherited `fontSize` and avoiding child hardcoded text sizes where they block the setting.
- [ ] Ensure the builder canvas and preview use the same style helpers from `src/lib/surveySettings.ts`.
- [ ] Add red asterisk in the left question navigation to the right of question title for `required` questions.
- [ ] Add tests for revert, new color controls, font size style, and required nav marker.
- [ ] Run: `npm test -- src/app/components/DashboardBuilder.test.tsx`

### Task 6: Builder Dropdown Borders and Settings Modal

**Files:**
- Modify: `src/app/components/DashboardBuilder.tsx`
- Modify: `src/app/components/CustomDropdown.tsx`
- Test: `src/app/components/DashboardBuilder.test.tsx`

- [ ] Audit native `<select>` elements in the right Edit panel and settings modal.
- [ ] Add visible `border border-border` plus focus border/ring to any select/input currently using only `bg-input-background`.
- [ ] Remove the `Advanced` tab from `SurveySettingsModal`; render the general settings directly.
- [ ] Keep `showQuestionNumber`, `collectEmail`, and `allowEditing` in settings modal because respondent behavior depends on them.
- [ ] Add tests that settings modal does not render “Advanced” and that key selects have bordered classes.
- [ ] Run: `npm test -- src/app/components/DashboardBuilder.test.tsx`

### Task 7: Respondent-Side Theming and Settings Behavior

**Files:**
- Modify: `src/app/components/SurveyRespondentPage.tsx`
- Test: `src/app/components/SurveyRespondentPage.test.tsx`

- [ ] Normalize settings when the public survey loads.
- [ ] Apply `fontFamily`, `fontSize`, `background`, `cardColor`, and `inputBackgroundColor` to respondent layout.
- [ ] Apply accent color to:
  - Progress bar fill.
  - Text input/textarea focus border or ring.
  - Dropdown focus border or ring.
  - Rating selected number button and selected stars.
  - Multiple choice and checkbox selected controls.
  - Grid selected controls.
  - Submit button background.
- [ ] Respect `showQuestionNumber === false` by hiding “Question N” on respondent cards while still showing required asterisk beside the question text.
- [ ] Keep `collectEmail` behavior as implemented but style it with the new input background/accent.
- [ ] Do not implement response editing unless there is a dedicated edit-token flow; leave `allowEditing` stored and surfaced, but avoid implying that submitted responses can currently be edited.
- [ ] Add tests for hidden question numbers, required email, accent styling, and submit button style.
- [ ] Run: `npm test -- src/app/components/SurveyRespondentPage.test.tsx`

### Task 8: Builder Preview Must Not Submit

**Files:**
- Modify: `src/app/components/DashboardBuilder.tsx`
- Test: `src/app/components/DashboardBuilder.test.tsx`

- [ ] Ensure any builder preview submit button is `type="button"` and has no live submit handler.
- [ ] If the builder uses the live `/s/:id` preview link, keep it as external preview only; the in-builder preview must not call the response function.
- [ ] Add a test that clicking preview submit does not call `fetch` and does not show success submission UI.
- [ ] Run: `npm test -- src/app/components/DashboardBuilder.test.tsx`

### Task 9: Share URLs

**Files:**
- Modify: `src/app/components/BuilderShare.tsx`
- Modify: `src/app/components/DashboardHome.tsx`
- Create/modify: `src/lib/surveySettings.ts`
- Test: `src/app/components/BuilderShare.test.tsx`

- [ ] Replace duplicated `${window.location.origin}/s/${surveyId}` logic with `getPublicSurveyUrl`.
- [ ] Use the helper in share link, QR, embed, email, social share links, dashboard copy-link, and builder top-bar copy-link.
- [ ] Document in code comments or README only if needed: production links will use the deployed domain automatically; set `VITE_PUBLIC_APP_URL=https://your-domain.com` if the builder is hosted somewhere different from public respondent links.
- [ ] Test helper use with mocked env/origin.
- [ ] Run: `npm test -- src/app/components/BuilderShare.test.tsx src/lib/surveySettings.test.ts`

### Task 10: Results Export and AI Insights Dropdown

**Files:**
- Modify: `src/app/components/BuilderResults.tsx`
- Test: `src/app/components/BuilderResults.test.tsx`

- [ ] Replace the single Export button with a custom dropdown:
  - CSV
  - XLSX
  - PDF
  - JSON
- [ ] Keep plan gating: all export options check `limits.canExport`.
- [ ] Implement CSV using current `downloadCsv`.
- [ ] Implement JSON by serializing survey title/questions and responses into a Blob.
- [ ] Implement XLSX using existing `xlsx` dependency and the same rows as CSV.
- [ ] Implement a simple PDF export using browser print-friendly HTML via `window.print()` or Blob HTML if no PDF library exists; keep it dependency-free unless product requires richer PDF.
- [ ] Replace the AI Insights native `<select>` with the existing custom `CustomSelect` component in `BuilderResults.tsx`.
- [ ] Remove the purple gradient treatment from the Insights header to match the non-purple product direction.
- [ ] Test dropdown rendering and export option click paths with mocked URL/blob APIs.
- [ ] Run: `npm test -- src/app/components/BuilderResults.test.tsx`

### Task 11: Final Verification

**Files:**
- No new edits unless verification fails.

- [ ] Run type check: `npm run type-check`
- [ ] Run focused tests from the tasks above.
- [ ] Run full tests if focused tests pass: `npm test`
- [ ] Run build: `npm run build`
- [ ] Start dev server: `npm run dev`
- [ ] Verify manually in browser:
  - Dashboard list icon is neutral.
  - Grid menu overlays cards.
  - Grid completion no longer claims `100%` without real completion data.
  - Profile dropdown is narrower/smaller and groups Theme/Settings above Switch Account.
  - Dashboard Logic/Share actions open the correct builder tabs.
  - Revert resets design to defaults.
  - Card/input colors and font size show in canvas and respondent page.
  - Required questions show a red asterisk in left nav.
  - Preview submit does not submit.
  - Settings modal has no Advanced tab.
  - Share link uses production origin or `VITE_PUBLIC_APP_URL`.
  - Results export dropdown works.
  - AI Insights dropdown is custom.

## Execution Order

1. Task 1 first because later tasks depend on normalized settings and URL helpers.
2. Tasks 2 and 3 together because dashboard menu actions depend on builder tab parsing.
3. Task 4 independently for account menu.
4. Tasks 5 through 8 together because builder settings, preview, and respondent styling are tightly coupled.
5. Task 9 after URL helper exists.
6. Task 10 last among feature changes because it is isolated to results.
7. Task 11 before any production push.

## Residual Product Decisions

- Real completion percentage requires response-level completion metadata or partial-response tracking. This plan removes the fake `100%` display rather than inventing data.
- True one-click account switching is not possible with Firebase Auth unless another valid provider/session credential is available. This plan stores known accounts and makes switching explicit through re-authentication.
- `allowEditing` is currently a stored setting only. A real implementation needs edit tokens or authenticated respondent sessions; do not claim this works until that flow exists.
