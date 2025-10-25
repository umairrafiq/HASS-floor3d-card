# Levels Menu Troubleshooting Guide

## Overview

The levels menu allows you to show/hide different floors or levels in your 3D home model. This guide explains how to make it work.

## Requirements

For the levels menu to appear, you need:

1. **Multiple levels in your 3D model** (at least 2)
2. **Correct object naming** in your model
3. **Proper configuration** in your card

## Object Naming Convention

Objects in your 3D model **must** follow this naming pattern:

```
lvlXXX_objectname
```

Where:
- `lvl` is the literal prefix (lowercase)
- `XXX` is a 3-digit level number (000, 001, 002, etc.)
- `_` is the separator
- `objectname` is the rest of the object name

### Examples

**✅ Correct Names:**
```
lvl000_living_room_floor
lvl000_kitchen_wall
lvl000_door_1
lvl001_bedroom_ceiling
lvl001_bathroom_floor
lvl002_attic_beam
```

**❌ Incorrect Names:**
```
level_0_wall        ❌ Wrong prefix pattern
lvl0_door           ❌ Not 3 digits
lv001_window        ❌ Wrong prefix
floor               ❌ No level prefix
Level1_roof         ❌ Capital L and only 1 digit
```

## Configuration

### Showing the Menu (Default)

```yaml
type: custom:floor3d-card
# ... other config ...
hideLevelsMenu: 'no'  # explicitly show
```

Or simply omit the setting (defaults to 'no'):

```yaml
type: custom:floor3d-card
# ... other config ...
# hideLevelsMenu not specified = menu will show
```

### Hiding the Menu

```yaml
type: custom:floor3d-card
# ... other config ...
hideLevelsMenu: 'yes'  # explicitly hide
```

## How It Works

### 1. Model Loading

When your 3D model loads, the card:
- Scans all object names for the pattern `/lvl(?<level>\d{3})/`
- Groups objects by level number
- Creates a THREE.Object3D group for each level

### 2. Level Detection

From the code (floor3d-card.ts:1707):
```javascript
const regex = /lvl(?<level>\d{3})/;
```

This regex looks for:
- `lvl` prefix
- Exactly 3 digits
- Extracts the digits as the level number

### 3. Name Processing

After detection, the `lvlXXX_` prefix is removed:
- `lvl000_wall1` becomes `wall1`
- `lvl001_door` becomes `door`

This cleaned name is used for entity bindings.

### 4. Menu Display Logic

The menu appears when (floor3d-card.ts:1884):
```javascript
if (this._levels.length > 1 &&
    (this._config.hideLevelsMenu == null ||
     this._config.hideLevelsMenu == 'no'))
```

## Creating Multi-Level Models

### Using SweetHome3D (Recommended)

1. Design your home with multiple levels
2. Use the **ExportToHASS plugin**
3. The plugin automatically names objects with `lvlXXX_` prefix
4. Export as OBJ/MTL or GLB

### Using Blender

1. Name your objects with the `lvlXXX_` pattern
2. Example hierarchy:
   ```
   Scene
   ├── lvl000_floor
   ├── lvl000_wall_north
   ├── lvl000_wall_south
   ├── lvl001_ceiling
   ├── lvl001_wall_bedroom
   └── lvl002_roof
   ```
3. Export as GLB or OBJ

### Using Other 3D Software

1. Ensure objects are named correctly
2. Use the naming pattern: `lvl000_`, `lvl001_`, etc.
3. Export in a supported format (OBJ/MTL or GLB)

## Checking Your Model

### Method 1: Browser Console

1. Open your Home Assistant dashboard
2. Open browser Developer Tools (F12)
3. Look for console logs when the card loads:
   ```
   Found level 0
   Found level 1
   Found level 2
   ```

If you only see "Found level 0", your model doesn't have properly named multi-level objects.

### Method 2: Inspect Model File

For **OBJ files**, open in a text editor:
```obj
o lvl000_floor
v 0.0 0.0 0.0
...
o lvl001_ceiling
v 0.0 2.4 0.0
...
```

For **GLB files**, use a tool like:
- [glTF Viewer](https://gltf-viewer.donmccurdy.com/)
- Blender (File → Import → glTF)

Check the object names in the scene hierarchy.

## Common Issues

### Issue: Menu Not Showing

**Possible Causes:**

1. **Only one level detected**
   - Solution: Ensure you have objects with different level numbers (lvl000, lvl001, etc.)

2. **Wrong naming pattern**
   - Solution: Check object names match `lvlXXX_` pattern exactly

3. **hideLevelsMenu is 'yes'**
   - Solution: Change to 'no' or remove the setting

4. **All objects default to level 0**
   - Solution: Verify object names in your 3D model file

### Issue: Some Objects Missing

**Possible Cause:**
- Object names don't match the pattern
- These objects are added to level 0 by default

**Solution:**
Rename objects in your 3D modeling software with proper `lvlXXX_` prefix.

### Issue: Level Numbers Don't Match

**Problem:**
Your model has `lvl000` and `lvl002`, but no `lvl001`.

**Result:**
- Level 0 will work
- Level 2 will work
- Gap in level 1 (will be empty)

**Solution:**
Use sequential level numbers (000, 001, 002) for best results.

## Advanced: Initial Level

You can set which level is visible on card load:

```yaml
type: custom:floor3d-card
# ... other config ...
initialLevel: 1  # Show level 1 (lvl001_* objects) on load
```

- `initialLevel: 0` → Show level 0 (default)
- `initialLevel: 1` → Show level 1
- `initialLevel: -1` → Show all levels

## Level Menu UI

When working correctly, you'll see:
- A numbered list icon (☰) in the corner
- Clicking shows level buttons (0, 1, 2, etc.)
- Active level is highlighted
- Click a number to toggle that level's visibility

## Testing

### Quick Test

1. Add this to your test model objects:
   - `lvl000_test_cube`
   - `lvl001_test_sphere`

2. Reload the card

3. You should see the levels menu appear

4. Click level buttons to toggle visibility

## Need Help?

If the levels menu still doesn't work:

1. Check browser console for errors
2. Verify object names in your 3D file
3. Confirm `hideLevelsMenu` config
4. Share your model's object list for diagnosis

## Related Settings

```yaml
type: custom:floor3d-card
hideLevelsMenu: 'no'     # Show/hide the menu
initialLevel: 0          # Which level to show on load
```

## Summary Checklist

- [ ] 3D model has objects named `lvlXXX_objectname`
- [ ] At least 2 different level numbers exist (e.g., lvl000 and lvl001)
- [ ] Level numbers use exactly 3 digits (000, 001, not 0, 1)
- [ ] `hideLevelsMenu` is 'no' or not specified
- [ ] Browser console shows "Found level 0" and "Found level 1" messages
- [ ] No JavaScript errors in console
