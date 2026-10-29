import React from "react";
import { Outlet } from "react-router-dom";
import GlobalNavbar from "./GlobalNavbar";
import ControllerNavigationProvider from "./ControllerNavigation";
import QuickMenu from "./QuickMenu";
import ConsoleSounds from "./ConsoleSounds";
import OnScreenKeyboard from "./OnScreenKeyboard";

const Layout = () => {
    return (
        <ControllerNavigationProvider>
            <GlobalNavbar />
            <QuickMenu />
            <ConsoleSounds />
            <OnScreenKeyboard />
            <div style={{ paddingTop: "0px", position: "relative" }}>
                <Outlet />
            </div>
        </ControllerNavigationProvider>
    );
};

export default Layout;
