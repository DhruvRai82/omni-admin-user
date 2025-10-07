import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';

const Index = () => {
  const navigate = useNavigate();
  const { user, userRole, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (user && userRole) {
        navigate(userRole === 'admin' ? '/admin' : '/dashboard', { replace: true });
      } else {
        navigate('/auth', { replace: true });
      }
    }
  }, [user, userRole, loading, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
    </div>
  );
};

export default Index;
