# Day/Night Cycle with Dynamic Sun/Moon Shadows - Feature Guide

## Overview

This new feature adds realistic day/night cycle lighting to your 3D floor plan with:
- ☀️ **Dynamic sun shadows** that move throughout the day
- 🌙 **Moon lighting** at night with phase-based intensity
- 🧭 **Correct shadow direction** based on your house orientation (north configuration)
- 🔄 **Real-time updates** as time progresses

## What's New

### Sun Shadow Improvements
- **Ground now receives shadows** - Previously disabled, now enabled for realistic rendering
- **Real-time sun position updates** - Sun moves throughout the day based on actual time
- **Dynamic shadows** - Shadows rotate and lengthen based on sun azimuth and elevation

### Moon Lighting (New!)
- **Automatic night lighting** - Moon activates when sun sets (elevation < 0)
- **Phase-based brightness** - Moon intensity varies realistically:
  - 🌑 New Moon: Very dim (0.05)
  - 🌓 Quarter Moons: Moderate (0.35)
  - 🌕 Full Moon: Brightest (0.8)
- **Cool blue tint** - Moonlight has realistic bluish-white color
- **Moon shadows** - Softer shadows cast during nighttime

## Configuration

### Basic Setup (Sun Shadows Only)

```yaml
type: custom:floor3d-card
sky: 'yes'              # Enable sky and sun
shadow: 'yes'           # Enable shadows
north:                  # Set your house orientation
  x: 0                  # North direction vector
  z: 1                  # (adjust for your location)
path: /local/home/
objfile: home.obj
mtlfile: home.mtl
# ... rest of your config
```

### Full Day/Night Cycle (Sun + Moon)

```yaml
type: custom:floor3d-card
sky: 'yes'              # Enable sky and sun
shadow: 'yes'           # Enable shadows
day_night_cycle: 'yes'  # Enable moon at night
moon_entity: 'sensor.moon'  # Optional, this is the default
north:                  # House orientation
  x: 0
  z: 1
path: /local/home/
objfile: home.obj
mtlfile: home.mtl
# ... rest of your config
```

## Setting North Direction

The `north` parameter tells the card which direction is north in your 3D model. This ensures shadows cast in the geographically correct direction.

**Common configurations:**
```yaml
# North towards positive Z axis (default)
north:
  x: 0
  z: 1

# North towards positive X axis
north:
  x: 1
  z: 0

# North towards negative X axis
north:
  x: -1
  z: 0

# North towards negative Z axis
north:
  x: 0
  z: -1
```

**How to determine your north:**
1. Open your SweetHome3D model
2. Note which direction faces north in your floor plan
3. Map that direction to the X/Z axes in your 3D view
4. Configure accordingly

## Requirements

### Built-in (No Setup Needed)
- `sun.sun` entity - Provides sun position (azimuth/elevation)

### Optional (For Moon Phases)
- Moon integration - Install from HACS or Home Assistant integrations
- Creates `sensor.moon` entity with current moon phase
- **If not installed:** Feature still works, moon will use default intensity (0.3)

## Visual Editor

The visual editor now includes two new options under the **Appearance** section:

1. **Day/Night Cycle** - Toggle between yes/no
2. **Moon Entity** - Specify custom moon entity (defaults to sensor.moon)

## How It Works

### Daytime (Sun Elevation > 0)
- Sun is active with full brightness
- Sun position updates every time `sun.sun` entity changes
- Shadows move and rotate based on sun azimuth
- Shadow length changes based on sun elevation
- Moon is disabled

### Nighttime (Sun Elevation < 0)
- Sun disabled automatically
- Moon activates with phase-based intensity
- Moon positioned opposite to where sun would be
- Cooler bluish lighting creates nighttime ambiance
- Softer shadows from moon

### Transitions
Transitions happen automatically when `sun.sun` entity updates:
- Dawn: Moon fades out, sun fades in
- Dusk: Sun fades out, moon fades in

## Troubleshooting

### Shadows not appearing
- Verify `shadow: 'yes'` is set
- Verify `sky: 'yes'` is set
- Check that objects in your model can receive shadows
- Ensure your 3D model objects aren't transparent

### Moon not working
- Verify `day_night_cycle: 'yes'` is set
- Check `sensor.moon` exists (or specify custom `moon_entity`)
- Moon only activates at night (sun elevation < 0)

### Shadows pointing wrong direction
- Adjust your `north` configuration
- Try rotating the direction 90° at a time until correct
- Reference your SweetHome3D model orientation

### Moon too bright/dim
- Moon brightness is automatic based on phase
- Full moon = 0.8 intensity, New moon = 0.05
- If `sensor.moon` is missing, defaults to 0.3
- No manual override currently (could be added if needed)

## Technical Details

### New TypeScript Methods
- `_updateSunPosition()` - Updates sun/moon position in real-time
- `_initMoon()` - Initializes moon directional light
- `_getMoonIntensity()` - Calculates moon brightness from phase

### Configuration Properties Added
- `day_night_cycle: string` - Enable/disable feature ('yes'/'no')
- `moon_entity: string` - Moon sensor entity ID

### Modified Behavior
- Ground plane now receives shadows (`receiveShadow: true`)
- `hass` setter now monitors `sun.sun` for changes
- Sun position recalculated on every entity update when sky mode active

## Performance Notes

- Only one directional light active at a time (sun OR moon, never both)
- Shadow maps are reused between sun and moon
- Updates only trigger when `sun.sun` entity actually changes
- Minimal performance impact vs original sky mode

## Future Enhancements (Not Implemented)

Possible future additions:
- Twilight period with gradual transitions
- Manual moon intensity override
- Seasonal sun angle adjustments
- Cloud cover effects on lighting intensity
- Stars/constellations at night

## Example Configuration

```yaml
type: custom:floor3d-card
name: My House
sky: 'yes'
shadow: 'yes'
day_night_cycle: 'yes'
north:
  x: 0
  z: 1
path: /local/house3d/
objfile: house.glb
backgroundColor: transparent
globalLightPower: 0.5
camera_position:
  x: 500
  y: 800
  z: 500
entities:
  - entity: light.living_room
    type3d: light
    object_id: lamp_1
    light:
      lumens: 800
  # ... more entities
```

## Demo

To see the feature in action:
1. Configure as shown above
2. Enable Developer Tools > Set time to morning (sun elevation positive)
3. Observe sun shadows
4. Set time to evening (sun elevation negative)
5. Watch moon activate with appropriate phase brightness

---

**Implemented:** January 2025
**Version:** 1.5.4 (pending)
**Tested:** TypeScript compilation successful ✅
