import { createSignal, JSX, onCleanup, Show } from "solid-js";
import { Portal } from "solid-js/web";
import { css } from "styled-system/css";

type TipState = { text: string; left: number; top: number };

// The page shows one tooltip at a time.
const [tip, setTip] = createSignal<TipState | null>(null);

const inlineWrap = css({
  position: "relative",
  display: "inline-flex",
  "& :disabled": { pointerEvents: "none" },
});

const blockWrap = css({
  position: "relative",
  display: "flex",
  flexDirection: "column",
  width: "100%",
  "& :disabled": { pointerEvents: "none" },
});

const hidden = css({ srOnly: true });

type TipProps = {
  text: string;
  // The tooltip shows only while this is true.
  when?: boolean;
  // Stretches to the full width, for form fields.
  block?: boolean;
  // Id of the hidden tooltip text, for the child's aria-describedby.
  id?: string;
  children: JSX.Element;
};

// Shows `text` next to the cursor while it is over the children, or under
// them while they have keyboard focus. Disabled children show it too.
export function Tip(props: TipProps) {
  const active = () => props.when ?? true;

  return (
    <span
      class={props.block ? blockWrap : inlineWrap}
      onMouseMove={(e) => {
        if (!active()) {
          setTip(null);
          return;
        }
        let left = e.clientX + 14;
        if (left + 270 > window.innerWidth) {
          left = Math.max(8, e.clientX - 270);
        }
        setTip({ text: props.text, left, top: e.clientY + 18 });
      }}
      onMouseLeave={() => setTip(null)}
      onFocusIn={(e) => {
        if (!active() || !e.currentTarget.matches(":has(:focus-visible)")) {
          return;
        }
        const rect = e.currentTarget.getBoundingClientRect();
        setTip({ text: props.text, left: rect.left, top: rect.bottom + 8 });
      }}
      onFocusOut={() => setTip(null)}
    >
      {props.children}
      <Show when={active() && props.id}>
        <span id={props.id} role="tooltip" class={hidden}>
          {props.text}
        </span>
      </Show>
    </span>
  );
}

// Renders the page's tooltip. Mount it once per page.
export function TipLayer() {
  onCleanup(() => setTip(null));

  return (
    <Portal>
      <Show when={tip()}>
        {(t) => (
          <div
            aria-hidden="true"
            class={css({
              position: "fixed",
              zIndex: "tooltip",
              maxWidth: "260px",
              background: "gray.12",
              color: "gray.1",
              fontSize: "xs",
              lineHeight: "1.4",
              paddingX: "2.5",
              paddingY: "1.5",
              borderRadius: "md",
              pointerEvents: "none",
              boxShadow: "md",
            })}
            style={{ left: `${t().left}px`, top: `${t().top}px` }}
          >
            {t().text}
          </div>
        )}
      </Show>
    </Portal>
  );
}
