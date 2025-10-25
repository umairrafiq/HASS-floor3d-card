/* eslint-disable @typescript-eslint/no-explicit-any */
import * as THREE from 'three';

/**
 * Level detection result
 */
export interface DetectedLevel {
  level: number;
  minHeight: number;
  maxHeight: number;
  objectCount: number;
  objects: string[]; // Object names in this level
}

/**
 * Level detection configuration
 */
export interface LevelDetectionConfig {
  minLevelHeight?: number; // Minimum height difference to consider a new level (default: 2.0 meters)
  clusterTolerance?: number; // Tolerance for grouping objects (default: 0.5 meters)
  ignoreSmallObjects?: boolean; // Ignore objects smaller than threshold (default: true)
  minObjectSize?: number; // Minimum object size to consider (default: 0.1 meters)
}

/**
 * Stored level mapping
 */
export interface StoredLevelMapping {
  modelHash: string;
  timestamp: number;
  levels: DetectedLevel[];
  config: LevelDetectionConfig;
}

/**
 * Automatic level detector based on object heights
 */
export class LevelDetector {
  private config: LevelDetectionConfig;
  private storageKey = 'floor3d_level_mapping';

  constructor(config?: LevelDetectionConfig) {
    this.config = {
      minLevelHeight: 2.0,
      clusterTolerance: 0.5,
      ignoreSmallObjects: true,
      minObjectSize: 0.1,
      ...config,
    };
  }

  /**
   * Generate a hash for the model to use as storage key
   */
  private generateModelHash(object: THREE.Object3D): string {
    const objectNames: string[] = [];
    object.traverse((child) => {
      if (child.name) {
        objectNames.push(child.name);
      }
    });

    // Simple hash based on object count and names
    const str = objectNames.sort().join('|');
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(16);
  }

  /**
   * Get bounding box height range for an object
   */
  private getObjectHeightRange(object: THREE.Object3D): { min: number; max: number; size: number } | null {
    const bbox = new THREE.Box3().setFromObject(object);

    if (bbox.isEmpty()) {
      return null;
    }

    const size = bbox.getSize(new THREE.Vector3());

    // Ignore very small objects if configured
    if (this.config.ignoreSmallObjects && size.length() < this.config.minObjectSize!) {
      return null;
    }

    return {
      min: bbox.min.y,
      max: bbox.max.y,
      size: size.y,
    };
  }

  /**
   * Cluster heights into distinct levels using simple clustering
   */
  private clusterHeights(heights: number[]): number[] {
    if (heights.length === 0) return [];

    // Sort heights
    const sorted = [...heights].sort((a, b) => a - b);
    const clusters: number[] = [sorted[0]];

    for (let i = 1; i < sorted.length; i++) {
      const lastCluster = clusters[clusters.length - 1];
      const diff = sorted[i] - lastCluster;

      // If height difference is significant, start a new cluster
      if (diff > this.config.minLevelHeight!) {
        clusters.push(sorted[i]);
      }
    }

    return clusters;
  }

  /**
   * Detect levels based on object heights
   */
  detectLevels(rootObject: THREE.Object3D): DetectedLevel[] {
    console.log('Starting automatic level detection...');

    const objectHeights: Map<string, { min: number; max: number; midpoint: number }> = new Map();
    const allMidpoints: number[] = [];

    // Collect height information for all objects
    rootObject.traverse((object) => {
      if (object.name && object.type === 'Mesh' || object.type === 'Group') {
        const heightRange = this.getObjectHeightRange(object);

        if (heightRange) {
          const midpoint = (heightRange.min + heightRange.max) / 2;

          objectHeights.set(object.name, {
            min: heightRange.min,
            max: heightRange.max,
            midpoint: midpoint,
          });

          allMidpoints.push(midpoint);
        }
      }
    });

    console.log(`Analyzed ${objectHeights.size} objects for level detection`);

    if (allMidpoints.length === 0) {
      console.warn('No suitable objects found for level detection');
      return [];
    }

    // Find level boundaries by clustering midpoints
    const levelBoundaries = this.clusterHeights(allMidpoints);
    console.log(`Detected ${levelBoundaries.length} potential levels at heights:`, levelBoundaries);

    // Create level ranges
    const levels: DetectedLevel[] = [];

    for (let i = 0; i < levelBoundaries.length; i++) {
      const minHeight = i === 0 ? -Infinity : (levelBoundaries[i - 1] + levelBoundaries[i]) / 2;
      const maxHeight = i === levelBoundaries.length - 1 ? Infinity : (levelBoundaries[i] + levelBoundaries[i + 1]) / 2;

      levels.push({
        level: i,
        minHeight: minHeight,
        maxHeight: maxHeight,
        objectCount: 0,
        objects: [],
      });
    }

    // Assign objects to levels
    objectHeights.forEach((heights, objectName) => {
      for (const level of levels) {
        if (heights.midpoint >= level.minHeight && heights.midpoint < level.maxHeight) {
          level.objects.push(objectName);
          level.objectCount++;
          break;
        }
      }
    });

    // Filter out empty levels
    const nonEmptyLevels = levels.filter(level => level.objectCount > 0);

    console.log('Level detection complete:');
    nonEmptyLevels.forEach(level => {
      console.log(`  Level ${level.level}: ${level.objectCount} objects (height ${level.minHeight.toFixed(2)} to ${level.maxHeight.toFixed(2)})`);
    });

    return nonEmptyLevels;
  }

  /**
   * Save detected levels to localStorage
   */
  saveToStorage(object: THREE.Object3D, levels: DetectedLevel[]): void {
    try {
      const modelHash = this.generateModelHash(object);

      const mapping: StoredLevelMapping = {
        modelHash: modelHash,
        timestamp: Date.now(),
        levels: levels,
        config: this.config,
      };

      localStorage.setItem(`${this.storageKey}_${modelHash}`, JSON.stringify(mapping));
      console.log('Level mapping saved to localStorage');
    } catch (error) {
      console.error('Failed to save level mapping:', error);
    }
  }

  /**
   * Load detected levels from localStorage
   */
  loadFromStorage(object: THREE.Object3D): DetectedLevel[] | null {
    try {
      const modelHash = this.generateModelHash(object);
      const stored = localStorage.getItem(`${this.storageKey}_${modelHash}`);

      if (!stored) {
        console.log('No stored level mapping found');
        return null;
      }

      const mapping: StoredLevelMapping = JSON.parse(stored);

      // Check if configuration has changed significantly
      if (JSON.stringify(mapping.config) !== JSON.stringify(this.config)) {
        console.log('Level detection config changed, ignoring stored mapping');
        return null;
      }

      console.log(`Loaded level mapping from storage (created ${new Date(mapping.timestamp).toLocaleString()})`);
      return mapping.levels;
    } catch (error) {
      console.error('Failed to load level mapping:', error);
      return null;
    }
  }

  /**
   * Clear stored level mapping
   */
  clearStorage(object: THREE.Object3D): void {
    try {
      const modelHash = this.generateModelHash(object);
      localStorage.removeItem(`${this.storageKey}_${modelHash}`);
      console.log('Level mapping cleared from storage');
    } catch (error) {
      console.error('Failed to clear level mapping:', error);
    }
  }

  /**
   * Apply detected levels to objects by setting userData
   */
  applyLevelsToObjects(rootObject: THREE.Object3D, levels: DetectedLevel[]): void {
    // Create a map for quick lookup
    const objectToLevel = new Map<string, number>();

    levels.forEach(level => {
      level.objects.forEach(objectName => {
        objectToLevel.set(objectName, level.level);
      });
    });

    // Apply level data to objects
    rootObject.traverse((object) => {
      if (object.name && objectToLevel.has(object.name)) {
        const levelNum = objectToLevel.get(object.name)!;
        object.userData = {
          ...object.userData,
          level: levelNum,
          autoDetected: true, // Mark as auto-detected
        };
      } else if (object.name) {
        // Objects not in any level default to level 0
        object.userData = {
          ...object.userData,
          level: 0,
          autoDetected: true,
        };
      }
    });

    console.log('Applied level assignments to objects');
  }

  /**
   * Full auto-detect and apply workflow
   */
  autoDetectAndApply(rootObject: THREE.Object3D, forceRegenerate = false): DetectedLevel[] {
    let levels: DetectedLevel[] | null = null;

    // Try to load from storage first
    if (!forceRegenerate) {
      levels = this.loadFromStorage(rootObject);
    }

    // If not in storage or forced regenerate, detect levels
    if (!levels) {
      console.log('Performing level detection...');
      levels = this.detectLevels(rootObject);

      // Save to storage for next time
      if (levels.length > 0) {
        this.saveToStorage(rootObject, levels);
      }
    }

    // Apply levels to objects
    if (levels.length > 0) {
      this.applyLevelsToObjects(rootObject, levels);
    }

    return levels;
  }

  /**
   * Get statistics about detected levels
   */
  getLevelStatistics(levels: DetectedLevel[]): string {
    if (levels.length === 0) {
      return 'No levels detected';
    }

    let stats = `Detected ${levels.length} level(s):\n`;
    levels.forEach(level => {
      const heightRange = level.maxHeight === Infinity
        ? `${level.minHeight.toFixed(2)}m+`
        : `${level.minHeight.toFixed(2)}m - ${level.maxHeight.toFixed(2)}m`;

      stats += `  Level ${level.level}: ${level.objectCount} objects (${heightRange})\n`;
    });

    return stats;
  }
}
