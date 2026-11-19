import { FileBarChart, Ship } from 'lucide-react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './auth/AuthProvider';
import { RequirePermission, RequireSignedIn } from './components/Guards';
import { Layout } from './components/Layout';
import { AuditPage } from './pages/Audit';
import { DashboardPage } from './pages/Dashboard';
import { ExpensesPage } from './pages/Expenses';
import { FleetPage } from './pages/Fleet';
import { LegacyImportPage } from './pages/LegacyImport';
import { ReferencePage } from './pages/Reference';
import { TripFormPage } from './pages/TripForm';
import { TripsPage } from './pages/Trips';
import { LoginPage } from './pages/Login';
import { NotFoundPage } from './pages/NotFound';
import { UpcomingPage } from './pages/Upcoming';
import { UsersPage } from './pages/Users';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            element={
              <RequireSignedIn>
                <Layout />
              </RequireSignedIn>
            }
          >
            <Route index element={<DashboardPage />} />
            <Route
              path="trips"
              element={
                <RequirePermission perm="trip.read">
                  <TripsPage />
                </RequirePermission>
              }
            />
            <Route
              path="trips/new"
              element={
                <RequirePermission perm="trip.write">
                  <TripFormPage />
                </RequirePermission>
              }
            />
            <Route
              path="trips/:id/edit"
              element={
                <RequirePermission perm="trip.write">
                  <TripFormPage />
                </RequirePermission>
              }
            />
            <Route
              path="fleet"
              element={
                <RequirePermission perm="vehicle.read">
                  <FleetPage />
                </RequirePermission>
              }
            />
            <Route
              path="expenses"
              element={
                <RequirePermission perm="expense.read">
                  <ExpensesPage />
                </RequirePermission>
              }
            />
            <Route
              path="reference"
              element={
                <RequirePermission perm="refData.write">
                  <ReferencePage />
                </RequirePermission>
              }
            />
            <Route
              path="import"
              element={
                <RequirePermission perm="dashboard.import">
                  <UpcomingPage title="nav.import" icon={Ship} empty="empty.imports" phase={3} />
                </RequirePermission>
              }
            />
            <Route
              path="reports"
              element={
                <RequirePermission perm="export.run">
                  <UpcomingPage title="nav.reports" icon={FileBarChart} empty="empty.trips" phase={2} />
                </RequirePermission>
              }
            />
            <Route
              path="admin/users"
              element={
                <RequirePermission perm="user.manage">
                  <UsersPage />
                </RequirePermission>
              }
            />
            <Route
              path="admin/import"
              element={
                <RequirePermission perm="user.manage">
                  <LegacyImportPage />
                </RequirePermission>
              }
            />
            <Route
              path="admin/audit"
              element={
                <RequirePermission perm="audit.read">
                  <AuditPage />
                </RequirePermission>
              }
            />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
