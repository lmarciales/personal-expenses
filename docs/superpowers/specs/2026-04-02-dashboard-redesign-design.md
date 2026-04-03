# Dashboard Redesign & Category Group System

## Context

The dashboard overview has several problems:
- **Balance mismatch** between dashboard and accounts page (fixed in `173903a`)
- **Category chaos**: 80 free-form tags mixing vendors (Spotify, KFC), spending types (Compras), and one-off events (Vacaciones) — makes the spending overview noisy and untrustworthy
- **Wrong time focus**: spending overview shows annual data, but the user thinks monthly ("am I on track this month?")
- **Missing alerts**: only recurring bills are surfaced; no spending spikes, debt reminders, low balances, or CDT maturity warnings
- **Overlap with Analytics**: the yearly expense chart duplicates what Analytics does better

The user's three dashboard priorities:
1. **How much can I spend?** — available money, income vs expenses
2. **Am I on track this month?** — monthly health check, savings rate
3. **What needs my attention?** — actionable alerts across the app

## Design

### 1. Category Group System

Add parent/child hierarchy to categories. The database schema and UI changes are minimal, but this unlocks meaningful spending aggregation.

#### Database

Add two columns to `categories` table:
- `parent_id` (nullable FK to categories.id) — links a tag to its parent group
- `is_group` (boolean, default false) — distinguishes groups from tags

A **group** has `is_group = true` and `parent_id = NULL`. A **tag** has `is_group = false` and optionally a `parent_id` pointing to a group. Tags without a `parent_id` are "ungrouped" and appear under an implicit "Other" bucket in the spending overview.

Migration creates ~11 parent groups and assigns existing 80 tags to them:

| Group | Example Children |
|-------|-----------------|
| Hogar | Luz (Codensa), Gas (Vanti), Agua (Acueducto), ETB, Tigo, EcoTower, CapitalTower |
| Suscripciones | Spotify, Netflix, iCloud, Rappi Prime, Patreon, Crunchyroll, True Caller, Google |
| Gaming | MLBB, Wings Store, SLA, FC25, FC26, EA Play, PS5, NS2, Games, MCGG |
| Comida | Almuerzo, El Corral, KFC, Dominos, Mis Carnes Parrilla, Il Forno, Presto, Aprissa Pizza, Comida, Food |
| Compras | Compras, Mercado Libre, Amazon, Shein, Zara, Adidas, Cafam, Bella Piel, Natura |
| Transporte | Uber, Gasolina, Peugeot, Camioneta, Pico Y Placa, PyP Solidario, SOAT |
| Software & Tools | ChatGPT, Claude, Cursor, Windsurf, Grammarly, Platzi, Fantastical, Athlytic, Software |
| Viajes | Vacaciones, Barcelo, Avianca, Vuelos, Pasaporte |
| Financiero | Tarjeta de credito, Paypal, Prestamo, Declaracion de Renta, Impuesto, Nomina |
| Personal | Cumpleanos, Rappi, Pagos Ma, Colmedica, Cine Colombia, MiduDev, Twitch |
| Servicios | Servicios, Apple |

Tags not matching any group get `parent_id = NULL` and act as their own ungrouped category until the user assigns them.

#### Category Picker UX (AddTransactionModal)

When creating a new tag inline:
1. User types a name that doesn't exist → "Create 'Pizza Hut'" option appears
2. User clicks it → tag is created, and a small inline group dropdown appears immediately below/beside it showing existing groups + "None"
3. User picks a group (or skips by clicking away / pressing Enter) → tag is saved with or without `parent_id`
4. No extra modal, no extra step — stays in the transaction form flow

Existing tags: no change to the picking flow. The group is already assigned.

#### Category Management

A dedicated section (accessible from the spending overview or a settings/admin area) to:
- View all groups and their children
- Drag or reassign tags between groups
- Create new groups
- Rename/delete groups

This is lower priority than the dashboard redesign and can ship as a follow-up.

### 2. Dashboard Layout

Four rows, top-to-bottom priority. The yearly expense chart is removed (Analytics handles it).

#### Row 1: Monthly Health Bar (4 KPI cards)

Full-width row with 4 equal cards. Responsive: 4 cols on desktop, 2x2 on tablet, stacked on mobile.

| Card | Primary Value | Secondary |
|------|--------------|-----------|
| Income This Month | Sum of income transactions this month | Source count |
| Expenses This Month | Sum of expense transactions this month | vs last month amount + % change (color-coded: green if down, red if up) |
| Net This Month | Income - Expenses | Savings rate: `(net / income) * 100%` |
| Total Balance | Sum of all account projected balances | Account count |

Data source: `useDashboardData` hook, extended to compute monthly income/expenses and month-over-month comparison.

#### Row 2: Unified Alerts ("Needs Attention")

Replaces the current `RecurringRecommendations` banner. A collapsible section that aggregates alerts from multiple sources. Hidden entirely when there are no alerts.

Alert types (each with a distinct color):

| Type | Color | Condition | Display |
|------|-------|-----------|---------|
| Recurring Bill | Amber | Recurring transaction is overdue per recurrence schedule | Payee name, overdue since date, amount, "Log It Now" action |
| Spending Spike | Red | A category group's current month spending > 2x its 3-month rolling average | Group name, multiplier, amount |
| Debt Pending | Blue | Pending splits exist (owed to user or user owes) | Person/direction, total amount pending |
| CDT Maturing | Purple | CDT maturity date within 60 days | CDT name, days remaining, projected value |
| Low Balance | Orange | Non-credit account balance below a threshold (configurable, default: no threshold — opt-in later) | Account name, current balance |

Layout: 2-column grid of alert cards. Each card shows: type icon + label, description, amount. Recurring bill alerts keep the "Log It Now" action button. Other alerts link to their respective pages (Debts, Accounts).

The alerts section has a count badge (e.g., "4 items") and can be collapsed by the user.

#### Row 3: Spending by Category + My Accounts (50/50 split)

**Left — Spending by Category:**
- Title: "Spending by Category" with subtitle showing current month name
- YTD total as a small badge in the header (e.g., "YTD: $ 20.555.159")
- List of category **groups** sorted by amount descending, each with:
  - Colored dot + group name
  - Amount (right-aligned)
  - Progress bar (width proportional to highest group)
- Shows top ~5 groups, then "+ N more groups" link
- Clicking a group navigates to Analytics with that group pre-filtered (future enhancement)
- Data: aggregate `transaction_categories` by the parent group of each category for the current month

**Right — My Accounts:**
- Same as current Products component but without the total balance header (moved to Row 1)
- Shows top 3 accounts by balance + "+ N more accounts" link
- "View All" links to Accounts page

#### Row 4: Recent Transactions + Financial Insights (50/50 split)

**Left — Recent Transactions:**
- Same as current: last 4-5 transactions, each with payee, account, amount
- "View All" links to Transactions page

**Right — Financial Insights:**
- Title: "Financial Insights" with "Deep Dive" link to Analytics
- 3 insight cards stacked vertically, each with a colored left border:

| Insight | Data | Color |
|---------|------|-------|
| Savings Rate Trend | Current month savings rate + comparison to last month + mini sparkline (3 bars for last 3 months) | Green |
| Biggest Category | Top spending group name + amount + % of total expenses | Purple (matches group color) |
| Month-over-Month | Expenses comparison: current vs previous month, absolute + % change | Amber if up, green if down |

Data source: computed from the same monthly data the KPI cards use, plus 3-month lookback for the sparkline and spending spike detection.

### 3. Dashboard vs Analytics Separation

| Aspect | Dashboard | Analytics |
|--------|-----------|-----------|
| Purpose | "Am I okay?" — snapshot for action | "Why did this happen?" — exploration for insight |
| Time focus | This month (with YTD context) | Any year, any month, comparisons |
| Categories | Groups only, current month | Groups → drill down to tags, any period |
| Charts | None (removed) | Monthly bars, income vs expenses, trends |
| Interaction | Glance + act (log bill, view alert) | Explore + understand (click months, filter) |
| KPIs | Monthly: income, expenses, net, balance | Yearly: totals, YoY, savings rate, highest/lowest months |
| Alerts | Yes (unified section) | No |
| Insights | 3 teaser stats | Full trend analysis |

The Analytics page keeps its current features unchanged. The category group system enhances it (future: filter by group, drill down to tags) but that's a follow-up, not part of this spec.

### 4. Data Architecture

#### Extended `useDashboardData` Hook

The hook currently returns: `accounts`, `transactions`, `totalBalance`, `totalIncome`, `totalExpense`, `categorySpending`.

New fields to add:

```
monthlyIncome: number          // current month income
monthlyExpense: number         // current month expenses
monthlyNet: number             // monthlyIncome - monthlyExpense
savingsRate: number            // (monthlyNet / monthlyIncome) * 100, or 0 if no income
prevMonthExpense: number       // previous month total expenses
momChange: number              // % change: ((monthlyExpense - prevMonthExpense) / prevMonthExpense) * 100
groupedSpending: Array<{       // category groups with monthly totals
  groupId: string
  groupName: string
  groupColor: string
  amount: number               // current month total for this group
  children: Array<{ name: string, amount: number }>
}>
```

#### New `useDashboardAlerts` Hook

Separate hook to compute alerts from multiple data sources:

```
alerts: Array<{
  type: 'recurring_bill' | 'spending_spike' | 'debt_pending' | 'cdt_maturing'
  severity: 'warning' | 'danger' | 'info'
  title: string
  description: string
  amount: number
  action?: { label: string, handler: () => void }
  link?: { label: string, href: string }
}>
```

Sources:
- Recurring bills: reuse logic from `useRecurringRecommendations`
- Spending spikes: compare current month group totals vs 3-month rolling average (requires querying 3 prior months)
- Debt pending: query `transaction_splits` for pending status
- CDT maturing: filter accounts where `type = 'CDT'` and `maturity_date` within 60 days

#### Financial Insights

Computed from the same data as KPI cards + 3-month lookback:

```
insights: {
  savingsRate: number              // current month
  savingsRatePrev: number          // last month (for comparison text)
  savingsRateTrend: number[]       // last 3 months (for sparkline)
  topGroup: { name: string, amount: number, pctOfTotal: number }
  momExpenseChange: number         // % change
  momExpenseAbs: [number, number]  // [current, previous] for display
}
```

### 5. Files to Create/Modify

#### New Files
- `supabase/migrations/YYYYMMDD_add_category_groups.sql` — add `parent_id` to categories + create groups + assign children
- `src/hooks/useDashboardAlerts.ts` — unified alerts hook
- `src/components/Dashboard/MonthlyHealthBar.tsx` — Row 1 KPI cards
- `src/components/Dashboard/AlertsSection.tsx` — Row 2 unified alerts
- `src/components/Dashboard/GroupedSpending.tsx` — Row 3 left: spending by category group
- `src/components/Dashboard/FinancialInsights.tsx` — Row 4 right: insights teaser

#### Modified Files
- `src/hooks/useDashboardData.ts` — extend with monthly calculations, grouped spending, insights data
- `src/pages/Dashboard/Dashboard.tsx` — new layout with 4 rows
- `src/components/Products/Products.tsx` — remove total balance header (moved to KPI cards), simplify to account list only
- `src/components/Transactions/AddTransactionModal.tsx` — inline group picker when creating new category
- `src/supabase/database.types.ts` — regenerated after migration

#### Removed/Replaced
- `src/components/SpendingOverview.tsx` — replaced by `GroupedSpending.tsx`
- `src/components/RecurringRecommendations.tsx` — replaced by `AlertsSection.tsx`
- `src/components/ExpenseChart.tsx` — removed from dashboard (still used in Analytics)
- `src/hooks/useRecurringRecommendations.ts` — logic absorbed into `useDashboardAlerts.ts`
- `src/hooks/useExpenseChartData.ts` — no longer imported by Dashboard (still used by Analytics)

## Verification

1. **Category migration**: Run migration, verify groups created with correct parent/child relationships via SQL query
2. **Dashboard layout**: Start dev server, log in, verify all 4 rows render with real data
3. **KPI accuracy**: Compare monthly income/expenses/net against manual Supabase query for current month
4. **Alerts**: Verify each alert type triggers correctly:
   - Create an overdue recurring transaction → recurring bill alert appears
   - Ensure spending spike shows when a group exceeds 2x its 3-month avg
   - Create pending splits → debt alert appears
   - CDT within 60 days of maturity → CDT alert appears
5. **Category picker**: Add a new transaction, create a new tag, verify inline group picker appears and assigns correctly
6. **Grouped spending**: Verify category groups aggregate correctly for current month, YTD badge shows annual total
7. **Financial insights**: Verify savings rate, top group, and MoM calculations match expected values
8. **Analytics unchanged**: Confirm Analytics page still works as before (no regressions from chart removal on dashboard)
9. **Build**: `pnpm build` passes with no errors
10. **Responsive**: Test on mobile viewport — cards stack, alerts collapse, layout adapts
