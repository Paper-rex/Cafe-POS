# Café POS — Full Implementation Plan

> **Goal**: Build a production-grade, full-stack Restaurant POS system with role-based dashboards (Admin, Waiter, Kitchen, Cashier), realtime SSE updates, UPI/Cash/Card payments, and a stunning green-themed design system.

## Tech Stack Summary

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript + Vite |
| Styling | Tailwind CSS + CSS custom properties |
| State | Zustand (global) + React Query (server) |
| Animation | Framer Motion |
| Charts | Recharts |
| Backend | Node.js + Express + TypeScript |
| ORM/DB | Prisma + PostgreSQL |
| Auth | JWT (access 15min + refresh 7d, httpOnly) |
| Realtime | Server-Sent Events (SSE) |
| Payments | Razorpay webhook (test mode) for UPI |

---

## User Review Required

> [!IMPORTANT]
> **PostgreSQL**: You need a running PostgreSQL instance. Provide a connection string (e.g. `postgresql://user:pass@localhost:5432/cafepos`) or confirm you want a Docker Compose setup included.

> [!IMPORTANT]
> **SMTP / Email**: Staff invite flow requires email. Provide Gmail app password / SMTP credentials, or confirm you want a dev-mode fallback that logs invite links to console.

> [!IMPORTANT]
> **Razorpay**: UPI auto-confirm requires Razorpay test-mode keys. Provide `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`, or confirm UPI should work in mock/manual mode initially.

> [!WARNING]
> **Tailwind CSS**: Your spec requests Tailwind CSS. The default web dev guidelines prefer vanilla CSS, but since you explicitly specified Tailwind, I'll use **Tailwind CSS v3** with a custom theme extending your design tokens. Confirm if you'd prefer v4.

---

## Proposed Changes

The implementation follows the 22-step order from the spec. Each phase is a self-contained unit with its own files, tests, and verification.

---

### Phase 0 — Project Scaffolding & Monorepo Setup

Set up the monorepo structure, install all dependencies, and configure tooling.

#### [NEW] Root files
- `package.json` — workspace root (npm workspaces: `frontend`, `backend`)
- `.gitignore` — Node, Prisma, env, uploads
- `.env.example` — all required env vars documented
- `README.md` — project overview, setup instructions

#### [NEW] `/backend/` scaffold
- `package.json` — Express, Prisma, bcrypt, jsonwebtoken, nodemailer, cors, dotenv, cookie-parser
- `tsconfig.json` — strict mode, ES2022, module NodeNext
- `src/index.ts` — Express app entry, middleware chain, route mounting
- `src/lib/prisma.ts` — Prisma client singleton
- `src/lib/jwt.ts` — `signAccess()`, `signRefresh()`, `verifyToken()`
- `src/lib/mailer.ts` — Nodemailer transporter factory
- `src/lib/constants.ts` — `ADMIN_EMAILS`, status enums, error codes
- `src/types/index.ts` — Express request augmentation (req.user, req.session)

#### [NEW] `/frontend/` scaffold
- Vite + React + TypeScript via `npx create-vite`
- `tailwind.config.ts` — full design system theme (colors, fonts, border-radius)
- `postcss.config.js`
- `src/index.css` — Tailwind directives + CSS custom properties (all `--brand-*`, `--surface-*`, etc.)
- `src/main.tsx` — React root + QueryClientProvider + Router
- `src/lib/api.ts` — Axios instance with interceptors (auto-refresh, error normalization)
- `src/lib/queryClient.ts` — React Query client config
- `src/lib/formatters.ts` — `formatCurrency()`, `formatTime()`, `formatDuration()`
- `src/types/index.ts` — all shared TypeScript types matching Prisma models

**Verification**: Both `npm run dev` (frontend) and `npm run dev` (backend) start without errors.

---

### Phase 1 — Prisma Schema + DB Migrations + Seed

#### [NEW] `/backend/prisma/schema.prisma`
Full schema as specified:
- `User` (id, email, name, password, role, status, emailVerified, verifyToken)
- `PosSession` (id, openedAt, closedAt, isActive, openedById, totalSales)
- `Floor` (id, name) → `Table` (id, number, seats, shape, posX, posY, isActive, floorId)
- `Category` (id, name, icon) → `Product` (id, name, price, description, imageUrl, isActive, taxPercent, categoryId)
- `Variant` (id, name, options JSON, productId)
- `Topping` (id, name, price, productId)
- `Order` (id, orderNumber, status, tableId, waiterId, sessionId, notes) → `OrderItem` (id, orderId, productId, name, unitPrice, quantity, variants JSON, toppings JSON, subtotal, isDone)
- `Payment` (id, orderId, method, status, amount, amountTendered, change, upiQrData, razorpayId, confirmedById)
- `PaymentConfig` (singleton, cashEnabled, cardEnabled, upiEnabled, upiId, upiName)
- All enums: `Role`, `UserStatus`, `TableShape`, `OrderStatus`, `PaymentMethod`, `PaymentStatus`

> [!NOTE]
> All monetary values stored as `Float` in Prisma but treated as **paise (integer × 100)** in application logic. A `toPaise()` / `fromPaise()` utility will handle conversion.

#### [NEW] `/backend/prisma/seed.ts`
- Seed admin users from `ADMIN_EMAILS` with bcrypt-hashed default password
- Seed a default `PaymentConfig` singleton (cash + card enabled, UPI disabled)
- Seed sample floor ("Ground Floor") with 6 tables
- Seed sample categories ("Coffee", "Tea", "Snacks", "Desserts") with 3-4 products each

**Verification**: `npx prisma migrate dev` runs cleanly, `npx prisma db seed` populates data, Prisma Studio shows all tables.

---

### Phase 2 — Auth Routes

#### [NEW] `/backend/src/routes/auth.ts`

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/login` | POST | Validate email+password, return access token in body + refresh token in httpOnly cookie |
| `/api/auth/logout` | POST | Clear refresh cookie |
| `/api/auth/refresh` | POST | Read refresh cookie → issue new access + refresh pair |
| `/api/auth/verify-email` | GET | `?token=` → verify JWT → set `emailVerified=true`, `status=ACTIVE` |
| `/api/auth/set-password` | POST | `{token, password, confirmPassword}` → hash + save → redirect info |
| `/api/auth/me` | GET | Return current user from JWT (requires auth middleware) |

**Key details**:
- Access token: 15min expiry, contains `{userId, role, email}`
- Refresh token: 7 day expiry, httpOnly, secure, sameSite=strict
- Login: bcrypt compare, check `status !== DISABLED`, check `emailVerified`
- `set-password`: verify invite token → update password + set emailVerified + status=ACTIVE

**Verification**: Postman/curl tests for full login → refresh → me → logout flow.

---

### Phase 3 — Role Middleware + Session-Required Middleware

#### [NEW] `/backend/src/middleware/authenticate.ts`
- Extract Bearer token from Authorization header
- Verify JWT → attach `req.user = { id, role, email }`
- 401 on missing/invalid/expired token

#### [NEW] `/backend/src/middleware/authorize.ts`
- Factory: `authorize(...roles: Role[])` → 403 if `req.user.role` not in allowed roles

#### [NEW] `/backend/src/middleware/sessionRequired.ts`
- Query DB for active `PosSession`
- If none → 403 `{ error: "No active session", code: "SESSION_REQUIRED" }`
- Attach `req.session = activeSession`
- Used on order creation, table operations, etc.

**Verification**: Unit tests confirming correct 401/403 responses for each middleware.

---

### Phase 4 — SSE Service (Event Bus + Per-Client Streams)

#### [NEW] `/backend/src/services/sse.service.ts`

```
SSEService (singleton):
  - clients: Map<string, { res: Response, userId: string, role: Role }>
  - addClient(userId, role, res) → assign unique clientId, set headers, keepalive
  - removeClient(clientId)
  - broadcast(event, data, targetRoles?: Role[], targetUserIds?: string[])
  - Events: order:created, order:status_updated, payment:confirmed,
            session:closing, session:closed, session:opened, table:updated
```

#### [NEW] `/backend/src/routes/events.ts`
- `GET /api/events` — requires auth, establishes SSE connection
- Sets headers: `Content-Type: text/event-stream`, `Cache-Control: no-cache`, `Connection: keep-alive`
- Sends heartbeat every 30s to keep connection alive
- On `req.close` → removes client

**Key details**:
- Role-based filtering: kitchen only gets `order:created` + `order:status_updated`
- User-based filtering: waiters only get events for their own orders
- Heartbeat: `event: ping\ndata: {}\n\n` every 30s

**Verification**: Open SSE in browser DevTools, confirm heartbeat, trigger test event.

---

### Phase 5 — Admin: Staff Invite (Email SMTP End-to-End)

#### [NEW] `/backend/src/routes/admin.ts` (staff section)

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/admin/staff` | GET | ADMIN | List all staff |
| `/api/admin/staff` | POST | ADMIN | Invite: `{email, role}` → create user PENDING, send email |
| `/api/admin/staff/:id` | DELETE | ADMIN | Soft-delete (set DISABLED) |
| `/api/admin/staff/:id/role` | PATCH | ADMIN | Change role |
| `/api/admin/staff/:id/resend-invite` | POST | ADMIN | Re-generate token, re-send email |

#### [NEW] `/backend/src/services/email.service.ts`
- `sendInviteEmail(email, role, token)` — HTML email with "Set your password" button linking to `/set-password?token=xxx`
- `sendPasswordResetEmail(email, token)` — future use
- Dev fallback: if no SMTP configured, log the invite URL to console

**Verification**: Invite a test email → receive email → click link → set password → login succeeds.

---

### Phase 6 — Admin: Session Open/Close + Session Gate Logic

#### [NEW] `/backend/src/routes/session.ts`

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/session/active` | GET | ANY | Returns active session or null |
| `/api/session/open` | POST | ADMIN | Create new PosSession, broadcast `session:opened` |
| `/api/session/close` | POST | ADMIN | Begin graceful close sequence |

#### [NEW] `/backend/src/services/session.service.ts`

**Close sequence** (critical logic):
1. Set `session.isActive = false` (prevents new orders)
2. Broadcast `session:closing` with count of open orders
3. Start monitoring: poll every 5s for orders not in `PAID`/`CANCELLED`
4. When all orders resolved → set `session.closedAt`, calculate `totalSales`
5. Reset all tables to empty state
6. Broadcast `session:closed`

**Verification**: Open session → create orders → close session → verify orders must complete → session fully closes.

---

### Phase 7 — Admin: Products + Categories CRUD

#### [NEW] `/backend/src/routes/products.ts`

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/categories` | GET | ANY | List all categories |
| `/api/categories` | POST | ADMIN | Create category |
| `/api/categories/:id` | PATCH | ADMIN | Update category |
| `/api/categories/:id` | DELETE | ADMIN | Delete (cascade check) |
| `/api/products` | GET | ANY | List products (filter by category, active) |
| `/api/products` | POST | ADMIN | Create product with variants/toppings |
| `/api/products/:id` | GET | ANY | Single product with relations |
| `/api/products/:id` | PATCH | ADMIN | Update product |
| `/api/products/:id` | DELETE | ADMIN | Soft-delete (set inactive) |

**Key details**:
- Image upload: multipart/form-data → save to `/uploads` or Cloudinary
- Variants stored as JSON: `[{label: "S", extraPrice: 0}, {label: "M", extraPrice: 1000}]` (paise)
- Toppings: separate model rows, each with name + price
- Delete category: blocked if products exist (return 409)

**Verification**: CRUD all entities via Postman, verify cascade relationships.

---

### Phase 8 — Admin: Floors + Tables CRUD

#### [NEW] `/backend/src/routes/floors.ts`

| Endpoint | Method | Auth |
|----------|--------|------|
| `/api/floors` | GET/POST | ADMIN |
| `/api/floors/:id` | PATCH/DELETE | ADMIN |
| `/api/floors/:floorId/tables` | GET/POST | ADMIN |
| `/api/tables/:id` | PATCH/DELETE | ADMIN |

**Key details**:
- Table position: `posX` and `posY` as percentages (0-100) on floor canvas
- Table shape: ROUND, SQUARE, RECTANGLE — stored as enum
- Delete floor: cascade deletes tables (confirm modal on frontend)
- Delete table: blocked if active orders exist on it

**Verification**: Create floor → add tables → reposition → verify positions persist.

---

### Phase 9 — Admin: Payment Config

#### [NEW] `/backend/src/routes/payment-config.ts`

| Endpoint | Method | Auth |
|----------|--------|------|
| `/api/payment-config` | GET | ANY |
| `/api/payment-config` | PATCH | ADMIN |

**Key details**:
- Singleton pattern: always ID = "singleton"
- UPI fields (`upiId`, `upiName`) required when `upiEnabled = true`
- Validation: at least one method must be enabled

**Verification**: Toggle methods, verify UPI fields validation.

---

### Phase 10 — Orders API (Full Status Machine)

#### [NEW] `/backend/src/routes/orders.ts`

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/orders` | GET | ANY | Filter: status, tableId, sessionId, waiterId |
| `/api/orders` | POST | WAITER | Create order (sessionRequired) |
| `/api/orders/:id` | GET | ANY | Full order with items |
| `/api/orders/:id/status` | PATCH | role-gated | Status transition |
| `/api/orders/:id` | DELETE | WAITER | Only if CREATED status |

**Status Machine** (enforced server-side):
```
CREATED → SENT           (WAITER only)
SENT → PENDING           (auto on kitchen receive)
PENDING → COOKING        (KITCHEN only)
COOKING → READY          (KITCHEN only)
READY → SERVED           (WAITER only)
SERVED → PAYMENT_PENDING (WAITER only)
PAYMENT_PENDING → PAID   (auto/CASHIER)
```

**Key details**:
- Order number: auto-increment `ORD-0001`, `ORD-0002`, etc. per session
- On create: snapshot product name + price into OrderItem (immutable)
- On status change: broadcast SSE `order:status_updated`
- On create: broadcast SSE `order:created` to KITCHEN + CASHIER
- Blocked if session is closing/closed

**Verification**: Walk through entire status chain via API, verify role gating at each step.

---

### Phase 11 — Payments API

#### [NEW] `/backend/src/routes/payments.ts`

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/payments` | POST | WAITER | Initiate payment (method, orderId) |
| `/api/payments/pending` | GET | CASHIER | List pending cash/card payments |
| `/api/payments/:id/confirm` | PATCH | CASHIER | Confirm cash/card payment |
| `/api/payments/webhook/razorpay` | POST | public | UPI auto-confirm |
| `/api/payments/history` | GET | CASHIER/ADMIN | Payment history with filters |

#### [NEW] `/backend/src/services/payment.service.ts`

**Cash/Card flow**:
1. Waiter POST → creates Payment (PENDING), order → PAYMENT_PENDING
2. Appears in cashier queue
3. Cashier confirms → Payment PAID, order → PAID
4. For cash: validate `amountTendered >= amount`, calculate `change`

**UPI flow**:
1. Waiter POST with method=UPI → generate UPI string, create Payment (PENDING)
2. QR displayed on waiter screen
3. Customer pays → Razorpay webhook fires → verify signature → Payment PAID
4. SSE `payment:confirmed` → waiter screen auto-updates

**Verification**: Test all 3 payment methods end-to-end.

---

### Phase 12 — Reports API

#### [NEW] `/backend/src/routes/reports.ts`

| Endpoint | Method | Auth |
|----------|--------|------|
| `/api/reports/dashboard` | GET | ADMIN | Live today's stats |
| `/api/reports/monthly` | GET | ADMIN | `?month=&year=` aggregated data |
| `/api/reports/export` | GET | ADMIN | `?format=pdf\|xls&month=&year=` |

**Dashboard endpoint returns**:
- Today's revenue, order count, active tables, session info
- Last 7 days revenue (for area chart)
- Recent orders (last 20)
- Top products today

**Monthly endpoint returns**:
- Revenue by day (for bar chart)
- Orders by status (for pie chart)
- Top 10 products
- Full orders list with pagination

**Export**:
- PDF: server-side generation with basic layout
- XLS: CSV format with proper headers

**Verification**: Seed order data → verify dashboard returns correct aggregations.

---

### Phase 13 — Frontend: Design System Setup

#### [NEW] `/frontend/src/index.css`
All CSS custom properties:
```css
:root {
  --brand-dark: #1B4332;
  --brand-mid: #2D6A4F;
  --brand-main: #40916C;
  --brand-light: #74C69D;
  --brand-pale: #D8F3DC;
  --accent: #F4A261;
  --danger: #E63946;
  --danger-pale: rgba(230,57,70,0.12);
  --success: #40916C;
  --success-pale: rgba(64,145,108,0.12);
  --surface-0: #FFFFFF;
  --surface-1: #F8FAF9;
  --surface-2: #EEF4F0;
  --border: #DDE8E2;
  --text-primary: #0D1F17;
  --text-secondary: #4A6B58;
  --text-muted: #8FA99A;
}
```

#### [NEW] `/frontend/tailwind.config.ts`
Extend theme with all design tokens, Google Fonts (Syne, DM Sans, JetBrains Mono).

#### [NEW] `/frontend/src/components/ui/` — Core UI Components
Each component: fully typed, animated with Framer Motion, uses design tokens.

| Component | Description |
|-----------|-------------|
| `Button.tsx` | Primary, Danger, Ghost variants, loading spinner, disabled state |
| `Input.tsx` | Text, email, password (show/hide), number — focus ring, error state |
| `Badge.tsx` | Status badges with color variants (success, danger, warning, neutral) |
| `Modal.tsx` | Backdrop blur, scale animation, close on Escape/overlay click |
| `Card.tsx` | rounded-2xl, shadow-sm, border, hover states |
| `Spinner.tsx` | Brand-colored spinner + pulse skeleton loader |
| `Toast.tsx` | Slide-in from top-right, auto-dismiss 4s, success/error/info variants |
| `Select.tsx` | Custom styled select with dropdown |
| `Switch.tsx` | Toggle switch for boolean settings |
| `Table.tsx` | Sortable, hoverable rows, no external borders |
| `Pagination.tsx` | Page numbers + prev/next |
| `ConfirmModal.tsx` | Destructive action confirmation with danger styling |

#### [NEW] `/frontend/src/components/shared/`

| Component | Description |
|-----------|-------------|
| `StatusBadge.tsx` | Order status with color mapping + icon |
| `TableCard.tsx` | Shape-aware (round/square/rect), color by status (empty/occupied/reserved) |
| `ProductCard.tsx` | Image, name, price, category chip, action buttons |
| `OrderLine.tsx` | Name + modifiers, qty, price, remove button |
| `PaymentModal.tsx` | 3-step payment flow (method → details → confirmation) |
| `QRDisplay.tsx` | qrcode.react wrapper with amount + UPI ID display |

**Verification**: Storybook-style page (`/dev/components`) showing all components in all states.

---

### Phase 14 — Frontend: Login + Set Password Pages

#### [NEW] `/frontend/src/pages/auth/Login.tsx`
- Split layout: left brand panel (gradient + floating SVG), right login card
- Email + password inputs with validation
- Error shake animation + red borders
- Loading state on submit
- On success: redirect to role-appropriate dashboard

#### [NEW] `/frontend/src/pages/auth/SetPassword.tsx`
- Same split layout
- Shows role badge from token decode
- Password + Confirm Password with strength indicator
- On success: redirect to `/login` with success toast

#### [NEW] `/frontend/src/store/useAuthStore.ts`
- Zustand store: `user`, `isAuthenticated`, `login()`, `logout()`, `refreshToken()`
- Persist user in memory (not localStorage — security)
- Auto-refresh via interceptor

#### [NEW] `/frontend/src/hooks/useAuth.ts`
- Hook wrapping auth store + React Query for `/api/auth/me`

**Verification**: Full login → set password → login flow in browser.

---

### Phase 15 — Frontend: Admin Layout + All Admin Pages

#### [NEW] `/frontend/src/components/layout/AdminLayout.tsx`
- 240px sidebar (brand-mid bg, white text)
- Logo "Café POS" in Syne 800
- Nav items with Lucide icons: Dashboard, Staff, Products, Floors & Tables, Payment Methods, Session, Reports
- Active item: lighter bg, left border accent
- Bottom: user avatar + name + logout
- Top bar: page title + breadcrumb + notification bell
- Content area with page transition animations

#### [NEW] `/frontend/src/pages/admin/Dashboard.tsx`
- 4 stat cards with animated count-up (useCountUp hook)
- Revenue area chart (Recharts, 7 days)
- Recent orders table + top products horizontal bar chart
- SSE-powered live updates

#### [NEW] `/frontend/src/pages/admin/Staff.tsx`
- Staff table with role/status badges
- Invite modal: email + role select
- Actions: change role dropdown, resend invite, remove with confirm
- Empty state illustration

#### [NEW] `/frontend/src/pages/admin/Products.tsx`
- Left: category panel (240px) with add category
- Right: product grid (3 cols)
- Product cards with image, name, price, toggle active
- Add/Edit drawer (480px, slides from right)
  - Image upload, name, category, price, tax, description
  - Variants section (dynamic add/remove)
  - Toppings section (dynamic add/remove)

#### [NEW] `/frontend/src/pages/admin/Floors.tsx`
- Floor tabs (add floor as "+" tab)
- Canvas with grid overlay
- Table cards positioned by posX/posY
- Shape-aware rendering (circle, square, rectangle)
- Drag to reposition (update position on drop)
- Click to edit modal
- Add table: click canvas to place

#### [NEW] `/frontend/src/pages/admin/PaymentConfig.tsx`
- 3 cards: Cash, Card, UPI with toggle switches
- UPI expanded: UPI ID input, display name, live QR preview
- Save button

#### [NEW] `/frontend/src/pages/admin/Session.tsx`
- Active session: green banner, stats, close button with confirm
- No session: centered card with open button, session history table
- Close modal with warning about in-progress orders

#### [NEW] `/frontend/src/pages/admin/Reports.tsx`
- Filter bar: month picker, session/staff/product dropdowns, export buttons
- 4 stat cards
- Revenue bar chart (full month)
- Pie chart (orders by status) + horizontal bar (top products)
- Full orders table with pagination

**Verification**: Navigate all admin pages, verify data loads, CRUD operations work.

---

### Phase 16 — Frontend: Waiter Layout + Floor View + Order Screen

#### [NEW] `/frontend/src/components/layout/WaiterLayout.tsx`
- Top bar only (no sidebar)
- Left: logo, Center: floor tabs, Right: "My Orders" + bell + avatar
- Session Gate overlay component

#### [NEW] `/frontend/src/pages/waiter/Floor.tsx`
- Floor tabs matching admin floors
- Canvas with tables at posX/posY
- Color coding: empty (success-pale), occupied (danger-pale)
- Hover: scale(1.03) spring animation + tooltip
- Click empty → new order, click occupied → existing order
- Legend at bottom-right

#### [NEW] `/frontend/src/pages/waiter/Order.tsx`
3-panel layout:

**Left panel** (200px):
- Shop logo
- Category list with icons
- Active: brand-main bg, white text

**Middle panel** (flex-1):
- Search bar
- Product grid (2 cols) with images
- Customization bottom sheet (Framer Motion slide-up):
  - Image + name, quantity stepper
  - Size/Sugar/Ice pill selectors
  - Toppings multi-select chips
  - "Add to Order" button

**Right panel** (320px):
- Table number + order number header
- Order lines with edit/remove
- Subtotal → Tax → Total (Syne font)
- "Send to Kitchen" button (disabled until items added)
- "Initiate Payment" button (only when ≥ SERVED)
- Status bar: current status pill, SSE-updated

**Verification**: Create order → add items with customizations → send to kitchen → verify status updates.

---

### Phase 17 — Frontend: Waiter My Orders + Payment Modal

#### [NEW] `/frontend/src/pages/waiter/MyOrders.tsx`
- Card list for all waiter orders this session
- Each card: order#, table, item count
- Status timeline stepper (9 states, current highlighted)
- "Mark as Served" when READY
- "Initiate Payment" when SERVED
- Realtime SSE updates

#### [NEW] `/frontend/src/components/shared/PaymentModal.tsx` (full implementation)
**Step 1**: Choose method (Cash/Card/UPI cards, disabled per config)
**Step 2a — Cash**: "Mark as Cash Pending" → appears in cashier queue
**Step 2b — Card**: "Mark as Card Pending" → same
**Step 2c — UPI**: Large QR code, amount display, "Waiting..." spinner, SSE listens for `payment:confirmed`, success animation on confirm

**Verification**: Test all 3 payment flows from waiter side.

---

### Phase 18 — Frontend: Kitchen Queue (Kanban + SSE)

#### [NEW] `/frontend/src/components/layout/KitchenLayout.tsx`
- Full screen, surface-1 bg
- Minimal sidebar: logo, "Queue" nav, avatar, live clock

#### [NEW] `/frontend/src/pages/kitchen/Queue.tsx`
- 4-column Kanban: PENDING (yellow) | COOKING (orange) | READY (green) | SERVED (grey)
- Each column: 280px fixed, scroll-y
- Order card:
  - Order# (mono) + Table badge + elapsed time (ticking)
  - Items list with checkboxes (isDone → strikethrough)
  - "Move to [next]" button
  - Urgent: >15min in PENDING → pulsing red border
- SSE: new orders slide into PENDING with spring animation
- Browser notification on new order (if permission granted)
- SERVED column: last 10 completed, greyed out

**Verification**: Create order from waiter → appears in kitchen → move through statuses → verify waiter sees updates.

---

### Phase 19 — Frontend: Cashier Pending + History

#### [NEW] `/frontend/src/components/layout/CashierLayout.tsx`
- Top bar: logo, "Pending" + "History" tabs, avatar

#### [NEW] `/frontend/src/pages/cashier/Pending.tsx`
Split view:
- **Left 60%**: Pending orders list
  - Order#, Table, Method badge, Amount, Waiter, Time waiting, "Confirm" button
  - UPI orders shown as "Auto-confirmed" with green badge
  - Sorted oldest first
- **Right 40%**: Confirmation panel (on row click)
  - Order details: items, subtotal, tax, total
  - Cash: amount tendered input → live change calculation → confirm
  - Card: simple confirm button
  - Confirmation animation: receipt + checkmark

#### [NEW] `/frontend/src/pages/cashier/History.tsx`
- Table: Order#, Table, Method, Amount, Confirmed by, Time
- Filters: method, time range
- Summary row: today's cash/card/UPI totals

**Verification**: Waiter initiates payment → cashier sees in queue → confirms → order marked PAID.

---

### Phase 20 — Frontend: SSE Integration Across All Roles

#### [NEW] `/frontend/src/hooks/useSSE.ts`
- Establishes SSE connection to `/api/events`
- Auto-reconnect with exponential backoff (1s, 2s, 4s, max 30s)
- Parses events, dispatches to Zustand stores
- Connection status indicator in UI

#### [NEW] `/frontend/src/store/useSSEStore.ts`
- Connection status: connecting, connected, disconnected
- Event handlers registered per store

#### [MODIFY] All role stores
- `useOrderStore` — handles `order:created`, `order:status_updated`
- `useSessionStore` — handles `session:opened`, `session:closing`, `session:closed`
- `usePaymentStore` — handles `payment:confirmed`

#### [NEW] `/frontend/src/components/layout/SessionGate.tsx`
- Full screen overlay when no active session
- Large clock icon + "No Active Session" message
- SSE listens for `session:opened` → auto-removes overlay + toast
- SSE listens for `session:closing` → shows banner + countdown

**Verification**: Multi-tab testing — open waiter, kitchen, cashier tabs, verify all receive realtime updates.

---

### Phase 21 — Session Close Graceful Flow (End-to-End)

This is an integration phase — no new files, but end-to-end testing of:

1. Admin clicks "Close Session"
2. All staff see "Session closing" banner
3. New order creation blocked (waiter sees disabled button + message)
4. Existing orders continue through pipeline
5. Kitchen processes remaining orders
6. Waiters mark served
7. Cashiers confirm payments
8. Server detects all orders → PAID/CANCELLED
9. `session:closed` broadcast
10. All staff see Session Gate overlay
11. Tables reset to empty

**Verification**: Full walkthrough with multiple browser tabs simulating different roles.

---

### Phase 22 — Polish: Animations, Empty States, Error States, Loading Skeletons

#### Animations (Framer Motion)
- Page enter: `opacity 0→1, y 16→0, 0.3s`
- Card stagger: `staggerChildren: 0.05s`
- Modal: `scale 0.95→1, opacity 0→1`
- Status badges: `layout` animation
- Table cards: spring on color transition
- Notifications: slide in top-right, auto-dismiss 4s
- Kanban cards: `layoutId` for column transitions

#### Empty States
- Staff page: illustration + "No staff yet" + invite CTA
- Products: "No products" + add product CTA
- Orders: "No orders yet" + table illustration
- Kitchen queue: "All caught up! 🎉" centered message

#### Error States
- Network error: toast + retry button
- Form validation: inline red messages + field highlighting
- 403: "Access denied" page with redirect
- 404: "Page not found" with home link

#### Loading States
- Pulse skeleton loaders for all data tables
- Card skeletons for product grids
- Stat card number shimmer
- Custom brand-colored spinner

**Verification**: Verify every page has proper loading, empty, and error states. Test offline/slow network.

---

## Open Questions

> [!IMPORTANT]
> **1. PostgreSQL Setup**: Do you have PostgreSQL installed locally, or should I include a `docker-compose.yml` for the database?

> [!IMPORTANT]
> **2. SMTP Credentials**: Should I set up a console-log fallback for development (prints invite links to terminal), or do you have Gmail/SMTP credentials ready?

> [!IMPORTANT]
> **3. Razorpay Keys**: Do you have Razorpay test-mode API keys, or should UPI payments use a mock webhook for development?

> [!NOTE]
> **4. Tailwind Version**: The plan uses Tailwind CSS v3. Confirm if you'd prefer v4 (which has a different configuration approach).

> [!NOTE]
> **5. Image Storage**: Start with local `/uploads` directory, or set up Cloudinary from the beginning?

> [!NOTE]
> **6. Deployment**: Any specific deployment target in mind (Vercel, Railway, VPS)? This affects build configuration but not core development.

---

## Verification Plan

### Automated Tests
- **Backend**: Jest + Supertest for all API routes
  - Auth flow (login, refresh, verify, set-password)
  - Role-based access control for every endpoint
  - Order status machine transitions (valid + invalid)
  - Payment flows (cash, card, UPI webhook)
  - Session open/close lifecycle
- **Frontend**: Vitest + React Testing Library for component tests
- **Database**: Prisma migrate + seed runs cleanly from scratch

### Integration Testing
- Multi-tab browser testing for SSE (waiter + kitchen + cashier simultaneously)
- Full order lifecycle: create → kitchen → serve → pay → session close
- Session close graceful flow with in-progress orders

### Manual Verification
- Visual review of all screens against design spec
- Responsive behavior (though POS is primarily tablet/desktop)
- Animation smoothness at 60fps
- Error state coverage (network off, invalid data, unauthorized access)
