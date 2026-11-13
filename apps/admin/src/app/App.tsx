import "../App.css";
import { Home } from "../features/home/HomePage";
import Page1 from "../features/species/SpeciesCreatePage";
import { EditEntry } from "../features/species/SpeciesForm";
import { HashRouter as Router, Routes, Route } from "react-router-dom";
import UsersPage from "../features/users/UsersPage";
import Analytics from "../features/analytics/AnalyticsPage";
import Audit from "../features/audit/AuditPage";
import AdminLoginForm from "../features/auth/LoginPage";
import AdminLayout from "./layout/AdminLayout";
import { GuestOnlyRoute } from "./layout/routeGuards";
import MediaManager from "../features/media/MediaPage";
import SpeciesPage from "../features/species/SpeciesListPage";
import AddExcel from "../features/species/SpeciesImportPage";

function App() {
  return (
    <Router>
      <Routes>
        {/*PUBLIC ROUTE */}

        <Route
          path="/admin-login"
          element={
            <GuestOnlyRoute>
              <AdminLoginForm />
            </GuestOnlyRoute>
          }
        />

        {/*ADMIN */}
        <Route
          path="/"
          element={
            <AdminLayout>
              <Home />
            </AdminLayout>
          }
        />

        <Route
          path="/species"
          element={
            <AdminLayout>
              <SpeciesPage />
            </AdminLayout>
          }
        />

        <Route
          path="/AddExcel"
          element={
            <AdminLayout>
              <AddExcel />
            </AdminLayout>
          }
        />

        <Route
          path="/Users"
          element={
            <AdminLayout>
              <UsersPage />
            </AdminLayout>
          }
        />

        <Route
          path="/Page1"
          element={
            <AdminLayout>
              <Page1 />
            </AdminLayout>
          }
        />
        <Route
          path="/edit"
          element={
            <AdminLayout>
              <EditEntry />
            </AdminLayout>
          }
        />

        <Route
          path="/edit/:id"
          element={
            <AdminLayout>
              <EditEntry />
            </AdminLayout>
          }
        />

        {/* <Route
          path="/Users"
          element={
            <AdminLayout>
              <UsersPage />
            </AdminLayout>
          }
        /> */}

        <Route
          path="/Analytics"
          element={
            <AdminLayout>
              <Analytics />
            </AdminLayout>
          }
        />

        <Route
          path="/Audit"
          element={
            <AdminLayout>
              <Audit />
            </AdminLayout>
          }
        />

        <Route
          path="/Media"
          element={
            <AdminLayout>
              <MediaManager />
            </AdminLayout>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
