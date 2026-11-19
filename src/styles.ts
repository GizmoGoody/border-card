import { css } from "lit";

/**
 * The progress angles are registered so CSS can animate them (a plain gradient cannot be animated).
 * @property does not work inside a shadow root, so this registers them once on the document.
 */
export function registerProgressProperties(): void {
  for (const name of ["--border-card-from", "--border-card-fill"]) {
    try {
      CSS.registerProperty({ name, syntax: "<angle>", inherits: false, initialValue: "0deg" });
    } catch {
      // Already registered by another copy of the card.
    }
  }
}

export const cardStyles = css`
  :host {
    display: block;
    height: 100%;
    --bc-radius: var(--ha-card-border-radius, 12px);
  }

  .container {
    position: relative;
    box-sizing: border-box;
    height: 100%;
    padding: var(--bc-thickness);
    border-radius: var(--bc-radius);
    background: var(--bc-base);
    box-shadow: var(--ha-card-box-shadow, 0 2px 6px rgba(0, 0, 0, 0.2));
    overflow: hidden;
  }

  .container.glow {
    box-shadow:
      var(--ha-card-box-shadow, 0 2px 6px rgba(0, 0, 0, 0.2)),
      0 0 20px var(--bc-color);
  }

  .container.no-border {
    padding: 0;
    background: transparent;
    box-shadow: none;
  }

  /* Concentric corners: the inner radius is the outer radius minus the border thickness. */
  .inner {
    --bc-inner-radius: max(0px, calc(var(--bc-radius) - var(--bc-thickness)));
    position: relative;
    z-index: 1;
    height: 100%;
    border-radius: var(--bc-inner-radius);
    overflow: hidden;
    background: var(--ha-card-background, var(--card-background-color, white));
    /* Inherited by the wrapped card's ha-card. */
    --ha-card-border-radius: var(--bc-inner-radius);
    --ha-card-box-shadow: none;
    --ha-card-border-width: 0;
  }

  .ring {
    position: absolute;
    inset: 0;
    z-index: 2;
    box-sizing: border-box;
    padding: var(--bc-thickness);
    border-radius: inherit;
    pointer-events: none;
    background: conic-gradient(
      from var(--border-card-from),
      var(--bc-color) 0deg var(--border-card-fill),
      transparent var(--border-card-fill)
    );
    -webkit-mask:
      linear-gradient(#000 0 0) content-box,
      linear-gradient(#000 0 0);
    -webkit-mask-composite: xor;
    mask:
      linear-gradient(#000 0 0) content-box exclude,
      linear-gradient(#000 0 0);
    transition:
      --border-card-from 0.5s ease,
      --border-card-fill 0.5s ease;
  }

  .text {
    position: absolute;
    z-index: 3;
    font-size: 14px;
    font-weight: bold;
    color: var(--bc-text-color, var(--primary-text-color));
    text-shadow: 0 1px 3px rgba(0, 0, 0, 0.8);
    white-space: nowrap;
    pointer-events: none;
  }
  .top-left {
    top: 12px;
    left: 12px;
  }
  .top-center {
    top: 12px;
    left: 50%;
    transform: translateX(-50%);
  }
  .top-right {
    top: 12px;
    right: 12px;
  }
  .center-left {
    top: 50%;
    left: 12px;
    transform: translateY(-50%);
  }
  .center {
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
  }
  .center-right {
    top: 50%;
    right: 12px;
    transform: translateY(-50%);
  }
  .bottom-left {
    bottom: 12px;
    left: 12px;
  }
  .bottom-center {
    bottom: 12px;
    left: 50%;
    transform: translateX(-50%);
  }
  .bottom-right {
    bottom: 12px;
    right: 12px;
  }

  @media (prefers-reduced-motion: reduce) {
    .ring {
      transition: none;
    }
  }
`;
