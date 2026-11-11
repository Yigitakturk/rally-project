import { Route, Routes } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import Home from './pages/Home.jsx';
import Placeholder from './pages/Placeholder.jsx';
import NotFound from './pages/NotFound.jsx';
import Calendar, { CalendarRedirect } from './pages/Calendar.jsx';
import Rally from './pages/Rally.jsx';

// Every address on the website. Placeholders are replaced by real pages in steps 4–7.
export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="calendar" element={<CalendarRedirect />} />
        <Route path="calendar/:year" element={<Calendar />} />
        <Route path="rallies/:id" element={<Rally />} />
        <Route path="drivers" element={<Placeholder titleKey="pages.drivers" />} />
        <Route path="drivers/:id" element={<Placeholder titleKey="pages.driver" />} />
        <Route path="codrivers/:id" element={<Placeholder titleKey="pages.codriver" />} />
        <Route path="teams" element={<Placeholder titleKey="pages.teams" />} />
        <Route path="teams/:id" element={<Placeholder titleKey="pages.team" />} />
        <Route path="cars/:id" element={<Placeholder titleKey="pages.car" />} />
        <Route path="standings" element={<Placeholder titleKey="pages.standings" />} />
        <Route path="standings/:year" element={<Placeholder titleKey="pages.standings" />} />
        <Route path="history" element={<Placeholder titleKey="pages.history" />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
