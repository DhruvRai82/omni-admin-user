import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FolderKanban, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const chartData = [
  { name: 'Mon', completed: 5, pending: 3 },
  { name: 'Tue', completed: 7, pending: 2 },
  { name: 'Wed', completed: 6, pending: 4 },
  { name: 'Thu', completed: 8, pending: 1 },
  { name: 'Fri', completed: 9, pending: 2 },
];

export default function UserDashboard() {
  const stats = [
    { title: 'My Projects', value: '0', icon: FolderKanban, color: 'text-chart-1' },
    { title: 'Completed', value: '0', icon: CheckCircle, color: 'text-chart-3' },
    { title: 'In Progress', value: '0', icon: Clock, color: 'text-chart-4' },
    { title: 'Issues', value: '0', icon: AlertCircle, color: 'text-chart-5' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">My Dashboard</h1>
        <p className="text-muted-foreground">Track your projects and progress</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
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
            <BarChart data={chartData}>
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