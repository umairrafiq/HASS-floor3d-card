# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Floor3d-card is a Home Assistant custom Lovelace card for visualizing and interacting with entities in a live 3D model. It renders 3D models (OBJ/MTL or GLB formats) using Three.js and binds Home Assistant entities to 3D objects for real-time visualization and control.

## Build and Development Commands

### Build
```bash
npm run build
```
Runs linting and rollup to create production build in `dist/`.

### Development
```bash
npm start
```
Runs rollup in watch mode with a development server on `http://0.0.0.0:5000`.

### Lint
```bash
npm run lint
```
Runs ESLint on TypeScript files in `src/`.

### Rollup Only
```bash
npm run rollup
```
Builds without linting.

## Architecture

### Entry Point and Core Components

- **src/floor3d-card.ts**: Main card component (`Floor3dCard` class extending `LitElement`)
  - Manages Three.js scene, camera, renderer, and controls
  - Handles entity state changes and updates 3D objects accordingly
  - Implements animation loop and TWEEN.js for smooth transitions
  - Manages raycasting for object selection and interaction

- **src/editor.ts**: Visual configuration editor (`Floor3dCardEditor` class)
  - Provides UI for configuring the card without writing YAML
  - Generates configuration arrays for entities, object groups, and zoom areas

- **src/types.ts**: TypeScript type definitions
  - `Floor3dCardConfig`: Main configuration interface
  - `EntityFloor3dCardConfig`: Entity-specific configuration

### Helper Modules

- **src/helpers.ts**: Utility functions
  - `createConfigArray()`: Processes entity configurations
  - `createObjectGroupConfigArray()`: Resolves object groups (objects wrapped in `<name>`)
  - `mergeDeep()`: Deep merges configuration objects
  - `hasConfigOrEntitiesChanged()`: Optimizes re-rendering

- **src/ensureComponents.ts**: Lazy-loads Home Assistant components

- **src/localize/localize.ts**: Internationalization support

- **src/const.ts**: Constants (e.g., `CARD_VERSION`)

### Element Wrappers

The `elements/` directory contains Material Web Components wrappers:
- `button.ts`, `select.ts`, `textfield.ts`, `formfield.ts`

## Key Architectural Concepts

### Entity Bindings (type3d)

The card supports multiple entity binding types via the `type3d` parameter:
- **light**: Renders point/spot lights with brightness/color control
- **color**: Changes object color based on entity state
- **hide/show**: Controls object visibility
- **text**: Displays entity state as 3D text on objects
- **door**: Animates doors/windows (swing/slide)
- **cover**: Animates roller shutters and covers
- **rotate**: Rotates objects continuously
- **gesture**: Triggers Home Assistant services on click
- **camera**: Displays camera feeds
- **room**: Highlights rooms with colored parallelepipeds

### Object Groups

Objects can be grouped using `object_groups` configuration. Reference groups in entity bindings using `<group_name>` syntax. The `createObjectGroupConfigArray()` function expands these references.

### Levels System

The card supports multi-level floor plans. Objects with level metadata (from SweetHome3D ExportToHASS plugin) are organized into level groups. UI buttons allow toggling level visibility.

### Zoom Areas

Predefined camera positions can be configured via `zoom_areas` for quick navigation to specific rooms or views.

### Three.js Scene Structure

- **Scene**: Contains all 3D objects, lights, and helpers
- **Camera**: PerspectiveCamera with configurable position/rotation/target
- **Renderer**: WebGLRenderer with shadow support
- **Controls**: OrbitControls for user interaction (can be locked via `lock_camera`)
- **Lights**: HemisphereLight for global illumination, plus entity-bound lights
- **Raycasting**: For click/double-click object interaction

### Animation and State Updates

- Uses `requestAnimationFrame()` loop in `floor3d-card.ts`
- TWEEN.js handles smooth transitions (doors, covers, camera movements)
- Entity state changes trigger updates via `updated()` lifecycle method
- `hasConfigOrEntitiesChanged()` prevents unnecessary re-renders

## Model Format Support

### OBJ/MTL (Wavefront)
- Loaded via `OBJLoader` and `MTLLoader`
- Requires `objfile` and `mtlfile` in configuration
- All referenced textures must be in the same `path`

### GLB (Binary glTF)
- Loaded via `GLTFLoader`
- Self-contained format (faster loading)
- Specify `.glb` extension in `objfile` (no `mtlfile` needed)

## Special Object Naming Conventions

Objects with specific names in the 3D model have special behavior:
- Objects containing "room": Used for room type bindings
- Objects containing "door": Automatically receive/cast shadows
- Objects named "transparent_slab": Used for sky mode to prevent sunlight through ceiling
- Walls and floors: Automatically receive/cast shadows when `shadow: 'yes'`

## Configuration Validation

The editor and helpers ensure:
- Entity references resolve to valid Home Assistant entities
- Object IDs exist in the loaded model
- Object group references are valid
- Required parameters for each type3d are present

## Sky Mode and Day/Night Cycle

### Sky Mode (`sky: 'yes'`)
When enabled, the card:
- Creates a realistic sky dome using Three.js `Sky` object
- Positions sun based on `sun.sun` entity (azimuth and elevation attributes)
- Uses `north` configuration to orient the scene correctly
- Requires proper model positioning (upper-left at 0,0 in SweetHome3D)
- Enables ground to receive shadows for realistic rendering
- Sun casts dynamic shadows that move throughout the day

### Day/Night Cycle (`day_night_cycle: 'yes'`)
Enhanced lighting feature that adds realistic day/night transitions:

**Daytime (sun elevation > 0):**
- Sun directional light active with full intensity (2.0)
- Sun position updates in real-time as `sun.sun` entity changes
- Sun casts dynamic shadows based on time of day
- Shadows rotate and lengthen based on sun azimuth/elevation

**Nighttime (sun elevation < 0):**
- Sun disabled, moon directional light activates
- Moon light has cooler bluish color (`0xadd8e6`)
- Moon intensity varies by phase (0.05 - 0.8):
  - New moon: 0.05 (very dim)
  - First/last quarter: 0.35
  - Full moon: 0.8 (brightest)
- Moon positioned opposite to sun's position
- Moon casts softer shadows with phase-appropriate intensity

**Configuration:**
```yaml
sky: 'yes'                 # Required for sun/moon
shadow: 'yes'              # Required for shadows
day_night_cycle: 'yes'     # Enable moon lighting
moon_entity: 'sensor.moon' # Optional, defaults to sensor.moon
north:                     # House orientation for correct shadow direction
  x: 0
  z: 1
```

**Implementation Details:**
- `_initSky()` (floor3d-card.ts:1126): Initializes sun, sky dome, and ground
- `_initMoon()` (floor3d-card.ts:1281): Sets up moon directional light
- `_updateSunPosition()` (floor3d-card.ts:1301): Real-time sun/moon position updates
- `_getMoonIntensity()` (floor3d-card.ts:1256): Calculates moon brightness from phase
- Updates triggered on `sun.sun` entity state changes in hass setter (floor3d-card.ts:1113)

**Requirements:**
- Home Assistant `sun.sun` entity (built-in)
- Home Assistant moon integration for `sensor.moon` (optional, defaults to 0.3 intensity if missing)

## Interaction Modes

- **Edit mode**: Double-click objects to show object IDs or camera position
- **Selection mode** (`selectionMode: 'yes'`): Select multiple objects, logs IDs to console
- **Click mode** (`click: 'yes'`): Enable single-click interactions
- **Overlay mode** (`overlay: 'yes'`): Display entity info in overlay panel

## Common Development Patterns

### Adding a new type3d binding:
1. Update `types.ts` with new configuration interface
2. Add handling in `floor3d-card.ts` within entity processing loop
3. Update editor in `editor.ts` to expose new parameters
4. Test with sample configuration

### Modifying 3D rendering:
- Core rendering logic is in `floor3d-card.ts`
- Scene setup happens in `connectedCallback()` and `firstUpdated()`
- Animation loop is in `animate()` method
- Material/mesh manipulation happens in entity binding sections

## Distribution

- Built files go to `dist/floor3d-card.js`
- Distributed via HACS (Home Assistant Community Store)
- Also available as manual download from GitHub releases
- Must be loaded as a module in Home Assistant Lovelace resources
