import { createSignal } from "solid-js";

// True while a Vibration Logger session is running. The page stays mounted
// after its first visit, so a session keeps logging while other pages are
// shown; the navigation bar uses this to show that it is still running.
export const [vibrationLogging, setVibrationLogging] = createSignal(false);
