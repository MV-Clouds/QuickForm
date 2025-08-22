# Submission Table — Image Analysis

Date: 2025-08-19
Source: Screenshot provided by user (Submission list / admin UI)

## Summary

This document describes the visual design, layout, colors, components, and interactive behaviours visible in the provided screenshot of the "Billing Form" submissions table. It is written to guide implementation or styling changes.

## Overall layout & structure

- Two-column app frame:
  - Left vertical navigation sidebar (narrow) with app logo at top and menu items stacked vertically.
  - Main content area to the right, full-height, containing header, tabs, content card and footer/pagination.
- Main content contains:
  - Top header bar with back icon + page title and right-aligned action buttons (Preview, Save, Publish).
  - Tab navigation directly under the header ("Table" and "Analytics").
  - A white rounded card containing controls (search, filter, field selection, results count, CSV icon, date range) and the submissions table.
  - Table is wide and horizontally scrollable when many fields are visible.
  - Floating selection action bar centered near bottom when rows are selected.
  - Pagination controls centered in the card footer; "Rows per page" control on the left.

## Visual hierarchy & spacing

- Large header occupies a narrow strip across top of the main content (approx 56–72px height). Title and CTA buttons are at the same baseline.
- The control card uses generous whitespace: padding approx 16–24px inside the card and rounded corners.
- Table header uses a light blue background row to separate it from body rows.
- Table rows have comfortable vertical spacing (approx 48–64px per row) to be readable and clickable.
- Icons and small buttons use about 32px square clickable areas.
- The floating selection bar is compact (approx 40px height) and centered horizontally over the card area.

## Typography

- Typeface: neutral geometric sans (looks like Inter / system UI). Use a standard UI scale:
  - Page title (header): ~20–24px, semi-bold
  - Tab labels and control labels: ~14–16px, medium
  - Table body rows: ~14px, regular
  - Helper text / small labels (pagination, results count): ~12px
- Text alignment: left for table content; center for pagination numbers.

## Color palette (observed / approximate)

- Header gradient (teal/cyan): approximate
  - Left: #2FB7D9 (cyan) — approximate
  - Right: #58C1E0 / #3CA9C9 (teal/cyan)
  - Note: the header gradient in screenshot is a cyan → teal gradient.
- Action blue (primary buttons / export / selection): #1F6FB0 → #0B2960 (deep blue)
- Card background: white (#FFFFFF)
- Page background: very light gray (#F5F7FA or #F3F5F7)
- Table header background: very pale blue (#EEF7FB or #EAF6FB)
- Table header border: soft blue-gray (#DCEFF8 or #D8EAF3)
- Row divider lines: light gray (#E6E9EE)
- Text colors:
  - Primary text (dark): #0F1724 / #1F2A37 (near-black navy)
  - Secondary text (muted): #6B7280 / #8B93A3 (gray-blue muted)
- Selection floating bar gradient (exact inline style seen in code):
  - linear-gradient(270deg, rgba(11, 41, 94, 0.85) 4.81%, rgba(29, 109, 158, 0.85) 100%)
  - This corresponds to deep navy -> teal-blue with partial opacity.

Notes: exact hex values are approximations from the screenshot; use brand palette or extract with color-pick tool if precise values required.

## Icons & imagery

- Icons used: back arrow (header), preview/eye, search magnifier, filter funnel, grid (field selector), calendar, CSV/file, export, delete/trash, settings avatar in sidebar.
- Icons are line-style with medium stroke weight — consistent visual style (likely lucide, feather, or custom svgs).
- App logo on the left sidebar: colorful mark and text "QUICK FORM".
- Row preview icon (eye) to open a submission preview.

## Components & behaviors

- Sidebar: vertical list of navigation items with icons and labels; active item highlighted with blue background pill.
- Header CTA group:
  - Preview button: subtle bordered pill with icon + label
  - Save button: bordered pill, neutral
  - Publish button: filled pill with solid deep-blue gradient, distinct (primary CTA)
- Tab control: horizontal tabs above the card; active tab underlined or with highlighted background.
- Global control card (above table): left area contains search, filter, and field selection; right area contains results count, CSV icon, date range control, plus Export All button.
- Search input: left-aligned magnifier icon, placeholder text.
- Filters button opens an overlay (modal or dropdown) to choose advanced filters.
- Field Selection opens a multi-select menu with a preview grid icon for each item.
- Table behaviors:
  - Left-most column: checkbox for selecting rows (with select-all in header).
  - Second column: preview action (eye icon) — opens modal with full submission details.
  - Fixed sticky columns for checkbox/preview/date when horizontally scrolling.
  - Column header truncates overflow and shows full label on hover via title attribute.
  - Column resize handles are present (thin draggable handle on header right side).
  - Empty state view: friendly illustration and message when there are no submissions.
- Row selection:
  - Multi-select via checkboxes; when rows selected, a fixed floating action bar appears with actions (clear selection, Export, Delete).
- Pagination: typical numbered pages with ellipsis for many pages; rows-per-page selector on left.

## Accessibility notes

- Contrast: dark text on white has good contrast; ensure buttons and muted text meet WCAG contrast for small text.
- Clickable targets appear large enough but verify 44px minimum touch target on mobile.
- Table headers should use <th> (already in markup) and aria-sort if sortable; ensure focusable keyboard navigation for checkboxes, preview buttons, pagination.

## Implementation hints (from existing code)

- The project already uses RSuite components (DateRangePicker, CheckPicker, SelectPicker) and lucide-react icons.
- Z-index fixes for RSuite dropdowns are necessary (seen in component code). Keep those global overrides.
- The floating selection bar gradient is present inline in code; reuse as a CSS variable:
  - --selection-gradient: linear-gradient(270deg, rgba(11,41,94,0.85) 4.81%, rgba(29,109,158,0.85) 100%);
- Table uses sticky columns for left controls; CSS must enforce z-index and background to avoid overlap when scrolling.
- Column resize handles: implement via mouse events on the header resize handle (already present in code sample).

## Extracted assets & selectors observed

- Filenames (in repo): quickform-logo.png, quickform-only-logo.png, quickformtext.png
- Common selectors/classes to style/use:
  - .submissions-table
  - .rs-picker-menu and other RSuite elements (z-index fixes)
  - .rs-modal-wrapper / .rs-modal-backdrop

## Suggested CSS variables (starter)

:root {
--page-bg: #f3f5f7;
--card-bg: #ffffff;
--header-grad-left: #2FB7D9; /_ approximate _/
--header-grad-right: #3CA9C9; /_ approximate _/
--primary: #1F6FB0; /_ deep blue for actions _/
--primary-contrast: #ffffff;
--muted: #6B7280;
--table-header-bg: #eef7fb;
--table-border: #e6e9ee;
--selection-gradient: linear-gradient(270deg, rgba(11,41,94,0.85) 4.81%, rgba(29,109,158,0.85) 100%);
}

## Notes / next steps

- If you want an exact CSS palette, provide the raw image or allow me to run a color extractor against the file for precise hex codes.
- I can convert these observations into a component style guide, CSS variables, or a Tailwind theme mapping if you'd like.

---

Requirements checklist (from your request):

- [x] Fully analyze the pasted image and describe layout, colors, components, spacing, icons.
- [x] Produce a text/markdown file with the analysis placed in the repository under `docs/SubmissionTable-Image-Analysis.md`.

What's next: tell me when you want me to start implementing styles or changes (I can create CSS/Tailwind variables, update components, or produce a style guide).
