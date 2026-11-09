# TALLY NEXUS — DESIGN SYSTEM SPECIFICATION
**Version:** 2.0.0 (Institutional Command Centre)  
**Architecture:** Three-Layer Token Architecture (Primitive &rarr; Semantic &rarr; Component)  
**File Origin:** `src/dashboard/dashboard-html.ts`  

---

## 1. Token Architecture

Following the `ui-ux-pro-max` token specification, Tally Nexus implements a strict three-tier token model:

```
[ Primitive Tokens ] (Raw hex values, base font sizes, pixel spacings)
        ↓
[ Semantic Tokens ]  (Functional aliases: bg-canvas, surface-card, text-primary, signal-success)
        ↓
[ Component Tokens ] (UI-specific mappings: --btn-primary-bg, --modal-border, --table-header-bg)
```

---

## 2. CSS Custom Properties Reference

```css
:root {
  /* =========================================================================
     1. PRIMITIVE COLOR TOKENS
     ========================================================================= */
  --color-obsidian-950: #080D16;
  --color-obsidian-900: #101827;
  --color-obsidian-850: #141F30;
  --color-obsidian-800: #19263A;
  --color-obsidian-700: #1E2E46;

  --color-slate-50:    #F4F7FB;
  --color-slate-300:   #A3B0C2;
  --color-slate-400:   #738197;
  --color-slate-600:   #475569;

  --color-turquoise-400: #43D6CF;
  --color-turquoise-500: #22B8B1;
  --color-cyan-400:      #38BDF8;
  --color-emerald-400:   #32C48D;
  --color-amber-400:     #F3B65B;
  --color-rose-400:      #F16B78;
  --color-indigo-400:    #818CF8;

  /* =========================================================================
     2. SEMANTIC COLOR TOKENS
     ========================================================================= */
  --bg-canvas:           var(--color-obsidian-950);
  --surface-primary:     var(--color-obsidian-900);
  --surface-secondary:   var(--color-obsidian-850);
  --surface-elevated:    var(--color-obsidian-800);
  --surface-hover:       rgba(255, 255, 255, 0.04);

  --text-primary:        var(--color-slate-50);
  --text-secondary:      var(--color-slate-300);
  --text-muted:          var(--color-slate-400);

  --border-subtle:       rgba(148, 163, 184, 0.13);
  --border-focus:        var(--color-turquoise-400);
  --border-active:       rgba(67, 214, 207, 0.35);

  --signal-turquoise:    var(--color-turquoise-400);
  --signal-cyan:         var(--color-cyan-400);
  --signal-success:      var(--color-emerald-400);
  --signal-warning:      var(--color-amber-400);
  --signal-danger:       var(--color-rose-400);
  --signal-accent:       var(--color-indigo-400);

  /* =========================================================================
     3. TYPOGRAPHY SCALES
     ========================================================================= */
  --font-sans: -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  --font-mono: "JetBrains Mono", "SF Mono", "Segoe UI Mono", Menlo, Consolas, monospace;

  --text-xs:   11px;
  --text-sm:   12.5px;
  --text-base: 13.5px;
  --text-md:   15px;
  --text-lg:   18px;
  --text-xl:   22px;
  --text-2xl:  30px;

  /* =========================================================================
     4. SPACING & RADIUS SCALES
     ========================================================================= */
  --space-1:  4px;
  --space-2:  8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;

  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-pill: 9999px;

  /* =========================================================================
     5. SHADOWS & DEPTH (Cinematic App Mode)
     ========================================================================= */
  --shadow-sm:     0 1px 2px rgba(0, 0, 0, 0.25);
  --shadow-card:   0 4px 14px rgba(0, 0, 0, 0.35);
  --shadow-modal:  0 20px 45px -10px rgba(0, 0, 0, 0.65), 0 0 25px rgba(67, 214, 207, 0.08);
  --shadow-glow:   0 0 16px rgba(67, 214, 207, 0.25);
}
```

---

## 3. Typography Rules & Numerical Formatting

1. **Tabular Numerals:**  
   All numerical data (volumes, dollar balances, token usages, latencies, compression ratios) MUST include:
   ```css
   font-variant-numeric: tabular-nums;
   letter-spacing: -0.02em;
   ```
2. **Monospace Identifiers:**  
   Transaction IDs, Merkle roots, Ed25519 public keys, and SHA-256 digests use `var(--font-mono)` with font size `11px` to `12px`.
3. **Hierarchy:**
   - App Brand: `20px` Bold (800)
   - Panel Titles: `15px` Semi-bold (700)
   - Metrics Numbers: `28px` Extra-bold (800)
   - Body & Table Text: `13px` Regular (400)
   - Badges & Micro-Labels: `11px` Bold (700), uppercase with `0.5px` letter spacing.

---

## 4. Component Specifications

### Buttons
- **Primary Action (`.btn-primary`):** Background `var(--signal-turquoise)`, text `#062828`, font weight 700. Hover: brightness 1.1 + subtle shadow glow.
- **Flagship Demo Runner (`.btn-demo`):** Gradient from `#22B8B1` to `#38BDF8`, font weight 800, padding `10px 18px`.
- **Secondary Action (`.btn-secondary`):** Background `var(--surface-secondary)`, border `1px solid var(--border-subtle)`, text `var(--text-primary)`. Hover: background `var(--surface-elevated)`.
- **Proof Chip (`.status-chip-proof`):** Micro-interaction pill with `padding: 3px 9px`, background `rgba(50, 196, 141, 0.12)`, border `1px solid rgba(50, 196, 141, 0.35)`, text `var(--signal-success)`.

### Badges & Status Pills
- **Success (`.tag-success`):** `rgba(50, 196, 141, 0.14)` bg, `#32C48D` text, `1px solid rgba(50, 196, 141, 0.3)`.
- **Pending (`.tag-pending`):** `rgba(243, 182, 91, 0.14)` bg, `#F3B65B` text, `1px solid rgba(243, 182, 91, 0.3)`.
- **Error / Rejected (`.tag-error`):** `rgba(241, 107, 120, 0.14)` bg, `#F16B78` text, `1px solid rgba(241, 107, 120, 0.3)`.
- **Information (`.tag-info`):** `rgba(56, 189, 248, 0.14)` bg, `#38BDF8` text, `1px solid rgba(56, 189, 248, 0.3)`.

### Modals & Dialogs
- **Backdrop:** `rgba(8, 13, 22, 0.8)` with `backdrop-filter: blur(8px)`.
- **Window Container:** Background `var(--surface-primary)`, border `1px solid var(--border-subtle)`, border radius `12px`, max-width `680px`.
- **Header:** Background `var(--surface-secondary)`, bottom border `1px solid var(--border-subtle)`.
- **Content:** Deep black preformatted payload container (`#04070d`) with syntax-highlighted labels.

### Toasts Notification System (`#toast-container`)
- Positioned fixed `bottom: 24px; right: 24px; z-index: 10000`.
- Glassmorphic slate card (`rgba(16, 24, 39, 0.95)` with `backdrop-filter: blur(12px)`).
- Semantic accent line on left border or icon badge.
- Native expandable `<details>` block for technical JSON dumps without blocking UI.

