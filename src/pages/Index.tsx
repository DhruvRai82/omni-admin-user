import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';

const Index = () => {
  const navigate = useNavigate();
  const { user, userRole, loading } = useAuth();

  useEffect(() => {
    if (!loading && user && userRole) {
      navigate(userRole === 'admin' ? '/admin' : '/dashboard');
    }
  }, [user, userRole, loading, navigate]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center space-y-6 max-w-2xl px-4">
        <div className="inline-block mb-4">
          <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-primary to-primary-glow animate-pulse" />
        </div>
        <h1 className="text-5xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
          Admin & User Dashboard
        </h1>
        <p className="text-xl text-muted-foreground">
          Role-based management system with powerful features
        </p>
        <div className="flex gap-4 justify-center pt-4">
          <Button size="lg" onClick={() => navigate('/auth')}>
            Get Started
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Index;
