import React, { useState, useEffect, useRef } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../AuthContext";
import "../styles/navbar.css";
import logo from "../assets/swiftshield.png";

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { username, isLoggedIn, isStaff, isAdmin, logout } = useAuth();
  
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close menus on route change
  useEffect(() => {
    setDropdownOpen(false);
    setMobileNavOpen(false);
    document.body.classList.remove("nav-open");
  }, [location]);

  function handleLogout() {
    setDropdownOpen(false);
    logout();
    navigate("/");
  }

  function toggleMobileNav() {
    const nextState = !mobileNavOpen;
    setMobileNavOpen(nextState);
    if (nextState) {
      document.body.classList.add("nav-open");
    } else {
      document.body.classList.remove("nav-open");
    }
  }

  return (
    <header className="mh-nav">
      <div className="mh-nav-inner">
        {/* Brand Logo & Name */}
        <div className="mh-brand" onClick={() => navigate("/")} role="button" tabIndex={0}>
          <img src={logo} alt="SwiftShield Inc Logo" />
          <div className="mh-brand-text">
            <span className="bank-name">SwiftShield Inc</span>
            <span className="bank-suite">Institutional Banking</span>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="mh-links">
          <NavLink to="/" end className={({ isActive }) => (isActive ? "active" : "")}>
            Home
          </NavLink>

          {isLoggedIn && (
            <>
              <NavLink to="/welcome">Dashboard</NavLink>
              <NavLink to="/payments">Payments</NavLink>
              <NavLink to="/beneficiaries">Beneficiaries</NavLink>
            </>
          )}

          <NavLink to="/support">Support</NavLink>

          {/* Staff / Admin Portal Badge Link */}
          {(isStaff || isAdmin) && (
            <NavLink to="/staff" className="staff-portal-link">
              <span className="portal-badge">PRO</span> Staff Portal
            </NavLink>
          )}
        </nav>

        {/* Right Side Actions / User Profile */}
        <div className="mh-actions">
          {isLoggedIn ? (
            <div className="mh-user-wrapper" ref={dropdownRef}>
              <button
                className={`mh-user-btn ${dropdownOpen ? "active" : ""}`}
                onClick={() => setDropdownOpen(!dropdownOpen)}
                aria-haspopup="true"
                aria-expanded={dropdownOpen}
              >
                <div className="avatar">
                  {username?.[0]?.toUpperCase() || "U"}
                </div>
                <span className="u-name">{username}</span>
                <span className={`chevron ${dropdownOpen ? "up" : "down"}`}>▾</span>
              </button>

              {/* User Dropdown Menu */}
              {dropdownOpen && (
                <div className="dropdown open">
                  <div className="dropdown-header">
                    <p className="user-title">{username}</p>
                    <span className="role-tag">
                      {isAdmin ? "Admin" : isStaff ? "Staff" : "Client Account"}
                    </span>
                  </div>

                  <div className="dropdown-divider" />

                  <NavLink to="/welcome" onClick={() => setDropdownOpen(false)}>
                    📊 Dashboard
                  </NavLink>
                  <NavLink to="/settings" onClick={() => setDropdownOpen(false)}>
                    ⚙️ Account Settings
                  </NavLink>

                  {(isStaff || isAdmin) && (
                    <NavLink to="/staff" onClick={() => setDropdownOpen(false)}>
                      🛡️ Staff Management
                    </NavLink>
                  )}

                  <div className="dropdown-divider" />

                  <button onClick={handleLogout} className="logout-btn">
                    🚪 Log Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="mh-auth">
              <NavLink className="btn ghost" to="/login">
                Sign In
              </NavLink>
              <NavLink className="btn solid" to="/register">
                Open Account
              </NavLink>

              <NavLink className="btn ghost staff-btn" to="/staff/login">
                Employee Portal
              </NavLink>
            </div>
          )}
        </div>

        {/* Mobile Navigation Toggle */}
        <button
          className={`mh-burger ${mobileNavOpen ? "is-active" : ""}`}
          aria-label="Toggle Navigation Menu"
          onClick={toggleMobileNav}
        >
          <span />
          <span />
          <span />
        </button>
      </div>
    </header>
  );
}