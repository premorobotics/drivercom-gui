import { css } from "styled-system/css";

export const card = css({
  flex: "1 1 380px",
  minWidth: "0",
  borderWidth: "1px",
  borderColor: "border",
  borderRadius: "10px",
  background: "gray.1",
  paddingX: "3.5",
  paddingY: "3",
  display: "flex",
  flexDirection: "column",
  gap: "2.5",
});

export const cardHead = css({
  display: "flex",
  alignItems: "center",
  columnGap: "3",
  rowGap: "2.5",
  flexWrap: "wrap",
});

export const actions = css({
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-end",
  gap: "2",
  marginLeft: "auto",
  flexWrap: "wrap",
});

export const eyebrow = css({
  fontSize: "11px",
  fontWeight: "semibold",
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  color: "fg.muted",
});

export const deviceName = css({
  marginTop: "1px",
  fontSize: "md",
  fontWeight: "semibold",
});

export const deviceIcon = css({
  width: "9",
  height: "9",
  borderRadius: "8px",
  background: "accent.3",
  color: "accent.11",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  flex: "none",
});

export const deviceIconMuted = css({
  width: "9",
  height: "9",
  borderRadius: "8px",
  background: "gray.3",
  color: "fg.muted",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  flex: "none",
});

export const facts = css({
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
  columnGap: "4",
  rowGap: "2",
  alignItems: "end",
});

export const factKey = css({
  display: "flex",
  alignItems: "center",
  gap: "0.5",
  height: "18px",
  fontSize: "xs",
  color: "fg.muted",
});

// Same height as a select, so the card keeps its size in configure mode.
export const factValue = css({
  display: "flex",
  alignItems: "center",
  height: "9",
  marginTop: "0.5",
  fontSize: "sm",
  fontWeight: "medium",
  fontVariantNumeric: "tabular-nums",
});

export const factField = css({ marginTop: "0.5" });

export const infoButton = css({
  width: "18px",
  height: "18px",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "full",
  color: "fg.subtle",
  cursor: "help",
  _hover: { color: "fg.default" },
  _focusVisible: {
    outline: "2px solid",
    outlineColor: "accent.9",
    outlineOffset: "1px",
  },
  "& svg": { width: "14px", height: "14px" },
});

export const hint = css({
  fontSize: "sm",
  lineHeight: "1.45",
  color: "fg.muted",
});

export const notice = css({
  fontSize: "sm",
  lineHeight: "1.45",
  paddingX: "2.5",
  paddingY: "2",
  borderRadius: "6px",
  background: "red.3",
  color: "red.11",
});

export const emptyBox = css({
  flex: "1",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: "2",
  padding: "6",
  textAlign: "center",
  borderWidth: "1px",
  borderStyle: "dashed",
  borderColor: "gray.7",
  borderRadius: "8px",
  background: "gray.1",
});

export const numeric = css({ fontVariantNumeric: "tabular-nums" });
