# Batwara 💸

**Batwara** is a personal & group expense tracker, money-lending log, and household work ledger. Split bills, simplify group debts, track money you lend to friends, import your Splitwise history, and log & peer-validate household chores, all in one app.

<table align="center">
  <tr>
    <td align="center">
      <img src="https://github.com/user-attachments/assets/a5755746-5cb9-4236-bf58-c5503b588267" width="180"><br>
      <b>Dashboard</b>
    </td>
    <td align="center">
      <img src="https://github.com/user-attachments/assets/90172fc5-1eaa-4ccd-b52f-ff84535c3ff4" width="180"><br>
      <b>Recent Activities</b>
    </td>
    <td align="center">
      <img src="https://github.com/user-attachments/assets/13e81fae-e042-402a-8e11-b3e17cc0c477" width="180"><br>
      <b>Work Ledger</b>
    </td>
    <td align="center">
      <img src="https://github.com/user-attachments/assets/38a19bc1-e71d-468f-881c-520fc55e580c" width="180"><br>
      <b>Groups</b>
    </td>
  </tr>
</table>

<p align="center">
  📸 <b>See more app screenshots:</b><br>
  <a href="https://drive.google.com/drive/folders/1WHYGqD2UvY5D5iDFCZm3tUVD0piyslo-?usp=drive_link">
    View Complete Screenshot Gallery
  </a>
</p>

---

## Features

### Expenses & Splitting
- Personal and group expenses, organized by category
- Split **equally**, by **exact amounts**, or by **percentage**
- Tap any expense for full detail — payer, split method, and per-person breakdown

### Groups
- Create groups with a name and emoji
- Add only registered users (search by name or email — no free-text members)
- Group detail shows members, your balances, expense history, and logged work
- Settle up within a group; delete a group and its data

### Balances & Settle Up
- **Net balance** across all groups, from your perspective, folding in group debts **and** outstanding loans (lent adds, borrowed subtracts), with a per-person breakdown
- Pairwise balances plus a Splitwise-style debt-simplification algorithm
- Record a payment between members — balances update instantly
- **Settle Up** clears both expense debts and loans in one place

### Lending & Borrowing
- Log money you **lent** or **borrowed** and track it until it's returned
- Pick an onboarded user (search by name/email) or add someone by name with an optional email
- Linked loans show the **mirror side** on the other person's account; loans added by email **auto-link** when that person later signs up
- Tap a loan for details — **mark settled / undo** or delete
- Dashboard shows outstanding **lent** and **borrowed** totals

### Work Ledger 🧹
- Log chores with category, effort level, duration, and optional photos
- **Peer validation** — group-mates approve or reject each entry:
  - Verified once approvals reach **50% of eligible voters (rounded up)**
  - Auto-rejected when that threshold becomes unreachable
  - You can never validate your own work; each entry has a **7-day window** with a live countdown
- **Effort points** (Easy 10 · Medium 20 · Hard 30), a **leaderboard** (weekly / monthly / all-time), and emoji **reactions**
- Per-member **contribution profiles** with stats and history
- Status (Pending / Verified / Rejected) is derived on the client from votes — never stored, so it can't drift between devices

### Dashboard
- Date-range picker — **7 days**, **30 days**, **year**, **all time**, or a **custom range**
- Group and personal totals, a **spending-by-category** pie chart, and outstanding lent/borrowed totals
- Recent-activity feed spanning expenses, work, and loans
- A single **quick-add "+"** button to create an **Expense**, **Lend / Borrow**, **Log work**, or **New group**

### Activity
- Unified log with four filters: **Group**, **Personal**, **Lending**, and **Work**
- Tap any item for its detail view

### Import from Splitwise
- Import a group's full history from a **Splitwise CSV export** in one tap
- Auto-creates the group, members, and every expense, and links your column to your account

### Accounts & Sync
- Email/password sign-in with **password recovery** via an emailed code
- Cloud sync through Supabase — groups are shared, each member seeing balances from their own perspective
- **Pull-to-refresh** and refresh buttons to fetch the latest changes
- Works offline in local mode (on-device storage, no account needed)

### Appearance 🌗
- **Light**, **Dark**, and **System** themes, switchable from **Settings → Appearance**
- **System** follows your phone's OS appearance and updates live when it changes
- The whole app recolors instantly — backgrounds, text, cards, tab bar, status bar, and every screen
- Your choice is remembered across launches

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React Native 0.76.9 via Expo SDK 52 (New Architecture enabled) |
| Language | TypeScript |
| Navigation | React Navigation v6 — five-tab navigator (Dashboard · Activity · Work · Groups · Settings) |
| Backend | Supabase (PostgreSQL + Auth) |
| Local storage | AsyncStorage |
| Charts | react-native-chart-kit + react-native-svg |
| Icons | Custom `Ionicons` renderer (draws glyphs directly from the bundled font) |
| Build | Local Gradle (`android/`) or EAS Build |

> **Note on icons:** the app renders Ionicons via a small custom component (`src/components/Icon.tsx`) that draws the glyph directly through `fontFamily`, bypassing `expo-font`'s async load gate which was leaving icons blank in release builds.

---

## Database Schema

Run **`supabase/setup.sql`** once in the Supabase SQL Editor — it creates every table, RLS policy, trigger, and helper function in a single pass. It **drops and recreates all tables**, so only run it on a fresh project (or when you intend to reset).

### Tables

| Table | Purpose |
|---|---|
| `profiles` | User profile (name, email, avatar color); auto-created on signup via a trigger |
| `groups` | A shared group with a name and emoji |
| `group_members` | Links users to the groups they belong to |
| `expenses` | Personal and group expenses, including split details |
| `settlements` | Recorded repayments between members |
| `lendings` | Money lent to or borrowed from a friend, tracked until returned |
| `work_entries` | Logged household chores |
| `work_votes` | Approve / reject validations on work entries |
| `work_reactions` | Emoji reactions on work entries |

---

## Setup & APK Build

See **[SETUP.md](./SETUP.md)** for full instructions: local development, Supabase configuration, environment variables, and both local-Gradle and EAS APK build guides.
