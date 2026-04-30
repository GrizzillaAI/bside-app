import 'react-native-url-polyfill/auto';
import { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import * as SplashScreen from 'expo-splash-screen';
import * as Font from 'expo-font';
import { AuthProvider } from './src/lib/auth';
import { PlayerProvider } from './src/lib/player';
import { RootNavigator } from './src/navigation/RootNavigator';
import { linking } from './src/navigation/linking';

SplashScreen.preventAutoHideAsync();

export default function App() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        await Font.loadAsync({
          'ArchivoBlack': require('./assets/fonts/ArchivoBlack-Regular.ttf'),
        });
      } catch (e) {
        console.warn('Font loading failed:', e);
      }
      setReady(true);
      await SplashScreen.hideAsync();
    })();
  }, []);

  if (!ready) return null;

  return (
    <AuthProvider>
      <PlayerProvider>
        <NavigationContainer linking={linking}>
          <StatusBar style="light" />
          <RootNavigator />
        </NavigationContainer>
      </PlayerProvider>
    </AuthProvider>
  );
}
