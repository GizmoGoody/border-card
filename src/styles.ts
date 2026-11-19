import { css } from "lit";

/**
 * The progress angles are registered so CSS can animate them (a plain gradient cannot be animated).
 * @property does not work inside a shadow root, so this registers them once on the document.
 */
export function registerProgressProperties(): void {
  for (const name of ["--border-card-fill", "--border-card-spin"]) {
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
    box-shadow: var(--ha-card-box-shadow, 0 2px 6px rgba(0, 0, 0, 0.2));
    overflow: hidden;
  }

  .container.effect-glow {
    box-shadow:
      var(--ha-card-box-shadow, 0 2px 6px rgba(0, 0, 0, 0.2)),
      0 0 20px var(--bc-color);
  }

  .container.effect-pulse {
    animation: bc-pulse 2s ease-in-out infinite;
  }

  @keyframes bc-pulse {
    0%,
    100% {
      box-shadow:
        var(--ha-card-box-shadow, 0 2px 6px rgba(0, 0, 0, 0.2)),
        0 0 4px var(--bc-color);
    }
    50% {
      box-shadow:
        var(--ha-card-box-shadow, 0 2px 6px rgba(0, 0, 0, 0.2)),
        0 0 24px var(--bc-color);
    }
  }

  .effect-breathe .frame,
  .effect-breathe .ring {
    animation: bc-breathe 3s ease-in-out infinite;
  }

  @keyframes bc-breathe {
    50% {
      opacity: 0.25;
    }
  }

  .container.effect-flicker {
    animation: bc-flicker-glow 4s linear infinite;
  }

  .effect-flicker .frame,
  .effect-flicker .ring {
    animation: bc-flicker 4s linear infinite;
  }

  @keyframes bc-flicker {
    0%,
    19%,
    21%,
    23%,
    25%,
    54%,
    56%,
    100% {
      opacity: 1;
    }
    20%,
    24%,
    55% {
      opacity: 0.3;
    }
  }

  @keyframes bc-flicker-glow {
    0%,
    19%,
    21%,
    23%,
    25%,
    54%,
    56%,
    100% {
      box-shadow:
        var(--ha-card-box-shadow, 0 2px 6px rgba(0, 0, 0, 0.2)),
        0 0 16px var(--bc-color);
    }
    20%,
    24%,
    55% {
      box-shadow: var(--ha-card-box-shadow, 0 2px 6px rgba(0, 0, 0, 0.2));
    }
  }

  /* Comet and chase run in the border color, so the solid border underneath is dimmed. */
  .effect-comet .frame,
  .effect-chase .frame {
    opacity: 0.3;
  }

  .effect-rainbow .frame,
  .effect-rainbow .ring {
    animation: bc-hue 6s linear infinite;
  }

  @keyframes bc-hue {
    to {
      filter: hue-rotate(360deg);
    }
  }

  .container.no-border {
    padding: 0;
    box-shadow: none;
  }

  /* A layer the shape of the border: the whole box, with the content area masked out. */
  .band {
    position: absolute;
    inset: 0;
    box-sizing: border-box;
    padding: var(--bc-thickness);
    border-radius: inherit;
    pointer-events: none;
    -webkit-mask:
      linear-gradient(#000 0 0) content-box,
      linear-gradient(#000 0 0);
    -webkit-mask-composite: xor;
    mask:
      linear-gradient(#000 0 0) content-box exclude,
      linear-gradient(#000 0 0);
  }

  .frame {
    background: var(--bc-base);
  }

  .comet {
    z-index: 2;
    background: conic-gradient(
      from var(--border-card-spin),
      transparent 0 200deg,
      color-mix(in srgb, var(--bc-color) 10%, transparent) 220deg,
      var(--bc-color) 350deg,
      #fff 357deg,
      transparent 360deg
    );
    animation: bc-spin 2.5s linear infinite;
  }

  .chase {
    z-index: 2;
    background: repeating-conic-gradient(
      from var(--border-card-spin),
      var(--bc-color) 0 6deg,
      transparent 6deg 12deg
    );
    animation: bc-spin 12s linear infinite;
  }

  .shine {
    z-index: 2;
    background: conic-gradient(
      from var(--border-card-spin),
      transparent 0 270deg,
      rgba(255, 255, 255, 0.8) 330deg,
      transparent 360deg
    );
    animation: bc-spin 3s linear infinite;
  }

  @keyframes bc-spin {
    to {
      --border-card-spin: 360deg;
    }
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

  /* The wrapped card fills the space inside the border, so its content stays centered like an unwrapped card. */
  .inner > * {
    display: block;
    height: 100%;
  }

  .ring {
    z-index: 2;
    /* A stop position of 0 snaps to the previous stop, so each color starts where the last one ends. */
    background: conic-gradient(
      from var(--bc-start),
      var(--bc-color) 0 var(--border-card-fill),
      var(--bc-track) 0 var(--bc-total),
      transparent 0
    );
    transition: --border-card-fill 0.5s ease;
  }

  .ring.ccw {
    background: conic-gradient(
      from var(--bc-start),
      var(--bc-track) 0 calc(var(--bc-total) - var(--border-card-fill)),
      var(--bc-color) 0 var(--bc-total),
      transparent 0
    );
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
    .container,
    .band {
      animation: none !important;
    }
  }
`;
