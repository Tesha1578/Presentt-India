import { Route, Routes } from 'react-router';
import Layout from '@/components/Layout';
import Home from '@/pages/Home';
import Leads from '@/pages/Leads';
import LeadProfile from '@/pages/LeadProfile';
import Customers from '@/pages/Customers';
import CustomerProfile from '@/pages/CustomerProfile';
import Visits from '@/pages/Visits';
import Queries from '@/pages/Queries';
import Analytics from '@/pages/Analytics';
import Settings from '@/pages/Settings';
import Login from '@/pages/Login';

/**
 * Layout + routing contract: CHILDREN pattern.
 * Layout renders `{children}`; App wraps <Routes> inside <Layout>.
 * /login renders shell-less (Phase 5 owns the real Login page).
 */
export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/*"
        element={
          <Layout>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/leads" element={<Leads />} />
              <Route path="/leads/:id" element={<LeadProfile />} />
              <Route path="/customers" element={<Customers />} />
              <Route path="/customers/:id" element={<CustomerProfile />} />
              <Route path="/visits" element={<Visits />} />
              <Route path="/queries" element={<Queries />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="*" element={<Home />} />
            </Routes>
          </Layout>
        }
      />
    </Routes>
  );
}
