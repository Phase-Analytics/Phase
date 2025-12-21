import NetInfo from '@react-native-community/netinfo';

export type NetworkState = {
  isConnected: boolean;
};

export type NetworkStateListener = (state: NetworkState) => void;
export type UnsubscribeFn = () => void;

export async function fetchNetworkState(): Promise<NetworkState> {
  const netState = await NetInfo.fetch();
  return {
    isConnected: netState.isConnected ?? false,
  };
}

export function addNetworkListener(
  listener: NetworkStateListener
): UnsubscribeFn {
  const unsubscribe = NetInfo.addEventListener((state) => {
    listener({
      isConnected: state.isConnected ?? false,
    });
  });

  return unsubscribe;
}
