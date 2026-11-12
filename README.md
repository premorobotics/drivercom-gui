# drivercom-gui

## Development

### Requirements

1. `pnpm`
2. `rustc` & `cargo`

### Setup

`pnpm i`

`pnpm fmt`

`pnpm check`

`pnpm test`

### Running

To run a development build, use `pnpm tauri dev`

It first places the `vilo` sidecar (Vibration Logger page). By default it
downloads the latest [ViLo](https://github.com/premorobotics/ViLo) release;
to use a local build instead, set `VILO_PATH` to the binary:

`VILO_PATH=../vilo/zig-out/bin/vilo pnpm tauri dev`
