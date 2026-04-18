
## Diagnosis

The `useSimulator` hook logic is correct in principle — toggling `running` should clear the interval. But network logs show `simulate-tick` is still being POSTed every ~2.5s, and from the user's point of view the button "does nothing." A few real problems:

1. **`Pause` only stops THIS tab from invoking ticks** — but the simulator runs from every open dashboard tab/device (including the published URL). If any other viewer has the dashboard open, drivers keep moving.
2. **Drivers keep moving visually even after a true pause** because realtime subscriptions in `useLiveData` continue receiving updates from any other tick source.
3. **No visible feedback** that the pause actually took effect — no badge, no toast, no greyed-out state. Easy to think the button is dead.
4. **No global pause** — even with one tab paused, the edge function still gets invoked from the next tab open.

## Plan: make Pause actually pause the simulation globally + give clear feedback

### 1. Server-side pause flag (`supabase/functions/simulate-tick/index.ts`)
- Add a tiny `app_settings` table with a single row: `simulation_paused boolean`.
- At the top of the edge function, read this flag. If paused → return `{ ok: true, paused: true }` immediately without moving any drivers.
- This means pause works **globally** across all tabs/devices, not just locally.

### 2. New migration
- Create `public.app_settings` table with one row `(key text primary key, value jsonb)`.
- RLS: allow public read + public update (it's a demo control, not sensitive). Or restrict update to authenticated — for now allow public to keep the demo simple.
- Seed the row `('simulation_paused', false)`.

### 3. Update `useSimulator` hook
- On mount, read the current paused flag from `app_settings` and use it as initial state.
- `setRunning(next)` now writes to the DB (`upsert`) AND updates local state.
- Subscribe to realtime changes on `app_settings` so all open tabs see pause/resume instantly.
- Keep the local interval guard so we don't waste round-trips when paused.

### 4. UI feedback in `src/pages/Index.tsx`
- When paused, show a small **"Simulation paused"** badge next to the button (amber dot + label).
- Add a brief `toast` confirmation on toggle ("Simulation paused" / "Simulation resumed") so the user immediately sees the click registered.
- Disable the button briefly during the DB round-trip to prevent double-clicks.

### Files touched
- `supabase/functions/simulate-tick/index.ts` — early-return when paused.
- `supabase/migrations/<new>.sql` — `app_settings` table + RLS + seed row + realtime publication.
- `src/hooks/useSimulator.ts` — read/write/subscribe to the DB flag.
- `src/pages/Index.tsx` — paused badge + toast feedback.

### Result
Clicking Pause will: (a) immediately show a "Paused" badge + toast, (b) stop this tab from invoking ticks, (c) make the edge function no-op for any other tab that calls it, (d) sync state across all open dashboards in real time.
