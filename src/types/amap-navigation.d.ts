declare namespace AMap {
  interface NavigationPoint {
    keyword?: string;
    city?: string;
    location?: [number, number];
  }

  interface DrivingOptions {
    map?: Map;
    showTraffic?: boolean;
    autoFitView?: boolean;
    extensions?: 'base' | 'all';
  }

  interface WalkingOptions {
    map?: Map;
    autoFitView?: boolean;
  }

  interface GeolocationOptions {
    enableHighAccuracy?: boolean;
    timeout?: number;
    convert?: boolean;
    showButton?: boolean;
    showCircle?: boolean;
  }

  type NavigationCallback = (status: string, result: unknown) => void;

  class Driving {
    constructor(options?: DrivingOptions);
    search(
      origin: NavigationPoint | [number, number],
      destination: NavigationPoint | [number, number],
      callback: NavigationCallback,
    ): void;
    clear(): void;
  }

  class Walking {
    constructor(options?: WalkingOptions);
    search(
      origin: NavigationPoint | [number, number],
      destination: NavigationPoint | [number, number],
      callback: NavigationCallback,
    ): void;
    clear(): void;
  }

  class Geolocation {
    constructor(options?: GeolocationOptions);
    getCurrentPosition(callback: NavigationCallback): void;
    destroy(): void;
  }

  interface ControlPositionOptions {
    top?: string;
    left?: string;
    right?: string;
    bottom?: string;
  }

  abstract class Control {
    constructor(options?: Record<string, unknown>);
    addTo(map: Map, position?: ControlPositionOptions): void;
    removeFrom(map: Map): void;
    remove(): void;
    show(): void;
    hide(): void;
  }

  class ToolBar extends Control {
    constructor(options?: { position?: ControlPositionOptions });
  }

  class Scale extends Control {
    constructor(options?: Record<string, unknown>);
  }
}
