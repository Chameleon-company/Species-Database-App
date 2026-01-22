import * as React from "react";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import CssBaseline from "@mui/material/CssBaseline";
import Divider from "@mui/material/Divider";
import Drawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import HomeIcon from "@mui/icons-material/Home";
import ParkIcon from "@mui/icons-material/Park";
import List from "@mui/material/List";
import GroupIcon from "@mui/icons-material/Group";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import MenuIcon from "@mui/icons-material/Menu";
import Toolbar from "@mui/material/Toolbar";
import { Link } from "react-router-dom";
import VerifiedUserIcon from "@mui/icons-material/VerifiedUser";
import FilterIcon from "@mui/icons-material/Filter";
import Logo from "../assets/logo-color.png";

const drawerWidth = 240;

export default function DrawerComponent({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [isClosing, setIsClosing] = React.useState(false);

  const handleDrawerClose = () => {
    setIsClosing(true);
    setMobileOpen(false);
  };

  const handleDrawerTransitionEnd = () => {
    setIsClosing(false);
  };

  const handleDrawerToggle = () => {
    if (!isClosing) {
      setMobileOpen(!mobileOpen);
    }
  };

  const drawer = (
    <div>
      <Toolbar
        className="flex items-center justify-center p-2"
        style={{
          backgroundColor: "#e2ecdd",
        }}
      >
        <img src={Logo} alt="Logo" className="h-10 w-auto object-contain" />
      </Toolbar>
      <Divider />
      <List>
        <ListComponent url="/" text="Dashboard" icon={<HomeIcon />} />
        <ListComponent url="/species" text="Species" icon={<ParkIcon />} />
        <ListComponent url="/Media" text="Media" icon={<FilterIcon />} />
        <ListComponent url="/Audit" text="Audit" icon={<VerifiedUserIcon />} />
        <ListComponent url="/Users" text="Users" icon={<GroupIcon />} />
      </List>
      {/* <Divider />
      <List>
        {["All mail", "Trash", "Spam"].map((text, index) => (
          <ListItem key={index} disablePadding>
            <ListItemButton>
              <ListItemIcon>
              </ListItemIcon>
              <ListItemText primary={text} />
            </ListItemButton>
          </ListItem>
        ))}
      </List> */}
    </div>
  );

  return (
    <Box sx={{ display: "flex" }}>
      <CssBaseline />
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
          backgroundColor: "white",
          //shadow remove
          boxShadow: "none",
          borderBottom: "1px solid #e0e0e0",
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: "none" }, color: "black" }}
          >
            <MenuIcon />
          </IconButton>
          <div className="flex flex-1 items-center justify-end gap-4">
            <img
              src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
              alt=""
              className="size-10 rounded-full outline -outline-offset-1 outline-white/10"
            />
          </div>
        </Toolbar>
      </AppBar>
      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
        aria-label="mailbox folders"
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onTransitionEnd={handleDrawerTransitionEnd}
          onClose={handleDrawerClose}
          sx={{
            display: { xs: "block", sm: "none" },
            "& .MuiDrawer-paper": {
              boxSizing: "border-box",
              width: drawerWidth,
            },
          }}
          slotProps={{
            root: {
              keepMounted: true, // Better open performance on mobile.
            },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: "none", sm: "block" },
            "& .MuiDrawer-paper": {
              boxSizing: "border-box",
              width: drawerWidth,
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
      <Box
        className="w-full"
        component="main"
        sx={
          {
            //   flexGrow: 1,
            //   p: 3,
            //   width: { sm: `calc(100% - ${drawerWidth}px)` },
          }
        }
      >
        <Toolbar />
        {children}
      </Box>
    </Box>
  );
}

export function ListComponent({
  url,
  text,
  icon,
}: {
  url: string;
  text: string;
  icon: React.ReactNode;
}) {
  const active = window.location.hash;
  return (
    <ListItemButton
      component={Link}
      to={url}
      className={
        active.toLowerCase() == `#${url.toLowerCase()}`
          ? "!bg-[#d4e4c7] hover:!text-black"
          : "hover:!text-black"
      }
    >
      <ListItemIcon>{icon}</ListItemIcon>
      <ListItemText primary={text} />
    </ListItemButton>
  );
}
