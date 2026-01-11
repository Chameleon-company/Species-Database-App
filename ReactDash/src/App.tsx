import "./App.css";
import TheDrawer from "./Components/drawer";
import { Home } from "./Pages/Home";
import Page1 from "./Pages/AddEntry";
import { EditEntry } from "./Pages/EditEntry";
import { AddExcel } from "./Pages/AddExcel";
import { HashRouter as Router, Routes, Route } from "react-router-dom";
import UsersPage from "./Pages/Users";
import Analytics from "./Pages/Analytics";

function App() {
  return (
    <Router>
      <TheDrawer />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/Page1" element={<Page1 />} />
        <Route path="/AddExcel" element={<AddExcel />} />
        <Route path="/EditEntry" element={<EditEntry />} />
        <Route path="/Users" element={<UsersPage />} />
        <Route path="/Analytics" element={<Analytics />} />
      </Routes>
    </Router>
  );
}

export default App;
