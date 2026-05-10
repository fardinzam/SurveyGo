# Footer Wordmark Repositioning Design

**Date:** 2026-05-09  
**Scope:** Move the large "SurveyGo" wordmark from its current full-width position to the bottom-right area of the footer

## Problem Statement

The SurveyGo wordmark is currently displayed as a very small, faint text at the bottom of the footer in a full-width section. According to the design, it should be prominently featured in a red square area on the right side of the footer, filling that designated space.

## Design Overview

### Layout Changes

**Current State:**
- Footer has a two-column grid layout with `max-w-[1200px]` container
- Left: brand logo + description + contact form
- Right: Product and Legal link columns
- Below: full-width Wordmark section
- Bottom: copyright section

**New State:**
- Keep the two-column grid layout unchanged
- Right column changes from a simple `grid grid-cols-2` to a flex column layout:
  - Top: Product and Legal link columns (maintains existing grid)
  - Bottom: large Wordmark component filling the red square area
- Remove the full-width Wordmark section after the main content
- Copyright section remains at the footer bottom

### Component Structure

**SiteFooter component modifications:**
1. Change right section from `grid grid-cols-2 gap-8 lg:pt-1` to `flex flex-col gap-8`
2. Wrap Product/Legal links in a `grid grid-cols-2 gap-8` container (preserves existing layout)
3. Add the Wordmark component as a direct child in the right column
4. Remove the full-width Wordmark component that appears after the main grid

**Wordmark component:**
- Keep all existing functionality (ResizeObserver for responsive sizing)
- Keep current styling: `text-white/10`, `font-display`, `font-bold`
- The component will now fill the available space in the bottom-right area

### Styling & Positioning

- Wordmark inherits the flex layout behavior, naturally filling available space
- The large text will expand to fill the red square area on the right
- Semi-transparent white color (`text-white/10`) maintains the subtle design
- No additional padding or margin adjustments needed beyond existing structure

### Visual Result

- The footer maintains its dark background and overall structure
- The Wordmark gains proper prominence in the designated right-side area
- The form and Wordmark are now visually balanced on left and right
- The layout remains responsive and works well on all screen sizes

## Implementation Details

**Files to modify:**
- `src/app/components/SiteFooter.tsx` — restructure the right column layout

**Changes:**
1. Move the Wordmark component from its full-width position to be a child of the right column
2. Restructure the right column to use flex layout with Product/Legal links on top
3. Ensure the Wordmark fills the available space in the bottom-right area

**No breaking changes** — the Wordmark component itself doesn't change, only its positioning in the layout.

## Responsive Behavior

**Desktop (lg breakpoint):**
- Two-column grid: form on left, links + Wordmark on right
- Wordmark fills the bottom-right area (the red square)

**Mobile/Tablet (below lg):**
- Layout stacks to single column due to `grid-cols-1 lg:grid-cols-2`
- Wordmark appears below the link columns in the right column area
- The Wordmark naturally adapts to single-column width

## Testing

- Verify the layout on desktop (red square area is properly filled)
- Test responsive behavior on tablet and mobile (Wordmark should adapt gracefully)
- Confirm the Wordmark text resizes correctly with the ResizeObserver logic
- Ensure all footer links and form functionality remain intact
