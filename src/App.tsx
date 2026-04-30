import { Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import SignIn from './pages/SignIn';
import SignUp from './pages/SignUp';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import AppLayout from './pages/AppLayout';
import Home from './pages/Home';
import Library from './pages/Library';
import Search from './pages/Search';
import Playlists from './pages/Playlists';
import Import from './pages/Import';
import Settings from './pages/Settings';
import SpotifyCallback from './pages/SpotifyCallback';
import YouTubeCallback from './pages/YouTubeCallback';
import ProtectedRoute from './components/ProtectedRoute';

export default function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/signin" element={<SignIn />} />
      <Route path="/signup" element={<SignUp />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* OAuth callbacks (protected so the user is signed in when we exchange the code) */}
      <Route
        path="/auth/spotify/callback"
        element={
          <ProtectedRoute>
            <SpotifyCallback />
          </ProtectedRoute>
        }
      />
      <Route
        path="/auth/youtube/callback"
        element={
          <ProtectedRoute>
            <YouTubeCallback />
          </ProtectedRoute>
        }
      />

      {/* Protected app routes */}
      <Route
        path="/app"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Home />} />
        <Route path="library" element={<Library />} />
        <Route path="search" element={<Search />} />
        <Route path="playlists" element={<Playlists />} />
        <Route path="import" element={<Import />} />
        <Route path="import/youtube" element={<Import />} />
        <Route path="import/spotify" element={<Import />} />
        <Route path="settings" element={<Settings />} />
      </Route>
    </Routes>
  );
}
