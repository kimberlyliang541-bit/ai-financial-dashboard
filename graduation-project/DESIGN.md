---
name: SentimentAI Financial Dashboard
description: AI-powered financial news sentiment analysis tool for stock market intelligence
colors:
  accent: "#D97706"
  accent-deep: "#B45309"
  accent-soft: "#FEF3C7"
  bg: "#F4F2EF"
  surface: "#FFFDF9"
  border: "#EDEBE8"
  text: "#1C1209"
  text-mid: "#57534E"
  text-dim: "#A8A29E"
  positive: "#22C55E"
  negative: "#FB7185"
  chart-ma5: "#F59E8B"
  chart-ma20: "#FBBF24"
typography:
  display:
    fontFamily: "'Inter', 'SF Pro Display', -apple-system, sans-serif"
    fontSize: "48px"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "-0.04em"
  headline:
    fontFamily: "'Inter', 'SF Pro Display', -apple-system, sans-serif"
    fontSize: "28px"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "-0.03em"
  title:
    fontFamily: "'Inter', 'SF Pro Display', -apple-system, sans-serif"
    fontSize: "18px"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  body:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontSize: "11px"
    fontWeight: 600
    letterSpacing: "0.08em"
rounded:
  pill: "99px"
  card: "16px"
  button: "8px"
  small: "7px"
  badge: "4px"
spacing:
  xs: "6px"
  sm: "10px"
  md: "16px"
  lg: "22px"
  xl: "28px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.text}"
    rounded: "{rounded.button}"
    padding: "7px 18px"
  button-primary-hover:
    backgroundColor: "{colors.accent-deep}"
    textColor: "#ffffff"
    rounded: "{rounded.button}"
    padding: "7px 18px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.text-mid}"
    rounded: "{rounded.button}"
    padding: "7px 16px"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.card}"
    padding: "16px 20px"
  input-default:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.button}"
    padding: "7px 12px"
  input-focus:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.button}"
    padding: "7px 12px"
---

# Design System: SentimentAI Financial Dashboard

## 1. Overview

**Creative North Star: "The Amber Analyst"**

Amber is not an accent color. It is a temperature. SentimentAI's design language was built around the conviction that financial data need not be cold, clinical, or forbidding. The interface is warm enough to invite attention and precise enough to earn trust. Every decision begins from that tension: warmth that does not compromise authority.

The system runs on a restrained palette of tinted warm neutrals anchored by a single amber point (oklch(63% 0.17 55), #D97706). Frosted glass surfaces create a sense of layered depth without visual drama. Interaction feedback is deliberately quiet: hover states lift, not shout; state transitions complete in under 200ms; nothing competes with the chart data. The type scale prioritizes reading comfort at 11-14px, with negative letter-spacing at headline sizes to signal precision. Sentiment semantics are the one place color expands: green for positive, rose for negative, amber for neutral.

This system explicitly rejects three failure modes documented in its strategic brief. The crypto-dark aesthetic (neon green or purple on black, DeFi-style) is prohibited: it signals cheap, speculative, and misaligned with academic credibility. The generic SaaS dashboard template (identical card grids, gradient text, oversized border-radius, Tailwind badge clusters) is prohibited: it signals assembled, not designed. The academic-report style (PowerPoint-style chart screenshots, Word-exported tables) is prohibited: it is precisely what this interface was built to disprove.

**Key Characteristics:**
- Warm cream-and-amber foundation that reads as intentional, not incidental
- Single amber accent used at 10% surface coverage or less; its rarity is structural
- Frosted glass elevation used purposefully, not as a universal surface default
- Type hierarchy through weight and scale contrast exclusively; no decorative type treatments
- Sentiment color semantics are the only place color expands beyond the amber/neutral axis
- Inter at negative tracking for headlines; system-ui fallback stack for body

## 2. Colors: The Amber Axis

The palette is built on a single chromatic commitment. Everything else is tinted neutral.

### Primary
- **Burnished Amber** (#D97706, oklch(63% 0.17 55)): The axis of the system. Used on interactive surfaces (primary buttons, active nav items, focus rings, links, data fetch CTA). Appears on less than 10% of any screen. Its visibility comes from rarity, not volume.
- **Deep Amber** (#B45309, oklch(53% 0.16 55)): Hover and pressed state for Burnished Amber. Also used as a link color in news tables where amber-600 reads too light. Never used as a standalone accent, only as a state shift.

### Secondary
- **Sentiment Green** (#22C55E, oklch(72% 0.20 145)): Positive sentiment indicators. Pills, metric card values, face icons. Semantic only; never used decoratively.
- **Sentiment Rose** (#FB7185, oklch(70% 0.20 10)): Negative sentiment. Same semantic rule: indicators and labels only.

### Tertiary
- **Chart Warm Orange** (#F59E8B, oklch(76% 0.12 40)): MA5 line in the stock chart. A warm secondary data color that harmonizes with the amber axis without competing.
- **Chart Gold** (#FBBF24, oklch(80% 0.17 75)): MA20 line in the stock chart. One step yellower than the accent; reads as a related but distinct signal.

### Neutral
- **Warm Ash** (#F4F2EF, oklch(96% 0.004 60)): Page background. Slightly warmer than pure white; prevents the "blank canvas" feeling of #FFF while staying out of the way of content.
- **Frosted Parchment** (#FFFDF9, oklch(99% 0.003 60)): Card and surface background. Used at 88% opacity with backdrop-filter: blur(12px) to create the frosted elevation effect. Solid form (#FFFDF9) used for the toolbar and table headers.
- **Ghost Border** (#EDEBE8, oklch(92% 0.005 60)): All border and divider strokes. Warm-tinted, never cool grey. Opacity variants (rgba(0,0,0,0.07) for rest, rgba(0,0,0,0.13) for emphasis) are acceptable where the base color's computed value would differ with non-white parents.
- **Warm Charcoal** (#1C1209, oklch(14% 0.02 55)): Primary text. Not pure black; tinted toward the amber hue at minimal chroma.
- **Warm Stone** (#57534E, oklch(42% 0.01 55)): Secondary text. Labels, supporting descriptions, table headers.
- **Warm Smoke** (#A8A29E, oklch(70% 0.008 55)): Tertiary text. Timestamps, counts, empty state body copy. Never used for anything that carries meaning.

### Named Rules

**The One Accent Rule.** Burnished Amber (#D97706) is the only chromatic accent. It appears on interactive controls, active states, and data-fetch prominence. Sentiment colors (green, rose) are semantic exceptions, not decorative choices. Every other chromatic element is a chart data color serving a specific data role. Do not add a second accent; use weight and size to create hierarchy in neutral zones instead.

**The Warm Neutrals Rule.** No surface, border, or text color in this system is a pure grey. Every neutral leans warm (hue 55-60, chroma 0.003-0.01 in OKLCH). This is the thermal baseline of the system; a pure cool grey anywhere reads as a mistake.

## 3. Typography

**Body Font:** Inter (primary) with SF Pro Display, -apple-system, Roboto, Helvetica Neue as fallbacks.

**Character:** A single-family system; no display serif, no mono accents. Inter at negative letter-spacing delivers the precision signals that a serif would otherwise carry, while staying legible at the 11-13px density this dashboard requires. The tight numeric tracking (tabular-nums, -0.03em to -0.04em) is what makes large metric numbers feel architectural rather than decorative.

### Hierarchy

- **Display** (weight 800, 48px, lh 1, tracking -0.04em): Pearson correlation coefficient hero number. One instance per screen, maximum. The number IS the message.
- **Headline** (weight 700, 28-30px, lh 1, tracking -0.03em): Metric card values. Summary numbers that need to read from across a presentation room. Tabular-nums enforced.
- **Title** (weight 700, 18-22px, lh 1.2, tracking -0.02em): Page title in topbar (18px), app header h1 (22px). One per screen context.
- **Section** (weight 600, 16px, lh 1.3, tracking normal): Chart card titles and section separators. Subdued; does not compete with chart content.
- **Body** (weight 400-500, 13-14px, lh 1.6): Table cell content, descriptions, alert messages. The workhorse size; 65ch line length cap in prose contexts.
- **Label** (weight 600, 10-11px, uppercase, tracking 0.06-0.1em): Column headers, metric card labels, badge text, nav sublines. All-caps at this size is a structural signal, not decoration. Never all-caps above 12px.

### Named Rules

**The Negative Tracking Rule.** Headline and display sizes use negative letter-spacing (-0.02em to -0.04em). This is what separates "designed" from "default" at large sizes. Body and label sizes use 0 or positive tracking. Never apply negative tracking below 16px.

**The Tabular Numerals Rule.** All financial numbers, metric values, and percentage figures use `font-variant-numeric: tabular-nums`. Proportional numbers in a column read as misaligned. No exceptions for metric displays.

## 4. Elevation

The system uses a two-tier frosted glass model. Surfaces are flat at rest; depth appears only as a response to layering context (sidebar below topbar, cards above page background) or interactive state (hover lift). Shadows are diffuse and warm-tinted, never sharp or architectural.

**Scene sentence:** A student presenting to three professors in a bright seminar room, screen projected at 2x size, content viewed from 3 meters. Surfaces must read without squinting. No surface should need to "prove" its depth.

### Shadow Vocabulary

- **Surface Ambient** (`box-shadow: 0 10px 30px rgba(0,0,0,0.08)`): Default state for cards, chart containers, metric cards. Diffuse and barely present; creates separation from the page background without drama.
- **Hover Lift** (`box-shadow: 0 20px 40px rgba(0,0,0,0.12)`, `transform: translateY(-4px)`): Applied on `:hover` for cards and metric cards. A quiet upward movement. Not a bounce; ease-out only.
- **Topbar/Sidebar Shadow** (`box-shadow: 0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.05)`): Structural shadows for persistent chrome. Lighter than card shadows because chrome recedes.
- **Accent Glow** (`box-shadow: 0 2px 14px rgba(217,119,6,0.27)`): Applied to primary CTA buttons and active symbol chips. Amber-tinted, not white. Used sparingly; maximum one glowing element visible at a time.
- **Frosted Surface** (`backdrop-filter: blur(12px)` + `background: rgba(255,253,249,0.88)`): The card surface treatment. Not a default for all surfaces; reserved for cards that float above the background. The sidebar, topbar, and toolbar use solid surfaces.

### Named Rules

**The Flat-By-Default Rule.** Shadows and blur appear as state or structural signals, not as a universal surface treatment. The sidebar is solid. The topbar is solid. The toolbar is solid. Cards are frosted. Frosted-glass on everything collapses the elevation model to visual noise.

**The Warm Shadow Rule.** No shadow uses a pure grey or blue base. All shadows use `rgba(0,0,0,N)` with warm-ambient values (0.05-0.12). The amber glow is the only shadow with chromatic content, and only on interactive elements.

## 5. Components

### Buttons

Purposeful and grounded. Primary buttons carry the amber gradient; their weight draws the eye without announcing themselves.

- **Shape:** Gently rounded (8px). Not pill, not square. Compact.
- **Primary** (`btn-primary`): Amber gradient background (`linear-gradient(135deg, #D97706, #B45309)`), warm charcoal text (#1C1209) at rest. On hover: text shifts to white (#fff), background darkens to Deep Amber. `box-shadow: 0 2px 14px rgba(217,119,6,0.27)` on CTA-level buttons only.
- **Ghost** (`btn-ghost`): Transparent background, 1px Ghost Border, Warm Stone text. For secondary actions in the topbar filter area (the "Apply" button). No shadow.
- **Disabled:** Opacity 0.55 on either variant. Never change shape or color; opacity alone.
- **Active press:** `transform: scale(0.97)`, 100ms. Grounded, not bouncy.

### Cards / Containers

The structural unit of the dashboard. Three surface levels in practice:

- **Chart Card / Metric Card** (`surface`: #FFFDF9 @ 88% opacity + blur): `border-radius: 16px`, `border: 1px solid rgba(0,0,0,0.07)`, `box-shadow: 0 10px 30px rgba(0,0,0,0.08)`. Hover lifts to `translateY(-4px) scale(1.02)` with shadow intensifying. `transition: transform 0.3s ease, box-shadow 0.3s ease`.
- **Toolbar** (solid #FFFDF9, no blur): Lower visual weight than cards; it is infrastructure, not content.
- **Empty State** (solid #FFFDF9, `border: 2px dashed #D4C9BE`): Dashed border signals absence deliberately. No shadow; flat.

Nested cards are never correct. If a container needs a container, flatten one level.

### Sentiment Pills

The semantic color system in microcosm. Each pill carries a face icon (happy/sad/neutral SVG) plus the label.

- **Positive:** `background: rgba(34,197,94,0.10)`, `color: #22C55E`
- **Negative:** `background: rgba(251,113,133,0.10)`, `color: #FB7185`
- **Neutral:** `background: rgba(217,119,6,0.10)`, `color: #57534E`
- Shape: `border-radius: 99px`, `padding: 3px 10px`, 11px weight-600.

Pills are read-only indicators. They do not interact. Do not use pills as filter chips without distinct selected/unselected states.

### Badges

Chart legend labels and data role markers. Not sentiment indicators; those use Pills.

- Structure: `background: {color}20` (20% opacity hex), `color: {color}` at full, `border-radius: 4px`, `padding: 2px 8px`, 10px weight-600, 0.04em tracking.
- The background opacity creates the badge tint without adding a distinct new color to the palette. The color IS the content of the badge.

### Inputs / Fields

- **Default:** `background: #FAF9F6` (one step warmer than surface), `border: 1px solid #E5DDD5`, `border-radius: 8px`, `padding: 7px 11px`, 13px.
- **Focus:** `border-color: #D97706` (Burnished Amber). No glow, no box-shadow; the color shift is the signal.
- **Disabled:** Opacity 0.55. No structural change.
- The date inputs (`colorScheme: light`) must remain explicitly light; system dark mode should not invert them.

### Navigation (Sidebar)

Compact and receding. The sidebar is infrastructure; it should not compete with the content area.

- **Nav Item default:** Transparent background, Warm Stone text, 13px weight-400, icon at 60% opacity.
- **Nav Item active:** `background: rgba(217,119,6,0.09)`, Burnished Amber text, weight-600, icon at full opacity. A 5x5px amber dot at the right edge (with `box-shadow: 0 0 6px #D97706`) marks the active state unmistakably.
- The active dot is the one permitted decorative glow in the sidebar.

### Metric Cards

A structured variant of the Card. Anatomy: uppercase label (11px, Warm Smoke, 0.1em tracking) → large numeric value (28px, weight-700, tabular-nums, negative tracking) → supporting sub-line (11px, Warm Stone). A SentimentFace SVG or emoji icon may precede the value when semantic context is meaningful. A 1px top gradient line (transparent to `{accent}44` to transparent) marks the card type without using a side stripe.

**Never use the hero-metric template** (big number + gradient accent card + decorative icon). The layout here is meaningful, not decorative: the number is the primary data point, everything else is context.

## 6. Do's and Don'ts

### Do:
- **Do** use Burnished Amber (#D97706) as the sole chromatic accent. Every interactive primary element in the system uses this color or its Deep Amber hover state.
- **Do** tint every neutral toward hue 55-60 in OKLCH. No surface, text, or border color is a pure grey; the warmth is structural.
- **Do** apply negative letter-spacing (-0.02em to -0.04em) to all headline and display sizes (16px+). This is what separates the type scale from a default browser rendering.
- **Do** enforce `font-variant-numeric: tabular-nums` on all financial figures, metric values, and percentages.
- **Do** keep frosted-glass (backdrop-filter: blur) to card-level surfaces only. Sidebar, topbar, and toolbar use solid fills.
- **Do** use WCAG AA contrast minimums. Warm Charcoal (#1C1209) on Frosted Parchment (#FFFDF9) is the baseline text combination; verify any new combination before shipping.
- **Do** use sentiment colors (green, rose) exclusively as semantic indicators. If a new color appears for decoration, it dilutes the semantic system.
- **Do** animate with `ease-out` cubic curves only. `transition: 0.15s ease` for micro-interactions, `0.3s ease` for card hover lifts.
- **Do** limit hover lift animations to `translateY(-4px)` maximum. Cards are grounded, not floating.

### Don't:
- **Don't** introduce a crypto dark aesthetic: no neon green, purple, or cyan on dark backgrounds. This system is explicitly warm, light, and credible; the dark crypto palette is the primary anti-reference.
- **Don't** build identical card grids with icon + heading + text repeated uniformly. This is the generic SaaS dashboard pattern that this system was designed to reject. Vary card size, content density, and purpose.
- **Don't** use gradient text (`background-clip: text`). The system's gradient energy lives in button backgrounds and the header band; text carries meaning at solid color only.
- **Don't** use `border-left` or `border-right` greater than 1px as a colored accent stripe on cards or list items. The MetricCard top-gradient line is a ruled exception; side stripes are not.
- **Don't** make frosted-glass cards the default for all surfaces. The blur/opacity treatment is reserved for floating card content. Applied universally, it reads as a 2018 design trend, not an intentional elevation model.
- **Don't** add a second accent color. If hierarchy is needed in a neutral zone, achieve it through weight (400 vs 700) or scale (11px vs 16px), not a new hue.
- **Don't** add bounce or elastic easing to any transition. `ease-out-quart` or `cubic-bezier(0.16, 1, 0.3, 1)` for cards; `ease` for micro-interactions. Bounce in a financial tool signals instability.
- **Don't** use all-caps text above 12px. The label convention (10-11px uppercase) is structural; applying it at body or title sizes reads as shouting.
- **Don't** use table or chart layouts that require zooming or close reading during a presentation. WCAG AA contrast is the floor; presentation-distance legibility is the ceiling.
- **Don't** build modals as the first answer to progressive disclosure. The analysis panel, inline alerts, and expandable chart cards handle disclosure without interrupting the data view.
