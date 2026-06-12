# Batwara 💸

> "You have to spend money to make money."

**Batwara** is a personal and group expense tracker built with React Native (Expo). Track what you spend, split bills with friends, simplify group debts, and settle up — all in one app. Installable as an Android APK.

---

## Features

### Dashboard
- **Group expenses this month** — total of all group expenses in the current month
- **Personal expenses this month** — total of all personal expenses in the current month
- **Net balance** — how much you are owed or owe across all groups, with a Settle Up shortcut
- **Spending by category** — pie chart breakdown (Grocery, Rent, Dining, Entertainment, Utilities, Others)
- **Recent activity** — last 5 expenses at a glance

### Personal Expenses
- Add expenses with description, amount, category, and date
- Full expense list with category icons and color coding
- Filter and browse all past personal transactions

### Groups
- Create groups with a name and emoji
- **Add only registered users** — search by name or email; no free-text members
- Each member sees expenses from their own perspective (who paid, who owes whom)
- Group expense detail: member list, simplified debt graph, expense history

### Bill Splitting
- **Equal split** — divide the bill evenly among all participants
- **Exact split** — enter a specific amount per person
- **Percentage split** — assign a percentage share to each person

### Debt Simplification
- Automatically simplifies complex multi-person debts into the minimum number of transactions (Splitwise-style algorithm)

### Settle Up
- Record a payment from one member to another
- Settlements are reflected immediately in the debt graph

### Settings
- Profile card with name and email
- Usage stats: total expenses, groups, and total amount tracked
- App info (backend, platform, version)
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
| Framework | React Native 0.76.9 via Expo SDK 52 |
| Language | TypeScript |
| Navigation | React Navigation v6 (bottom tabs + native stack) |
| Backend | Supabase (PostgreSQL + Auth + RLS) |
| Local storage | AsyncStorage |
| Charts | react-native-chart-kit + react-native-svg |
| Build | EAS Build (Expo Application Services) |

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

See [SETUP.md](./SETUP.md) for full instructions: local development, Supabase configuration, environment variables, and step-by-step APK build guide.

---

## Developer

Developed with love by **Nagmani Kumar**

- GitHub: [github.com/nag2mani](https://github.com/nag2mani)
- LinkedIn: [linkedin.com/in/nag2mani](https://www.linkedin.com/in/nag2mani/)
