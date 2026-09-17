import type { SRemoteParentApi } from './api.d.ts';

declare global {
  interface Window {
    sremote?: SRemoteParentApi;
    SRemote?: SRemoteParentApi;
  }
}

export {};
