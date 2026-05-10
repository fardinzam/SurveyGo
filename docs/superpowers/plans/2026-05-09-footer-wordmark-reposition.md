# Footer Wordmark Repositioning Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reposition the SurveyGo wordmark from a full-width section to the bottom-right area of the footer, integrated into the right column layout.

**Architecture:** The footer currently has a two-column grid (form on left, links on right) with a separate full-width Wordmark section below. We'll restructure the right column to use flexbox with the link columns on top and the Wordmark filling the bottom space, then remove the full-width Wordmark section.

**Tech Stack:** React, Tailwind CSS, TypeScript

---

### Task 1: Restructure the Right Column Layout

**Files:**
- Modify: `src/app/components/SiteFooter.tsx:100-138`

- [ ] **Step 1: Update the right column container**

Change the right section from a simple grid to a flex column layout. Replace:

```tsx
{/* Right: link columns */}
<div className="grid grid-cols-2 gap-8 lg:pt-1">
  <div>
    {/* Product column */}
  </div>
  <div>
    {/* Legal column */}
  </div>
</div>
```

With:

```tsx
{/* Right: link columns + wordmark */}
<div className="flex flex-col gap-8">
  <div className="grid grid-cols-2 gap-8">
    <div>
      {/* Product column */}
    </div>
    <div>
      {/* Legal column */}
    </div>
  </div>
  <Wordmark />
</div>
```

This changes the right container to `flex flex-col gap-8`, wraps the existing link grid in its own container, and adds the Wordmark component as a child.

- [ ] **Step 2: Verify the right column structure in the file**

Open `src/app/components/SiteFooter.tsx` and confirm that lines 101-137 match the old structure (grid with two columns). The modification above will be the replacement.

- [ ] **Step 3: Commit this structural change**

```bash
git add src/app/components/SiteFooter.tsx
git commit -m "feat: restructure footer right column to flex layout with wordmark"
```

---

### Task 2: Remove the Full-Width Wordmark Section

**Files:**
- Modify: `src/app/components/SiteFooter.tsx:140-141`

- [ ] **Step 1: Remove the full-width Wordmark component**

Delete these lines (currently lines 140-141):

```tsx
{/* Full-width wordmark */}
<Wordmark />
```

The footer structure after the main grid will now go directly from the closing `</div>` of the main grid to the copyright section.

- [ ] **Step 2: Verify the removal**

After deletion, the footer should have this structure:
- Main content grid (with form on left, links + wordmark on right)
- Copyright section (border-t with copyright text)

No full-width Wordmark section in between.

- [ ] **Step 3: Commit this removal**

```bash
git add src/app/components/SiteFooter.tsx
git commit -m "feat: remove full-width wordmark section from footer"
```

---

### Task 3: Test the Layout

**Files:**
- Test: Browser visual inspection of `src/app/components/LandingPage.tsx`

- [ ] **Step 1: Start the development server**

```bash
npm run dev
```

Expected: Server starts on localhost (typically http://localhost:5173 or similar)

- [ ] **Step 2: Navigate to the landing page**

Open your browser and go to `http://localhost:5173` (or the URL shown in terminal)

- [ ] **Step 3: Scroll to the footer**

Scroll to the very bottom of the page to view the footer

- [ ] **Step 4: Verify the layout**

Check the following:
- The SurveyGo wordmark now appears in the bottom-right area (the red square area) instead of full-width below
- The wordmark text is large, bold, and semi-transparent white
- The form remains on the left side
- The Product and Legal links remain on the top-right
- The wordmark fills the available space in the bottom-right area
- The layout is responsive (resize the browser window to test tablet/mobile views)

- [ ] **Step 5: Verify footer functionality**

Test that:
- The contact form still works (try clicking the input fields)
- The footer links are clickable
- No console errors appear in browser dev tools

- [ ] **Step 6: Commit the visual verification**

```bash
git add -A
git commit -m "test: verify footer wordmark repositioning layout"
```

---

## Plan Summary

**Changes Made:**
1. Restructured the right column from a simple 2-column grid to a flex column layout
2. Wrapped the Product/Legal link columns in their own grid container
3. Added the Wordmark component as a child of the right column (bottom position)
4. Removed the full-width Wordmark section that previously appeared below the main footer content

**Result:** The SurveyGo wordmark now fills the red square area on the right side of the footer while maintaining all existing functionality and responsive behavior.
