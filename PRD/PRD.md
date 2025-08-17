# PRD.me — DRP Workshop (Web + Mobile)
**Product Requirements Document v1.0**

---

## TL;DR (What we're building)

A responsive SaaS for coaches ("PRO"), staff, and athletes with:

- **Public marketing site** (landing, pricing, about, contact)
- **Auth** (single sign-in page) with PRO purchase gate via Stripe
- **Role-based app shell** after login with slide-in menu and pages:
  - Profile (RW all users)
  - Dashboard (role-tailored UI)
  - Your Team (PRO: RW staff+athletes; Staff/Athlete: read-only)
  - Messages (team chat; PRO+Staff can create chats)
  - Calendar (PRO/Staff availability + sessions/bookings/meetings; Athletes view-only when involved)
  - Payments (PRO: payouts, requests, performance; Athlete: pay trainer)
  - SWEATsheet (program builder, 4 phases; PRO/Staff build, Athlete consume)
  - Logout (full sign-out)

**Key Flow**: Stripe purchase activates PRO. PRO can issue limited Staff and Athlete invites via role-bound links.

**Focus**: Simplicity, modern UX, security-first, and cost control on Firebase.

---

## 1. Architecture

### 1.1 Tech Stack

- **Web**: React + TypeScript + Vite + Tailwind CSS
- **Mobile**: React Native (Expo recommended)
- **Auth/DB/Hosting**: Firebase Auth, Firestore (Native mode), Firebase Hosting, Cloud Functions (Node 20+), Firebase Storage (user avatars only)
- **Payments**: Stripe via Firebase Extension: Run Payments with Stripe (and/or custom Functions as needed)
- **Env/Secrets**: Firebase project config + Functions secrets (Stripe keys, webhook secret)

### 1.2 Monorepo Layout

```
/apps
  /web                 # React + Vite
  /mobile              # React Native (Expo)
  /functions           # Cloud Functions (admin SDK, Stripe webhooks, invites)
  /scripts             # one-off scripts (e.g., backfill)
/packages
  /ui                  # shared React UI components (Tailwind)
  /types               # shared TypeScript types (zod + ts)
  /lib                 # shared helpers (auth, firestore, validation)
```

### 1.3 Core Principles

- Role-based access via Firebase custom claims + Firestore rules
- Invite flow issues signed, expiring tokens to claim Staff/Athlete seats
- Firestore reads minimized with role-filtered queries, denormalized summaries, and pagination
- "Server-only" authority (Functions) for anything billing, roles, seats, or sensitive writes

---

## 2. User Roles & Lifecycle

### 2.1 Roles

- **PRO** (owner/trainer): pays, owns a team, manages seats, content, payments
- **STAFF** (assistant/coach): operates under a PRO's team. Can create chats, edit SWEATsheets
- **ATHLETE** (client): consumes content, pays the PRO, limited read-only in places

### 2.2 Sign-up / Sign-in

- Landing pages are public
- Single sign-in page for all roles
- Only PRO can self-create an account (no invite needed). They must complete Stripe checkout to activate
- Staff/Athlete accounts are created via invite links from PRO's seat inventory. Invitee signs in/up through the same page; link redemption assigns role & team

### 2.3 Activation Gates

- If a new PRO has not completed Stripe checkout → redirect to `/billing/subscribe`
- After Stripe success webhook → mark `proStatus=active`, set custom claim `role=PRO`

---

## 3. Navigation & Layout

### 3.1 Public (Unauthenticated)

**Header**: left About, Pricing, Contact; right Register, Sign in

**Pages**:
- Landing (hero, mission, CTA)
- Pricing (only one paid tier: PRO)
- About
- Contact (contact form → Cloud Function email/Discord webhook)

### 3.2 Authenticated App Shell

- **Top center**: app logo
- **Top right**: simple menu button (hamburger). On click → slide-in drawer with:
  - Profile (RW) — all roles
  - Dashboard — all roles; content varies
  - Your Team — PRO: RW seats & members; Staff/Athlete: read-only list
  - Messages — PRO/Staff: create chats; Athlete: participate if member
  - Calendar — PRO/Staff: RW; Athlete: RO on related items
  - Payments — PRO & Athlete only
  - SWEATsheet — PRO/Staff: build; Athlete: view current/archived
  - Logout — all roles

---

## 4. Data Model (Firestore, Minimal & Scalable)

Collection names are lowerCamel. IDs are ULIDs. Use server timestamps. Use composite indexes sparingly.

### Core Collections

```typescript
// /users/{uid}
export type User = {
  uid: string
  email: string
  displayName: string
  photoURL?: string
  role: 'PRO' | 'STAFF' | 'ATHLETE'           // mirror of custom claim (read only for clients)
  proId?: string                               // which PRO owns this user (self if PRO)
  seats?: { staffLimit: number; athleteLimit: number } // only for PRO
  createdAt: FirebaseTimestamp
  updatedAt: FirebaseTimestamp
  proStatus?: 'inactive' | 'active'            // for PRO billing status
}

// /teams/{proId}                              // one team per PRO
export type Team = {
  proId: string
  name: string
  membersCount: { staff: number; athlete: number }
  createdAt: FirebaseTimestamp
  updatedAt: FirebaseTimestamp
}

// /invites/{inviteId}
export type Invite = {
  proId: string
  role: 'STAFF' | 'ATHLETE'
  email?: string                               // optional email constraint
  tokenHash: string                            // hashed, signed token
  expiresAt: FirebaseTimestamp
  claimedBy?: string                           // uid if claimed
  createdAt: FirebaseTimestamp
}

// /chats/{chatId}
export type Chat = {
  proId: string
  createdBy: string                            // uid
  lastMessage?: { text: string; at: FirebaseTimestamp; by: string }
  members: string[]                            // array of uids (size-limited)
  createdAt: FirebaseTimestamp
}

// /chats/{chatId}/messages/{messageId}
export type Message = {
  chatId: string
  by: string
  text: string
  createdAt: FirebaseTimestamp
}

// /events/{eventId}
export type Event = {
  proId: string
  title: string
  type: 'availability' | 'session' | 'booking' | 'meeting'
  startsAt: FirebaseTimestamp
  endsAt: FirebaseTimestamp
  createdBy: string
  attendees: string[]                          // uids (athlete included if relevant)
  visibility: 'team' | 'attendees'
  createdAt: FirebaseTimestamp
  updatedAt: FirebaseTimestamp
}

// /payments/{paymentId}                        // summary, not source of truth
export type Payment = {
  proId: string
  payerUid: string                             // athlete uid
  amount: number                               // cents
  currency: string
  stripePaymentIntentId: string
  status: 'succeeded' | 'processing' | 'requires_action' | 'failed'
  createdAt: FirebaseTimestamp
}

// /programs/{programId}                        // SWEATsheet container
export type Program = {
  proId: string
  athleteUid: string
  title: string
  status: 'current' | 'archived' | 'draft'
  phases: [Phase, Phase, Phase, Phase]         // fixed 4 phases
  createdBy: string
  createdAt: FirebaseTimestamp
  updatedAt: FirebaseTimestamp
}

export type Phase = {
  name: string                                 // e.g., Prep, Strength, Power, Recovery
  blocks: Block[]
}

export type Block = {
  muscleGroup: string
  exercises: Exercise[]
  notes?: string
}

export type Exercise = {
  name: string
  sets: number
  reps: number
  load?: string                                // optional weight prescription
  tempo?: string
  restSec?: number
}
```

### Index Suggestions

- `chats` by `proId + createdAt desc`
- `events` by `proId + startsAt`
- `programs` by `proId + athleteUid`

---

## 5. Security Model

### 5.1 Auth & Claims

- On PRO activation, set custom claims `{ role:'PRO', proId: uid }`
- On Staff/Athlete invite redemption, set `{ role:'STAFF'|'ATHLETE', proId: proId }`
- Client reads role from Firestore `/users/{uid}` mirror for UI only; do not trust it for access

### 5.2 Firestore Rules (v2 Example)

Keep tight; all create/update for sensitive resources done through Functions where needed.

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function isSignedIn() { return request.auth != null; }
    function uid() { return request.auth.uid; }
    function role() { return request.auth.token.role; }
    function proId() { return request.auth.token.proId; }

    match /users/{userId} {
      allow read: if isSignedIn() && (userId == uid() || role() == 'PRO' && userId in getTeamMemberIds());
      allow update: if isSignedIn() && userId == uid(); // self-edit only (limited fields via rules)
      allow create, delete: if false; // created by Functions
    }

    // Team doc visible to its members
    match /teams/{teamProId} {
      allow read: if isSignedIn() && (teamProId == proId());
      allow write: if isSignedIn() && role() == 'PRO' && teamProId == uid();
    }

    match /invites/{inviteId} {
      allow read: if false; // opaque
      allow write: if isSignedIn() && role() == 'PRO' && request.resource.data.proId == uid();
    }

    match /chats/{chatId} {
      allow read: if isSignedIn() && (uid() in resource.data.members);
      allow create: if isSignedIn() && (role() == 'PRO' || role() == 'STAFF') && request.resource.data.proId == proId();
      allow update, delete: if isSignedIn() && (role() == 'PRO' || role() == 'STAFF') && resource.data.proId == proId();
    }

    match /chats/{chatId}/messages/{messageId} {
      allow read, create: if isSignedIn() && (uid() in get(/databases/$(database)/documents/chats/$(chatId)).data.members);
      allow update, delete: if false; // immutable
    }

    match /events/{eventId} {
      allow read: if isSignedIn() && (
        role() == 'PRO' && resource.data.proId == proId() ||
        role() == 'STAFF' && resource.data.proId == proId() ||
        role() == 'ATHLETE' && (uid() in resource.data.attendees)
      );
      allow create, update, delete: if isSignedIn() && (role() == 'PRO' || role() == 'STAFF') && request.resource.data.proId == proId();
    }

    match /payments/{paymentId} {
      allow read: if isSignedIn() && (
        role() == 'PRO' && resource.data.proId == proId() ||
        role() == 'ATHLETE' && resource.data.payerUid == uid()
      );
      allow write: if false; // only via Functions/webhooks
    }

    match /programs/{programId} {
      allow read: if isSignedIn() && (
        role() == 'PRO' && resource.data.proId == proId() ||
        role() == 'STAFF' && resource.data.proId == proId() ||
        role() == 'ATHLETE' && resource.data.athleteUid == uid()
      );
      allow create, update, delete: if isSignedIn() && (role() == 'PRO' || role() == 'STAFF') && request.resource.data.proId == proId();
    }
  }
}
```

**Note**: Helper (pseudo) for `getTeamMemberIds()` can be avoided by directly checking membership via server-managed lists (keep members array small). For large teams, switch to a `/members` subcollection and query instead of function calls in rules.

---

## 6. Flows (Happy Paths & Guards)

### 6.1 PRO Sign-up & Billing

1. Visitor hits Register
2. Create Firebase user → provisional `proStatus=inactive`, no claim set
3. Redirect to Stripe Checkout (via Extension or Function)
4. Stripe webhook (Function) on successful payment:
   - Set `/users/{uid}.proStatus='active'`
   - Set custom claims `{role:'PRO', proId: uid}`
   - Create `/teams/{uid}` with seat limits (defaults)
5. Client listens for claim refresh → routes to `/app/dashboard`

**Guards**:
- If `proStatus!='active'` → block app routes; allow only `/billing/subscribe`
- All sensitive writes checked in Functions by verifying role and proId

### 6.2 Invite Staff/Athlete

1. PRO opens Your Team → "Invite Staff" or "Invite Athlete"
2. Client calls callable Function `createInvite({ role, email? })`
3. Function checks seat availability, mints signed token, hashes it, stores `/invites/{id}` with `expiresAt`
4. Returns invite URL: `https://app.com/join?token=...`
5. Invitee visits link → sign-in/up → client calls `redeemInvite(token)`
6. Function validates token, claims seat, sets custom claim `{role, proId}`, writes `/users/{uid}`, updates `/teams/{proId}` counts
7. Redirect to app

**Guards**:
- Token single-use and expiring (e.g., 7 days)
- Attempts beyond seat limit fail with friendly error

### 6.3 Messages

- PRO/Staff can create chat with selected members (enforce small member arrays)
- Messages appended; client paginates by `createdAt` descending (limit 50)
- No edits/deletes; reduce write complexity

### 6.4 Calendar

- PRO/Staff create availability & events
- Athlete can view only events where uid is an attendee

### 6.5 Payments

- Athlete pays PRO via Stripe Checkout/Payment Links generated per PRO
- Webhook writes `/payments` records (summary) and updates financial KPIs on PRO dashboard

### 6.6 SWEATsheet

- PRO/Staff author programs (exactly 4 phases)
- Athlete sees current + archived
- Versioning via `updatedAt`; copy-as-new for revisions

---

## 7. UI/UX Requirements

- **Responsive by default**: Tailwind container + grid utils; test breakpoints: sm, md, lg, xl
- **Top app bar**: logo center, menu button right. Drawer slides from left; click-outside closes
- **Accessible**: semantic HTML, focus rings, ARIA labels for drawer and menu
- **Empty states** for every page
- **Loading/skeletons** for network fetches
- **Error toasts** with retry action
- **No infinite listeners** where not needed; prefer on-demand queries

---

## 8. Acceptance Criteria (Checklist)

### Public
- [ ] Landing renders in <2s on 4G (Uncached)
- [ ] Pricing/About/Contact navigable; contact form sends Function-triggered email

### Auth
- [ ] Single sign-in page for all roles
- [ ] PRO must complete payment to access app
- [ ] Claims update without manual refresh (use `getIdToken(true)` after webhook flag is set)

### App Shell
- [ ] Drawer opens/closes with keyboard ESC & focus trap
- [ ] Role-based menu items and visibility enforced

### Your Team
- [ ] PRO can view seat usage and invite users (links)
- [ ] Staff/Athlete see read-only members list

### Messages
- [ ] PRO/Staff can create chats; Athlete can post in member chats only
- [ ] Message list virtualized; 50 msg pagination; no edits/deletes

### Calendar
- [ ] PRO/Staff can create/update events; Athlete sees attendee events only

### Payments
- [ ] Athlete can complete payment; PRO dashboard shows totals and recent payments
- [ ] Webhooks cannot be spoofed (verify signature)

### SWEATsheet
- [ ] PRO/Staff can create a 4-phase program; Athlete can view assigned programs (current+archived)
- [ ] Program save validates structure client-side and server-side

### Logout
- [ ] Clears Auth and returns to login; protected routes blocked

### Security
- [ ] All sensitive writes go through Functions
- [ ] Firestore rules block unauthorized reads/writes (tested)

### Costs
- [ ] Dashboard loads with ≤3 queries & ≤1 active listener
- [ ] Messages use paginated reads
- [ ] Aggregates maintained by Functions, not client fan-out

---

## 9. Cost Control Guidance (Firebase)

- Prefer `get()` over `onSnapshot()` for screens that don't need real-time
- Narrow queries (`where('proId','==',proId)`, `limit()`)
- Denormalize summaries (e.g., `Team.membersCount`, `Chat.lastMessage`) to avoid fan-out reads
- Pagination with `startAfter`
- Cache with in-app state + IndexedDB persistence (web) and RN storage (mobile)
- Minimal composite indexes; create only those used by UI
- Use TTL (Firestore TTL policies) for ephemeral data like invite docs
- Batch writes and `runTransaction` for counters
- Avoid large arrays; keep members small. For bigger teams, move to `/teams/{proId}/members/{uid}` with indexed queries

---

## 10. Cloud Functions (Outline)

### `createCheckoutSession()` (or use Stripe Extension)
- Auth: signed-in user only
- Creates checkout for PRO tier; returns URL

### Stripe webhook `/stripe/webhook`
- Verify signature; on success: set `proStatus='active'`, set claims, create team doc

### `createInvite({ role, email? })`
- Verify caller is PRO; check seat availability; create Invite with hashed token; return URL

### `redeemInvite({ token })`
- Verify token & expiry; set claims for caller; set `/users/{uid}`; update counts

### `requestPayout()` (optional)
- For PRO; triggers Stripe transfer/reporting (if platform model)

### `onUserCreate` (Auth trigger)
- Write `/users/{uid}` with minimal profile

### `onPaymentIntentWebhook`
- Append `/payments` summary doc

**Secrets**: Store Stripe secret keys & webhook secret via `functions:config:set` or `functions:secrets`

---

## 11. Client Routing & Guards

### Public routes
`/`, `/pricing`, `/about`, `/contact`, `/auth`, `/billing/subscribe`

### App routes
Under `/app/*`
- **Guard**: require `isSignedIn`
- **Additional guard**:
  - If role missing → fetch claims/redirect to `/auth`
  - If `role==='PRO' && proStatus!=='active'` → `/billing/subscribe`

Drawer links rendered by allowed pages list per role.

---

## 12. Implementation Notes (Web + Mobile)

- **Design system**: Tailwind + shared UI in `/packages/ui` (Buttons, Drawer, AppBar, Card, Form, Input, Select)
- **Forms**: react-hook-form + zod schema validation in `/packages/types`
- **State/query**: @tanstack/react-query for data fetching & caching. Avoid listeners unless needed
- **Auth**: Email/password or email-link (magic link). Use reCAPTCHA for abuse protection where needed
- **Mobile**: Mirror routes with a bottom tab + drawer; reuse business logic in `/packages/lib`

---

## 13. Example Component Contracts (TypeScript)

```typescript
// packages/types/src/program.ts
import { z } from 'zod'
export const Exercise = z.object({
  name: z.string().min(1),
  sets: z.number().int().min(1).max(12),
  reps: z.number().int().min(1).max(50),
  load: z.string().optional(),
  tempo: z.string().optional(),
  restSec: z.number().int().min(0).max(600).optional(),
})
export type Exercise = z.infer<typeof Exercise>

// apps/web/src/features/menu/useMenuItems.ts
export function getMenu(role: 'PRO'|'STAFF'|'ATHLETE') {
  const base = [
    { label: 'Profile', to: '/app/profile' },
    { label: 'Dashboard', to: '/app' },
    { label: 'Messages', to: '/app/messages' },
    { label: 'Calendar', to: '/app/calendar' },
    { label: 'SWEATsheet', to: '/app/programs' },
    { label: 'Logout', to: '/logout' },
  ]
  if (role === 'PRO') base.splice(2, 0, { label: 'Your Team', to: '/app/team' }, { label: 'Payments', to: '/app/payments' })
  if (role === 'ATHLETE') base.splice(3, 0, { label: 'Payments', to: '/app/payments' })
  return base
}
```

---

## 14. Testing Plan

- **Unit**: types, validators, helpers, Functions logic
- **Integration**: invite flow, role guard, webhook handling (with signed fixtures)
- **E2E**: Cypress/Playwright: PRO signup → pay → invite staff → send message → create event → build program → athlete views
- **Security tests**: Firestore Rules emulator test suite for negative cases (cross-role access attempts)

---

## 15. Observability & Analytics

- **Logs**: Cloud Functions structured logs (requestId, uid)
- **Metrics**: count payments, active programs, messages sent
- **Analytics**: Page & feature events (anonymized), consent on first visit

---

## 16. Deployment & Environments

- **Envs**: dev, staging, prod (separate Firebase projects)
- **CI/CD**:
  - Lint/Type check/Tests on PR
  - Deploy Functions & Hosting on main branch merges
- **Caching**: Static marketing pages with long Cache-Control + immutable; app shell with medium TTL

---

## 17. Content & Copy (Minimum)

- **Landing**: Mission, hero CTA "Start as PRO", trust signals, brief features
- **Pricing**: One PRO plan (include what's included: seats, messaging, calendar, SWEATsheet, payments)
- **Contact**: Form (name, email, message) → Function mail

---

## 18. Risks & Mitigations

- **Role escalation**: Only Functions set claims; clients cannot
- **Webhook spoofing**: Always verify Stripe signature and event type
- **Runaway reads**: Avoid broad listeners; paginate; denormalize summaries
- **Seat abuse**: Seat checks on invite creation + redemption in a transaction

---

## 19. Done Criteria (Release v1)

- [ ] Public site live
- [ ] PRO can subscribe and enter app
- [ ] Invite issuance + redemption works with seats enforced
- [ ] Role-appropriate menu & access verified via rules tests
- [ ] Messaging, Calendar, SWEATsheet functional per role
- [ ] Payments recorded from Stripe webhooks; PRO sees financial summary; Athlete can pay
- [ ] Emulator test suite passes; basic E2E passes
- [ ] P50 TTI on mobile 4G < 3s for public pages; app shell hydrated < 2.5s

---

## 20. Nice-to-Haves (Post v1)

- Push notifications (Expo + FCM)
- Offline-first for Messages (recent cache) & Programs (read)
- Team-level roles (e.g., Staff permissions granularity)
- Program templates library

---

## Appendices

### Appendix A — Minimal Firestore Indexes (Initial)

- `chats` composite: `proId ASC, createdAt DESC`
- `events` composite: `proId ASC, startsAt ASC`
- `programs` composite: `proId ASC, athleteUid ASC`

### Appendix B — ENV Variables (Examples)

- `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, etc.
- Functions secrets: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `APP_BASE_URL`, `INVITE_TOKEN_SECRET`

### Appendix C — Stripe Model (Simple)

- Single recurring product/price for PRO
- Payment Links or Checkout per-transaction for Athlete→PRO purchases
- Webhook events used: `checkout.session.completed`, `payment_intent.succeeded`, `payment_intent.payment_failed`, `customer.subscription.updated` (if subscriptions for athletes later)

---

**This document serves as the single source of truth to guide implementation in Cursor.**