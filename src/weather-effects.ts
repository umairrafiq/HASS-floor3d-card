/* eslint-disable @typescript-eslint/no-explicit-any */
import * as THREE from 'three';

/**
 * Weather condition types
 */
export enum WeatherCondition {
  CLEAR = 'clear-night',
  SUNNY = 'sunny',
  PARTLYCLOUDY = 'partlycloudy',
  CLOUDY = 'cloudy',
  RAINY = 'rainy',
  POURING = 'pouring',
  LIGHTNING = 'lightning',
  LIGHTNING_RAINY = 'lightning-rainy',
  SNOWY = 'snowy',
  SNOWY_RAINY = 'snowy-rainy',
  FOG = 'fog',
  WINDY = 'windy',
  EXCEPTIONAL = 'exceptional',
}

/**
 * Weather effects configuration
 */
export interface WeatherEffectsConfig {
  enabled: boolean;
  intensity?: number; // 0.0 to 1.0
  particleCount?: number;
  windSpeed?: number;
  cloudCover?: number;
}

interface Particle {
  x: number;
  y: number;
  z: number;
  speed: number;
  drift?: number;
}

/**
 * Rain effect using instanced meshes (optimized, single draw call)
 */
class RainEffect {
  private mesh: THREE.InstancedMesh;
  private particles: Particle[] = [];
  private particleCount: number;
  private scene: THREE.Scene;
  private dummy: THREE.Object3D = new THREE.Object3D();
  private clock: THREE.Clock;

  constructor(scene: THREE.Scene, clock: THREE.Clock, particleCount = 2000) {
    this.scene = scene;
    this.clock = clock;
    this.particleCount = particleCount;

    // Create low-poly rain drop geometry (elongated cylinder) - scaled up 10x for visibility
    const geometry = new THREE.CylinderGeometry(1, 1, 20, 3);
    const material = new THREE.MeshBasicMaterial({
      color: 0x8888aa,
      transparent: true,
      opacity: 0.6,
    });

    // Create instanced mesh (single draw call for all raindrops)
    this.mesh = new THREE.InstancedMesh(geometry, material, particleCount);
    this.mesh.visible = false;
    this.scene.add(this.mesh);

    // Initialize particles
    for (let i = 0; i < particleCount; i++) {
      this.particles.push({
        x: (Math.random() - 0.5) * 1000,
        y: Math.random() * 500,
        z: (Math.random() - 0.5) * 1000,
        speed: 15 + Math.random() * 10,
      });
    }
  }

  update(windSpeed = 0, cameraPosition?: THREE.Vector3): void {
    if (!this.mesh.visible) return;

    const camX = cameraPosition?.x || 0;
    const camY = cameraPosition?.y || 0;
    const camZ = cameraPosition?.z || 0;

    this.particles.forEach((particle, i) => {
      // Rain falls straight down with some wind drift
      particle.y -= particle.speed * 0.016; // Approximate 60fps delta
      particle.x += windSpeed * 0.5;

      // Reset when hitting ground (below camera)
      if (particle.y < -500) {
        particle.y = 500;
        particle.x = (Math.random() - 0.5) * 1000;
        particle.z = (Math.random() - 0.5) * 1000;
      }

      // Update instance matrix (position relative to camera) - Y also offset by camera now!
      this.dummy.position.set(camX + particle.x, camY + particle.y, camZ + particle.z);
      this.dummy.rotation.z = Math.atan2(windSpeed, particle.speed); // Angle based on wind
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(i, this.dummy.matrix);
    });

    this.mesh.instanceMatrix.needsUpdate = true;
  }

  setIntensity(intensity: number): void {
    const material = this.mesh.material as THREE.MeshBasicMaterial;
    material.opacity = 0.4 * intensity;

    // Adjust visible particle count
    this.mesh.count = Math.floor(this.particleCount * intensity);
  }

  show(): void {
    this.mesh.visible = true;
  }

  hide(): void {
    this.mesh.visible = false;
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
    this.scene.remove(this.mesh);
  }
}

/**
 * Snow effect with physics-based tumbling (optimized with instanced meshes)
 */
class SnowEffect {
  private mesh: THREE.InstancedMesh;
  private particles: Particle[] = [];
  private particleCount: number;
  private scene: THREE.Scene;
  private dummy: THREE.Object3D = new THREE.Object3D();
  private clock: THREE.Clock;

  constructor(scene: THREE.Scene, clock: THREE.Clock, particleCount = 1500) {
    this.scene = scene;
    this.clock = clock;
    this.particleCount = particleCount;

    // Create low-poly snowflake geometry (simple octahedron) - scaled up 10x for visibility
    const geometry = new THREE.OctahedronGeometry(5, 0);
    const material = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.9,
    });

    // Create instanced mesh (single draw call for all snowflakes)
    this.mesh = new THREE.InstancedMesh(geometry, material, particleCount);
    this.mesh.visible = false;
    this.scene.add(this.mesh);

    // Initialize particles with drift properties
    for (let i = 0; i < particleCount; i++) {
      this.particles.push({
        x: (Math.random() - 0.5) * 1000,
        y: Math.random() * 500,
        z: (Math.random() - 0.5) * 1000,
        speed: 0.5 + Math.random() * 1.5,
        drift: 0.05 + Math.random() * 0.1,
      });
    }
  }

  update(windSpeed = 0, cameraPosition?: THREE.Vector3): void {
    if (!this.mesh.visible) return;

    const camX = cameraPosition?.x || 0;
    const camY = cameraPosition?.y || 0;
    const camZ = cameraPosition?.z || 0;
    const elapsedTime = this.clock.getElapsedTime();

    this.particles.forEach((particle, i) => {
      // Snow falls slowly with drift
      particle.y -= particle.speed * 0.016;
      // Sinusoidal drift for realistic floating motion
      particle.x += Math.sin(elapsedTime + i) * particle.drift! + windSpeed * 0.3;

      // Reset when hitting ground (below camera)
      if (particle.y < -500) {
        particle.y = 500;
        particle.x = (Math.random() - 0.5) * 1000;
        particle.z = (Math.random() - 0.5) * 1000;
      }

      // Update instance matrix with tumbling rotation (position relative to camera) - Y also offset!
      this.dummy.position.set(camX + particle.x, camY + particle.y, camZ + particle.z);
      // Time-based tumbling rotation for natural snowflake movement
      this.dummy.rotation.x = elapsedTime * 2 + i;
      this.dummy.rotation.y = elapsedTime * 3 + i;
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(i, this.dummy.matrix);
    });

    this.mesh.instanceMatrix.needsUpdate = true;
  }

  setIntensity(intensity: number): void {
    const material = this.mesh.material as THREE.MeshBasicMaterial;
    material.opacity = 0.8 * intensity;

    // Adjust visible particle count
    this.mesh.count = Math.floor(this.particleCount * intensity);
  }

  show(): void {
    this.mesh.visible = true;
  }

  hide(): void {
    this.mesh.visible = false;
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
    this.scene.remove(this.mesh);
  }
}

/**
 * Cloud effect using low-poly instanced meshes
 */
class CloudEffect {
  private mesh: THREE.InstancedMesh;
  private particles: Particle[] = [];
  private particleCount: number;
  private scene: THREE.Scene;
  private dummy: THREE.Object3D = new THREE.Object3D();
  private clock: THREE.Clock;

  constructor(scene: THREE.Scene, clock: THREE.Clock, particleCount = 30) {
    this.scene = scene;
    this.clock = clock;
    this.particleCount = particleCount;

    // Create low-poly cloud geometry (low-res sphere) - scaled up for visibility
    const geometry = new THREE.SphereGeometry(80, 6, 6);
    const material = new THREE.MeshLambertMaterial({
      color: 0xdddddd,
      transparent: true,
      opacity: 0.7,
    });

    // Create instanced mesh
    this.mesh = new THREE.InstancedMesh(geometry, material, particleCount);
    this.mesh.visible = false;
    this.scene.add(this.mesh);

    // Initialize cloud particles at high altitude (relative to camera)
    for (let i = 0; i < particleCount; i++) {
      this.particles.push({
        x: (Math.random() - 0.5) * 2000,
        y: 100 + Math.random() * 200, // Offset from camera (100-300 units above)
        z: (Math.random() - 0.5) * 2000,
        speed: 0.5 + Math.random() * 1,
      });
    }
  }

  update(windSpeed = 0, cameraPosition?: THREE.Vector3): void {
    if (!this.mesh.visible) return;

    const camX = cameraPosition?.x || 0;
    const camY = cameraPosition?.y || 0;
    const camZ = cameraPosition?.z || 0;
    const elapsedTime = this.clock.getElapsedTime();

    this.particles.forEach((particle, i) => {
      // Clouds drift slowly
      particle.x += (windSpeed * 0.3 + particle.speed) * 0.016;

      // Wrap around when moving off screen
      if (particle.x > 1000) {
        particle.x = -1000;
      }

      // Gentle bobbing motion
      const bobbing = Math.sin(elapsedTime * 0.5 + i) * 0.5;

      // Update instance matrix (position relative to camera)
      this.dummy.position.set(camX + particle.x, camY + particle.y + bobbing, camZ + particle.z);
      this.dummy.scale.set(1 + Math.sin(i) * 0.3, 0.8, 1 + Math.cos(i) * 0.3);
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(i, this.dummy.matrix);
    });

    this.mesh.instanceMatrix.needsUpdate = true;
  }

  setIntensity(intensity: number): void {
    const material = this.mesh.material as THREE.MeshLambertMaterial;
    material.opacity = 0.6 * intensity;

    // Adjust visible cloud count
    this.mesh.count = Math.floor(this.particleCount * intensity);
  }

  show(): void {
    this.mesh.visible = true;
  }

  hide(): void {
    this.mesh.visible = false;
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
    this.scene.remove(this.mesh);
  }
}

/**
 * Lightning effect for thunderstorms
 */
class LightningEffect {
  private lightningLight: THREE.PointLight;
  private scene: THREE.Scene;
  private active = false;
  private lastFlash = 0;

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    // Create point light for lightning flashes
    this.lightningLight = new THREE.PointLight(0xe6d8b3, 0, 300, 0.8);
    this.lightningLight.position.set(0, 200, 0);
    this.lightningLight.castShadow = true;
    this.scene.add(this.lightningLight);
  }

  update(cameraPosition?: THREE.Vector3): void {
    const now = Date.now();

    const camX = cameraPosition?.x || 0;
    const camY = cameraPosition?.y || 0;
    const camZ = cameraPosition?.z || 0;

    // Random lightning flash (0.3% chance per frame when not active)
    if (!this.active && Math.random() < 0.003 && now - this.lastFlash > 2000) {
      this.active = true;
      this.lastFlash = now;

      // Random position for each flash (relative to camera)
      this.lightningLight.position.x = camX + (Math.random() - 0.5) * 200;
      this.lightningLight.position.y = camY + 200;
      this.lightningLight.position.z = camZ + (Math.random() - 0.5) * 200;

      // Bright flash
      this.lightningLight.intensity = 90;

      // Turn off after 400ms
      setTimeout(() => {
        this.lightningLight.intensity = 0;
        this.active = false;
      }, 400);
    }
  }

  show(): void {
    this.lightningLight.visible = true;
  }

  hide(): void {
    this.lightningLight.visible = false;
    this.lightningLight.intensity = 0;
    this.active = false;
  }

  dispose(): void {
    this.scene.remove(this.lightningLight);
  }
}

/**
 * Main Weather Effects Manager
 */
export class WeatherEffectsManager {
  private scene: THREE.Scene;
  private sky?: any;
  private clock: THREE.Clock;
  private rainEffect: RainEffect;
  private snowEffect: SnowEffect;
  private cloudEffect: CloudEffect;
  private lightningEffect: LightningEffect;
  private currentCondition: WeatherCondition | null = null;
  private config: WeatherEffectsConfig;
  private windSpeed = 0;

  constructor(scene: THREE.Scene, clock: THREE.Clock, sky?: any, config?: WeatherEffectsConfig) {
    this.scene = scene;
    this.sky = sky;
    this.clock = clock;
    this.config = {
      enabled: true,
      intensity: 1.0,
      particleCount: 2000,
      windSpeed: 0,
      cloudCover: 0.5,
      ...config,
    };

    // Initialize effects with instanced meshes (very performant)
    this.rainEffect = new RainEffect(scene, clock, this.config.particleCount);
    this.snowEffect = new SnowEffect(scene, clock, Math.floor(this.config.particleCount! * 0.75));
    this.cloudEffect = new CloudEffect(scene, clock, 30);
    this.lightningEffect = new LightningEffect(scene);
  }

  /**
   * Update weather based on Home Assistant weather entity state
   */
  updateWeather(condition: string, attributes?: any): void {
    if (!this.config.enabled) return;

    // Map Home Assistant weather states to our conditions
    const weatherCondition = this.mapWeatherCondition(condition);

    if (weatherCondition === this.currentCondition) return;

    // Hide all effects first
    this.hideAllEffects();

    // Extract wind speed from attributes if available
    if (attributes?.wind_speed) {
      this.windSpeed = parseFloat(attributes.wind_speed) / 10; // Scale down for effect
    }

    // Show effects based on condition
    this.currentCondition = weatherCondition;
    this.applyWeatherCondition(weatherCondition);
  }

  private mapWeatherCondition(condition: string): WeatherCondition {
    const conditionLower = condition.toLowerCase().replace(/[_-]/g, '');

    // Check for thunderstorm/lightning first
    if (conditionLower.includes('thunder') || conditionLower.includes('lightning') || conditionLower.includes('storm')) {
      if (conditionLower.includes('rain')) {
        return WeatherCondition.LIGHTNING_RAINY;
      }
      return WeatherCondition.LIGHTNING;
    }

    if (conditionLower.includes('rain') || conditionLower.includes('rainy')) {
      if (conditionLower.includes('pour') || conditionLower.includes('heavy')) {
        return WeatherCondition.POURING;
      }
      return WeatherCondition.RAINY;
    }

    if (conditionLower.includes('snow')) {
      return WeatherCondition.SNOWY;
    }

    if (conditionLower.includes('cloud')) {
      if (conditionLower.includes('partly') || conditionLower.includes('partial')) {
        return WeatherCondition.PARTLYCLOUDY;
      }
      return WeatherCondition.CLOUDY;
    }

    if (conditionLower.includes('fog') || conditionLower.includes('mist')) {
      return WeatherCondition.FOG;
    }

    if (conditionLower.includes('clear') || conditionLower.includes('night')) {
      return WeatherCondition.CLEAR;
    }

    if (conditionLower.includes('sunny')) {
      return WeatherCondition.SUNNY;
    }

    return WeatherCondition.SUNNY;
  }

  private applyWeatherCondition(condition: WeatherCondition): void {
    switch (condition) {
      case WeatherCondition.LIGHTNING:
      case WeatherCondition.LIGHTNING_RAINY:
        // Storm with dark clouds and lightning
        this.cloudEffect.show();
        this.cloudEffect.setIntensity(1.0);
        this.lightningEffect.show();
        if (condition === WeatherCondition.LIGHTNING_RAINY) {
          this.rainEffect.show();
          this.rainEffect.setIntensity(1.0);
        }
        this.adjustSkyForWeather(25, 1.2); // Very dark, stormy
        break;

      case WeatherCondition.RAINY:
        this.rainEffect.show();
        this.rainEffect.setIntensity(0.6);
        this.cloudEffect.show();
        this.cloudEffect.setIntensity(0.5);
        this.adjustSkyForWeather(15, 2); // More turbid
        break;

      case WeatherCondition.POURING:
        this.rainEffect.show();
        this.rainEffect.setIntensity(1.0);
        this.cloudEffect.show();
        this.cloudEffect.setIntensity(0.7);
        this.adjustSkyForWeather(20, 1.5); // Very turbid, darker
        break;

      case WeatherCondition.SNOWY:
        this.snowEffect.show();
        this.snowEffect.setIntensity(0.8);
        this.cloudEffect.show();
        this.cloudEffect.setIntensity(0.6);
        this.adjustSkyForWeather(12, 2.5); // Bright but overcast
        break;

      case WeatherCondition.SNOWY_RAINY:
        this.rainEffect.show();
        this.snowEffect.show();
        this.cloudEffect.show();
        this.rainEffect.setIntensity(0.4);
        this.snowEffect.setIntensity(0.4);
        this.cloudEffect.setIntensity(0.6);
        this.adjustSkyForWeather(15, 2);
        break;

      case WeatherCondition.CLOUDY:
        this.cloudEffect.show();
        this.cloudEffect.setIntensity(0.8);
        this.adjustSkyForWeather(18, 2); // Overcast
        break;

      case WeatherCondition.PARTLYCLOUDY:
        this.cloudEffect.show();
        this.cloudEffect.setIntensity(0.4);
        this.adjustSkyForWeather(12, 2.8); // Slightly cloudy
        break;

      case WeatherCondition.FOG:
        this.adjustSkyForWeather(25, 1); // Very turbid
        this.setFog(true, 0.002);
        break;

      case WeatherCondition.CLEAR:
      case WeatherCondition.SUNNY:
      default:
        this.adjustSkyForWeather(10, 3); // Clear sky
        break;
    }
  }

  private adjustSkyForWeather(turbidity: number, rayleigh: number): void {
    if (!this.sky) return;

    const uniforms = this.sky.material.uniforms;
    if (uniforms) {
      uniforms['turbidity'].value = turbidity;
      uniforms['rayleigh'].value = rayleigh;
    }
  }

  private setFog(enabled: boolean, density = 0.001): void {
    if (enabled) {
      this.scene.fog = new THREE.FogExp2(0xcccccc, density);
    } else {
      this.scene.fog = null;
    }
  }

  private hideAllEffects(): void {
    this.rainEffect.hide();
    this.snowEffect.hide();
    this.cloudEffect.hide();
    this.lightningEffect.hide();
    this.setFog(false);
  }

  /**
   * Update animation for all active effects
   * Call this in your animation loop
   */
  update(cameraPosition?: THREE.Vector3): void {
    if (!this.config.enabled) return;

    this.rainEffect.update(this.windSpeed, cameraPosition);
    this.snowEffect.update(this.windSpeed, cameraPosition);
    this.cloudEffect.update(this.windSpeed, cameraPosition);
    this.lightningEffect.update(cameraPosition);
  }

  /**
   * Dispose all effects and clean up resources
   */
  dispose(): void {
    this.rainEffect.dispose();
    this.snowEffect.dispose();
    this.cloudEffect.dispose();
    this.lightningEffect.dispose();
    this.setFog(false);
  }

  /**
   * Enable or disable weather effects
   */
  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
    if (!enabled) {
      this.hideAllEffects();
    } else if (this.currentCondition) {
      this.applyWeatherCondition(this.currentCondition);
    }
  }

  /**
   * Set global intensity multiplier
   */
  setIntensity(intensity: number): void {
    this.config.intensity = Math.max(0, Math.min(1, intensity));
  }
}
