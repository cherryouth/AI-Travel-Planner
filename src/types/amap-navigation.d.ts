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

  class ToolBar {
    constructor(options?: { position?: ControlPositionOptions });
  }

  class Scale {
    constructor(options?: Record<string, unknown>);
  }
}
