# Batwara 💸

> "You have to spend money to make money."

**Batwara** is a personal and group expense tracker built with React Native (Expo). Track what you spend, split bills with friends, simplify group debts, import your existing Splitwise history, and settle up — all in one app. Installable as an Android APK.

---

## Features

### Dashboard
- **Date range picker** (top-right) — view your data over **Last 7 days**, **Last 30 days**, **Last year**, **All time**, or a **custom date range**. Totals and the chart update to match the selected range.
- **Group total** and **Personal total** for the selected range
- **Your net balance** — your overall position across **all groups combined**, shown from *your* perspective:
  - a clear per-person breakdown — **"You owe Animesh ₹4,199.19"**, **"Shadab owes you ₹2,293.32"**
  - a Settle Up shortcut
- **Spending by category** — pie chart breakdown (Grocery, Rent, Dining, Entertainment, Utilities, Others)
- **Recent activity** — latest expenses at a glance
- **Floating "+" button** — quick-add an expense from anywhere on the screen

### Expenses
- Add expenses with description, amount, category, and date
- Full expense list with category icons and color coding
- Filter by **type** (all / personal / group) and by **category**
- **Tap any expense** to open a detail view — amount, category, date, group, who paid, split method, and the full per-person split breakdown
- **Delete** an expense from the row (red trash icon) or from the detail view
- Floating "+" button to add a new expense

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
| Navigation | React Navigation v6 (bottom tabs + native stack) |
| Backend | Supabase (PostgreSQL + Auth + RLS) |
| Local storage | AsyncStorage |
| Charts | react-native-chart-kit + react-native-svg |
| Icons | Custom `Ionicons` renderer (draws glyphs directly from the bundled font) |
| Build | Local Gradle (`android/`) or EAS Build |

> **Note on icons:** the app renders Ionicons via a small custom component (`src/components/Icon.tsx`) that draws the glyph directly through `fontFamily`, bypassing `expo-font`'s async load gate which was leaving icons blank in release builds.

---

## Database Schema

Run `supabase/setup.sql` in the Supabase SQL Editor to set up everything from scratch. Safe to re-run (drops and recreates all tables).

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

### Row Level Security

| Table | Policy |
|---|---|
| `profiles` | Any signed-in user can read (for member search). Only own row can be updated. |
| `groups` | Visible to creator and all members. Only creator can insert/delete. |
| `group_members` | Any signed-in user can read. Only group creator can add members. |
| `expenses` | Personal → only creator. Group → all members of that group. |
| `settlements` | Visible to `from_user`, `to_user`, or any group member. |

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
