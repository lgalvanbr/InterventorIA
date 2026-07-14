---
name: Structural Integrity
colors:
  surface: '#f7f9fb'
  surface-dim: '#d8dadc'
  surface-bright: '#f7f9fb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f6'
  surface-container: '#eceef0'
  surface-container-high: '#e6e8ea'
  surface-container-highest: '#e0e3e5'
  on-surface: '#191c1e'
  on-surface-variant: '#444651'
  inverse-surface: '#2d3133'
  inverse-on-surface: '#eff1f3'
  outline: '#757682'
  outline-variant: '#c5c5d3'
  surface-tint: '#4059aa'
  primary: '#00236f'
  on-primary: '#ffffff'
  primary-container: '#1e3a8a'
  on-primary-container: '#90a8ff'
  inverse-primary: '#b6c4ff'
  secondary: '#515f74'
  on-secondary: '#ffffff'
  secondary-container: '#d5e3fc'
  on-secondary-container: '#57657a'
  tertiary: '#222a3e'
  on-tertiary: '#ffffff'
  tertiary-container: '#384055'
  on-tertiary-container: '#a4acc5'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dce1ff'
  primary-fixed-dim: '#b6c4ff'
  on-primary-fixed: '#00164e'
  on-primary-fixed-variant: '#264191'
  secondary-fixed: '#d5e3fc'
  secondary-fixed-dim: '#b9c7df'
  on-secondary-fixed: '#0d1c2e'
  on-secondary-fixed-variant: '#3a485b'
  tertiary-fixed: '#dae2fd'
  tertiary-fixed-dim: '#bec6e0'
  on-tertiary-fixed: '#131b2e'
  on-tertiary-fixed-variant: '#3f465c'
  background: '#f7f9fb'
  on-background: '#191c1e'
  surface-variant: '#e0e3e5'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.05em
  data-mono:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 4px
  container-max: 1440px
  gutter: 24px
  margin-desktop: 40px
  margin-mobile: 16px
  stack-sm: 8px
  stack-md: 16px
  stack-lg: 32px
---

## Brand & Style

This design system is built for the high-stakes environment of civil infrastructure supervision. The brand personality is authoritative, precise, and unwavering. It aims to evoke a sense of structural stability and "Ingenieril limpio"—a clean engineering aesthetic that prioritizes clarity over decoration.

The design style is **Corporate / Modern** with a lean toward **Minimalism**. It utilizes a systematic grid to mirror the organized nature of engineering projects. The interface focuses on high-density information management, ensuring that supervisors and stakeholders can assess project health at a glance without visual fatigue. Expect heavy use of whitespace to separate complex data modules and a logical, top-down hierarchy.

## Colors

The palette is anchored by "Supervision Blue" (#1E3A8A), a deep, trust-inspiring primary that signals professionalism and institutional strength. This is paired with "Technical Slate" for secondary elements and UI borders, grounding the interface in an industrial context.

The neutral scale is strictly cool-toned to maintain a crisp, clean environment. Status colors are high-chroma and functional:
- **Primary:** Actions, navigation, and brand identity.
- **Secondary/Slate:** Metadata, icons, and structural borders.
- **Status Green:** On-track milestones and approved inspections.
- **Status Amber:** Budget warnings or minor schedule deviations.
- **Status Red:** Critical delays, safety violations, or failed inspections.

## Typography

The typography utilizes **Inter** exclusively for its neutral, systematic character and exceptional legibility at small sizes—critical for data-heavy engineering reports. 

Key typographic principles:
- **Tabular Figures:** All numeric data (GPS coordinates, budget figures, percentages) must use tabular (monospaced) lining figures to ensure vertical alignment in tables.
- **Hierarchy:** Strong weight contrast between labels and values.
- **Labels:** Small, bold, and uppercase labels are used for technical metadata to differentiate from prose content.

## Layout & Spacing

This design system employs a **12-column Fluid Grid** for desktop, transitioning to a **4-column layout** for mobile field inspections. The layout is designed to maximize the horizontal space available for Gantt charts, data tables, and technical drawings.

Spacing follows a strict 4px base unit. Elements are grouped into "Technical Modules" (Cards) with consistent 24px internal padding. High-density views (like data grids) may reduce this to 12px to maximize information density. Safe areas and consistent gutters ensure that even when the screen is full of data, the "Ingenieril limpio" aesthetic remains intact.

## Elevation & Depth

To maintain a professional and clean aesthetic, depth is communicated through **Low-contrast outlines** and **Tonal layers** rather than heavy shadows.

- **Surface Level 0:** The neutral background (#F8FAFC).
- **Surface Level 1 (Cards):** Pure white background with a 1px solid border in Slate-200. No shadow.
- **Surface Level 2 (Modals/Popovers):** Pure white with a very subtle, diffused 10% opacity shadow to suggest floating above the workspace.
- **Separators:** 1px hairline strokes are used to delineate sections within a module, ensuring structural clarity without adding visual bulk.

## Shapes

The shape language is **Soft (0.25rem)**. This slight rounding provides a modern, approachable feel while maintaining the rigid, structural integrity expected in engineering software. 

- **Primary Buttons & Inputs:** 4px (0.25rem) corner radius.
- **Modules & Large Containers:** 8px (0.5rem) corner radius.
- **Status Indicators (Pills):** Fully rounded (pill-shaped) to distinguish them from interactive buttons.

## Components

### Buttons
- **Primary:** Solid Blue (#1E3A8A) with white text. High-contrast, sharp.
- **Secondary:** Outlined Slate-600. For non-destructive actions.
- **Critical:** Solid Red, reserved for permanent deletions or work-stoppage orders.

### Cards & Modules
All content must live within white cards. Every card requires a header section with a title in `label-md` and an optional "Status Pill" in the top right corner.

### Inputs & Tables
- **Text Fields:** 1px border, clear focus state using a 2px blue ring.
- **Data Tables:** Zebra striping is discouraged. Instead, use thin horizontal separators. Row height should be 48px for standard views and 40px for high-density supervision views.
- **Progress Bars:** Use a thick 8px track. For supervision, include a "Marker" to indicate the "Planned" vs "Actual" progress.

### Status Indicators
Small, high-visibility pills. They must include both a background tint and high-contrast text for accessibility. In "Supervision" contexts, these are the most important visual cues in the UI.

### Field Components
Special focus on **Photo Upload slots** with captioning capabilities and **Map View toggles**, which are essential for site-specific infrastructure reporting.