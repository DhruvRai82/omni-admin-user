import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Package, Figma, Github, Mail, Send } from 'lucide-react';

const apps = [
  {
    name: 'Discord',
    description: 'Team communication and collaboration',
    icon: MessageSquare,
    connected: false,
    color: 'text-[#5865F2]',
  },
  {
    name: 'Docker',
    description: 'Container management and deployment',
    icon: Package,
    connected: false,
    color: 'text-[#2496ED]',
  },
  {
    name: 'Figma',
    description: 'Design and prototyping tool',
    icon: Figma,
    connected: false,
    color: 'text-[#F24E1E]',
  },
  {
    name: 'GitHub',
    description: 'Code repository and version control',
    icon: Github,
    connected: false,
    color: 'text-foreground',
  },
  {
    name: 'Gmail',
    description: 'Email integration and notifications',
    icon: Mail,
    connected: false,
    color: 'text-[#EA4335]',
  },
  {
    name: 'Telegram',
    description: 'Messaging and bot integration',
    icon: Send,
    connected: false,
    color: 'text-[#26A5E4]',
  },
];

export default function Apps() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">App Integrations</h1>
        <p className="text-muted-foreground">Connect external services to enhance your workflow</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {apps.map((app) => (
          <Card key={app.name} className="border-border bg-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <app.icon className={`h-10 w-10 ${app.color}`} />
                <Badge variant={app.connected ? 'default' : 'secondary'}>
                  {app.connected ? 'Connected' : 'Not Connected'}
                </Badge>
              </div>
              <CardTitle className="mt-4">{app.name}</CardTitle>
              <CardDescription>{app.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant={app.connected ? 'destructive' : 'default'} className="w-full">
                {app.connected ? 'Disconnect' : 'Connect'}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}