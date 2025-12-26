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

export default function TheDrawer() {
  const [open, setOpen] = React.useState(false);

  const toggleDrawer = (newOpen: boolean) => () => {
    setOpen(newOpen);
  };

  const DrawerList = (
    <Box sx={{ width: 250 }} role="presentation" onClick={toggleDrawer(false)}>
      <List>
        <ListItem disablePadding>
          <ListItemButton
            component={Link}
            to="/"
            onClick={() => setOpen(false)}
          >
            <ListItemText primary="Home" />
          </ListItemButton>
        </ListItem>

        <ListItem disablePadding>
          <ListItemButton
            component={Link}
            to="/Page1"
            onClick={() => setOpen(false)}
          >
            <ListItemText primary="Add Entry" />
          </ListItemButton>
        </ListItem>

        <ListItem disablePadding>
          <ListItemButton
            component={Link}
            to="/EditEntry"
            onClick={() => setOpen(false)}
          >
            <ListItemText primary="Edit Existing Entry" />
          </ListItemButton>
        </ListItem>

        <ListItem disablePadding>
          <ListItemButton
            component={Link}
            to="/AddExcel"
            onClick={() => setOpen(false)}
          >
            <ListItemText primary="Upload from Excel" />
          </ListItemButton>
        </ListItem>

        <ListItem disablePadding>
          <ListItemButton
            component={Link}
            to="/Users"
            onClick={() => setOpen(false)}
          >
            <ListItemText primary="Users" />
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
