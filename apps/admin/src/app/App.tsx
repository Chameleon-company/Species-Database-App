import { Navigate, Route, Routes } from "react-router-dom";
import AdminLayout from "./layout/AdminLayout";
import { GuestOnly } from "./layout/routeGuards";
import { Home } from "../features/home/HomePage";
import SpeciesListPage from "../features/species/SpeciesListPage";
import Page1 from "../features/species/SpeciesCreatePage";
import { EditEntry } from "../features/species/SpeciesForm";
import SpeciesImportPage from "../features/species/SpeciesImportPage";
import MediaPage from "../features/media/MediaPage";
import UsersPage from "../features/users/UsersPage";
import AnalyticsPage from "../features/analytics/AnalyticsPage";
import AuditPage from "../features/audit/AuditPage";
import LoginPage from "../features/auth/LoginPage";

export default function App() {
  return (
    <Routes>
      <Route
        path="/admin-login"
        element={
          <GuestOnly>
            <LoginPage />
          </GuestOnly>
        }
      />
      <Route element={<AdminLayout />}>
        <Route index element={<Home />} />
        <Route path="species" element={<SpeciesListPage />} />
        <Route path="species/new" element={<Page1 />} />
        <Route path="species/import" element={<SpeciesImportPage />} />
        <Route path="species/:id" element={<EditEntry />} />
        <Route path="media" element={<MediaPage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="analytics" element={<AnalyticsPage />} />
        <Route path="audit" element={<AuditPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
