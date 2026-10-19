import "./App.css";
import React, { useEffect, useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import HomeDashboard from "./Components/HomeDashboard";
import FriendsPage from "./Components/FriendsPage";
import PartyChatPage from "./Components/PartyChatPage";
import ControllerDashboard from "./Components/Anikator/ControllerDashboard";
import ControllerInterface from "./Components/Anikator/ControllerInterface";
import VirtualCursor from "./Components/Anikator/VirtualCursor";
import PSMediaUI from "./Components/MediaUI";
import Profile from "./Components/Profile";
import Layout from "./Components/Layout";
import Preloader from "./Components/Preloader";
import SteamStorePage from "./Components/SteamStorePage";
import SteamLibraryPage from "./Components/SteamLibraryPage";
import ConsoleSettingsPage from "./Components/ConsoleSettingsPage";

function RouteDiagnostics() {
  const location = useLocation();

  useEffect(() => {
    const bridge = window.consoleBridge;
    if (typeof bridge?.reportDiagnostic !== "function") return;
    bridge.reportDiagnostic({
      code: "RENDERER-NAV-0001",
      message: "Console route changed.",
      name: "Navigation",
      detail: location.pathname,
    }).catch(() => {});
  }, [location.pathname]);

  return null;
}

function App() {
  const [loading, setLoading] = useState(true);

  return (
    <>
      {loading && <Preloader onComplete={() => setLoading(false)} />}
      <Router>
        <RouteDiagnostics />
        <VirtualCursor />
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Navigate to="/home" replace />} />
            <Route path="/home" element={<HomeDashboard />} />
            <Route path="/media" element={<PSMediaUI />} />
            <Route path="/store" element={<SteamStorePage />} />
            <Route path="/showcase" element={<ControllerDashboard />} />
            <Route path="/friends" element={<FriendsPage />} />
            <Route path="/accessories" element={<Navigate to="/friends" replace />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/library" element={<SteamLibraryPage />} />
            <Route path="/party" element={<PartyChatPage />} />
            <Route path="/subscriptions" element={<Navigate to="/party" replace />} />
            <Route path="/settings" element={<ConsoleSettingsPage />} />
          </Route>
          {/* The phone controller UI doesn't need the Layout typically, it's a remote */}
          <Route path="/controller" element={<ControllerInterface />} />
        </Routes>
      </Router>
    </>
  );
}

export default App;
