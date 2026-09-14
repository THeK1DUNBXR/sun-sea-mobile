import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { useAuth } from '@/store/auth';
import { usePalette } from '@/ui/theme';

export default function Index() {
  const { isHydrating, isAuthenticated } = useAuth();
  const palette = usePalette();

  if (isHydrating) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.bg }}>
        <ActivityIndicator color={palette.accent} />
      </View>
    );
  }

  return <Redirect href={isAuthenticated ? '/(tabs)/overview' : '/login'} />;
}
