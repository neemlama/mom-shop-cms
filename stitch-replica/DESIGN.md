---
name: LiveStream Merchant Hub
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#464555'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#777587'
  outline-variant: '#c7c4d8'
  surface-tint: '#4d44e3'
  primary: '#3525cd'
  on-primary: '#ffffff'
  primary-container: '#4f46e5'
  on-primary-container: '#dad7ff'
  inverse-primary: '#c3c0ff'
  secondary: '#565e74'
  on-secondary: '#ffffff'
  secondary-container: '#dae2fd'
  on-secondary-container: '#5c647a'
  tertiary: '#6b00b8'
  on-tertiary: '#ffffff'
  tertiary-container: '#8822df'
  on-tertiary-container: '#ebd2ff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e2dfff'
  primary-fixed-dim: '#c3c0ff'
  on-primary-fixed: '#0f0069'
  on-primary-fixed-variant: '#3323cc'
  secondary-fixed: '#dae2fd'
  secondary-fixed-dim: '#bec6e0'
  on-secondary-fixed: '#131b2e'
  on-secondary-fixed-variant: '#3f465c'
  tertiary-fixed: '#f0dbff'
  tertiary-fixed-dim: '#ddb8ff'
  on-tertiary-fixed: '#2c0051'
  on-tertiary-fixed-variant: '#6800b4'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  headline-xl:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '500'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  label-lg:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '700'
    lineHeight: 14px
  numeric-callout:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 34px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-sm: 0.75rem
  margin: 1rem
  margin-tablet: 1.5rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1rem
  space-xl: 1.5rem
---

## Brand & Style

This design system is engineered for fast-paced live commerce operations. It serves independent merchants and small family teams who handle real-time inventory tagging, rapid order logging, and phone-based customer confirmations during and immediately after live broadcasts. 

The aesthetic is Modern Utility: clean, structured, and legible under high-pressure conditions. It prioritizes operational efficiency over decorative ornament. Visual hierarchy is achieved through clear contrasts, large tactile targets, and distinct status color-coding. Interfaces remain calm and composed using stable indigo and slate anchors, while high-contrast status signifiers keep order states instantly recognizable.

## Colors

The palette balances utility, structural authority, and rapid situational awareness.

- **Primary (`#4F46E5` - Electric Indigo):** Anchors primary calls to action, active navigation tabs, order confirmation highlights, and critical batch logging triggers.
- **Secondary (`#0F172A` - Deep Slate):** Applied to primary typographic hierarchy, high-contrast headings, and structural bar surfaces for maximum contrast and legibility.
- **Tertiary (`#9333EA` - Stream Violet):** Dedicated to live broadcast indicators, active stream session tags, flash sale timers, and VIP viewer callouts.
- **Neutral Palette:** Crisp slate scales provide clear visual separation without eye fatigue. Canvas backgrounds sit on `#F8FAFC`, card containers and interactive form fields rest on `#FFFFFF`, and borders and subtle dividers leverage `#E2E8F0` and `#CBD5E1`. Muted metadata uses `#64748B`.
- **Functional Semantics:**
  - **Success (`#059669` / `#10B981` Emerald):** Paid invoices, confirmed deliveries, verified addresses, and collected COD funds.
  - **Warning (`#D97706` / `#F59E0B` Amber):** Pending confirmation calls, unverified phone numbers, held items, and incoming chat requests.
  - **Danger (`#E11D48` / `#F43F5E` Rose Red):** Returned parcels, failed deliveries, high-risk buyer warnings, cancellations, and out-of-stock items.

## Typography

The type scale combines the accessible geometry of Plus Jakarta Sans for structural headings with the neutral clarity of Inter for dense operational content.

All numerals—such as live unit counts, customer phone numbers, currency totals, and tracking codes—should use tabular lining figures (`font-variant-numeric: tabular-nums`) to prevent jitter and misread entries during fast-paced tallying. Labels and badges use medium and semi-bold weights to remain distinct under low-light or angled phone stand setups.

## Layout & Spacing

The layout is built mobile-first, targeting single-handed phone usage and countertop tablet stands beside live broadcast rigs.

- **Grid Architecture:** A responsive 4-column layout on mobile devices transitioning to an 8-column layout on tablets. Screens maintain a constant safe bottom inset of 56px to 72px to keep primary action buttons clear of operating system navigation controls.
- **Rhythm & Safe Areas:** Spacing values adhere to an 8px base rhythm (`0.5rem`, `0.75rem`, `1rem`, `1.5rem`). Touch targets for critical order logging buttons, call customer triggers, and status toggles never drop below a 48px square target area.
- **Form Factor Adaptations:**
  - *Mobile (Portrait):* Single column stack. Order logging drawers slide up from the bottom with one-tap entry rows.
  - *Tablet / Countertop Mode (Landscape):* Split-view layout. The left 40% panel displays the incoming live comment/claim stream, while the right 60% contains the customer order registry, item selector, and dispatch verification list.

## Elevation & Depth

Visual hierarchy uses clean tonal planes backed by low-opacity, high-spread shadows rather than heavy structural borders.

- **Level 0 (Base Surface):** Page backgrounds set to `#F8FAFC`. All sub-panels and non-interactive backgrounds rest here.
- **Level 1 (Card & Row Surface):** Default card panels, customer list items, and form groups sit on `#FFFFFF` with a 1px border of `#E2E8F0` and an ambient drop shadow: `box-shadow: 0 1px 3px 0 rgba(15, 23, 42, 0.05)`.
- **Level 2 (Interactive Floating Controls):** Bottom persistent toolbars, quick-log input sheets, and one-tap call triggers utilize `box-shadow: 0 4px 12px -1px rgba(15, 23, 42, 0.08), 0 2px 6px -1px rgba(15, 23, 42, 0.04)`.
- **Level 3 (Modals & Confirmation Sheets):** Urgent customer duplicate notifications, quick-calling cards, and item assignment dialogs use `box-shadow: 0 12px 28px -4px rgba(15, 23, 42, 0.16)`.

## Shapes

The interface uses standard rounded styling (Border Radius: 8px default, 16px large, 24px extra-large) to create a touch-friendly aesthetic.

- **Base Components (Inputs, Small Badges, Action Bars):** `0.5rem` (8px). Provides clean corner definition that maintains maximum inner content area for phone numbers and item SKUs.
- **Containers & Cards:** `rounded-lg` (`1rem` / 16px). Softens the separation between order groups, stream metrics, and product variation tiles.
- **Overlays, Bottom Sheets & Modals:** `rounded-xl` (`1.5rem` / 24px on top corners). Establishes a tactile drawer feeling when pulled up on mobile viewports.
- **Counter & Status Pills:** Fully rounded pill shapes (`9999px`) are reserved exclusively for live session markers, claim order numbers, and compact status tags.

## Components

### Buttons
- **Primary Action (Quick Save, Confirm Claim):** Deep indigo (`#4F46E5`) fill with solid white text. Height: minimum 48px on mobile. Rounded at 8px. Hover/active state deepens to `#4338CA`.
- **Direct Phone Dial Button:** Emerald green (`#059669`) fill with white text and an explicit phone icon. Prominently placed next to buyer handles for rapid post-stream address confirmation.
- **Secondary / Cancel:** Neutral surface (`#F1F5F9`) with slate text (`#0F172A`). Active feedback features a subtle border highlight (`#CBD5E1`).
- **High-Risk Flag Button:** Soft rose surface (`#FFE4E6`) with bold red text (`#E11D48`) for instant tagging of known parcel rejectors or ghost buyers.

### Badges & Chips
- **COD / Paid Badges:** Bold uppercase styling (`11px`, weight 700). Emerald background tint (`#D1FAE5`) with emerald text (`#065F46`).
- **Pending Confirmation Call:** Amber background tint (`#FEF3C7`) with dark amber text (`#92400E`).
- **Live Highlight Chip:** Violet background tint (`#F3E8FF`) with purple text (`#6B21A8`). Includes a pulsating 6px dot indicator.
- **Returned / Bogus Order Chip:** Rose background tint (`#FFE4E6`) with dark rose text (`#9F1239`).

### Lists & Order Logging Rows
- **Customer Claim Row:** Two-tier layout. Upper line displays customer handle, item size/color code, and claim timestamp. Lower line features direct phone number tap link, payment status badge, and total price.
- **Spacing:** Minimum padding of `12px` vertical by `16px` horizontal per list item to prevent accidental mis-taps during active streams.

### Form Inputs
- **Live Quick-Search / Tag Input:** Single-line, high-contrast text fields with `#FFFFFF` background and `#CBD5E1` border. Active focus brings a crisp 2px border in `#4F46E5`. Font size locked to 16px minimum to prevent automated browser zoom on mobile devices.
- **Phone Number Field:** Tabular numeric font styling with dedicated international/local country code picker and large paste trigger.

### Checkboxes & Segmented Controls
- **Stock Counter Checkbox:** Oversized 24px check controls with clear high-contrast states (`#4F46E5` when selected) for quick item packing verification.
- **Payment Filter Segmented Control:** Full-width pill-backed toggle tabs (`All`, `Unpaid`, `COD`, `Shipped`) on a light slate track (`#F1F5F9`).

### Live Feed Action Bar
- A persistent lower bottom panel featuring quick numerical tallies: Total Live Revenue, Unconfirmed Baskets, and a high-prominence "+ Log Item Claim" button that can be tapped repeatedly without navigating away from the stream monitor.