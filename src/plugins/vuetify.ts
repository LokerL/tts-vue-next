import "vuetify/styles";
import "@mdi/font/css/materialdesignicons.css";
import { createVuetify } from "vuetify";
import * as components from "vuetify/components";
import * as directives from "vuetify/directives";

export const vuetify = createVuetify({
  components,
  directives,
  theme: {
    defaultTheme: "light",
    themes: {
      light: {
        dark: false,
        colors: {
          primary: "#4A7CFF",
          secondary: "#6F7E95",
          background: "#F3F7FC",
          surface: "#FCFEFF",
          "surface-elevated": "#FFFFFF",
          glass: "#FFFFFF",
          "glass-border": "#D7E3F1",
          "text-muted": "#62748B",
          success: "#2EA26B",
          warning: "#D99A33",
          error: "#D85F6B",
        },
      },
      dark: {
        dark: true,
        colors: {
          primary: "#7AA6FF",
          secondary: "#90A0B8",
          background: "#0D1624",
          surface: "#111D2D",
          "surface-elevated": "#172436",
          glass: "#162334",
          "glass-border": "#31465F",
          "text-muted": "#9AABC1",
          success: "#58C48A",
          warning: "#F3BF65",
          error: "#FF8C99",
        },
      },
    },
  },
  defaults: {
    VBtn: { variant: "flat" },
    VTextField: { variant: "outlined", density: "compact" },
    VSelect: { variant: "outlined", density: "compact" },
    VSlider: { density: "compact" },
  },
});
