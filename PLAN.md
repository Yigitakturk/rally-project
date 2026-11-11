# Rally Website — Plan

**Status:** Planning in progress (no code yet). Last updated: 11 November 2026.

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

## 5. Tools (proposed, waiting for approval)

- **React** for building the pages.
- **Firebase** for storing the data and putting the site online.
- A **daily collector**: a small program that reads Wikipedia's official API once a day and saves the latest data to our storage. Visitors read from our storage, so the site is fast and we don't overload Wikipedia.

## 6. Cost

To be decided. Goal: free.

## 7. Build order

To be decided.

## Research notes

- FIA WRC fan survey (2024): fans want more manufacturers, more endurance rallies, better TV coverage; only ~53% are happy with TV/online airtime; cost and distance stop fans from attending.
- 2027 season: new WRC27 cars, 15 rounds, a USA round returns.
