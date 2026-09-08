/** @type {const} */
// Lumière House runs a SINGLE black-first champagne theme. There is no light
// mode and no system-appearance following: the "light" and "dark" entries below
// are intentionally identical.
//
// Why identical rather than just deleting the light values: the palette is read
// through several independent paths (NativeWind CSS variables, the `Colors`
// runtime palette behind `useColors()`, Tailwind's compiled classes, and the
// static web prerender, which runs before any client theme state exists). Any
// one of those resolving to "light" used to hand back the old cream palette —
// which is how #F3E9DD text ended up painted on a #F3E9DD background. Making
// both schemes the same palette means every path renders the same black-first
// design no matter which one it picks, including the very first prerendered
// paint and a device set to light mode.
//
// Contrast against #0A0A0A (WCAG AA needs 4.5:1 for body text, 3:1 for large):
//   foreground #F3E9DD 17.0:1 · primary #C9AE7B 9.4:1 · muted #9C9086 6.1:1
//   success #9DC2A4 9.2:1 · warning #E1B873 11.0:1 · error #F09A80 9.4:1
const black = {
  primary: "#C9AE7B", // champagne gold — CTAs, active states, highlights
  background: "#0A0A0A", // near-black page ground
  surface: "#151515", // cards and inputs
  elevated: "#1E1E1E", // callout panels that sit above a card
  foreground: "#F3E9DD", // off-white primary text
  muted: "#9C9086", // secondary text
  border: "#2A2A2A", // dividers, card outlines
  success: "#9DC2A4",
  warning: "#E1B873",
  error: "#F09A80",
};

const themeColors = Object.fromEntries(
  Object.entries(black).map(([name, value]) => [name, { light: value, dark: value }]),
);

module.exports = { themeColors };
