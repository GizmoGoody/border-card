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
| `border.glow`            | `false`          | Adds a glow in the border color.                                                                                                   |
| `progress.enabled`       | `false`          | Shows the border as a progress ring.                                                                                               |
| `progress.entity`        |                  | The entity that provides the value.                                                                                                |
| `progress.attribute`     |                  | Use this attribute instead of the entity state.                                                                                    |
| `progress.min_value`     | `0`              | The value that shows an empty ring.                                                                                                |
| `progress.max_value`     | `100`            | The value that shows a full ring.                                                                                                  |
| `progress.start`         | `0`              | Start angle in degrees. `0` is the top.                                                                                            |
| `progress.end`           | `360`            | End angle in degrees.                                                                                                              |
| `progress.direction`     | `clockwise`      | `clockwise` fills from the start angle. `counterclockwise` fills from the end angle back toward the start.                         |
| `progress.track`         | `none`           | The unfilled part of the border: `none` (transparent), `match` (dimmed border color), or `custom` (dimmed `track_color`).          |
| `progress.track_color`   |                  | The track color when `track` is `custom`.                                                                                          |
| `progress.text.enabled`  | `true`           | Shows a text label.                                                                                                                |
| `progress.text.position` | `bottom-right`   | `top-left`, `top-center`, `top-right`, `center-left`, `center`, `center-right`, `bottom-left`, `bottom-center`, or `bottom-right`. |
| `progress.text.template` | `{value}%`       | `{value}` is the progress percentage, `{state}` is the entity state, and `{attribute_name}` is any attribute.                      |
| `progress.text.color`    | theme text color | A theme color name or any CSS color.                                                                                               |

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
