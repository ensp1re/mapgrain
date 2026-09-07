export interface MapgrainStudio {
  token: string;
  fileName: string;
}

declare global {
  interface Window {
    __MAPGRAIN_STUDIO__?: MapgrainStudio;
  }
}

export {};
