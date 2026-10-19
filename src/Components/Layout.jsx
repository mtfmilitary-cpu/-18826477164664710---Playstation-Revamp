import React from "react";
import { Outlet } from "react-router-dom";
import GlobalNavbar from "./GlobalNavbar";
import ControllerNavigationProvider from "./ControllerNavigation";
import QuickMenu from "./QuickMenu";
import ConsoleSounds from "./ConsoleSounds";

const Layout = () => {
    return (
        <ControllerNavigationProvider>
            <GlobalNavbar />
            <QuickMenu />
            <ConsoleSounds />
            <div style={{ paddingTop: "0px", position: "relative" }}>
                <Outlet />
            </div>
        </ControllerNavigationProvider>
    );
};

export default Layout;
