import { Route, Routes } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import Home from './pages/Home.jsx';
import Placeholder from './pages/Placeholder.jsx';
import NotFound from './pages/NotFound.jsx';
import Calendar, { CalendarRedirect } from './pages/Calendar.jsx';
import Rally from './pages/Rally.jsx';
import Drivers from './pages/Drivers.jsx';
import Profile from './pages/Profile.jsx';
import Teams from './pages/Teams.jsx';

// Every address on the website. Placeholders are replaced by real pages in steps 4–7.
export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="calendar" element={<CalendarRedirect />} />
        <Route path="calendar/:year" element={<Calendar />} />
        <Route path="rallies/:id" element={<Rally />} />
        <Route path="drivers" element={<Drivers />} />
        <Route path="drivers/:id" element={<Profile kind="drivers" key="drivers" />} />
        <Route path="codrivers/:id" element={<Profile kind="codrivers" key="codrivers" />} />
        <Route path="teams" element={<Teams />} />
        <Route path="teams/:id" element={<Profile kind="teams" key="teams" />} />
        <Route path="cars/:id" element={<Profile kind="cars" key="cars" />} />
        <Route path="standings" element={<Placeholder titleKey="pages.standings" />} />
        <Route path="standings/:year" element={<Placeholder titleKey="pages.standings" />} />
        <Route path="history" element={<Placeholder titleKey="pages.history" />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
