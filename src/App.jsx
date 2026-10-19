import "./App.css";
import React, { useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import HomeDashboard from "./Components/HomeDashboard";
import ControllerDashboard from "./Components/Anikator/ControllerDashboard";
import ControllerInterface from "./Components/Anikator/ControllerInterface";
import HardwareStore from "./Components/Anikator/HardwareStore";
import VirtualCursor from "./Components/Anikator/VirtualCursor";
import PSMediaUI from "./Components/MediaUI";
import Profile from "./Components/Profile";
import Layout from "./Components/Layout";
import Preloader from "./Components/Preloader";
import SubscriptionsPage from "./Components/SubscriptionsPage";
import SteamStorePage from "./Components/SteamStorePage";
import SteamLibraryPage from "./Components/SteamLibraryPage";

function App() {
  const [loading, setLoading] = useState(true);

  return (
    <>
      {loading && <Preloader onComplete={() => setLoading(false)} />}
      <Router>
        <VirtualCursor />
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Navigate to="/home" replace />} />
            <Route path="/home" element={<HomeDashboard />} />
            <Route path="/media" element={<PSMediaUI />} />
            <Route path="/store" element={<SteamStorePage />} />
            <Route path="/showcase" element={<ControllerDashboard />} />
            <Route path="/accessories" element={<HardwareStore />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/library" element={<SteamLibraryPage />} />
            <Route path="/subscriptions" element={<SubscriptionsPage />} />
          </Route>
          {/* The phone controller UI doesn't need the Layout typically, it's a remote */}
          <Route path="/controller" element={<ControllerInterface />} />
        </Routes>
      </Router>
    </>
  );
}

export default App;
