import { Navigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { Loader2 } from 'lucide-react';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#08080C] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-[#FF4F2B] animate-spin mx-auto mb-4" />
          <p className="text-[#5A5A72] text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/signin" replace />;
  }

  return <>{children}</>;
}
