# Design System — myfinplan-mobile

**Date:** 2026-04-27
**Status:** Approved

---

## Goal

Replace the default shadcn/generic theme with a minimalist, modern design system that feels intentional and premium. Support both dark and light modes.

---

## Design Decisions

### Themes

Two modes, both supported via NativeWind's `darkMode: "class"` mechanism.

**Dark (default preference)**
| Token | Value | Usage |
|---|---|---|
| `--background` | `#0a0a0a` | Screen background |
| `--card` | `#141414` | Cards, sheets, inputs |
| `--border` | `#1f1f1f` | Dividers, card borders |
| `--foreground` | `#ffffff` | Primary text |
| `--muted-foreground` | `#525252` | Secondary text, labels |

**Light**
| Token | Value | Usage |
|---|---|---|
| `--background` | `#faf7f2` | Screen background (warm off-white) |
| `--card` | `#ffffff` | Cards, sheets, inputs |
| `--border` | `#e8e2d8` | Dividers, card borders (warm gray) |
| `--foreground` | `#1c1917` | Primary text |
| `--muted-foreground` | `#a8a09a` | Secondary text, labels |

**Shared**
| Token | Value | Usage |
|---|---|---|
| `--primary` (accent) | `#10b981` | Buttons, active tab, positive amounts |
| `--destructive` | `#ef4444` | Negative amounts, errors |
| `--radius` | `12px` | Base border radius (up from 8px) |

### Typography

- Font: system default (SF Pro on iOS)
- Headings & large numbers: `font-weight: 800`, `letter-spacing: -0.5px`
- Body text: `font-weight: 500`
- Metadata labels: `font-size: 11px`, `letter-spacing: 1px`, `text-transform: uppercase`, `font-weight: 500`
- Numbers (amounts): `font-weight: 700`, tabular-nums

### Tab Bar

Replace default Expo Tabs styling with custom `tabBar` render:
- Background: `--card` color with top border `--border`
- Active tab: icon + label with `rgba(16,185,129,0.12)` pill background, label and icon in `#10b981`
- Inactive tab: icon + label in `--muted-foreground`
- No shadow on dark mode; subtle shadow on light mode

### Buttons

- Default (primary): `bg-[#10b981]` background, white text, `rounded-xl`, height 52px
- Outline: `border border-[#1f1f1f]` dark / `border-[#e8e2d8]` light, foreground text
- Ghost: no border, foreground text
- Loading state: ActivityIndicator in button color
- Corner radius: `rounded-xl` (12px)

### Inputs

- Background: `--card`
- Border: `--border`, focus border `#10b981`
- Height: 52px (up from 48px)
- Corner radius: `rounded-xl`
- Label: uppercase spaced metadata style
- Placeholder: `--muted-foreground`

### Cards

- Background: `--card`
- Border: 1px `--border`
- Corner radius: `rounded-2xl` (16px)
- Padding: `p-4`
- No heavy shadows — dark mode uses border only, light mode uses `shadow-sm`

### Screen Headers

- No native navigation header (`headerShown: false` already set)
- Custom in-screen header: app name or screen title in `text-2xl font-extrabold`, safe area aware
- Muted subtitle below where appropriate

---

## Files to Change

| File | Change |
|---|---|
| `global.css` | Update all CSS variable values for both light and dark themes, increase `--radius` to 12px |
| `tailwind.config.js` | No structural changes needed |
| `components/ui/button.tsx` | Update variant styles, radius, height, primary color |
| `components/ui/input.tsx` | Update border, radius, height, label style, focus color |
| `app/(app)/_layout.tsx` | Replace default Tabs with custom `tabBar` render using Active Pill style |

## Files NOT changed

- `components/ui/select.tsx`, `sheet.tsx` — touched only if they appear in a visible screen during this sprint
- Screen content files (`index.tsx`, `transactions/index.tsx`, etc.) — placeholder screens stay as-is; only the shell (tab bar, inputs, buttons) gets the new design

---

## Out of Scope

- Dark/light mode toggle UI (system preference respected automatically)
- Custom icons (use existing Expo vector icons for now)
- Animation or transitions
- Any screen content beyond what already exists
