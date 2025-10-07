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

  // Show nothing while redirecting
  return null;
};

export default Index;
