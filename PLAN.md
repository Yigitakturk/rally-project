# Rally Website — Plan

**Status:** Plan complete, waiting for manager review (no code yet). Last updated: 11 November 2026.

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

## 5. Tools (approved)

- **React** for building the pages.
- **Firebase** for storing the data and putting the site online.
- A **daily collector**: a small program that reads Wikipedia's official API once a day and saves the latest data to our storage. Visitors read from our storage, so the site is fast and we don't overload Wikipedia.

## 6. Cost

**Free.**

- **Website:** Firebase free plan (enough for a few hundred to about a thousand visitors a day; can upgrade later if needed).
- **Daily collector:** runs on GitHub, which is free for public repositories. (Firebase's timed programs need a paid plan, so we don't use them.)
- **Address:** start with a free Firebase address (e.g. rally-project.web.app). A custom name (about $10–15 a year) may be added a few weeks after launch. The free address keeps working after that.

## 7. Build order

1. **Collector first:** confirm we can get good rally data from Wikipedia.
2. **Site skeleton:** dark style, menu, Turkish/English switch.
3. **Calendar** and **Rally page**.
4. **Drivers** and **Teams and cars**.
5. **Standings** and **History**.
6. **Home page** (last, because it shows a bit of everything).
7. **Go online** at the free address, with the collector running daily.
8. **Custom address** a few weeks later (optional).

Each step is checked in the browser before moving to the next.

## Research notes

- FIA WRC fan survey (2024): fans want more manufacturers, more endurance rallies, better TV coverage; only ~53% are happy with TV/online airtime; cost and distance stop fans from attending.
- 2027 season: new WRC27 cars, 15 rounds, a USA round returns.
