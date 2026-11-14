import { createCn } from "cn/config";

/** Class merger that also knows the theme's custom font sizes from globals.css. */
export const cn = createCn({
  extend: { theme: { text: ["label", "compact", "title"] } },
});
