# Drivercom GUI

A desktop GUI for **configuring, logging and analyzing** linear motion system (LMS/XTS) drivers.

![Configuration](docs/images/configuration.png)

## Table of Contents

- [Features](#features)
- [Screen Layout](#screen-layout)
- [Usage](#usage)
  - [1. Controller Configuration](#1-controller-configuration)
  - [2. Data Logging](#2-data-logging)
  - [3. Log Viewer](#3-log-viewer)
  - [4. Tabs, Panels and Files](#4-tabs-panels-and-files)
- [Shortcuts](#shortcuts)
- [Parameter Reference](#parameter-reference)
- [Glossary](#glossary)
- [Documentation](#documentation)
- [Development](#development)

## Features

| Tab | Functions |
|---|---|
| **Configuration** | Read settings from the controller (`Get from port`), gain tuning (`tune`), check calibration values (`calibration`), save settings to the controller, import/save settings files (JSON5), m ↔ mm unit toggle |
| **Logging** | Select log items, duration and axes; save logs as CSV; log while a slider is moving; import/save Log Config files |
| **Log Viewer** | Plot CSV logs; show/hide and search legends; horizontal/vertical zoom; cursor lock; pan; reset; partial save; split/merge/reorder graphs; legend styling |
| **Common** | Multiple tabs and split panels, drag-and-drop file opening, recent files, light/dark theme, version info |

## Screen Layout

| Configuration | Logging | Log Viewer |
|---|---|---|
| ![Configuration](docs/images/configuration.png) | ![Logging](docs/images/logging.png) | ![Log Viewer](docs/images/log-viewer.png) |

- **Left tree** — selects the `system` / `tune` / `calibration` settings group (toggle with the `Open/Close left dock` button)
- **`Driver status` (right)** — shows the servo, CC-Link and axis status of the connected driver (toggle with the table button)
- **Top bar** — switches between the Configuration / Logging / Log Viewer pages; the buttons at the top right toggle the light/dark theme and show the GUI/CLI version (ⓘ)

## Usage

### 1. Controller Configuration

#### Reading settings

1. Click the `Get from port` button.
2. Select the port of the driver to read settings from.
3. Check that the settings are displayed.

<img src="docs/images/get-from-port.png" width="640" alt="Get from port">

#### Importing and saving settings files

- **Import File** — opens a settings file (`.json5`). Recently opened files are listed for quick access.
- **Save as file** (floppy disk button) — saves the current settings to a `.json5` file. Saving to a file does not change the controller.
- **Change length and weight units** (ruler button) — switches length-based values between m and mm (m/s ↔ mm/s, m/s² ↔ mm/s²) for display and entry.
- **`?` help** — hover over the `?` next to a parameter to see its description. The `flags.flip` and `flags.swap` help shows a sensor diagram.

#### Gain tuning (`tune`)

Adjust the gains of the current, speed and position control loops. The controller response depends on these gains. For example, a higher speed gain makes the slider respond more strongly.

<img src="docs/images/tune.png" width="640" alt="tune">

#### Checking calibration values (`calibration`)

Calibration values are measured and entered automatically by the controller. However, **any item shown as 0 after reading settings must be entered manually**.

| Item | Entry rule | Example |
|---|---|---|
| Sensor position (`sensor.position.on/off`) | Correct by the Base position difference between axes | If Base position differs by 11 between axis 1 and axis 2 and the axis 2 "on" value is 0, enter the axis 1 "on" value + 11 |
| Section count (`sensor.section_count`) | Enter the same value, without correction | If axis 1 "on backward" is -53, enter -53 for axis 2 "on backward" |

> [!WARNING]
> If zero calibration values are not entered, **overcurrent occurs** when a slider registered on axis 1 or axis 3 is moved to another axis.

<img src="docs/images/calibration.png" width="640" alt="calibration">

#### Saving settings to the controller

> [!IMPORTANT]
> **Both the servo and CC-Link must be OFF** before saving. CC-Link stays enabled while the server on the PC is running, so shut down the server first.

1. Shut down the server running on the PC.
2. Click the refresh button in `Driver status` and check that CC-Link is OFF.
3. Click `Disable servo` at the top right of `Driver status` and select the target driver.
4. Check that the servo has turned OFF.
5. Click the save button.
6. Saving is complete when the `Communication Success` message appears at the top right.

| Disable servo | Save complete |
|---|---|
| ![Disable servo](docs/images/disable-servo.png) | ![Save success](docs/images/save-success.png) |

### 2. Data Logging

#### Basic logging

1. Select the items to record in `Log Config`.
2. Set `duration` (seconds) and `Axes` (axis1–axis3).
3. Click `Start logging` and select the driver to log from.
4. Specify the CSV save location. Progress is shown in the download manager at the bottom right.
5. When finished, click the file button in the download manager to open the log directly in the Log Viewer.

The Log Config (items, duration, axes and command) can be imported from or saved to a file with the import and floppy disk buttons, and recently used files are listed for quick access.

#### Logging while a slider is moving

1. Enter values in the `Initialize` bar on the right and select the driver on which to register the slider.
2. On success, the axis information appears under `slider`.
3. Select `speed_profile` or `position_profile` in `Command type`. The default, `current_state`, logs without moving the slider.
4. Enter the travel distance, speed, acceleration and slider ID, then click `Start logging`.

<img src="docs/images/logging-with-motion.png" width="640" alt="Logging with motion">

### 3. Log Viewer

| Function | How to use |
|---|---|
| Open file | Open file button → select a CSV file |
| Show/hide legend | Click a legend item |
| Tooltip | Hover over the graph |
| Horizontal zoom | Select horizontal zoom and drag (`Shift`); mouse wheel zoom supported |
| Vertical zoom | Select vertical zoom and drag (`Ctrl`); mouse wheel zoom supported |
| Cursor lock | Select cursor lock and click a position (`Alt`) |
| Pan | Select pan and drag |
| Reset | `Reset` button → restores the original zoom and graph layout |
| Partial save | Saves only the visible legends within the horizontal zoom range as CSV |
| Legend search | Hide all → search → show legends button (clear the search to show all) |
| Range select | `Shift` + click a second legend checkbox or visibility toggle to apply it to every legend in between |
| Split graph | Split button → check legends → split |
| Reorder graphs | `Reorder Graph` button → drag and drop the move handle |
| Merge graphs | Check the graphs to merge → merge button |
| Legend style | Button left of the legend → set color and line style (dotted/dashed/solid) → save |

| Horizontal zoom | Split graph | Legend style |
|---|---|---|
| ![Zoom](docs/images/horizontal-zoom.png) | ![Split](docs/images/split-graph.png) | ![Legend style](docs/images/legend-style.png) |

### 4. Tabs, Panels and Files

| Function | How to use |
|---|---|
| New tab | `+` button at the end of the tab bar |
| Rename tab | Double-click the tab name, type, then press `Enter` |
| Split panel | Drag a tab to the edge of a panel; the highlighted area shows where the new panel will be placed (`Esc` cancels the drag) |
| Open by drag and drop | Drop one file onto a panel (`.json5` on Configuration/Logging, `.csv` on Log Viewer). Dropping in the middle opens it as a new tab; dropping on the left/right quarter splits the panel |
| Changed settings | On Configuration tabs, a colored mark shows that the settings differ from the opened file |

## Shortcuts

`Shift`, `Ctrl` and `Alt` switch the Log Viewer cursor mode only while held; releasing the key returns to the previously selected mode.

| Input | Function | Notes |
|---|---|---|
| `Shift` + drag | Horizontal zoom | |
| `Ctrl` + drag | Vertical zoom | |
| `Alt` + click | Cursor lock | |
| Mouse wheel | Zoom horizontally and vertically around the cursor | |
| `Shift` + wheel | Zoom using horizontal scroll | For touchpads / horizontal wheels |
| Double-click (horizontal zoom mode) | Reset horizontal and vertical zoom | Horizontal zoom resets only in horizontal mode |
| Double-click (vertical zoom mode) | Reset vertical zoom | Horizontal zoom is kept |
| `Shift` + click (legend checkbox / visibility) | Apply to the whole range from the previous click | |
| `Shift` + click (settings checkbox) | Apply to every checkbox between the previous click and this one | Within the same group |
| Double-click (tab name) | Rename tab | |
| `Esc` (while dragging a tab) | Cancel tab drag | |

## Parameter Reference

Types: `u8`/`u16`/`u32` unsigned integer, `i16` signed integer, `f32` float, `bool` true/false. The unit `pitch` is a position unit where one slider magnet pitch equals 1.

<details>
<summary><b>System · Flags · Line</b></summary>

| Field | Type | Unit | Description |
|---|---|---|---|
| `id` | u16 | | Driver ID, unique per Line. The first driver is 1, then consecutively increasing |
| `station` | u16 | | CC-Link station ID (unique per Track) |
| `cc_link_speed` | CcLinkSpeed | | CC-Link communication speed |
| `retry_count` | u8 | | Retries for synchronous communication between drivers |
| `voltage_warmup` | f32 | V | Maximum voltage applied to find the sensor angle offset |
| `hall_cutoff_freq` | f32 | Hz | Cut-off frequency of the sensor smoothing filter |
| `overcurrent_timeout` | f32 | s | Minimum overcurrent duration before alarm |
| `pos_offset` | f32 | pitch | Position offset |
| `right_sensor_distance` | f32 | | Distance from the right sensor to the right end of the axis (XTS only) |
| `angle_offset` | f32 | | Normalized sensor angle offset (measured by calibration) |
| `flags.home_exists` | bool | | Driver has a home sensor |
| `flags.has_neighbor.backward` / `forward` | bool | | Another driver is connected on the left / right |
| `flags.use_axis.axis2` / `axis3` | bool | | Uses the second / third axis (axis2 must be true to use axis3) |
| `flags.calibration_spare.backward` / `forward` | bool | | Spare space left of the first axis / right of the last axis during calibration |
| `flags.collision_avoidance` | bool | | Collision Avoidance System enabled |
| `flags.calibration_use` | bool | | Calibration information used for LMDS actions |
| `flags.xts` | bool | | true: XTS, false: LMS |
| `flags.flip` | bool | | Exchange cosine and sine sensor readings |
| `flags.swap` | bool | | Switch the order of the two sensors in the axis |
| `line.axes` | u32 | | Total number of axes in the Line |
| `line.axis_length` | f32 | m | Distance between axis coil centers |
| `line.slider.mass` | f32 | kg | Slider mass including load |
| `line.slider.length` | f32 | m | Slider length |
| `line.magnet_pitch` | f32 | m | Distance between two N poles of the slider magnet |
| `section_count.skip` | i16 | | Section count at which the next axis becomes primary |
| `section_count.max.axis1~3` | i16 | | Maximum section count while each axis is primary |

</details>

<details>
<summary><b>Per-axis motor constants · gains · calibration (<code>axes[n]</code>)</b></summary>

| Field | Type | Unit | Description |
|---|---|---|---|
| `rs` | f32 | Ω | Stator resistance (line to neutral) |
| `ls` | f32 | H | Stator inductance (line to neutral) |
| `kf` | f32 | N/A | Force constant (newton per ampere) |
| `kbm` | f32 | V/(m/s) | Back EMF constant |
| `max_current` | f32 | A | Maximum peak coil current |
| `continuous_current` | f32 | A | Maximum continuous coil current |
| `gain.current.p` / `i` | f32 | | Current control P / I gain |
| `gain.current.denominator` | u16 | | Divider of the 15 kHz sampling frequency for current control bandwidth |
| `gain.speed.p` / `i` | f32 | | Speed control P / I gain |
| `gain.speed.denominator` | u16 | | Divider of current control bandwidth for speed control bandwidth |
| `gain.speed.denominator_pi` | u16 | | Divider of speed control bandwidth for PI corner frequency |
| `gain.position.p` | f32 | | Position control P gain |
| `gain.position.denominator` | u16 | | Divider of speed control bandwidth for position control bandwidth |
| `arrival_threshold` | f32 | m | Position error tolerance for movement completion |
| `base_position` | f32 | pitch | Base position of the axis |
| `sensor.position.on.forward` / `backward` | f32 | pitch | Right sensor ON position (forward) / left sensor ON position (backward) |
| `sensor.position.off.forward` / `backward` | f32 | pitch | Left sensor OFF position (forward) / right sensor OFF position (backward) |
| `sensor.section_count.on/off.forward/backward` | i16 | | Section counts at the sensor ON/OFF points above |

`base_position` and all `sensor.*` values are measured by calibration.

</details>

<details>
<summary><b>Driver status (<code>state</code>)</b></summary>

| Field | Type | Unit | Description |
|---|---|---|---|
| `state.servo_enabled` | bool | | Servo is on |
| `state.cc_link_enabled` | bool | | CC-Link is on |
| `state.calibrated` | bool | | Calibration completed |
| `state.vdc` | f32 | V | Motor coil supply voltage |
| `state.thermo` | f32 | | Inverter temperature |
| `state.sys_version` | f32 | | Firmware version |
| `state.sensor.home` / `id0~id2` | u8 | | Sensor readings (0 if sensed) |
| `state.synchronization_request_position.forward` / `backward` | f32 | | Position to receive a profile request from the next axis during backward / forward calibration |
| `state.section_count.deactivate_secondary.*` | i16 | | Section counts at which the secondary axis is deactivated |
| `state.section_count.activate_primary.*` | i16 | | Section counts at which a deactivated axis becomes primary again |
| `state.axes[n].enabled` / `primary` | bool | | Axis is active / primary |
| `state.axes[n].slider.id` / `slider.state` | u8 / Fsm | | ID / state of the slider on the axis |
| `state.axes[n].entrance` | Entrance | | Side from which the slider entered |
| `state.axes[n].overcharge_state` | Fsm | | Slider state before overcurrent |
| `state.axes[n].pitch_count` | i16 | | Pitch count |
| `state.axes[n].mechanical_position` | f32 | pitch | Slider position (integer part = number of magnet pitches) |
| `state.axes[n].bias.a` / `b` | f32 | A | A-phase / B-phase current offset |

Section count thresholds refer to the primary axis. Forward triggers when count ≥ value; backward triggers when count ≤ value.

</details>

<details>
<summary><b>Log items (<code>Log Config</code>)</b></summary>

| Item | Description |
|---|---|
| `profile_position` / `profile_speed` | Profile output position / applied speed |
| `position_output` / `position_reference` / `position_feedback` | Position controller output / reference / feedback |
| `speed_reference` / `speed_feedback` | Speed controller reference / feedback |
| `current_q_reference` / `current_q_feedback` / `current_d_feedback` | Q-axis current reference / Q- and D-axis current feedback |
| `voltage_q_reference` / `voltage_d_reference` | Q- / D-axis voltage reference |
| `voltage_q_feedforward` / `voltage_d_feedforward` | Q- / D-axis voltage feedforward |
| `calculation_time` | Control loop calculation time |
| `theta_section` | Theta section |
| `electrical_angular_speed` | Electrical angular speed |
| `in_position` | In-position state of profile movement |
| `current_a` / `b` / `c` | A/B/C-phase current |
| `voltage_alpha` / `voltage_beta` | Alpha/beta-axis voltage |
| `voltage_a` / `b` / `c` | A/B/C-phase voltage |
| `slider_state` | Slider FSM state |
| `applied_angle` / `encoder_angle` | Applied angle / angle measured by the encoder |
| `vector_sector` | Vector sector number |
| `hall_alarm_left` / `hall_alarm_right` | Left / right hall sensor alarm |

</details>

## Glossary

| Term | Description |
|---|---|
| Driver | Controller that drives the motor coils, identified by ID within a Line |
| Line | Transport line made up of one or more drivers (LMS or XTS) |
| Axis | Drive section controlled by a driver; up to three axes per driver |
| Slider | Moving element (carrier) that travels along the line |
| Section count | Count used for slider handover between axes and primary/secondary switching |
| pitch | Position unit where the distance between slider magnet N poles equals 1 |

## Documentation

See the user manual for detailed procedures and all screenshots.

- [User Manual (English)](docs/manual/Drivercom_GUI_User_Manual_Rev1.0_EN.docx)
- [User Manual (Korean)](docs/manual/Drivercom_GUI_User_Manual_Rev1.0_KR.docx)

## Development

### Requirements

1. `pnpm`
2. `rustc` & `cargo`
3. [`gh`](https://cli.github.com/) (GitHub CLI), logged in with access to `pmotionf/drivercom-cli`

> [!NOTE]
> `pnpm tauri ...` first runs `pnpm run drivercom`, which downloads the `drivercom-cli` binary from the GitHub releases of `pmotionf/drivercom-cli` with `gh release download` and generates the config types into `src-tauri/generated/config`. Run `gh auth login` beforehand.

### Setup

```sh
pnpm i
pnpm fmt
pnpm check
pnpm test
```

### Running

To run a development build, use `pnpm tauri dev`.

To build the installer, use `pnpm tauri build`.

---

© PREMO Robotics Co., Ltd. · Author: Hyuna Kim · 2026-11-19
