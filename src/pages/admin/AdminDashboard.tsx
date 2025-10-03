import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, MessageSquare, FolderKanban, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

export default function AdminDashboard() {
  const { toast } = useToast();
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeProjects: 0,
    messages: 0,
    growth: 0,
  });
  const [activityData, setActivityData] = useState<any[]>([]);
  const [userGrowthData, setUserGrowthData] = useState<any[]>([]);

  useEffect(() => {
    fetchDashboardData();
    
    // Set up realtime subscriptions
    const messagesChannel = supabase
      .channel('dashboard-messages')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_messages' }, () => {
        fetchDashboardData();
      })
      .subscribe();

    const projectsChannel = supabase
      .channel('dashboard-projects')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, () => {
        fetchDashboardData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(projectsChannel);
    };
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch total users
      const { count: usersCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Fetch active projects
      const { count: projectsCount } = await supabase
        .from('projects')
        .select('*', { count: 'exact', head: true });

      // Fetch total messages
      const { count: messagesCount } = await supabase
        .from('chat_messages')
        .select('*', { count: 'exact', head: true });

      // Calculate growth (users created in last 30 days vs previous 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const sixtyDaysAgo = new Date();
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

      const { count: recentUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', thirtyDaysAgo.toISOString());

      const { count: previousUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', sixtyDaysAgo.toISOString())
        .lt('created_at', thirtyDaysAgo.toISOString());

      const growth = previousUsers ? ((recentUsers! - previousUsers) / previousUsers) * 100 : 0;

      setStats({
        totalUsers: usersCount || 0,
        activeProjects: projectsCount || 0,
        messages: messagesCount || 0,
        growth: Math.round(growth),
      });

      // Fetch activity data for the past week
      const weekData = [];
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dayStart = new Date(date.setHours(0, 0, 0, 0));
        const dayEnd = new Date(date.setHours(23, 59, 59, 999));

        const { count } = await supabase
          .from('chat_messages')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', dayStart.toISOString())
          .lte('created_at', dayEnd.toISOString());

        weekData.push({
          name: days[dayStart.getDay()],
          value: count || 0,
        });
      }
      setActivityData(weekData);

      // Fetch user growth data for the past 6 months
      const monthData = [];
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
        const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);

        const { count } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .lte('created_at', monthEnd.toISOString());

        monthData.push({
          name: months[monthStart.getMonth()],
          users: count || 0,
        });
      }
      setUserGrowthData(monthData);

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
    { title: 'Total Users', value: stats.totalUsers.toString(), icon: Users, color: 'text-chart-1' },
    { title: 'Active Projects', value: stats.activeProjects.toString(), icon: FolderKanban, color: 'text-chart-2' },
    { title: 'Messages', value: stats.messages.toString(), icon: MessageSquare, color: 'text-chart-3' },
    { title: 'Growth', value: `${stats.growth}%`, icon: TrendingUp, color: 'text-chart-4' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground">Welcome back! Here's your overview</p>
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

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle>Weekly Activity</CardTitle>
            <CardDescription>Message activity for the past week</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={activityData}>
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
                <Bar dataKey="value" fill="hsl(var(--chart-1))" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle>User Growth</CardTitle>
            <CardDescription>Total user registrations over the past 6 months</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={userGrowthData}>
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
                <Line
                  type="monotone"
                  dataKey="users"
                  stroke="hsl(var(--chart-2))"
                  strokeWidth={2}
                  dot={{ fill: 'hsl(var(--chart-2))' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
