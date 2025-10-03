import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FolderKanban, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';

export default function UserDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [stats, setStats] = useState({
    myProjects: 0,
    completed: 0,
    inProgress: 0,
    issues: 0,
  });
  const [weeklyData, setWeeklyData] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
      
      // Set up realtime subscriptions
      const projectsChannel = supabase
        .channel('user-projects')
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'projects',
          filter: `owner_id=eq.${user.id}`
        }, () => {
          fetchDashboardData();
        })
        .subscribe();

      const dataChannel = supabase
        .channel('user-project-data')
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'project_data',
          filter: `created_by=eq.${user.id}`
        }, () => {
          fetchDashboardData();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(projectsChannel);
        supabase.removeChannel(dataChannel);
      };
    }
  }, [user]);

  const fetchDashboardData = async () => {
    if (!user) return;

    try {
      // Fetch user's projects
      const { data: projects } = await supabase
        .from('projects')
        .select('id')
        .eq('owner_id', user.id);

      const projectIds = projects?.map(p => p.id) || [];

      // Fetch project data entries
      let completedCount = 0;
      let inProgressCount = 0;
      let issuesCount = 0;

      if (projectIds.length > 0) {
        const { data: projectData } = await supabase
          .from('project_data')
          .select('data')
          .in('project_id', projectIds);

        projectData?.forEach((entry: any) => {
          const data = entry.data;
          if (data.status === 'completed') completedCount++;
          else if (data.status === 'in_progress') inProgressCount++;
          if (data.bugs || data.issues) issuesCount++;
        });
      }

      setStats({
        myProjects: projects?.length || 0,
        completed: completedCount,
        inProgress: inProgressCount,
        issues: issuesCount,
      });

      // Fetch weekly activity data
      const weekData = [];
      const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
      
      for (let i = 4; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dayStart = new Date(date.setHours(0, 0, 0, 0));
        const dayEnd = new Date(date.setHours(23, 59, 59, 999));

        const { data: dayData } = await supabase
          .from('project_data')
          .select('data')
          .in('project_id', projectIds)
          .gte('entry_date', dayStart.toISOString().split('T')[0])
          .lte('entry_date', dayEnd.toISOString().split('T')[0]);

        let completed = 0;
        let pending = 0;

        dayData?.forEach((entry: any) => {
          if (entry.data.status === 'completed') completed++;
          else pending++;
        });

        weekData.push({
          name: days[4 - i],
          completed,
          pending,
        });
      }

      setWeeklyData(weekData);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load dashboard data',
        variant: 'destructive',
      });
    }
  };

  const statsCards = [
    { title: 'My Projects', value: stats.myProjects.toString(), icon: FolderKanban, color: 'text-chart-1' },
    { title: 'Completed', value: stats.completed.toString(), icon: CheckCircle, color: 'text-chart-3' },
    { title: 'In Progress', value: stats.inProgress.toString(), icon: Clock, color: 'text-chart-4' },
    { title: 'Issues', value: stats.issues.toString(), icon: AlertCircle, color: 'text-chart-5' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">My Dashboard</h1>
        <p className="text-muted-foreground">Track your projects and progress</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statsCards.map((stat) => (
          <Card key={stat.title} className="border-border bg-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle>Weekly Progress</CardTitle>
          <CardDescription>Your task completion overview</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
              <YAxis stroke="hsl(var(--muted-foreground))" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '0.5rem',
                }}
              />
              <Bar dataKey="completed" fill="hsl(var(--chart-3))" radius={[8, 8, 0, 0]} />
              <Bar dataKey="pending" fill="hsl(var(--chart-4))" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
