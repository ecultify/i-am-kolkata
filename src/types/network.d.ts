// Add this to types/network.d.ts
interface NetworkInformation extends EventTarget {
    readonly effectiveType: '4g' | '3g' | '2g' | 'slow-2g';
    readonly downlink: number;
    readonly rtt: number;
    readonly saveData: boolean;
    readonly type: 'bluetooth' | 'cellular' | 'ethernet' | 'none' | 'wifi' | 'wimax' | 'other' | 'unknown';
    onchange: EventListener;
  }
  
  interface Navigator {
    connection?: NetworkInformation;
  }