// Deep linking config for OAuth callbacks and password reset
import { LinkingOptions } from '@react-navigation/native';
import * as Linking from 'expo-linking';

const prefix = Linking.createURL('/');

export const linking: LinkingOptions<any> = {
  prefixes: [prefix, 'mixd://', 'https://getmixd.app'],
  config: {
    screens: {
      Auth: {
        screens: {
          SignIn: 'signin',
          SignUp: 'signup',
          ForgotPassword: 'forgot-password',
        },
      },
      Main: {
        screens: {
          Tabs: {
            screens: {
              Home: 'app',
              Library: 'app/library',
              Search: 'app/search',
              Playlists: 'app/playlists',
              Import: 'app/import',
              Settings: 'app/settings',
            },
          },
          NowPlaying: 'app/now-playing',
          PlaylistDetail: 'app/playlist/:playlistId',
        },
      },
    },
  },
};
