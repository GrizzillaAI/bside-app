import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../lib/theme';
import { usePlayer } from '../lib/player';

import HomeScreen from '../screens/HomeScreen';
import LibraryScreen from '../screens/LibraryScreen';
import SearchScreen from '../screens/SearchScreen';
import PlaylistsScreen from '../screens/PlaylistsScreen';
import ImportScreen from '../screens/ImportScreen';
import SettingsScreen from '../screens/SettingsScreen';
import MiniPlayer from '../components/MiniPlayer';

export type MainTabParamList = {
  Home: undefined;
  Library: undefined;
  Search: undefined;
  Playlists: undefined;
  Import: undefined;
  Settings: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

const tabIcons: Record<string, keyof typeof Ionicons.glyphMap> = {
  Home: 'home',
  Library: 'library',
  Search: 'search',
  Playlists: 'list',
  Import: 'download',
  Settings: 'settings',
};

export function MainNavigator() {
  const { currentTrack } = usePlayer();

  return (
    <View style={{ flex: 1, backgroundColor: colors.ink }}>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name={tabIcons[route.name] || 'ellipse'} size={size} color={color} />
          ),
          tabBarActiveTintColor: colors.pink,
          tabBarInactiveTintColor: colors.ash,
          tabBarStyle: {
            backgroundColor: colors.void,
            borderTopColor: colors.slate,
            borderTopWidth: 1,
            paddingBottom: 4,
            height: 56,
          },
          tabBarLabelStyle: {
            fontSize: 10,
            fontWeight: '600',
          },
        })}
      >
        <Tab.Screen name="Home" component={HomeScreen} />
        <Tab.Screen name="Library" component={LibraryScreen} />
        <Tab.Screen name="Search" component={SearchScreen} />
        <Tab.Screen name="Playlists" component={PlaylistsScreen} />
        <Tab.Screen name="Import" component={ImportScreen} />
        <Tab.Screen name="Settings" component={SettingsScreen} />
      </Tab.Navigator>
      {currentTrack && <MiniPlayer />}
    </View>
  );
}
