import "./App.css";
import TheDrawer from "./Components/drawer";
import { Home } from "./Pages/Home";
import Page1 from "./Pages/AddEntry";
import { EditEntry } from "./Pages/EditEntry";
import { AddExcel } from "./Pages/AddExcel";
import { HashRouter as Router, Routes, Route } from "react-router-dom";
import UsersPage from "./Pages/Users";
import Analytics from "./Pages/Analytics";
import Audit from "./Pages/Audit";
import AdminLoginForm from "./Pages/AdminLoginForm";
import AdminLayout from "./Components/AdminLayout";
import MediaManager from "./Pages/MediaManager";

function App() {
  return (
    <Router>
      <Routes>
        {/*PUBLIC ROUTE */}
        <Route path="/admin-login" element={<AdminLoginForm />} />

        {/*ADMIN */}
        <Route path="/" element={<AdminLayout>
          <Home />
        </AdminLayout>} />

        <Route 
          path="/Page1" 
          element={
            <AdminLayout>
              <Page1 />
            </AdminLayout>} />
            
        <Route path="/AddExcel" element={
          <AdminLayout>
            <AddExcel />
          </AdminLayout> } />

        <Route 
          path="/EditEntry" 
          element={
          <AdminLayout>
            <EditEntry />
          </AdminLayout>
          } />

        <Route 
          path="/Users" 
          element={
          <AdminLayout>
            <UsersPage />
          </AdminLayout>
          } />
        
        <Route 
        path="/Analytics" 
        element={
        <AdminLayout>
          <Analytics />
        </AdminLayout>} />

        <Route 
        path="/Audit" 
        element={
        <AdminLayout>
          <Audit />
        </AdminLayout>} />

        <Route 
        path="/Media" 
        element={
        <AdminLayout>
          <MediaManager />
        </AdminLayout>} />

      </Routes>
    </Router>
  );
}

export default App;
