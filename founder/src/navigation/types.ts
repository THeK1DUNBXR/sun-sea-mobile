import type { NativeStackScreenProps } from '@react-navigation/native-stack';

export type RootStackParamList = {
  Main: undefined;
  Agent: { agentId: string };
  Attention: undefined;
  Settings: undefined;
};
export type TabParamList = { Overview: undefined; Sales: undefined; Receivables: undefined; Team: undefined; Operations: undefined };
export type ScreenProps<T extends keyof RootStackParamList> = NativeStackScreenProps<RootStackParamList, T>;
