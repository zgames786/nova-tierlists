# NovaSMP Tierlists

React + Vite tierlist admin and guest rankings app with **Firebase Firestore** shared storage.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Copy `.env.example` to `.env` and paste your Firebase web app config from **Firebase Console → Project settings → Your apps**:

```bash
cp .env.example .env
```

3. In **Firestore Database**, create a database (test mode is fine for development).

4. Set Firestore security rules so the app can read/write the shared document (adjust for production):

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /appData/{docId} {
      allow read, write: if true;
    }
  }
}
```

5. Run the dev server:

```bash
npm run dev
```

## Firestore data

- Collection: `appData`
- Document: `novaSmp`
- Shape: `{ tierlists, admins, logs, settings }`

On first load, if the document is missing, the app creates default data (Overall tierlist + empty admins/logs).

The owner account (`ZGames786` / `NovaAdmin786`) is built into the app and is not stored in `admins`.

## Storage

| Data | Location |
|------|----------|
| Tierlists, players, logs, settings, admin accounts | Firestore `appData/novaSmp` |
| Login session | `localStorage` (`novasmp_admin_session`) |

Old `localStorage` tierlist/admin data is **not** migrated.

## Default owner login

- Username: `ZGames786`
- Password: `NovaAdmin786`
