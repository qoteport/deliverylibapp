# Web platform and administration

The active React entry point now uses `src/platform/WebPlatform.tsx`. It reuses Firebase Authentication and the mobile command backend. The old monolithic App and legacy portals remain in source for reference; their disabled local mutation endpoints are not re-enabled.

## Delivered workflows

- Food, Grocery, Homes, Motors and Lifestyle share responsive cards, advanced custom filter sheets, current promotions, Black Friday before sale sections, favorites, swipeable image/video galleries, full-size photos, sharing, vendor identity and deterministic related items.
- Grocery supports shop browsing, merchant-specific baskets, saved delivery details, a single final-summary checkout and order tracking. Food retains preparation, pickup and dine-in rules. Drinks stay out of the global food feed.
- Lifestyle carts group by seller and send canonical order requests through in-app chat. Homes and Motors remain contact-only. Approved Lifestyle merchants can use the existing Live Market commerce workflow.
- Messages support private images and videos, in-browser recorded voice notes, vendor catalogue references with price/photo, conversation history and unread state. Audio recording requires HTTPS or localhost and browser microphone permission.
- Business workspaces include profile completion, media uploads and ordering, stock/listing updates, promotions, kitchen/grocery order decisions, rider assignment and availability, team invitation links, and a room-based table layout editor with keyboard/drag positioning. Table GPS is advisory and guests confirm their table.
- Rider and driver web screens use the same matching, price proposal, lifecycle and availability APIs as mobile. GPS sharing runs while the page is open; use the native app for background operation.
- Live Market uses LiveKit: restored studio settings, tagged products, camera/mic/flip controls, comments/likes, real sale notices, merchant MoMo instructions, required screenshot cropping, private receipt uploads and manual merchant review. Replay visibility and playback leases stay enforced by the backend. Paid retention is not implemented as a new web payment integration.
- Account settings save delivery details and allow food-preference learning to be paused or forgotten. Food recommendations use existing completed-order features, without an AI service.
- `/admin` has protected application review, status/type/search filters, cursor pagination, approval/rejection/change requests/suspension, reason entry and audit history. Decisions enforce version checks and idempotency on the server, update publication atomically, and notify applicants. Customer UI roles and email addresses cannot grant approval privileges.

## Production configuration

Deploy the updated `deliverylib_mobile/backend` before this frontend: admin reviews, signed catalogue upload staging and commerce promotions add API routes. Existing mobile routes remain supported. The production API URL is checked into `.env.production` as `https://aura-mobile-iota.vercel.app`; it contains no credentials. Local `.env.local` remains unchanged. Production build configuration fails early for a missing API/Firebase configuration, a local/insecure production API URL, or secret-looking VITE variables.

Set these public build values in the web hosting environment:

```
VITE_COMMAND_API_BASE_URL=https://aura-mobile-iota.vercel.app
VITE_FIREBASE_API_KEY=<Firebase web configuration>
VITE_FIREBASE_AUTH_DOMAIN=<Firebase web configuration>
VITE_FIREBASE_PROJECT_ID=auraliberia
VITE_FIREBASE_STORAGE_BUCKET=<existing Firebase Storage bucket>
VITE_FIREBASE_MESSAGING_SENDER_ID=<Firebase web configuration>
VITE_FIREBASE_APP_ID=<Firebase web configuration>
VITE_FIRESTORE_DATABASE_ID=aura-shared
VITE_GOOGLE_MAPS_API_KEY=<HTTP-referrer-restricted browser key>
VITE_FIREBASE_VAPID_KEY=<public Firebase web-push key>
```

The browser Google Maps key is currently absent locally. Enable Maps JavaScript API and Places API (New), configure billing and restrict the browser key to the deployed web origins. Places autocomplete also falls back to the existing backend proxy, which keeps its server key private. The proxy requires the existing server Maps configuration. Do not reuse an Android-restricted key or put server credentials in VITE variables.

Add the deployed web origin to Firebase Authentication authorized domains and the Google OAuth web client's JavaScript origins. Configure the backend's `API_ALLOWED_ORIGINS` with exact HTTPS web origins; add localhost only to development configuration. API credentials, LiveKit API secrets and Firebase Admin service-account JSON stay on the backend.

For browser push, enable `PUSH_ENABLED` and configure messaging on the backend. The dedicated `/aura-push-sw.js` uses the public VAPID key and verifies the signed-in recipient before showing a notification. The root service worker bypasses all cross-origin requests, `/v1/` routes and authenticated requests; it does not cache private API responses. Browser notification/camera/microphone permissions are requested only by their corresponding user actions.

Media uploads use signed direct PUT URLs and existing backend Firebase Storage credentials, avoiding Vercel request-body limits. Configure the existing bucket's CORS for your web origin (PUT/GET/HEAD and Content-Type), including the chat, receipt and recordings buckets if those are separate. Do not make private receipts or recordings public. Apply a storage lifecycle rule to remove abandoned `catalog-staging/` objects after one day. The application validates size/type, normalizes photos and rate-limits new upload URLs before signing.

LiveKit room creation, token grants, recording credentials/buckets and retention schedules remain configured on the backend as for mobile. Provider credentials and browser billing/permissions were not changed or live-tested during this work.

Use SPA hosting rewrites to `/index.html` for frontend routes such as `/homes`, `/messages/:id`, `/portal`, `/live/:id` and `/admin`. Do not rewrite backend `/v1` paths to the frontend.

## First administrator

Using Firebase Console or a trusted Admin SDK environment, select the **aura-shared** Firestore database and set `memberships/<verified Firebase Authentication UID>` to include:

```
role: "admin"
active: true
```

Use `super_admin` only for an intended platform administrator. No public registration flow can write this protected record. Existing business associations remain separate. No production admin privileges or approval decisions were changed during implementation. `/admin` asks guests to sign in and rejects authenticated accounts without this membership. Revocation is checked again inside each review transaction.

Reviews currently publish at most 400 catalog records in one atomic transaction; larger businesses get an explicit staged-review requirement instead of a partially published catalog. Queue counts/search describe loaded records, with a Load more action for subsequent pages. The portal reviews business applications; it does not introduce arbitrary user-role granting, refunds or a payment settlement system.

## Local verification

```
npm ci
npm run lint
npm test
npm run build
```

Run the real local backend on port 8787 for authenticated local workflows. For isolated visual review without credentials or database writes, `npm run preview:fixtures` serves clearly labelled read-only fixtures there; never run it alongside the real backend. Then run `PORT=8124 npm run dev` (PowerShell: `$env:PORT='8124'; npm run dev`). Fixtures deliberately reject private endpoints.

Tests cover discount expiry/reference prices, recommendations, admin denial and versioned approval, canonical checkout, guest-login continuation, signed catalogue uploads, nested dialog focus/scroll restoration, and service-worker privacy. The backend suite additionally covers dispatch races, order lifecycle, invitations, rich chat, Live Market payments and replay policy. Real Google OAuth, browser push, live camera/audio and two-party production broadcasts still require configured providers and an authenticated manual acceptance run.

Dependencies use npm and `package-lock.json`. A compatible gRPC override fixes the transitive Firebase Node dependency, and unused Vite PWA tooling was removed; the app keeps its own existing service worker.


## Legal pages

Public `/terms` and `/privacy` routes (also `/terms-and-conditions` and `/privacy-policy`) are linked from the footer, account screen and sign-in sheet. Vercel rewrites cover these direct policy links. Mobile bundles matching content in `deliverylib_mobile/assets/legal/policies.json` so the policies remain readable without a web connection or login. The web copy is `src/platform/legal-content.json`; keep both documents aligned when updating policy text.

The operator legal name and official support/privacy email have been requested and remain unconfirmed. The pages explicitly show contact details awaiting confirmation. Confirm those details and review the documents against actual operations before publication; no fabricated contact address or automatic acceptance requirement has been added.
