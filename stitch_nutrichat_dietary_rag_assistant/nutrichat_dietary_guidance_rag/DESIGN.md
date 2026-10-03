---
name: NutriChat - Dietary Guidance RAG
colors:
  surface: '#10131a'
  surface-dim: '#10131a'
  surface-bright: '#363941'
  surface-container-lowest: '#0b0e15'
  surface-container-low: '#191b23'
  surface-container: '#1d1f27'
  surface-container-high: '#272a32'
  surface-container-highest: '#32353d'
  on-surface: '#e1e2ec'
  on-surface-variant: '#bbcabf'
  inverse-surface: '#e1e2ec'
  inverse-on-surface: '#2d3038'
  outline: '#86948a'
  outline-variant: '#3c4a42'
  surface-tint: '#4edea3'
  primary: '#4edea3'
  on-primary: '#003824'
  primary-container: '#10b981'
  on-primary-container: '#00422b'
  inverse-primary: '#006c49'
  secondary: '#c0c1ff'
  on-secondary: '#1000a9'
  secondary-container: '#3131c0'
  on-secondary-container: '#b0b2ff'
  tertiary: '#ffb95f'
  on-tertiary: '#472a00'
  tertiary-container: '#e29100'
  on-tertiary-container: '#523200'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#6ffbbe'
  primary-fixed-dim: '#4edea3'
  on-primary-fixed: '#002113'
  on-primary-fixed-variant: '#005236'
  secondary-fixed: '#e1e0ff'
  secondary-fixed-dim: '#c0c1ff'
  on-secondary-fixed: '#07006c'
  on-secondary-fixed-variant: '#2f2ebe'
  tertiary-fixed: '#ffddb8'
  tertiary-fixed-dim: '#ffb95f'
  on-tertiary-fixed: '#2a1700'
  on-tertiary-fixed-variant: '#653e00'
  background: '#10131a'
  on-background: '#e1e2ec'
  surface-variant: '#32353d'
typography:
  headline-xl:
    fontFamily: Inter
    fontSize: 2.5rem
    fontWeight: '700'
    lineHeight: 3rem
    letterSpacing: -0.025em
  headline-xl-mobile:
    fontFamily: Inter
    fontSize: 1.875rem
    fontWeight: '700'
    lineHeight: 2.25rem
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 1.75rem
    fontWeight: '600'
    lineHeight: 2.25rem
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 1.5rem
    fontWeight: '600'
    lineHeight: 2rem
    letterSpacing: -0.015em
  headline-sm:
    fontFamily: Inter
    fontSize: 1.25rem
    fontWeight: '600'
    lineHeight: 1.75rem
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 1.125rem
    fontWeight: '400'
    lineHeight: 1.75rem
    letterSpacing: -0.01em
  body-md:
    fontFamily: Inter
    fontSize: 0.9375rem
    fontWeight: '400'
    lineHeight: 1.5rem
    letterSpacing: 0em
  body-sm:
    fontFamily: Inter
    fontSize: 0.8125rem
    fontWeight: '400'
    lineHeight: 1.25rem
    letterSpacing: 0.005em
  label-md:
    fontFamily: Inter
    fontSize: 0.875rem
    fontWeight: '500'
    lineHeight: 1.25rem
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Inter
    fontSize: 0.75rem
    fontWeight: '600'
    lineHeight: 1rem
    letterSpacing: 0.02em
  code-inline:
    fontFamily: Inter
    fontSize: 0.8125rem
    fontWeight: '500'
    lineHeight: 1.25rem
    letterSpacing: 0em
rounded:
  sm: 0.5rem
  DEFAULT: 1rem
  md: 1.5rem
  lg: 2rem
  xl: 3rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-desktop: 1.5rem
  margin: 1rem
  margin-desktop: 2rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
---

## Brand & Style
The design system positions nutritional intelligence at the intersection of clinical authority and empathetic conversational AI. The experience is tailored for health-conscious users, clinicians, and individuals managing specialized dietary requirements who demand trustworthy, citation-backed answers without cognitive fatigue. 

The aesthetic is clean, modern, and dark-mode native, drawing inspiration from premier conversational interfaces while introducing precision dietary telemetry. The style integrates subtle glassmorphism with controlled micro-borders (1px with 8–12% opacity), deep layered midnight surfaces, and soft emerald luminescence. Interaction states rely on soft glowing focus rings and seamless transitions to communicate ongoing RAG computation, semantic retrieval, and contextual confidence.

## Colors
The color architecture reinforces hierarchy and semantic clarity through deep contrast tiers:

- **Background & Canvas:** `#0a0d14` forms the foundational canvas, reducing ambient eye fatigue during extended conversational sessions.
- **Surface Panels:** `#111827` anchors persistent structural zones such as sidebars, headers, reference drawers, and floating panels.
- **Elevated Surfaces:** `#1a2236` defines interactive elements including bot message envelopes, input textareas, and modal views.
- **Primary Accent (`#10b981` Emerald):** Represents AI-generated telemetry, verified factual grounding, primary calls to action, and subtle ring glows.
- **Secondary Accent (`#6366f1` to `#4f46e5` Indigo Gradient):** Distinguishes user prompts, user-selected filters, and personal input attribution.
- **Typography & States:** Text scales across `#f1f5f9` (Primary Body/Headers), `#94a3b8` (Secondary metadata, timestamps, and citations), and `#475569` (Muted hints and inactive glyphs).
- **RAG Refusal & Fallback System:** Strict semantic badges use `#ef4444` (Out of Scope / Medical contraindication) and `#f59e0b` (Not in Corpus / Grounding retrieval failure), rendered with 15% opacity fills and matching 1px translucent borders.

## Typography
The system employs `Inter` exclusively across all textual levels to establish a consistent, legible, and technical UI surface. Variable font tracking tightens slightly on larger headings to command presence without occupying unnecessary horizontal conversational space.

Body prose in conversation streams is optimized for scannability with comfortable line heights (`body-md` at 1.5rem on a 0.9375rem base). Citations, macro breakdowns, and reference anchors utilize `label-sm` with tabular numerical alignment to ensure dense dietary metrics remain clear.

## Layout & Spacing
The layout relies on a docked application frame with a centered, fixed-width conversational feed:

- **Conversational Track:** The central stream enforces a `max-w-3xl` (48rem / 768px) reading container to prevent over-extended text scan paths while maintaining ample margin breathing space.
- **Sidebar & Panels:** The history and dietary profile drawer occupies a fixed `260px` to `320px` rail on desktop, collapsing into an overlay slide-out on viewports below `1024px`.
- **Rhythm Scale:** Increments align strictly to an 8pt base grid (`space-xs` 4px, `space-sm` 8px, `space-md` 16px, `space-lg` 24px, `space-xl` 32px).
- **Responsive Adaptations:** Desktop canvases preserve a `margin-desktop` of 32px with floating prompt docks; mobile layouts adapt to edge-to-edge frames with `margin` of 16px and pinned bottom input docks.

## Elevation & Depth
Depth is created through backdrop filtration, structural tonal contrast, and luminous ambient diffusion:

- **Level 0 (Canvas):** `#0a0d14` serves as the base void without shadows or blurs.
- **Level 1 (Sidebars & Navbars):** Surface `#111827` blended with `backdrop-filter: blur(16px)` and a subtle bottom or lateral micro-border: `rgba(241, 245, 249, 0.06)`.
- **Level 2 (Chat Bubbles & Cards):** Elevated `#1a2236` featuring a gentle directional inner top border (`rgba(255, 255, 255, 0.05)`) and diffused drop shadows (`0 8px 24px -4px rgba(0, 0, 0, 0.45)`).
- **Level 3 (Modals & Prompt Bar):** Elevated above the stream with high blur (`backdrop-filter: blur(24px)`), background color `rgba(26, 34, 54, 0.85)`, and an ambient soft halo when active (`box-shadow: 0 0 20px -2px rgba(16, 185, 129, 0.15)`).

## Shapes
The design adopts a pill-shaped curvature system (`roundedness: 3`) to echo friendly, fluid, and natural conversational cadence:

- **Pill Primitives:** Action buttons, prompt suggestion pills, input text wrappers, citation badges, and filter chips leverage complete pill radii (`rounded-full` / 9999px).
- **Content Blocks:** Chat envelopes, macro analytic cards, and structured RAG quote modules inherit softened container curves (`rounded-2xl` / 1rem to 1.5rem).
- **Micro Accents:** Checkbox indicators, avatar frames, and thumbnail previews utilize refined balanced curves (`rounded-lg` / 0.5rem) to preserve structural integrity within pill-heavy layouts.

## Components

### Buttons & Quick Actions
- **Primary CTA:** Full pill button with `#10b981` background, `#0a0d14` high-contrast typography, and an interactive emerald glow on hover (`box-shadow: 0 0 16px rgba(16, 185, 129, 0.4)`).
- **Secondary / Ghost:** Translucent fill (`rgba(26, 34, 54, 0.6)`), 1px border (`rgba(241, 245, 249, 0.1)`), and `#f1f5f9` text with soft scaling on click.
- **Prompt Suggestions:** Pill chips featuring `#111827` background, `rgba(255, 255, 255, 0.05)` border, and a subtle emerald glow transition when focused.

### Chat Envelopes
- **AI Response Node:** Borderless `#1a2236` container with an anchored 24px emerald spark indicator or icon badge. Citations are embedded as inline pill references that expand a contextual drawer on click.
- **User Prompt Node:** Right-aligned bubble styled with an indigo linear gradient (`#6366f1` to `#4f46e5`), `#ffffff` crisp typography, and soft atmospheric indigo shadows.

### RAG Telemetry & Status Badges
- **Out of Scope Badge:** Pill container rendered with `rgba(239, 68, 68, 0.15)` background, `#ef4444` border (1px), and `#f87171` label with an alert shield glyph.
- **Not in Corpus Badge:** Pill container rendered with `rgba(245, 158, 11, 0.15)` background, `#f59e0b` border (1px), and `#fbbf24` label indicating low retrieval confidence.
- **Retrieval Source Chip:** Compact pill with `#111827` fill, 1px border `rgba(16, 185, 129, 0.3)`, displaying corpus chunk index and nutritional authority domain.

### Input Bar & Dock
- **Chat Input Wrapper:** Elevated pill structure floating above the stream with `rgba(26, 34, 54, 0.85)` surface fill, 24px blur, and dynamic focus state featuring a 1.5px continuous `#10b981` outer glow ring. Action buttons (mic, camera, submit) are nested inside the pill contour.

### Dietary Telemetry Cards
- **Macro Nutrient Cards:** Nested within `#111827` panels with `#1a2236` internal fills, 1px micro-borders, and emerald circular progress rings showing daily target calibrations.