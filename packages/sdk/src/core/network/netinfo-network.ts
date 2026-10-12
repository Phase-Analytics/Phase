import type {
  NetworkState,
  NetworkStateListener,
  UnsubscribeFn,
} from '../adapters/network-adapter';

type NetInfoState = { isConnected: boolean | null };
type NetInfoModule = {
  fetch: () => Promise<NetInfoState>;
  addEventListener: (listener: (state: NetInfoState) => void) => () => void;
};

let NetInfo: NetInfoModule | null = null;

try {
  const mod = require('@react-native-community/netinfo');
  NetInfo = (mod?.default ?? mod) as NetInfoModule;
} catch {
  // Optional peer: without it the SDK assumes it is online and relies on retries.
}

export function isNetInfoAvailable(): boolean {
  return NetInfo !== null;
}

// `isConnected` is null while unknown; only an explicit false counts as offline.
function toNetworkState(state: NetInfoState): NetworkState {
  return { isConnected: state.isConnected !== false };
}

export async function fetchNetworkState(): Promise<NetworkState> {
  if (!NetInfo) {
    return { isConnected: true };
  }
  return toNetworkState(await NetInfo.fetch());
}

export function addNetworkListener(
  listener: NetworkStateListener
): UnsubscribeFn {
  if (!NetInfo) {
    return () => {
      // Nothing to unsubscribe without NetInfo.
    };
  }
  return NetInfo.addEventListener((state) => listener(toNetworkState(state)));
}
