# Rally Project

A website for rally fans, in Turkish and English. See [PLAN.md](PLAN.md) for the plan and progress.

## Folders

- `backend/`: Firebase Cloud Functions. The daily collector (Wikipedia → Firestore) and the read-only API.
- `frontend/`: the website (coming in step 3).

## Try the collector locally

```
cd backend
npm install
npm run collect:local 2026                      # saves JSON files in backend/data-out/
YEARS="2025 2026" npm run collect:emulator      # saves into the local test database
npm run api:check                               # starts the local API and tests every address
```

The local test tools need Java (`brew install openjdk`).

Data comes from Wikipedia (CC BY-SA). Every rally and season keeps a link to its source article.
