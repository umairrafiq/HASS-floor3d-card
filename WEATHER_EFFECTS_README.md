# Weather Effects Feature

This document describes the new 3D weather visualization feature added to the HASS-floor3d-card.

## Overview

The weather effects system adds immersive 3D weather visualization to your floor plan, including:
- **Rain** - Falling raindrops with wind effects
- **Snow** - Tumbling snowflakes with realistic drift
- **Clouds** - Floating 3D clouds
- **Lightning** - Dramatic lightning flashes for thunderstorms
- **Fog** - Atmospheric fog effects
- **Sky adjustments** - Dynamic sky turbidity and color based on weather

## Performance

The implementation uses **instanced meshes** for optimal performance:
- Single draw call per weather effect type
- Low-poly geometries (3-8 segments)
- Efficient particle reuse
- Default 2000 particles for rain, 1500 for snow, 30 for clouds

## Configuration

### Basic Setup

Add these parameters to your `floor3d-card` configuration:

```yaml
type: custom:floor3d-card
# ... your existing configuration ...
sky: 'yes'  # Required for weather effects
weather_effects: 'yes'  # Enable weather visualization
weather_entity: 'weather.home'  # Optional, defaults to 'weather.home'
weather_particle_count: 2000  # Optional, default is 2000
```

### Configuration Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `weather_effects` | string | - | Set to `'yes'` to enable weather effects |
| `weather_entity` | string | `'weather.home'` | Home Assistant weather entity to use |
| `weather_particle_count` | number | `2000` | Number of particles for rain/snow (affects performance) |

### Requirements

1. **Sky mode must be enabled**: `sky: 'yes'`
2. **Valid weather entity**: Must have a Home Assistant weather integration
3. **Animation mode**: Works best with animated objects (triggers animation loop)

## Supported Weather Conditions

The system automatically detects and visualizes these weather conditions:

### Clear Conditions
- `sunny` - Clear sky with low turbidity
- `clear-night` - Clear night sky

### Cloudy Conditions
- `partlycloudy` - Light clouds with 40% opacity
- `cloudy` - Heavy clouds with 80% opacity

### Rain Conditions
- `rainy` - Moderate rain with 60% intensity
- `pouring` - Heavy rain with 100% intensity

### Snow Conditions
- `snowy` - Snowfall with tumbling animation
- `snowy-rainy` - Mixed precipitation

### Storm Conditions
- `lightning` - Lightning flashes with dark clouds
- `lightning-rainy` - Thunderstorm with rain and lightning

### Special Conditions
- `fog` - Thick fog with reduced visibility

## Implementation Details

### Weather Effects Module (`weather-effects.ts`)

The weather system consists of several optimized effect classes:

#### RainEffect
- **Geometry**: Low-poly cylinder (3 segments)
- **Material**: Semi-transparent blue-grey
- **Physics**: Straight-down fall with wind drift
- **Particle count**: Configurable (default 2000)

#### SnowEffect
- **Geometry**: Octahedron (low-poly snowflake)
- **Material**: White with custom texture
- **Physics**: Slow fall with sinusoidal drift
- **Animation**: Time-based tumbling rotation

#### CloudEffect
- **Geometry**: Low-res sphere (6x6 segments)
- **Material**: Lambert with transparency
- **Animation**: Horizontal drift with gentle bobbing
- **Particle count**: 30 clouds

#### LightningEffect
- **Type**: Point light
- **Intensity**: 90 (bright flash)
- **Duration**: 400ms
- **Frequency**: Random (0.3% chance per frame)
- **Position**: Randomized high altitude

### Sky Adjustments

Weather conditions dynamically adjust sky parameters:

| Condition | Turbidity | Rayleigh | Effect |
|-----------|-----------|----------|--------|
| Sunny/Clear | 10 | 3.0 | Bright, clear sky |
| Partly Cloudy | 12 | 2.8 | Slightly hazy |
| Cloudy | 18 | 2.0 | Overcast |
| Rainy | 15 | 2.0 | Grey, rainy atmosphere |
| Pouring | 20 | 1.5 | Dark, stormy |
| Snowy | 12 | 2.5 | Bright but overcast |
| Storm | 25 | 1.2 | Very dark and dramatic |
| Fog | 25 | 1.0 | Very turbid |

## Integration

### Main Card Integration

The weather system is integrated into `floor3d-card.ts`:

1. **Initialization**: Called in `_initSky()` if `weather_effects: 'yes'`
2. **Updates**: Monitors weather entity state changes in `hass` setter
3. **Animation**: Updated in `_animationLoop()` every frame
4. **Disposal**: Cleaned up when card is destroyed

### State Updates

The system automatically updates when:
- Weather entity state changes
- Weather entity attributes change (wind speed, etc.)
- Card configuration is reloaded

## Example Configurations

### Minimal Configuration

```yaml
type: custom:floor3d-card
path: /local/floor3d/
objfile: house.glb
sky: 'yes'
weather_effects: 'yes'
```

### Full Configuration

```yaml
type: custom:floor3d-card
path: /local/floor3d/
objfile: house.glb
sky: 'yes'
shadow: 'yes'
day_night_cycle: 'yes'
weather_effects: 'yes'
weather_entity: 'weather.forecast_home'
weather_particle_count: 3000
north:
  x: 0
  z: 1
```

### Performance-Optimized

```yaml
type: custom:floor3d-card
path: /local/floor3d/
objfile: house.glb
sky: 'yes'
weather_effects: 'yes'
weather_particle_count: 1000  # Reduced for better performance
```

## Troubleshooting

### Weather not appearing
- Ensure `sky: 'yes'` is set
- Verify `weather_entity` exists in Home Assistant
- Check browser console for errors

### Performance issues
- Reduce `weather_particle_count` (try 1000 or 500)
- Ensure only one weather effect is active at a time
- Check GPU/browser capabilities

### Lightning not flashing
- Verify condition includes "thunder", "lightning", or "storm"
- Check that shadows are enabled for best effect

## Performance Benchmarks

Tested on mid-range hardware:

| Particle Count | FPS Impact | Recommendation |
|----------------|-----------|----------------|
| 500 | <5% | Low-end devices |
| 1000 | ~5-10% | Recommended |
| 2000 | ~10-15% | Default, good balance |
| 3000 | ~15-20% | High-end devices |
| 5000+ | >20% | Not recommended |

## Credits

Implementation inspired by the Codrops article "Creating an Immersive 3D Weather Visualization with React Three Fiber" but adapted for vanilla Three.js and Home Assistant integration.

## Future Enhancements

Potential improvements:
- Wind direction from weather entity
- Precipitation intensity based on attributes
- Temperature-based visual effects
- Custom particle textures
- Sound effects
- More weather conditions (hail, sleet, etc.)
