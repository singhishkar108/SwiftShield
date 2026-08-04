import React from "react";
import Navbar from "./Navbar";
import Footer from "./Footer";
import "../styles/variables.css";
import "../styles/layout.css";

export default function Layout({ children, username, isAuthed, onLogout }) {
  return (
    <div className="app-shell">
      <Navbar username={username} isAuthed={isAuthed} onLogout={onLogout} />
      <main className="app-main">{children}</main>
      <Footer />
    </div>
  );
}
