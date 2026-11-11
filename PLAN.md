# Rally Website — Plan

**Status:** Building. Step 1 (collector + database) done. Last updated: 11 November 2026.

## 1. Who is it for?

Rally fans in Turkey and around the world.

- The site will be in **Turkish and English**, with a button to switch.
- It is built so **more languages can be added later**: every word on the site lives in one "dictionary" file per language. Adding a language means adding one file.

## 2. Pages

1. **Home:** countdown to the next rally, the latest winner, top 3 of the standings.
2. **Calendar:** each rally of the season with date, country, road type (gravel, snow, asphalt) and a "where to watch" link.
3. **Rally page:** final results, list of stages with the fastest driver on each, retirements, and a link to official live results.
4. **Drivers:** a profile for each driver and co-driver: country, team, car, wins, titles.
5. **Teams and cars:** each team with its drivers and cars, and simple facts about each car.
6. **Standings:** championship tables for drivers, co-drivers and teams.
7. **History:** past champions and records.

Considered and **not** included for now: a beginner's guide page ("Rally 101") and a Turkish rallies section.

## 3. Where the data comes from

- **Wikipedia / Wikidata:** free to reuse as long as we credit them. Covers past rallies, calendars, entries, stages, results, standings, drivers, teams and cars.
- **Links to official websites** for live results during a rally (Wikipedia is updated hours or days later).

Not used, and why:
- Copying ("scraping") rally websites such as WRC.com, eWRC-results, Autosport and Motorsport.com: their rules block automated copying, and their content belongs to them.
- Paid data providers (e.g. Sportradar): too expensive for this project.

Known limits: no live timing; small and national rallies have little Wikipedia coverage; Turkish Wikipedia has less rally content than English, so long texts (like driver biographies) will mostly be in English.

## 4. Look

- **Dark and sporty:** black background with bright orange/red.
- Works on **phones and computers**.

## 5. Architecture and tools (approved)

Separated backend and frontend. The frontend never talks to Wikipedia or the database directly; it only uses our API.

```
Wikipedia API --(daily)--> Collector --> Firestore --> REST API --> Website
                           [-------------- backend -------------]  [frontend]
```

**Backend (Firebase):**
- **Collector:** a scheduled Cloud Function that runs once a day, reads Wikipedia/Wikidata through their official API, and saves cleaned data to the database.
- **Database:** Firestore.
- **API:** HTTP Cloud Functions that expose read-only JSON endpoints, for example:
  - `GET /api/seasons/{year}/calendar`
  - `GET /api/rallies/{id}` (results, stages, retirements)
  - `GET /api/drivers`, `GET /api/drivers/{id}`
  - `GET /api/teams`, `GET /api/cars`
  - `GET /api/seasons/{year}/standings`
  - `GET /api/history`
  
  Final endpoint list to be fixed in build step 2.

**Frontend:**
- **React** website on **Firebase Hosting**. It only displays data from the API.
- Translations live in one dictionary file per language (Turkish, English, more later).

Because the API is separate, a phone app could reuse it later without a new backend.

## 6. Cost

**Expected: $0 at our size**, but a card is required.

- Cloud Functions with a timer need Firebase's **pay-as-you-go (Blaze) plan**, which requires a credit card. Its free monthly allowance should cover this project.
- A **spending alert** (budget alert) will be set at a low amount so there are no surprises.
- **Billing account owner:** Yigit (personal card).
- Note: a budget alert only **warns**, it does not stop spending. Protections: alert at $1, an automatic cut-off if the budget is passed, API caching and request limits, and automatic cleanup of old function images (storage above 0.5 GB can cost a few cents).
- **Address:** start with a free Firebase address (e.g. rally-project.web.app). A custom name (about $10–15 a year) may be added a few weeks after launch. The free address keeps working after that.

## 7. Build order

1. **Backend: collector + database.** Confirm we can get good rally data from Wikipedia and store it.
2. **Backend: API.** Fix the endpoint list and make the data available.
3. **Frontend skeleton:** dark style, menu, Turkish/English switch.
4. **Calendar** and **Rally page**.
5. **Drivers** and **Teams and cars**.
6. **Standings** and **History**.
7. **Home page** (last, because it shows a bit of everything).
8. **Go online** at the free address, with the collector running daily and the spending alert set.
9. **Custom address** a few weeks later (optional).

Each step is checked before moving to the next.

### Progress

- **Step 1 done (11 Nov 2026):** the collector reads WRC seasons and rally articles from Wikipedia and saves them to Firestore. Tested on the local test database with 2020–2027: 101 rallies, ~520 drivers, ~590 co-drivers. The daily run collects last, this and next season, then rebuilds the drivers/teams/cars lists.
- Scope decisions: **WRC only** for now. **Detailed data from 2020** (older articles use a different layout); earlier years only for the History page.
- To fix in later steps: the "teams" list includes private entrants (one-person teams); the Teams page should show the main manufacturer teams.

## Research notes

- FIA WRC fan survey (2024): fans want more manufacturers, more endurance rallies, better TV coverage; only ~53% are happy with TV/online airtime; cost and distance stop fans from attending.
- 2027 season: new WRC27 cars, 15 rounds, a USA round returns.
