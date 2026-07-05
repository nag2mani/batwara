# Batwara 💸

**Batwara** is a personal & group expense tracker **and household work ledger**, built with React Native (Expo). Track what you spend, split bills with friends, simplify group debts, import your existing Splitwise history, and settle up — then log and peer-validate household chores so everyone's contribution stays fair and visible. All in one app, installable as an Android APK.

<table align="center">
  <tr>
    <td align="center">
      <img src="https://github.com/user-attachments/assets/38778044-9ce4-47d2-bbe1-86aff5e22e7c" width="180"><br>
      <b>Dashboard</b>
    </td>
    <td align="center">
      <img src="https://github.com/user-attachments/assets/b90675ae-78b3-4da8-b62f-68e2256bbb3b" width="180"><br>
      <b>Recent Activities</b>
    </td>
    <td align="center">
      <img src="https://github.com/user-attachments/assets/057593c6-10c9-4b73-b174-965f8f1f8a0f" width="180"><br>
      <b>Work Ledger</b>
    </td>
    <td align="center">
      <img src="https://github.com/user-attachments/assets/a347ad5f-498d-4dab-a1bb-fc866f28060a" width="180"><br>
      <b>Groups</b>
    </td>
  </tr>
</table>

---

## Features

### Dashboard
- **Date range picker** (top-right) — view your data over **Last 7 days**, **Last 30 days**, **Last year**, **All time**, or a **custom date range**. Totals and the chart update to match the selected range.
- **Group total** and **Personal total** for the selected range
- **Your net balance** — your overall position across **all groups combined**, shown from *your* perspective:
  - a clear per-person breakdown — **"You owe Animesh ₹4,199.19"**, **"Shadab owes you ₹2,293.32"**
  - a Settle Up shortcut
- **Spending by category** — pie chart broken down by category (Grocery, Rent, Dining, Entertainment, Utilities, Others), **ordered highest percentage first**. Tap the card for a detailed sheet showing each category's **amount and exact percentage** with proportional bars.
- **Recent activity** — latest expenses at a glance
- **Floating "+" button** — quick-add an expense from anywhere on the screen

### Activity
The **Activity** tab is the unified record of everything logged, split into three filters:
- **Group** — all group expenses
- **Personal** — your personal expenses
- **Work** — your own household work submissions (pending or verified)

- Category icons and color coding throughout
- **Tap any expense** to open a detail view — amount, category, date, group, who paid, split method, and the full per-person split breakdown
- **Tap any work entry** to open its detail — validation progress, voters, effort points, photos, and reactions
- **Context-aware "+" button** — adds an expense on the Group/Personal filters, or logs work on the Work filter
- **Delete** an expense from the row (red trash icon) or from the detail view

### Groups
- Create groups with a name and emoji (floating "+" button)
- **Add only registered users** — search by name or email; no free-text members
- **Your balances** — the group detail shows debts from *your* perspective only (who owes you / whom you owe within that group)
- Group detail: member list, your balances, expense history, and a **Settle Up** action
- **Delete a group** (and all its expenses) from the group detail header

### Bill Splitting
- **Equal split** — divide the bill evenly among all participants
- **Exact split** — enter a specific amount per person
- **Percentage split** — assign a percentage share to each person

### Import from Splitwise
- Import a group's full history directly from a **Splitwise CSV export** (Settings → Import from Splitwise)
- Robust CSV parsing — detects columns by header name, so it works whether or not the export includes a `Currency` column
- Maps each Splitwise balance row to a proper expense: the person with the positive balance is the **payer**, others owe their share, and a `0` means that person wasn't part of the split
- **"Which member are you?"** selector — links your column to your account (auto-detected by email) so balances compute from your perspective
- Auto-creates the group, members, and every expense in one tap

### Debt Simplification & Pairwise Balances
- **Pairwise balances** power the dashboard and group views — your direct, per-person position (who owes you / whom you owe)
- A **Splitwise-style simplification** algorithm is also available to collapse complex multi-person debts into the minimum number of transactions

### Settle Up
- Record a payment from one member to another
- Settlements are reflected immediately in everyone's balances

### Work Ledger 🧹
A full household-chore tracker with **peer validation**, so effort is credited fairly and disputes over "who does what" disappear. It has its own **Work** tab and also surfaces under **Activity → Work**.

- **Log work** — title, description, category (Cleaning, Cooking, Shopping, Water, Laundry, Bills, Maintenance, Misc), effort level, duration, optional photo attachments, and date
- **Peer validation** — every submission starts as **Pending**; group-mates (everyone except the submitter) **approve** or **reject** it:
  - Marked **Verified** once approvals reach **50% of eligible voters, rounded up** — e.g. a 3-member group needs 1 approval, 4 members need 2, 6 members need 3
  - Marked **Rejected** automatically once enough rejections make that threshold unreachable
  - You can **never validate your own work**
  - Each submission has a **48-hour validation window** with a live countdown
- **Effort points** — Easy = 10, Medium = 20, Hard = 30, awarded on verification
- **Contribution dashboard** — verified / pending / rejected counts, total contribution hours, and total effort points for the group
- **Leaderboard** — ranks members by effort points and verified work across **Weekly**, **Monthly**, and **All-time** windows, with 🥇🥈🥉 for the top three
- **Activity feed** — verified chores in chronological order; each card shows the submitter, task, category, duration, effort, approval count, and status
- **Reactions** — cheer on good work with 👏 ❤️ 🔥 🙌
- **Contribution profile** — tap any member to see their stats, category breakdown, and full submission history
- **In-app reminders** — a badge and banner flag submissions that are waiting on *your* validation

> Work status (Pending / Verified / Rejected) is **derived on the client** from the votes and group size — it is never stored, so it can't drift between devices or between local and cloud mode.

### Settings
- Clean, sectioned layout: **Profile**, **Your activity**, **Data**, **About**, **Account**
- Usage stats: total expenses, groups, and total amount tracked
- Import from Splitwise
- Developer links (GitHub / LinkedIn) and app version
- Sign out

### Dual Mode
| Mode | Description |
|---|---|
| **Local** | No account needed. Data stored on-device with AsyncStorage. Great for solo use. |
| **Supabase** | Sign up / sign in. Data synced to cloud. Groups are shared — other members see the same expenses from their own perspective. |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React Native 0.76.9 via Expo SDK 52 (New Architecture enabled) |
| Language | TypeScript |
| Navigation | React Navigation v6 — five-tab bottom navigator (Dashboard · Activity · Work · Groups · Settings) |
| Backend | Supabase (PostgreSQL + Auth + RLS) |
| Local storage | AsyncStorage |
| Charts | react-native-chart-kit + react-native-svg |
| Icons | Custom `Ionicons` renderer (draws glyphs directly from the bundled font) |
| Build | Local Gradle (`android/`) or EAS Build |

> **Note on icons:** the app renders Ionicons via a small custom component (`src/components/Icon.tsx`) that draws the glyph directly through `fontFamily`, bypassing `expo-font`'s async load gate which was leaving icons blank in release builds.

---

## Database Schema

Run `supabase/setup.sql` in the Supabase SQL Editor to set up everything from scratch. Safe to re-run — but note it **drops and recreates all tables**, wiping existing data.

> **Already have data?** Run **`supabase/work_ledger_migration.sql`** instead. It additively creates only the three Work Ledger tables (`work_entries`, `work_votes`, `work_reactions`) and leaves your existing tables and data untouched.

### Tables

#### `profiles`
Automatically created when a user signs up (via trigger). All signed-in users can search profiles by name or email.

```sql
id           uuid        PRIMARY KEY  -- matches auth.users.id
display_name text        NOT NULL
email        text        NOT NULL
color        text        NOT NULL DEFAULT '#34d399'
created_at   timestamptz NOT NULL DEFAULT now()
```

#### `groups`
```sql
id         text        PRIMARY KEY  -- client-generated uid
created_by uuid        NOT NULL REFERENCES auth.users(id)
name       text        NOT NULL
emoji      text        NOT NULL DEFAULT '🏠'
created_at timestamptz NOT NULL DEFAULT now()
```

#### `group_members`
Junction table linking users to groups.

```sql
group_id  text        NOT NULL REFERENCES groups(id) ON DELETE CASCADE
user_id   uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
joined_at timestamptz NOT NULL DEFAULT now()
PRIMARY KEY (group_id, user_id)
```

#### `expenses`
```sql
id           text           PRIMARY KEY
created_by   uuid           NOT NULL REFERENCES auth.users(id)
description  text           NOT NULL
amount       numeric(12,2)  NOT NULL  CHECK (amount > 0)
category     text           NOT NULL  -- Grocery | Rent | Entertainment | Dining | Utilities | Others
date         timestamptz    NOT NULL
type         text           NOT NULL  CHECK (type IN ('personal','group'))
group_id     text           REFERENCES groups(id) ON DELETE SET NULL
paid_by      text           -- UUID of the member who paid (group expenses)
split_method text           -- 'equal' | 'exact' | 'percentage'
splits       jsonb          -- [{memberId, amount}]
created_at   timestamptz    NOT NULL DEFAULT now()
```

#### `settlements`
```sql
id         text           PRIMARY KEY
group_id   text           REFERENCES groups(id) ON DELETE SET NULL
from_user  text           NOT NULL  -- UUID of payer
to_user    text           NOT NULL  -- UUID of receiver
amount     numeric(12,2)  NOT NULL  CHECK (amount > 0)
date       timestamptz    NOT NULL
created_at timestamptz    NOT NULL DEFAULT now()
```

#### `work_entries`
A logged household chore, always tied to a group.

```sql
id               text        PRIMARY KEY
group_id         text        NOT NULL REFERENCES groups(id) ON DELETE CASCADE
created_by       uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
title            text        NOT NULL
description      text        NOT NULL DEFAULT ''
category         text        NOT NULL  -- Cleaning | Cooking | Shopping | Water | Laundry | Bills | Maintenance | Misc
effort           text        NOT NULL  CHECK (effort IN ('Easy','Medium','Hard'))
duration_minutes integer     NOT NULL DEFAULT 0  CHECK (duration_minutes >= 0)
images           jsonb       NOT NULL DEFAULT '[]'  -- attachment URIs
date             timestamptz NOT NULL
created_at       timestamptz NOT NULL DEFAULT now()
```

#### `work_votes`
Approve / reject validations — one per member per entry.

```sql
id         text        PRIMARY KEY
work_id    text        NOT NULL REFERENCES work_entries(id) ON DELETE CASCADE
user_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
vote       text        NOT NULL  CHECK (vote IN ('approve','reject'))
created_at timestamptz NOT NULL DEFAULT now()
UNIQUE (work_id, user_id)  -- enables upsert on re-vote
```

#### `work_reactions`
```sql
id         text        PRIMARY KEY
work_id    text        NOT NULL REFERENCES work_entries(id) ON DELETE CASCADE
user_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
emoji      text        NOT NULL
created_at timestamptz NOT NULL DEFAULT now()
UNIQUE (work_id, user_id, emoji)
```

> Work **status is not stored** — it's derived on the client from the votes and group size (see [Work Ledger](#work-ledger-)).

### Row Level Security

| Table | Policy |
|---|---|
| `profiles` | Any signed-in user can read (for member search). Only own row can be updated. |
| `groups` | Visible to creator and all members. Only creator can insert/delete. |
| `group_members` | Any signed-in user can read. Only group creator can add members. |
| `expenses` | Personal → only creator. Group → all members of that group. |
| `settlements` | Visible to `from_user`, `to_user`, or any group member. |
| `work_entries` | Visible to all members of the entry's group. Only the creator (and a group member) can insert; only the creator can delete. |
| `work_votes` | Readable by group members. You may vote on a group-mate's entry but **not your own**; you can update/delete only your own vote. |
| `work_reactions` | Readable by group members. Members can add reactions and remove only their own. |

### Trigger

A `SECURITY DEFINER` trigger on `auth.users` auto-creates a profile row on signup. Exception handling ensures a profile error never blocks the signup flow.

---

## Setup & APK Build

See **[SETUP.md](./SETUP.md)** for full instructions: local development, Supabase configuration, environment variables, and both local-Gradle and EAS APK build guides.

---

## Developer

Developed with love by **Nagmani Kumar**

- GitHub: [github.com/nag2mani](https://github.com/nag2mani)
- LinkedIn: [linkedin.com/in/nag2mani](https://www.linkedin.com/in/nag2mani/)
