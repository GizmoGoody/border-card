# Border Card

A Home Assistant card that wraps any other card in a colored border. The border can also show progress from an entity, drawn as an animated ring with an optional text label.

The wrapped card keeps its own look and behavior. Border Card uses Home Assistant's own card container to load it, so built-in and custom cards both work.

## Installation

### HACS

1. In HACS, open the menu (⋮) and select **Custom repositories**.
2. Add `https://github.com/GizmoGoody/border-card` with the type **Dashboard**.
3. Search for **Border Card**, then download it.
4. Reload the browser.

### Manual

1. Download `border-card.js` from the [latest release](https://github.com/GizmoGoody/border-card/releases/latest).
2. Copy it to `config/www/border-card.js`.
3. Go to **Settings → Dashboards → ⋮ → Resources → Add resource**. Enter the URL `/local/border-card.js` and choose **JavaScript module**.
4. Reload the browser.

## Usage

Add the card from the dashboard editor by searching for **Border Card**. Every option is available in the visual editor.

```yaml
type: custom:border-card
border:
  color: light-blue
  thickness: 4
progress:
  enabled: true
  entity: sensor.washer_progress
  track: match
card:
  type: tile
  entity: sensor.washer_status
```

## Options

| Option                   | Default          | Description                                                                                                                        |
| ------------------------ | ---------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `card`                   | required         | The card to wrap. Any card configuration works.                                                                                    |
| `border.color`           | `#03a9f4`        | A theme color name (for example `primary` or `red`) or any CSS color.                                                              |
| `border.thickness`       | `4`              | Border width in pixels. `0` disables the border.                                                                                   |
| `border.effect`          | `none`           | A moving or glowing border. See [Effects](#effects).                                                                               |
| `progress.enabled`       | `false`          | Shows the border as a progress ring.                                                                                               |
| `progress.entity`        |                  | The entity that provides the value.                                                                                                |
| `progress.attribute`     |                  | Use this attribute instead of the entity state.                                                                                    |
| `progress.min_value`     | `0`              | The value that shows an empty ring.                                                                                                |
| `progress.max_value`     | `100`            | The value that shows a full ring.                                                                                                  |
| `progress.path`          | `full`           | `full` (whole border), `top`, `right`, `bottom`, `left` (one edge), or `custom` (between `start` and `end`).                       |
| `progress.start_at`      | `top`            | Where a `full` path starts: `top`, `right`, `bottom`, or `left`.                                                                   |
| `progress.start`         | `0`              | Start angle in degrees for a `custom` path. `0` is the top.                                                                        |
| `progress.end`           | `360`            | End angle in degrees for a `custom` path.                                                                                          |
| `progress.ends`          | `straight`       | `straight` (cut straight across the border), `round`, or `spoke` (point at the center; `full` and `custom` only).                  |
| `progress.direction`     | `clockwise`      | `clockwise` or `counterclockwise`. Clockwise runs left to right on the top edge and top to bottom on the right edge.               |
| `progress.track`         | `none`           | The unfilled part of the range: `none` (transparent), `match` (dimmed border color), or `custom` (dimmed `track_color`).           |
| `progress.track_color`   |                  | The track color when `track` is `custom`.                                                                                          |
| `progress.text.enabled`  | `true`           | Shows a text label.                                                                                                                |
| `progress.text.position` | `bottom-right`   | `top-left`, `top-center`, `top-right`, `center-left`, `center`, `center-right`, `bottom-left`, `bottom-center`, or `bottom-right`. |
| `progress.text.template` | `{value}%`       | `{value}` is the progress percentage, `{state}` is the entity state, and `{attribute_name}` is any attribute.                      |
| `progress.text.color`    | theme text color | A theme color name or any CSS color.                                                                                               |

A config with only `progress.start` and `progress.end` from earlier versions uses the `custom` path. `border.glow: true` from earlier versions still works and is the same as `effect: glow`.

### Effects

- `glow`: a steady glow in the border color.
- `pulse`: the glow grows and fades.
- `breathe`: the border slowly fades in and out.
- `flicker`: a neon-sign flicker with glow.
- `shimmer`: a white light runs around the border.
- `comet`: a bright head with a fading tail runs around the border.
- `chase`: dashes march around the border, like a marquee.
- `rainbow`: the border cycles through colors. It has no effect on grey, white, or black borders.

Animations stop when the device is set to reduce motion.

### Values from entities

Any number option (`border.thickness`, `progress.start`, `progress.end`, `progress.min_value`, `progress.max_value`) also takes an entity ID, such as an `input_number`. The card then uses that entity's state.

Any color option (`border.color`, `progress.track_color`, `progress.text.color`) also takes an entity ID, such as an `input_text`. The entity's state can be a theme color name (`red`, `primary`), any CSS color (`transparent`, `#ff9800`, `rgb(255, 152, 0)`, `hsl(36, 100%, 50%)`), or three numbers (`255, 152, 0`). When the state is not a color, the card uses the default color.

```yaml
type: custom:border-card
border:
  color: input_text.border_color
  thickness: input_number.border_thickness
card:
  type: tile
  entity: light.kitchen
```

## Development

```sh
npm install
npm run build      # writes dist/border-card.js
npm run watch      # rebuilds on every change
npm run lint
npm run typecheck
```

`dist/` is not committed. CI builds the card on every push and pull request and keeps it as a workflow artifact. Publishing a GitHub release attaches `border-card.js` to it, and HACS installs that file.

## License

MIT
