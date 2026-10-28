import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import { SignIn, SignUp } from './pages/Auth';
import Overview from './pages/Overview';
import Claims from './pages/Claims';
import ClaimDetail from './pages/ClaimDetail';
import AddClaim from './pages/AddClaim';
import { Reports, Sources, Platforms, Panic, SettingsPage } from './pages/Others';

// Frontend-only guard. Not real security: anyone can edit localStorage.
function RequireAuth() {
  const { user } = useAuth();
  const loc = useLocation();
  return user ? <Outlet /> : <Navigate to="/signin" replace state={{ from: loc.pathname }} />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/signin" element={<SignIn />} />
      <Route path="/signup" element={<SignUp />} />
      <Route element={<RequireAuth />}>
        <Route element={<Layout />}>
          <Route index element={<Overview />} />
          <Route path="claims" element={<Claims />} />
          <Route path="claims/new" element={<AddClaim />} />
          <Route path="claims/:id" element={<ClaimDetail />} />
          <Route path="reports" element={<Reports />} />
          <Route path="sources" element={<Sources />} />
          <Route path="platforms" element={<Platforms />} />
          <Route path="panic" element={<Panic />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
