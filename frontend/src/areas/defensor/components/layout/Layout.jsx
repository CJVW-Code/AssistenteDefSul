import React from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";

export const Layout = () => {
  return (
    <div className="min-h-screen bg-app flex">
      <Sidebar />
      <div className="flex-1 flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 overflow-y-auto bg-app">
          <div className="container-app py-10">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
