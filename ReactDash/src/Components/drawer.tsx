import * as React from "react";
import Box from "@mui/material/Box";
import Drawer from "@mui/material/Drawer";
import Button from "@mui/material/Button";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import { Link } from "react-router-dom";
import menuIcon from "../assets/menuIcon.svg";
import { translations } from "../translations";

export default function TheDrawer() {
  const [open, setOpen] = React.useState(false);
  const lang =
    (localStorage.getItem("lang") as "en" | "tet") || "en";
  const t = (key: string) =>
    (translations as any)[key]?.[lang] || key;

  const toggleDrawer = (newOpen: boolean) => () => {
    setOpen(newOpen);
  };

  const DrawerList = (
    <Box sx={{ width: 250 }} role="presentation" onClick={toggleDrawer(false)}>
      <Box sx={{ display: "flex", justifyContent: "center", gap: 1, p: 2 }}>
      </Box>

      <List>
        <ListItem disablePadding>
          <ListItemButton
            component={Link}
            to="/"
            onClick={() => setOpen(false)}
          >
            <ListItemText primary={t("home")} />
          </ListItemButton>
        </ListItem>

        <ListItem disablePadding>
          <ListItemButton
            component={Link}
            to="/Page1"
            onClick={() => setOpen(false)}
          >
            <ListItemText primary={t("addEntry")} />
          </ListItemButton>
        </ListItem>

        <ListItem disablePadding>
          <ListItemButton
            component={Link}
            to="/EditEntry"
            onClick={() => setOpen(false)}
          >
            <ListItemText primary={t("addEntry")} />
          </ListItemButton>
        </ListItem>

        <ListItem disablePadding>
          <ListItemButton
            component={Link}
            to="/AddExcel"
            onClick={() => setOpen(false)}
          >
            <ListItemText primary={t("uploadFromExcel")} />
          </ListItemButton>
        </ListItem>

        <ListItem disablePadding>
          <ListItemButton
            component={Link}
            to="/Media"
            onClick={() => setOpen(false)}
          >
            <ListItemText primary={t("media")} />
          </ListItemButton>
        </ListItem>

        <ListItem disablePadding>
          <ListItemButton
            component={Link}
            to="/Users"
            onClick={() => setOpen(false)}
          >
            <ListItemText primary={t("users")} />
          </ListItemButton>
        </ListItem>

        <ListItem disablePadding>
          <ListItemButton
            component={Link}
            to="/Analytics"
            onClick={() => setOpen(false)}
          >
            <ListItemText primary={t("analytics")} />
          </ListItemButton>
        </ListItem>

        <ListItem disablePadding>
          <ListItemButton
            component={Link}
            to="/Audit"
            onClick={() => setOpen(false)}
          >
            <ListItemText primary={t("auditFeature")} />
          </ListItemButton>
        </ListItem>
      </List>
    </Box>
  );

  return (
    <div style={{ position: "fixed", top: 16, left: 16, zIndex: 1000 }}>
      <Button onClick={toggleDrawer(true)}>
        <img src={menuIcon} alt="icon" style={{ width: 24, height: 24 }} />
      </Button>
      <Drawer open={open} onClose={toggleDrawer(false)}>
        {DrawerList}
      </Drawer>
    </div>
  );
}