# Automatic Level Detection

## Overview

The automatic level detection feature analyzes your 3D model's object heights to automatically group them into levels/floors, eliminating the need for specific object naming conventions.

## How It Works

### Detection Algorithm

1. **Scans all objects** in your 3D model
2. **Measures height ranges** (Y-axis bounding boxes) for each object
3. **Clusters objects** by their vertical position (midpoint of bounding box)
4. **Groups objects** into distinct levels based on height
5. **Stores the mapping** in browser localStorage for fast reload

### Height-Based Clustering

The system uses a simple but effective clustering algorithm:
- Objects within ~2 meters of each other (configurable) are grouped together
- Natural "floors" are detected by finding gaps in vertical distribution
- Works for most standard building layouts

## Configuration

### Visual Editor

All level detection settings are now available in the visual card editor under the **Appearance** section:

1. **Hide Levels Menu** - Hide/show the levels menu (yes/no)
2. **Auto Detect Levels** - Enable automatic level detection (yes/no)
3. **Initial Level** - Which level to display on startup (number, default: 0)
4. **Min Level Height** - Minimum vertical distance between levels in meters (default: 2.0)
5. **Level Cluster Tolerance** - Tolerance for grouping objects within a level (default: 0.5)

No need to manually edit YAML - configure everything visually!

### Enable Auto-Detection (YAML)

```yaml
type: custom:floor3d-card
# ... other config ...
autoDetectLevels: 'yes'        # Enable auto-detection
minLevelHeight: 2.0            # Minimum height between levels (meters)
levelClusterTolerance: 0.5     # Tolerance for grouping objects
initialLevel: 0                # Start on ground floor
```

### Configuration Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `autoDetectLevels` | string | `'no'` | Set to `'yes'` to enable automatic level detection |
| `initialLevel` | number | `0` | Which level to display on startup (0 = ground floor) |
| `minLevelHeight` | number | `2.0` | Minimum vertical distance between levels (in meters) |
| `levelClusterTolerance` | number | `0.5` | Tolerance for grouping objects within a level |
| `hideLevelsMenu` | string | `'no'` | Set to `'yes'` to hide the levels menu UI |

### When Auto-Detection Activates

Auto-detection runs when:
1. **`autoDetectLevels: 'yes'`** is set in configuration
2. **No manual `lvlXXX_` naming** is found in the model
3. **Less than 2 manual levels** were detected

If manual naming is found, it takes precedence over auto-detection.

## Usage

### First Load

1. Add `autoDetectLevels: 'yes'` to your config
2. Reload your dashboard
3. Check browser console for detection results:
   ```
   Starting automatic level detection...
   Analyzed 156 objects for level detection
   Detected 3 potential levels at heights: [0, 2.5, 5.2]
   Auto-detected level 0: 64 objects (height -Inf to 1.25m)
   Auto-detected level 1: 58 objects (height 1.25m to 3.85m)
   Auto-detected level 2: 34 objects (height 3.85m to Inf)
   Level mapping saved to localStorage
   ```

### Subsequent Loads

- Levels are **loaded from localStorage** (instant)
- No re-calculation needed unless you regenerate

### Regenerating Levels

If your model changes or detection wasn't perfect:

1. **Look for the refresh icon** (🔄) in the levels menu
   - Only appears when auto-detection is active
2. **Click the icon** to regenerate levels
3. New detection runs and overwrites stored mapping

## Example Configurations

### Basic Auto-Detection

```yaml
type: custom:floor3d-card
path: /local/floor3d/
objfile: house.glb
autoDetectLevels: 'yes'
initialLevel: 0  # Start on ground floor
```

### Custom Detection Parameters

```yaml
type: custom:floor3d-card
path: /local/floor3d/
objfile: house.glb
autoDetectLevels: 'yes'
minLevelHeight: 2.5            # Levels must be at least 2.5m apart
levelClusterTolerance: 0.3     # Tighter clustering (0.3m tolerance)
```

### Multi-Story Building

```yaml
type: custom:floor3d-card
path: /local/floor3d/
objfile: apartment.glb
autoDetectLevels: 'yes'
minLevelHeight: 3.0            # Higher ceilings
hideLevelsMenu: 'no'           # Show level buttons
initialLevel: 0                # Start on ground floor
```

## How Levels Are Detected

### Example Detection

For a typical 2-story house:

**Model heights:**
- Floor/foundation: Y = 0.0m
- Ground floor walls: Y = 0.0m to 2.4m
- First floor ceiling: Y = 2.4m
- First floor walls: Y = 2.5m to 4.9m
- Roof: Y = 5.0m

**Detection result:**
- **Level 0**: Objects with midpoint around 1.2m (ground floor)
- **Level 1**: Objects with midpoint around 3.7m (first floor)
- **Level 2**: Objects with midpoint around 5.2m (roof/attic)

### Handling Edge Cases

**Split-level homes:**
- May create more levels than expected
- Adjust `minLevelHeight` to merge adjacent levels

**Open floor plans:**
- Works perfectly - objects at same height grouped together

**Mezzanines/lofts:**
- Detected as separate level if height difference > `minLevelHeight`

**Furniture:**
- Small objects ignored by default (`ignoreSmallObjects: true`)
- Furniture at table height won't create false levels

## Storage and Performance

### LocalStorage Caching

Detection results are stored in browser localStorage:
- **Key format**: `floor3d_level_mapping_[model_hash]`
- **Content**: Level assignments, timestamps, configuration
- **Lifetime**: Until you clear browser data or regenerate

### Model Hash

A hash is generated based on:
- Object count
- Object names (sorted)

If the model changes (objects added/removed/renamed), the hash changes and detection re-runs.

### Performance

- **First detection**: ~50-200ms for typical models (100-500 objects)
- **Subsequent loads**: <5ms (loaded from storage)
- **Memory impact**: Minimal (just level assignments)

## Debugging

### Console Output

Check browser console (F12) for detailed logs:

```javascript
Starting automatic level detection...
Analyzed 156 objects for level detection
Detected 3 potential levels at heights: [0, 2.5, 5.2]
Level detection complete:
  Level 0: 64 objects (height -Infinity to 1.25)
  Level 1: 58 objects (height 1.25 to 3.85)
  Level 2: 34 objects (height 3.85 to Infinity)
Applied level assignments to objects
Level mapping saved to localStorage
End Init Objects. Number of levels found: 3
```

### Verification

To see which level each object was assigned:

1. Open browser console
2. Type: `performance.memory` (check if detection ran)
3. Look for "Auto-detected level X" messages

### Common Issues

**Too many levels detected:**
- Increase `minLevelHeight` (e.g., from 2.0 to 3.0)
- This merges close levels together

**Too few levels detected:**
- Decrease `minLevelHeight` (e.g., from 2.0 to 1.5)
- This splits levels more aggressively

**Objects in wrong level:**
- Check object position/height in 3D editor
- Regenerate levels with adjusted parameters
- Objects are assigned by their center point (midpoint Y)

## Comparison: Manual vs Auto-Detection

### Manual Naming (`lvlXXX_`)

**Pros:**
- Explicit control over level assignments
- Works for non-standard layouts
- Can assign objects arbitrarily

**Cons:**
- Requires renaming all objects
- Tedious for large models
- Must follow strict naming pattern

### Auto-Detection

**Pros:**
- Works with any model (no renaming needed)
- Fast and automatic
- Cached for performance
- Easy to regenerate

**Cons:**
- May not work for unusual layouts
- Requires height-based structure
- Less precise than manual

### Best Practice

1. **Try auto-detection first** - easiest approach
2. **Regenerate if needed** - use refresh button to adjust
3. **Fall back to manual** - only if auto-detection fails

## Advanced: Custom Detection Logic

If you need more control, you can modify the detection algorithm:

**File:** `src/level-detector.ts`

**Key methods:**
- `detectLevels()` - Main detection logic
- `clusterHeights()` - Clustering algorithm
- `getObjectHeightRange()` - Height calculation

**Example customization:**
```typescript
// Detect levels based on walls only
private getObjectHeightRange(object: THREE.Object3D) {
  // Only consider objects with "wall" in the name
  if (!object.name.includes('wall')) {
    return null;
  }
  // ... rest of logic
}
```

## Troubleshooting

### Issue: No Levels Detected

**Possible causes:**
1. All objects at same height
2. Model has no Y-axis variation
3. Objects too small (filtered out)

**Solutions:**
- Check model in 3D editor (Blender, etc.)
- Verify objects have different Y positions
- Set `ignoreSmallObjects: false` in config

### Issue: Levels Menu Not Showing

**Possible causes:**
1. Only 1 level detected
2. `hideLevelsMenu: 'yes'`
3. Auto-detection failed

**Solutions:**
- Check console for "Auto-detected level" messages
- Ensure `hideLevelsMenu: 'no'` or omit
- Verify at least 2 levels were detected

### Issue: Wrong Level Assignments

**Possible causes:**
1. Objects at boundary between levels
2. `minLevelHeight` too small/large
3. Unusual building geometry

**Solutions:**
- Adjust `minLevelHeight` parameter
- Use `levelClusterTolerance` to fine-tune
- Regenerate levels after adjusting config
- Fall back to manual naming if needed

## API Reference

### LevelDetector Class

```typescript
class LevelDetector {
  constructor(config?: LevelDetectionConfig)

  // Main methods
  detectLevels(rootObject: THREE.Object3D): DetectedLevel[]
  applyLevelsToObjects(rootObject, levels): void
  autoDetectAndApply(rootObject, forceRegenerate): DetectedLevel[]

  // Storage methods
  saveToStorage(object, levels): void
  loadFromStorage(object): DetectedLevel[] | null
  clearStorage(object): void

  // Utility methods
  getLevelStatistics(levels): string
}
```

### DetectedLevel Interface

```typescript
interface DetectedLevel {
  level: number           // Level number (0, 1, 2, ...)
  minHeight: number       // Minimum Y coordinate
  maxHeight: number       // Maximum Y coordinate
  objectCount: number     // Number of objects
  objects: string[]       // Object names
}
```

## Summary

Auto-level detection provides a **zero-configuration** way to enable the levels menu without renaming objects. It's:

- ✅ Automatic and intelligent
- ✅ Cached for performance
- ✅ Configurable and tunable
- ✅ Easy to regenerate
- ✅ Compatible with any 3D model

Perfect for users who want the levels feature without the hassle of manual object naming!
