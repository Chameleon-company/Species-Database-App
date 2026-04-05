import * as React from "react";
import Box from "@mui/material/Box";
import CssBaseline from "@mui/material/CssBaseline";
import Drawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import { Link, useNavigate, useLocation } from "react-router-dom";

import HomeIcon from "@mui/icons-material/Home";
import ParkIcon from "@mui/icons-material/Park";
import FilterIcon from "@mui/icons-material/Filter";
import VerifiedUserIcon from "@mui/icons-material/VerifiedUser";
import GroupIcon from "@mui/icons-material/Group";
import AnalyticsIcon from "@mui/icons-material/Analytics";
import LogoutIcon from "@mui/icons-material/Logout";
import MenuIcon from "@mui/icons-material/Menu";
import CloseIcon from "@mui/icons-material/Close";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";

import Logo from "../assets/logo-color.png";

const DRAWER_WIDTH = 220;

const NAV_ITEMS = [
  { url: "/",          label: "Dashboard", Icon: HomeIcon },
  { url: "/species",   label: "Species",   Icon: ParkIcon },
  { url: "/Media",     label: "Media",     Icon: FilterIcon },
  { url: "/Audit",     label: "Audit",     Icon: VerifiedUserIcon },
  { url: "/Users",     label: "Users",     Icon: GroupIcon },
  { url: "/Analytics", label: "Analytics", Icon: AnalyticsIcon },
];

/* ─── Styles ──────────────────────────────────────────────────────── */
const styles: Record<string, React.CSSProperties> = {
  sidebar: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
    backgroundColor: "#ffffff",
    fontFamily: "'DM Sans', sans-serif",
  },
  logoArea: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px 16px",
    backgroundColor: "#eef6e6",
    borderBottom: "1px solid #d8edbd",
  },
  logo: {
    height: 40,
    width: "auto",
    objectFit: "contain",
  },
  sectionLabel: {
    padding: "20px 20px 8px",
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    color: "#86b85a",
  },
  nav: {
    flex: 1,
    padding: "0 10px",
    display: "flex",
    flexDirection: "column",
    gap: 2,
  },
  divider: {
    margin: "8px 16px",
    height: 1,
    backgroundColor: "#e8f5db",
    border: "none",
  },
  logoutBtn: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "10px 12px",
    margin: "0 10px 16px",
    border: "none",
    borderRadius: 12,
    background: "transparent",
    cursor: "pointer",
    fontSize: 14,
    fontWeight: 500,
    color: "#9ca3af",
    fontFamily: "'DM Sans', sans-serif",
    transition: "background 0.15s, color 0.15s",
    width: "calc(100% - 20px)",
    textAlign: "left",
  },
  logoutIcon: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 32,
    height: 32,
    borderRadius: 8,
    color: "#9ca3af",
    flexShrink: 0,
  },
  /* top bar */
  topBar: {
    position: "fixed",
    top: 0,
    right: 0,
    left: 0,
    height: 56,
    backgroundColor: "#ffffff",
    borderBottom: "1px solid #e8f5db",
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    padding: "0 16px",
    zIndex: 1200,
    boxSizing: "border-box",
  },
  mobileMenuBtn: {
    background: "transparent",
    border: "none",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 6,
    borderRadius: 8,
    color: "#4b5563",
    marginRight: "auto",
  },
  /* account dropdown */
  accountWrap: {
    position: "relative",
  },
  accountBtn: {
    background: "transparent",
    border: "none",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 36,
    height: 36,
    borderRadius: "50%",
    color: "#6b7280",
    transition: "background 0.15s",
  },
  dropdown: {
    position: "absolute",
    top: 44,
    right: 0,
    width: 176,
    backgroundColor: "#ffffff",
    border: "1px solid #d8edbd",
    borderRadius: 14,
    boxShadow: "0 8px 24px rgba(0,0,0,0.10)",
    overflow: "hidden",
    zIndex: 9999,
  },
  dropdownHeader: {
    padding: "12px 16px",
    borderBottom: "1px solid #f0f9e8",
  },
  dropdownHeaderTitle: {
    fontSize: 12,
    fontWeight: 600,
    color: "#2d6a0a",
    margin: 0,
  },
  dropdownHeaderSub: {
    fontSize: 11,
    color: "#9ca3af",
    margin: "2px 0 0",
  },
  dropdownLogout: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    width: "100%",
    padding: "10px 16px",
    background: "transparent",
    border: "none",
    cursor: "pointer",
    fontSize: 13,
    color: "#ef4444",
    fontFamily: "'DM Sans', sans-serif",
    fontWeight: 500,
    transition: "background 0.15s",
    textAlign: "left",
    boxSizing: "border-box",
  },
};

/* ─── Nav Item ────────────────────────────────────────────────────── */
function NavItem({
  url,
  label,
  Icon,
  active,
  onClick,
}: {
  url: string;
  label: string;
  Icon: React.ElementType;
  active: boolean;
  onClick?: () => void;
}) {
  const [hovered, setHovered] = React.useState(false);

  const isHighlighted = active || hovered;

  return (
    <Link
      to={url}
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "10px 12px",
        borderRadius: 12,
        textDecoration: "none",
        fontSize: 14,
        fontWeight: 500,
        color: active ? "#2d6a0a" : hovered ? "#3d7a14" : "#6b7280",
        backgroundColor: active ? "#dff0c8" : hovered ? "#f0f9e8" : "transparent",
        transition: "background 0.15s, color 0.15s",
        position: "relative",
        overflow: "hidden",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* left accent bar */}
      <span
        style={{
          position: "absolute",
          left: 0,
          top: "50%",
          transform: "translateY(-50%)",
          width: 3,
          height: 24,
          borderRadius: "0 4px 4px 0",
          backgroundColor: "#4a8f1f",
          opacity: active ? 1 : hovered ? 0.4 : 0,
          transition: "opacity 0.15s",
        }}
      />

      {/* icon tile */}
      <span
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 32,
          height: 32,
          borderRadius: 8,
          backgroundColor: active ? "#c2e29a" : hovered ? "#e4f5d0" : "transparent",
          color: active ? "#2d6a0a" : hovered ? "#3d7a14" : "#9ca3af",
          flexShrink: 0,
          transition: "background 0.15s, color 0.15s",
        }}
      >
        <Icon sx={{ fontSize: 18 }} />
      </span>

      <span style={{ flex: 1 }}>{label}</span>

      {/* active dot */}
      {active && (
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            backgroundColor: "#4a8f1f",
            flexShrink: 0,
          }}
        />
      )}
    </Link>
  );
}

/* ─── Account Dropdown ────────────────────────────────────────────── */
function AccountMenu({ onLogout }: { onLogout: () => void }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} style={styles.accountWrap}>
      <button
        style={styles.accountBtn}
        onClick={() => setOpen((v) => !v)}
        aria-label="Account menu"
      >
        <AccountCircleIcon sx={{ fontSize: 28 }} />
      </button>

      {open && (
        <div style={styles.dropdown}>
          <div style={styles.dropdownHeader}>
            <p style={styles.dropdownHeaderTitle}>Admin</p>
            <p style={styles.dropdownHeaderSub}>Signed in</p>
          </div>
          <button
            style={styles.dropdownLogout}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#fef2f2")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
            onClick={() => { setOpen(false); onLogout(); }}
          >
            <LogoutIcon sx={{ fontSize: 16 }} />
            Logout
          </button>
        </div>
      )}
    </div>
  );
}

/* ─── Sidebar Content ─────────────────────────────────────────────── */
function SidebarContent({
  onNavClick,
}: {
  onNavClick?: () => void;
}) {
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (url: string) => {
    if (url === "/")
      return location.pathname === "/" || location.hash === "#/";
    return (
      location.pathname.toLowerCase().includes(url.toLowerCase()) ||
      location.hash.toLowerCase().includes(url.toLowerCase())
    );
  };

  const handleLogout = () => {
    localStorage.removeItem("admin_token");
    localStorage.removeItem("admin_role");
    navigate("/admin-login");
  };

  const [logoutHovered, setLogoutHovered] = React.useState(false);

  return (
    <div style={styles.sidebar}>
      {/* Logo */}
      <div style={styles.logoArea}>
        <img src={Logo} alt="FINI Logo" style={styles.logo} />
      </div>

      {/* Section label */}
      <div style={styles.sectionLabel}>Main Menu</div>

      {/* Nav */}
      <nav style={styles.nav}>
        {NAV_ITEMS.map(({ url, label, Icon }) => (
          <NavItem
            key={url}
            url={url}
            label={label}
            Icon={Icon}
            active={isActive(url)}
            onClick={onNavClick}
          />
        ))}
      </nav>

      {/* Divider */}
      <hr style={styles.divider} />

      {/* Logout */}
      <button
        style={{
          ...styles.logoutBtn,
          backgroundColor: logoutHovered ? "#fef2f2" : "transparent",
          color: logoutHovered ? "#ef4444" : "#9ca3af",
        }}
        onMouseEnter={() => setLogoutHovered(true)}
        onMouseLeave={() => setLogoutHovered(false)}
        onClick={handleLogout}
      >
        <span
          style={{
            ...styles.logoutIcon,
            color: logoutHovered ? "#ef4444" : "#9ca3af",
          }}
        >
          <LogoutIcon sx={{ fontSize: 18 }} />
        </span>
        Logout
      </button>
    </div>
  );
}

/* ─── Main Component ──────────────────────────────────────────────── */
export default function DrawerComponent({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [isClosing, setIsClosing] = React.useState(false);
  const navigate = useNavigate();

  const handleDrawerClose = () => { setIsClosing(true); setMobileOpen(false); };
  const handleDrawerTransitionEnd = () => setIsClosing(false);
  const handleDrawerToggle = () => { if (!isClosing) setMobileOpen(!mobileOpen); };

  const handleLogout = () => {
    localStorage.removeItem("admin_token");
    localStorage.removeItem("admin_role");
    navigate("/admin-login");
  };

  return (
    <Box sx={{ display: "flex" }}>
      <CssBaseline />

      {/* ── Top bar ── */}
      <div style={styles.topBar}>
        {/* Mobile hamburger */}
        <button
          style={{
            ...styles.mobileMenuBtn,
            display: undefined, // shown always, hidden via sx on IconButton below
          }}
          onClick={handleDrawerToggle}
          aria-label="open drawer"
        >
          <IconButton
            sx={{ display: { sm: "none" }, color: "#4b5563", p: 0 }}
            disableRipple
          >
            {mobileOpen ? <CloseIcon fontSize="small" /> : <MenuIcon fontSize="small" />}
          </IconButton>
        </button>

        <AccountMenu onLogout={handleLogout} />
      </div>

      {/* ── Sidebar ── */}
      <Box
        component="nav"
        sx={{ width: { sm: DRAWER_WIDTH }, flexShrink: { sm: 0 } }}
      >
        {/* Mobile */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onTransitionEnd={handleDrawerTransitionEnd}
          onClose={handleDrawerClose}
          sx={{
            display: { xs: "block", sm: "none" },
            "& .MuiDrawer-paper": {
              width: DRAWER_WIDTH,
              border: "none",
              boxShadow: "4px 0 24px rgba(0,0,0,0.08)",
            },
          }}
          slotProps={{ root: { keepMounted: true } }}
        >
          <SidebarContent onNavClick={() => setMobileOpen(false)} />
        </Drawer>

        {/* Desktop */}
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: "none", sm: "block" },
            "& .MuiDrawer-paper": {
              width: DRAWER_WIDTH,
              border: "none",
              borderRight: "1px solid #e8f5db",
            },
          }}
          open
        >
          <SidebarContent />
        </Drawer>
      </Box>

      {/* ── Page content ── */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { sm: `calc(100% - ${DRAWER_WIDTH}px)` },
          pt: "56px", // top bar offset
        }}
      >
        {children}
      </Box>
    </Box>
  );
}

/* ─── ListComponent (backwards compat) ───────────────────────────── */
export function ListComponent({
  url,
  text,
  icon,
}: {
  url: string;
  text: string;
  icon: React.ReactNode;
}) {
  const active =
    window.location.hash.toLowerCase() === `#${url.toLowerCase()}`;
  return (
    <Link
      to={url}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "10px 12px",
        borderRadius: 12,
        textDecoration: "none",
        fontSize: 14,
        fontWeight: 500,
        color: active ? "#2d6a0a" : "#6b7280",
        backgroundColor: active ? "#dff0c8" : "transparent",
      }}
    >
      <span
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 32,
          height: 32,
          borderRadius: 8,
          backgroundColor: active ? "#c2e29a" : "transparent",
          color: active ? "#2d6a0a" : "#9ca3af",
        }}
      >
        {icon}
      </span>
      {text}
    </Link>
  );
}