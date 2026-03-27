# Browser Test Plan — Pre-Commit Fixes Validation

## Setup
- App URL: `http://localhost:5173`
- Test credentials: read from `.env.test.local` (`TEST_USER_EMAIL` and `TEST_USER_PASSWORD`)
- Start dev server: `pnpm dev`
- Browser: Chrome (via claude-in-chrome MCP tools)

---

## TC-01: Login and redirect to dashboard
**Validates:** App loads correctly, auth works, code-splitting doesn't break routing
1. Navigate to `http://localhost:5173`
2. Verify login page renders (look for email/password form fields)
3. Fill in email and password from test credentials
4. Submit the form
5. **Expected:** Redirect to `/dashboard`, dashboard content visible
6. **Check console:** No errors in console (open DevTools console)

## TC-02: Lazy-loaded route navigation
**Validates:** Step 9 — React.lazy code-splitting works for all routes
1. From dashboard, navigate to `/accounts`
2. **Expected:** Page loads (may show brief "Cargando..." fallback), accounts list renders
3. Navigate to `/transactions`
4. **Expected:** Transactions page renders with data
5. Navigate to `/analytics`
6. **Expected:** Analytics page renders with charts
7. Navigate to `/debts`
8. **Expected:** Debts page renders
9. Navigate to `/profile`
10. **Expected:** Profile page renders
11. **Check:** No blank screens, no uncaught chunk-loading errors in console

## TC-03: Toast notifications — failed account deletion
**Validates:** Steps 2 & 7 — Sonner toasts replace alert() calls
1. Navigate to `/accounts`
2. Open browser DevTools Network tab
3. Block requests to Supabase API (or disconnect network briefly)
4. Attempt to delete an account (click delete button on any account)
5. **Expected:** A toast notification appears (bottom-right or top-right of screen) with message containing "No se pudo eliminar la cuenta" — NOT a browser alert() dialog
6. **Expected:** Toast auto-dismisses after a few seconds
7. Restore network

## TC-04: Toast notifications — failed transaction save
**Validates:** Steps 2 & 7
1. Navigate to `/transactions`
2. Open the "Add transaction" modal
3. Fill in required fields
4. Block network / Supabase requests
5. Submit the form
6. **Expected:** Toast notification with "No se pudo guardar la transaccion" — NOT a browser alert()
7. Restore network

## TC-05: Toast notifications — failed transaction deletion
**Validates:** Steps 2 & 7
1. Navigate to `/transactions`
2. Block network
3. Attempt to delete an existing transaction
4. **Expected:** Toast notification with "No se pudo eliminar la transaccion" — NOT a browser alert()
5. Restore network

## TC-06: Reset password page — direct navigation without session
**Validates:** Step 4 — session verification on /reset-password
1. Open a new incognito/private window (or clear session)
2. Navigate directly to `http://localhost:5173/reset-password`
3. **Expected:** Should briefly show loading state ("Verificando..."), then redirect to `/` (login page)
4. **Expected:** Should NOT show the password reset form to unauthenticated users

## TC-07: Transaction search functionality
**Validates:** Step 3 — search filter sanitization doesn't break normal search
1. Navigate to `/transactions`
2. Enter a normal search term (e.g., a known payee name) in the search field
3. **Expected:** Transactions are filtered to match the search term
4. Clear search, enter a special character string: `test,notes.eq.hack`
5. **Expected:** No results (search treated as literal text, no injection), no errors in console
6. Clear search, enter: `"test'`
7. **Expected:** No results or matching results, no console errors, no crashes

## TC-08: Navbar accounts load correctly
**Validates:** Step 5 — user_id filter on Navbar accounts query
1. From any authenticated page, check the navbar
2. Look for the "+" (quick transaction) button or accounts dropdown
3. **Expected:** Only the logged-in user's accounts appear
4. **Check console:** No Supabase errors related to accounts query

## TC-09: Transactions page accounts dropdown
**Validates:** Step 5 — user_id filter on TransactionsView accounts query
1. Navigate to `/transactions`
2. Open the "Add transaction" modal
3. Check the account selector/dropdown
4. **Expected:** Only the logged-in user's accounts appear in the dropdown
5. **Check console:** No errors

## TC-10: Console error logging (DevTools check)
**Validates:** Step 8 — console.log replaced with console.error
1. Navigate to login page (`/`)
2. Open browser DevTools Console, filter to show only "Errors"
3. Enter wrong credentials (email: `wrong@test.com`, password: `wrongpass`)
4. Submit the form
5. **Expected:** An error appears in the Console (red, under "Errors" filter) — NOT under "Info" or "Log" level
6. **Expected:** The form shows "Correo o contrasena incorrectos" error message

## TC-11: Theme-aware toast styling
**Validates:** Step 2 — Sonner respects app theme
1. Navigate to any authenticated page
2. Toggle theme to dark mode (via navbar theme switcher)
3. Trigger a toast (e.g., repeat TC-03 flow)
4. **Expected:** Toast has dark styling that matches the app's dark theme
5. Toggle to light mode
6. Trigger a toast again
7. **Expected:** Toast has light styling matching the app's light theme

## TC-12: Full page load performance (visual check)
**Validates:** Step 9 — code-splitting reduces initial load
1. Open DevTools Network tab
2. Hard refresh the login page (`Ctrl+Shift+R`)
3. **Expected:** Multiple smaller JS chunks loaded instead of one large bundle
4. Login and navigate to `/dashboard`
5. **Expected:** Additional JS chunk(s) loaded on navigation (lazy loading working)
6. Navigate to `/analytics`
7. **Expected:** Another JS chunk loaded for analytics page

---

## Related Functionality Regression Checks

These test cases verify that existing features still work correctly after the changes.

## TC-R01: Full transaction CRUD flow
1. Navigate to `/transactions`
2. Click "Add transaction" — fill in all fields (account, amount, category, payee)
3. Submit
4. **Expected:** Transaction appears in the list, no errors
5. Click on the new transaction to edit it, change the amount
6. Submit edit
7. **Expected:** Updated amount reflected in the list
8. Delete the transaction
9. **Expected:** Transaction removed, toast confirms (or list updates)

## TC-R02: Full account CRUD flow
1. Navigate to `/accounts`
2. Add a new account (name, type, initial balance)
3. **Expected:** Account appears in the list
4. Edit the account name
5. **Expected:** Updated name reflected
6. Delete the account
7. **Expected:** Account removed

## TC-R03: Dashboard data loads
1. Navigate to `/dashboard`
2. **Expected:** Spending overview, expense chart, recent transactions, and account balances all render with data
3. **Check:** No loading spinners stuck indefinitely

## TC-R04: Analytics page renders
1. Navigate to `/analytics`
2. **Expected:** KPI cards, income/expense chart, and spending trends all render
3. Click on a month in the chart
4. **Expected:** Month detail panel opens with breakdown

## TC-R05: Debts page
1. Navigate to `/debts`
2. **Expected:** "My Debts" and "Owed to Me" tabs render
3. Switch between tabs
4. **Expected:** Data loads for each tab without errors

## TC-R06: Profile page
1. Navigate to `/profile`
2. **Expected:** User profile information renders correctly

## TC-R07: Login -> Forgot password flow
1. Go to login page
2. Click "Forgot password" link
3. **Expected:** Forgot password form appears
4. Enter an email and submit
5. **Expected:** Success message: "Revisa tu correo para restablecer tu contrasena"
6. Click back to login
7. **Expected:** Login form returns

## TC-R08: Mobile responsive layout
1. Resize browser to mobile width (375px)
2. Navigate between pages using bottom navigation
3. **Expected:** Bottom nav visible, sidebar hidden, pages render correctly
4. Resize back to desktop
5. **Expected:** Sidebar visible, bottom nav hidden
