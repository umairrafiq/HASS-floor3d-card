# HASS-floor3d-card Codebase Architecture Analysis

## Project Overview

**HASS-floor3d-card** is a Home Assistant custom Lovelace card that creates a 3D digital twin of a home. It enables real-time visualization and interaction with Home Assistant entities through a fully rendered 3D model using Three.js. The card supports multiple 3D model formats (OBJ/MTL and GLB), advanced lighting with sun/moon cycle simulation, and entity bindings for interactive control.

**Key Characteristics:**
- Version: 1.5.3
- Tech Stack: TypeScript, Lit (Web Components), Three.js, TWEEN.js
- Distribution: HACS (Home Assistant Community Store)
- Buildtool: Rollup with TypeScript compilation

---

## Project Structure

```
/home/ubuntu/HASS-floor3d-card/
├── src/                           # TypeScript source files
│   ├── floor3d-card.ts           # Main card component (3622 lines)
│   ├── editor.ts                 # Visual configuration editor
│   ├── types.ts                  # TypeScript interfaces
│   ├── const.ts                  # Constants (version)
│   ├── helpers.ts                # Utility functions
│   ├── ensureComponents.ts        # Lazy-load Home Assistant components
│   └── localize/                 # Internationalization
│       ├── localize.ts
│       └── languages/
│           ├── en.json
│           └── nb.json
├── elements/                      # Material Design Web Component wrappers
│   ├── button.ts
│   ├── formfield.ts
│   ├── select.ts
│   └── textfield.ts
├── dist/                          # Built output (floor3d-card.js)
├── .devcontainer/                # Dev container config
├── .vscode/                       # VS Code settings and tasks
├── rollup.config.js              # Production build config
├── rollup.config.dev.js          # Development build config
├── tsconfig.json                 # TypeScript configuration
├── package.json                  # Dependencies and scripts
├── CLAUDE.md                      # Development guidelines
├── DAY_NIGHT_CYCLE_FEATURE.md    # Day/night cycle documentation
├── README.md                      # User documentation
└── hacs.json                      # HACS metadata
```

---

## Technology Stack

### Core Technologies
| Technology | Version | Purpose |
|------------|---------|---------|
| **Three.js** | 0.130.1 | 3D graphics rendering, scene management |
| **Lit** | 2.0.0 | Web component framework (LitElement) |
| **TypeScript** | 4.3.5 | Type-safe development |
| **TWEEN.js** | 18.6.4 | Smooth animation transitions |
| **Rollup** | 2.62.0 | Module bundling |
| **Material Web Components** | 0.25.3 | UI elements (buttons, forms, menus) |

### Home Assistant Integration
- `home-assistant-js-websocket`: 5.11.1 - Real-time entity state updates
- `custom-card-helpers`: 1.7.2 - Home Assistant card API utilities
- `@mdi/font`: 6.5.95 - Material Design Icons

### Development Tools
- ESLint + Prettier for code quality
- Babel for JavaScript transformation
- TypeScript for type checking

---

## Key Files and Responsibilities

### 1. **src/floor3d-card.ts** (Main Component - 3622 lines)

**Purpose:** Core implementation of the Floor3dCard Web Component extending LitElement.

**Key Classes:**
```typescript
@customElement('floor3d-card')
export class Floor3dCard extends LitElement
```

**Critical Properties:**
- `_scene`: THREE.Scene - The 3D scene containing all objects
- `_camera`: THREE.PerspectiveCamera - Camera for viewing the scene
- `_renderer`: THREE.WebGLRenderer - WebGL renderer with shadow support
- `_controls`: OrbitControls - User interaction (rotation, zoom)
- `_config`: Floor3dCardConfig - Card configuration
- `_hass`: HomeAssistant - Home Assistant instance reference

**Key Methods:**

| Method | Line | Purpose |
|--------|------|---------|
| `connectedCallback()` | 180 | Lifecycle: Setup observers and animation loops |
| `setConfig()` | 399 | Validate and store configuration |
| `firstUpdated()` | 523 | Initial rendering after model loads |
| `display3dmodel()` | 1396 | Create scene, camera, renderer, load 3D model |
| `set hass()` | 861 | Handle Home Assistant entity state changes |
| `_initSky()` | 1128 | Initialize sky dome, sun, and ground |
| `_initMoon()` | 1295 | Initialize moon directional light |
| `_updateSunPosition()` | 1315 | Update sun/moon position based on sun.sun entity |
| `_animationLoop()` | 3322 | Frame rendering loop with TWEEN updates |
| `_render()` | 555 | Render current scene to canvas |

**Lifecycle Flow:**
```
1. Constructor -> Initialize properties
2. setConfig() -> Validate configuration
3. connectedCallback() -> Attach to DOM
4. firstUpdated() -> Display 3D model
   ├── display3dmodel() -> Create renderer, camera, scene
   ├── _onLoaded3DModel() -> Process loaded geometry
   ├── _initobjects() -> Parse model objects
   └── (if sky mode) _initSky() -> Setup sky/sun
5. hass setter -> Entity state updates
   ├── Check entity changes
   └── Update 3D objects accordingly
6. _animationLoop() -> Continuous frame rendering
```

---

### 2. **src/types.ts** (Type Definitions)

**Key Interfaces:**

```typescript
interface Floor3dCardConfig {
  // Model and Display
  path: string;                    // Path to 3D model files
  objfile: string;                 // OBJ or GLB filename
  mtlfile?: string;                // MTL file (OBJ only)
  name: string;                    // Card title
  header: string;                  // Show header: 'yes'/'no'
  backgroundColor: string;         // Canvas background color
  
  // Scene Configuration
  width: number;
  height: number;
  font: string;
  style: string;
  
  // Lighting
  globalLightPower: string;        // Ambient light intensity (0-1 or entity)
  shadow: string;                  // Enable shadows: 'yes'/'no'
  extralightmode: string;          // Extra light mode: 'yes'/'no'
  
  // Sky and Sun/Moon
  sky: string;                     // Enable sky dome: 'yes'/'no'
  north: { x: number; z: number }; // North direction
  day_night_cycle: string;         // Enable moon: 'yes'/'no'
  moon_entity: string;             // Moon phase sensor
  
  // Camera
  lock_camera: string;             // Lock camera controls
  camera_position: { x, y, z };    // Initial camera position
  camera_rotate: { x, y, z };      // Camera rotation
  camera_target: { x, y, z };      // Orbit controls target
  
  // Entities and Bindings
  entities: EntityFloor3dCardConfig[];
  object_groups: ObjectGroupConfig[];
  zoom_areas: ZoomAreaConfig[];
  
  // Interaction
  click: string;                   // Enable click events: 'yes'/'no'
  overlay: string;                 // Show data overlay: 'yes'/'no'
  selectionMode: string;           // Multi-select mode: 'yes'/'no'
  
  // Etc.
  show_axes: string;               // Debug axis helper
  editModeNotifications: string;
  attribute: string;
  objectlist: string;
}

interface EntityFloor3dCardConfig {
  entity: string;
  type3d: 'light' | 'color' | 'hide' | 'show' | 'text' | 'door' | 
          'cover' | 'rotate' | 'gesture' | 'camera' | 'room';
  object_id: string;                           // 3D object name
  // Type-specific configs...
  light?: { lumens: number; distance?: number };
  door?: { doortype: string; direction: string; hinge: string };
  cover?: { type: string; percentage: number };
  // etc.
}
```

---

### 3. **src/helpers.ts** (Utility Functions)

**Key Functions:**

```typescript
export function createConfigArray(config): Floor3dCardConfig[]
  // Expands entity configurations into array

export function createObjectGroupConfigArray(config): Floor3dCardConfig[]
  // Resolves <object_group> references to actual object lists
  // Example: entity with object_id: '<DoorGroup>' gets expanded

export function hasConfigOrEntitiesChanged(element, changedProps, forceUpdate): boolean
  // Optimizes re-rendering by detecting config/entity changes

export function mergeDeep(...objects): any
  // Deep merge configuration objects (immutable)

export function mapRange(num, in_min, in_max, out_min, out_max): number
  // Linear value mapping (used for animations)

export const getLovelace()
  // Access Home Assistant Lovelace configuration
```

---

### 4. **src/editor.ts** (Visual Configuration UI)

**Purpose:** Provides web-based UI for card configuration without YAML editing.

**Key Class:**
```typescript
@customElement('floor3d-card-editor')
export class Floor3dCardEditor extends LitElement implements LovelaceCardEditor
```

**Features:**
- Entity selection dropdowns
- Object group management
- Zoom area configuration
- Real-time preview
- Material Design UI with Home Assistant styling

---

## Three.js Integration Deep Dive

### Scene Architecture

**Hierarchy:**
```
Scene
├── Sky (Three.Sky object)
├── Ground (PlaneGeometry)
├── Sun (DirectionalLight)
├── Moon (DirectionalLight) [if day_night_cycle enabled]
├── HemisphereLight (ambient)
├── Torch (camera-relative light)
├── BoundingBoxModel (THREE.Object3D)
│   ├── Level 0 (THREE.Object3D)
│   │   ├── 3D Objects (meshes)
│   │   │   ├── Doors, walls, furniture
│   │   │   ├── Light objects
│   │   │   └── Room boxes (for visualization)
│   │   └── Sprites (text labels)
│   ├── Level 1
│   └── Level N
└── AxesHelper [debug]
```

### Model Loading Pipeline

**1. Model Format Detection (display3dmodel method)**
```typescript
let fileExt = this._config.objfile.split('?')[0].split('.').pop();

if (fileExt == 'obj') {
  // Load OBJ + MTL files separately
  MTLLoader -> _onLoaded3DMaterials()
  OBJLoader -> _onLoaded3DModel()
} else if (fileExt == 'glb') {
  // Load single GLB file
  GLTFLoader -> _onLoadedGLTF3DModel()
}
```

**2. Object Parsing (_initobjects method)**
- Traverse entire model hierarchy
- Extract individual meshes and materials
- Create raycasting targets for interaction
- Organize objects by level (floor groups)
- Store initial materials for state changes

**3. Material System**
- Stores initial materials: `_initialmaterial[entityIndex][objectIndex]`
- Stores cloned materials: `_clonedmaterial[entityIndex][objectIndex]`
- Allows color changes without affecting original
- Supports transparency and shadow casting

### Lighting System

**Ambient Lighting (_initAmbient method)**
```typescript
HemisphereLight: 
  - Sky color: light blue (0x87ceeb)
  - Ground color: brown (0x8b7355)
  - Intensity: configurable (globalLightPower)
```

**Sky Mode Implementation (_initSky method)**

When `sky: 'yes'`:
```typescript
1. Create Sky shader object scaled to 100000 units
2. Create ground plane with shadow receiving
3. Initialize sun directional light (2.0 intensity)
4. Read sun.sun entity:
   - azimuth: horizontal angle (0-360°)
   - elevation: vertical angle (-90 to 90°)
5. Use THREE.Spherical coords to position sun
6. Set up shadow camera (ortho projection)
7. Initialize sky shader uniforms
8. (If day_night_cycle) Initialize moon
```

**Sun Position Update (_updateSunPosition method)**
```typescript
// Called whenever sun.sun entity changes (every minute)
1. Read azimuth/elevation from sun.sun state
2. Calculate sun vector using Spherical coordinates
3. Update sky shader 'sunPosition' uniform
4. Position sun directional light at calculated position
5. Handle day/night transition:
   - elevation < 0 -> Nighttime mode
   - elevation >= 0 -> Daytime mode
```

**Day/Night Cycle (_initMoon + _getMoonIntensity methods)**

When `day_night_cycle: 'yes'`:
```typescript
Nighttime (elevation < 0):
  - Sun intensity: 0 (disabled)
  - Moon intensity: varies by phase
  - Moon color: cool blue (0xadd8e6)
  - Moon position: opposite to sun

Daytime (elevation >= 0):
  - Sun intensity: 2.0 (full brightness)
  - Moon intensity: 0 (disabled)

Moon Phase Intensity Mapping:
  'new_moon': 0.05
  'waxing_crescent': 0.15
  'first_quarter': 0.35
  'waxing_gibbous': 0.55
  'full_moon': 0.8
  'waning_gibbous': 0.55
  'last_quarter': 0.35
  'waning_crescent': 0.15
```

### Animation System

**Frame Loop (_animationLoop method)**
```typescript
Running at screen refresh rate (typically 60 FPS):

1. Delta time calculation: clockDelta = clock.getDelta()
2. Rotation updates:
   - For each rotating object: apply angular velocity
   - Use rotateBy = clockDelta * π * 2 (radians per frame)
3. TWEEN animation updates: TWEEN.update()
   - Smooth door swings
   - Cover movements
   - Camera transitions
4. Shadow map update: renderer.shadowMap.needsUpdate = true
5. Render: renderer.render(scene, camera)
```

**TWEEN.js Integration**
- Used for smooth transitions (0.5-2 second durations)
- Animates doors, covers, and camera movements
- Chainable animations with easing functions

### Entity State Binding

**Binding Types (type3d parameter):**

| Type | Implementation | Effect |
|------|---|---|
| **light** | Creates THREE.PointLight | Emits light from object; intensity = brightness/255 |
| **color** | Material color change | Changes mesh material color based on state |
| **hide/show** | Object visibility | Set object.visible = true/false |
| **text** | SpriteText rendering | Displays entity state as 3D text label |
| **door** | Rotation animation | Swings/slides door based on percentage |
| **cover** | Height/position animation | Animates roller shutters or covers |
| **rotate** | Continuous rotation | Rotates object around axis |
| **gesture** | Service call trigger | Calls Home Assistant service on click |
| **camera** | Link click | Opens more-info dialog |
| **room** | Colored box visualization | Highlights room with translucent box |

### Raycasting System

**Purpose:** Detect which 3D object user clicked

```typescript
_getintersect(e: Event): THREE.Intersection[]
  1. Convert mouse position to normalized device coords
  2. Create raycaster from camera through mouse point
  3. Cast ray against _raycasting array (clickable objects)
  4. Return sorted intersections (closest first)

Interaction Methods:
  - Click: Toggle light / show more-info
  - Double-click: Show object ID (edit mode) / Gesture action
  - Long-press: Long-press action
```

---

## Home Assistant Integration

### Entity State Updates

**Flow:**
```
Home Assistant
  ↓
HomeAssistant instance (WebSocket)
  ↓
Floor3dCard.set hass(homeAssistant)
  ↓
Check each entity in _configArray
  ├── Compare old state with new state
  └── If changed:
      ├── Call _updateXXX() methods
      ├── Update 3D object properties
      └── Request render
  ↓
_render() calls renderer.render()
```

**Key State Properties Used:**
```
Entity State:
  - state: primary value (on/off, open/closed, number)
  - attributes.brightness: light brightness (0-255)
  - attributes.color_mode: 'rgb' | 'color_temp'
  - attributes.rgb_color: [r, g, b]
  - attributes.color_temp: mirek (warm/cool)
  - attributes.current_position: 0-100 (covers)
  - attributes.unit_of_measurement: display unit
```

**Special Entities:**
- `sun.sun`: Provides azimuth/elevation for sky/sun positioning
- `sensor.moon`: Moon phase string ('full_moon', 'new_moon', etc.)
- Custom entities: any configurable sensor for globalLightPower

### Configuration Validation

**In setConfig():**
```typescript
1. Check required fields (path, objfile)
2. Parse entities array
3. Expand object_group references
4. Initialize material storage
5. Validate entity references (when hass available)
```

---

## Architecture Highlights

### 1. **Reactive Updates**
- Lit property/state decorators trigger renders
- hass setter fires automatically on state changes
- Optimization: `hasConfigOrEntitiesChanged()` prevents unnecessary renders

### 2. **Performance Optimizations**
- Material cloning avoids original modifications
- Raycasting only on designated objects
- Animation loop stops when card obscured (z-index check)
- Shadow map updates only when needed
- Logarithmic depth buffer for far/near distance handling

### 3. **Responsive Design**
- ResizeObserver monitors container size changes
- Canvas resizes with container (panel/sidebar aware)
- Debounced resize handling (50ms timeout)

### 4. **Flexible Model Support**
- OBJ/MTL: Traditional Wavefront format
- GLB: Optimized binary glTF format
- Both loaded with progress callbacks
- Automatic material/texture handling

### 5. **Multi-Level Support**
- Models can have multiple floor levels
- Level visibility toggled via UI buttons
- Level organization via "level_" prefix in object names
- Supports hiding/showing entire levels

---

## Best Places to Add Weather Visualization Features

### **Option 1: Weather-Based Sky Modifications** (RECOMMENDED)

**Location:** `_updateSunPosition()` method (line 1315)
**Approach:** Enhance sky shader uniforms based on weather entity

```typescript
private _updateWeatherEffects(): void {
  if (!this._hass.states['weather.home']) return;
  
  const weatherState = this._hass.states['weather.home'].state;
  const skyUniforms = this._sky.material.uniforms;
  
  // Modify turbidity/rayleigh based on conditions
  switch(weatherState) {
    case 'rainy':
      skyUniforms['turbidity'].value = 20;  // More haze
      skyUniforms['rayleigh'].value = 5;    // More scatter
      break;
    case 'cloudy':
      skyUniforms['turbidity'].value = 15;
      break;
    case 'clear':
      skyUniforms['turbidity'].value = 10;
      break;
  }
}
```

**Advantages:**
- Uses existing sky shader
- No new geometry needed
- Minimal performance impact
- Visual changes with existing lighting
- Easy to configure

**Integration Points:**
1. Read `weather.*` entity in hass setter
2. Call from `_updateSunPosition()` whenever sky updates
3. Add configuration options for weather entity reference

### **Option 2: Weather Particles System**

**Location:** New methods in `Floor3dCard` class
**Approach:** Create particle system for rain/snow/clouds

```typescript
private _initWeatherParticles(): void {
  // Create particle geometry, material, and system
  // Use Points or LineSegments for rain/snow
}

private _updateWeatherParticles(): void {
  // Update particle positions/visibility based on weather state
  // Called in _animationLoop()
}
```

**Features to Add:**
- Rain drops (LineSegments or Points)
- Snow flakes (Points with rotation)
- Cloud movement (particle rotation)
- Fog/mist layers (THREE.Fog)

**Advantages:**
- Realistic visual effects
- Highly configurable
- Can use existing animation loop
- Supports multiple weather types

### **Option 3: Weather Entity Bindings**

**Location:** `types.ts` and entity binding section
**Approach:** New type3d binding for weather visualization

```typescript
// In types.ts add:
type3d: '...' | 'weather_indicator'

// In entity binding section (~line 2936):
if (entity.type3d == 'weather_indicator') {
  // Create weather visualization on specific object
  // Example: color object based on humidity
  // Show precipitation % as object scale
}
```

### **Option 4: Data Overlay Enhancement**

**Location:** `_setoverlaycontent()` method
**Approach:** Display weather data in existing overlay panel

```typescript
// Show in overlay when weather entity selected:
// - Temperature
// - Humidity
// - Wind speed/direction (could rotate object)
// - Precipitation
// - UV index
```

**Advantages:**
- Uses existing UI overlay system
- Non-intrusive
- Easy to configure
- No 3D changes needed

---

## Current Weather-Related Code Locations

**Found References:**
- Line 1115-1117: Sun position update call in hass setter
- Line 1128-1242: Sky initialization with sun positioning
- Line 1315-1369: Sun/moon position update logic
- Line 861-1126: Full hass setter with entity handling pattern

**Weather Data Pattern to Follow:**
```typescript
// How sun.sun entity is currently accessed:
if (this._hass.states['sun.sun']) {
  const azimuth = this._hass.states['sun.sun'].attributes['azimuth'];
  const elevation = this._hass.states['sun.sun'].attributes['elevation'];
}

// Apply same pattern for weather entities:
if (this._hass.states['weather.home']) {
  const condition = this._hass.states['weather.home'].state;
  const temp = this._hass.states['weather.home'].attributes['temperature'];
  const humidity = this._hass.states['weather.home'].attributes['humidity'];
  // etc.
}
```

---

## Summary for Implementation

### Recommended Path for Weather Features:

1. **Start with Option 1** (Sky modifications) - lowest complexity, highest visual impact
2. **Add Option 4** (Data overlay) - informational display
3. **Scale to Option 2** (Particles) - advanced effects
4. **Consider Option 3** (Type bindings) - specialized use cases

### Key Development Patterns:

**Adding Configuration Options:**
- Add to `Floor3dCardConfig` interface in types.ts
- Add UI fields in editor.ts
- Use in floor3d-card.ts with null checks

**Adding Entity Subscriptions:**
- Follow existing pattern in hass setter (line 861)
- Check for entity existence: `if (this._hass.states[entity_id])`
- Subscribe by reading state in hass setter
- Update automatically on changes

**Modifying 3D Scene:**
- For visual changes: modify materials/uniforms in animation loop
- For geometry: add in display3dmodel() or _onLoaded3DModel()
- Always call `_renderer.shadowMap.needsUpdate = true` after changes
- Call `this._render()` to update immediately

**Performance Considerations:**
- Keep shader updates efficient (called every state change)
- Particle systems need careful vertex count management
- Test with multiple weather entities
- Monitor shadow map updates (expensive operation)

---

## File Modification Guide

**For Weather Integration, You'll Primarily Modify:**

1. `/home/ubuntu/HASS-floor3d-card/src/types.ts`
   - Add weather configuration interfaces

2. `/home/ubuntu/HASS-floor3d-card/src/floor3d-card.ts` (Main work)
   - Add weather-related properties
   - Enhance hass setter to subscribe to weather
   - Add _updateWeatherEffects() method
   - Call from _animationLoop() or hass setter
   - Modify _initSky() if needed

3. `/home/ubuntu/HASS-floor3d-card/src/editor.ts`
   - Add weather entity configuration UI
   - Add new fields for weather preferences

4. `/home/ubuntu/HASS-floor3d-card/src/const.ts`
   - Add constants for weather types, thresholds

