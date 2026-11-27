/* @refresh reload */
import "./index.css"; // Necessary for PandaCSS
import { lazy } from "solid-js";
import { render } from "solid-js/web";
import { Route, Router } from "@solidjs/router";
import "pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css";

import App from "./App";
const Configuration = lazy(() => import("./pages/Configuration.tsx"));
const LogViewer = lazy(() => import("./pages/LogViewer.tsx"));
const Logging = lazy(() => import("./pages/Logging.tsx"));

render(
  () => (
    <Router root={App}>
      <Route path="/configuration" component={Configuration} />
      <Route path="/logviewer" component={LogViewer} />
      <Route path="/logging" component={Logging} />
      {/* App renders the Vibration Logger itself, so that it keeps running
          while other pages are shown. */}
      <Route path="/vibrationlogger" component={() => null} />
    </Router>
  ),
  document.getElementById("root") as HTMLElement,
);
