import { defineTextStyles } from "@pandacss/dev";

export const textStyles = defineTextStyles({
  xs: { value: { fontSize: "xs", lineHeight: "1.125rem", fontFamily: "body" } },
  sm: { value: { fontSize: "sm", lineHeight: "1.25rem", fontFamily: "body" } },
  md: { value: { fontSize: "md", lineHeight: "1.5rem", fontFamily: "body" } },
  lg: { value: { fontSize: "lg", lineHeight: "1.75rem", fontFamily: "body" } },
  xl: { value: { fontSize: "xl", lineHeight: "1.875rem", fontFamily: "body" } },
  "2xl": {
    value: { fontSize: "2xl", lineHeight: "2rem", fontFamily: "body" },
  },
  "3xl": {
    value: {
      fontSize: "3xl",
      lineHeight: "2.375rem",
      fontFamily: "body",
    },
  },
  "4xl": {
    value: {
      fontSize: "4xl",
      lineHeight: "2.75rem",
      letterSpacing: "-0.02em",
      fontFamily: "body",
    },
  },
  "5xl": {
    value: {
      fontSize: "5xl",
      lineHeight: "3.75rem",
      letterSpacing: "-0.02em",
      fontFamily: "body",
    },
  },
  "6xl": {
    value: {
      fontSize: "6xl",
      lineHeight: "4.5rem",
      letterSpacing: "-0.02em",
      fontFamily: "body",
    },
  },
  "7xl": {
    value: {
      fontSize: "7xl",
      lineHeight: "5.75rem",
      letterSpacing: "-0.02em",
      fontFamily: "body",
    },
  },

  label: {
    value: {
      fontSize: "sm",
      lineHeight: "1.25rem",
      fontWeight: "medium",
      fontFamily: "body",
    },
  },
});
