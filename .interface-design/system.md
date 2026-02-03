# Health Comply Design System

## Elegant Brutalist

A sophisticated, trust-conveying design language for healthcare compliance management.

---

## Principles

1. **Minimal Geometry** - 2-4px radius, never fully rounded
2. **Bold Boundaries** - 2px borders define all containers
3. **No Shadows** - Depth through borders and contrast only
4. **Trust Blue** - Healthcare blue accent for primary actions
5. **Clear Hierarchy** - Typography weight and spacing for emphasis
6. **Progressive Disclosure** - Clean, uncluttered with information revealed appropriately

---

## Design Tokens

### Radius
```css
--radius: 0.125rem;        /* 2px - base radius */
--radius-sm: 0;            /* 0px - minimal elements */
--radius-md: 0.0625rem;    /* 1px */
--radius-lg: 0.125rem;     /* 2px */
--radius-xl: 0.25rem;      /* 4px - maximum */
```

### Borders
- Standard: `border-2` (2px)
- Accent: `border-l-4` (4px left border for alerts)
- Dividers: `border-b-2` (2px bottom border)

### Colors

**Light Mode**
```css
--background: oklch(0.995 0 0);     /* Off-white */
--foreground: oklch(0.141 0.005 285.823);
--primary: oklch(0.45 0.2 250);     /* Healthcare blue */
--border: oklch(0.8 0.005 285);     /* High contrast gray */
```

**Dark Mode**
```css
--background: oklch(0.1 0.005 285);
--foreground: oklch(0.95 0 0);
--primary: oklch(0.55 0.2 250);     /* Lighter blue for dark */
--border: oklch(0.35 0.006 286);
```

### Typography
- Headings: `font-semibold tracking-tight`
- Labels: `text-xs font-semibold uppercase tracking-wider`
- Body: Default weight, standard tracking
- Data: Tabular-nums for numerical content

---

## Component Patterns

### Cards
```tsx
className="bg-card text-card-foreground flex flex-col gap-4 rounded-sm border-2 py-5"
```
- No shadows
- 2px border
- Tighter internal spacing (gap-4 vs gap-6)

### Buttons
```tsx
// Default variant
className="rounded-sm border-2 border-primary bg-primary text-primary-foreground font-semibold tracking-tight"

// Outline variant
className="rounded-sm border-2 border-border bg-transparent hover:bg-foreground hover:text-background"
```
- All variants have explicit 2px borders
- Font-semibold with tight tracking
- Clean hover states

### Inputs
```tsx
className="rounded-sm border-2 h-10 focus-visible:border-ring"
```
- Taller inputs (h-10 vs h-9)
- Focus changes border color only, no ring

### Dialogs
```tsx
// Overlay
className="bg-black/70"  // Darker overlay

// Content
className="rounded-sm border-2 p-6"  // No shadow
```

### Tables
```tsx
// Container
className="border-2 rounded-sm"

// Header
className="[&_tr]:border-b-2 bg-muted/50"

// Header cells
className="font-semibold text-xs uppercase tracking-wider"
```

### Badges
```tsx
className="rounded-sm border-2 text-xs font-semibold uppercase tracking-wider"
```

### Alerts
```tsx
className="rounded-sm border-2 border-l-4"  // Left accent border
```

### Tabs
```tsx
// List
className="rounded-sm border-2 border-border"

// Trigger (active)
className="rounded-sm border-2 border-border bg-background font-semibold"
```

---

## Spacing

- Card padding: `p-5` / `px-5`
- Content area: `p-6`
- Component gaps: `gap-4`
- Vertical sections: `space-y-4` or `space-y-6`

---

## Interaction States

### Focus
```tsx
className="focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
```

### Hover
- Buttons: Opacity or color shift (bg-primary/90)
- Cards/Rows: Subtle background (`hover:bg-muted/50`)

### Active (Sidebar)
```tsx
className="data-[active=true]:border-l-2 data-[active=true]:border-sidebar-primary data-[active=true]:font-semibold"
```

---

## Accessibility

- Minimum contrast ratio: 4.5:1 (WCAG AA)
- Focus indicators: Visible ring or border change
- Touch targets: Minimum 44px (buttons h-10 to h-11)
- Dark mode: All patterns maintained with appropriate color adjustments

---

## File Reference

| Component | Location |
|-----------|----------|
| Design tokens | `src/styles.css` |
| Button | `src/components/ui/button.tsx` |
| Card | `src/components/ui/card.tsx` |
| Dialog | `src/components/ui/dialog.tsx` |
| Input | `src/components/ui/input.tsx` |
| Table | `src/components/ui/table.tsx` |
| Sidebar | `src/components/ui/sidebar.tsx` |
| Layout | `src/components/main-layout.tsx` |
