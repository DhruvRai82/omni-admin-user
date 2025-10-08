import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const availableApps = [
  { name: 'Discord', icon: '💬', description: 'Team communication platform', color: 'bg-[#5865F2]' },
  { name: 'GitHub', icon: '🐙', description: 'Code repository and collaboration', color: 'bg-[#181717]' },
  { name: 'Figma', icon: '🎨', description: 'Collaborative design tool', color: 'bg-[#F24E1E]' },
  { name: 'Gmail', icon: '📧', description: 'Email integration', color: 'bg-[#EA4335]' },
  { name: 'Telegram', icon: '✈️', description: 'Messaging platform', color: 'bg-[#26A5E4]' },
  { name: 'Slack', icon: '💼', description: 'Workspace communication', color: 'bg-[#4A154B]' },
];

export default function Apps() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [integrations, setIntegrations] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [selectedApp, setSelectedApp] = useState<any>(null);
  const [apiKey, setApiKey] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedProject, setSelectedProject] = useState('');

  useEffect(() => {
    if (user) {
      fetchIntegrations();
      fetchProjects();
      fetchUsers();
    }
  }, [user]);

  const fetchIntegrations = async () => {
    const { data } = await supabase
      .from('app_integrations')
      .select('*');
    setIntegrations(data || []);
  };

  const fetchProjects = async () => {
    const { data } = await supabase
      .from('projects')
      .select('*');
    setProjects(data || []);
  };

  const fetchUsers = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, email');
    setUsers(data || []);
  };

  const handleConnect = async () => {
    if (!selectedApp || !selectedUser || !selectedProject) {
      toast({
        title: 'Missing Information',
        description: 'Please select a user, project, and provide connection details',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { error } = await supabase.from('app_integrations').insert({
        user_id: selectedUser,
        app_name: selectedApp.name,
        is_connected: true,
        config: {
          api_key: apiKey,
          webhook_url: webhookUrl,
          project_id: selectedProject,
        },
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: `${selectedApp.name} connected successfully`,
      });

      fetchIntegrations();
      setSelectedApp(null);
      setApiKey('');
      setWebhookUrl('');
      setSelectedUser('');
      setSelectedProject('');
    } catch (error) {
      console.error('Error connecting app:', error);
      toast({
        title: 'Error',
        description: 'Failed to connect app',
        variant: 'destructive',
      });
    }
  };

  const handleDisconnect = async (integrationId: string, appName: string) => {
    try {
      const { error } = await supabase
        .from('app_integrations')
        .delete()
        .eq('id', integrationId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: `${appName} disconnected`,
      });

      fetchIntegrations();
    } catch (error) {
      console.error('Error disconnecting app:', error);
      toast({
        title: 'Error',
        description: 'Failed to disconnect app',
        variant: 'destructive',
      });
    }
  };

  const getIntegrationsForApp = (appName: string) =>
    integrations.filter((i) => i.app_name === appName && i.is_connected);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">App Integrations Management</h1>
        <p className="text-muted-foreground">Manage app integrations for all users and projects</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {availableApps.map((app) => {
          const appIntegrations = getIntegrationsForApp(app.name);
          return (
            <Card key={app.name} className="border-border bg-card">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`h-12 w-12 rounded-lg ${app.color} flex items-center justify-center text-2xl`}>
                      {app.icon}
                    </div>
                    <div>
                      <CardTitle className="text-lg">{app.name}</CardTitle>
                      <CardDescription className="text-sm">{app.description}</CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between mb-2">
                  <Badge variant={appIntegrations.length > 0 ? 'default' : 'outline'}>
                    {appIntegrations.length} Active
                  </Badge>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button size="sm" onClick={() => setSelectedApp(app)}>
                        Connect
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Connect {app.name}</DialogTitle>
                        <DialogDescription>
                          Configure {app.name} integration for a user and project
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="user">Select User</Label>
                          <Select value={selectedUser} onValueChange={setSelectedUser}>
                            <SelectTrigger>
                              <SelectValue placeholder="Choose a user" />
                            </SelectTrigger>
                            <SelectContent>
                              {users.map((u) => (
                                <SelectItem key={u.id} value={u.id}>
                                  {u.full_name || u.email}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="project">Select Project</Label>
                          <Select value={selectedProject} onValueChange={setSelectedProject}>
                            <SelectTrigger>
                              <SelectValue placeholder="Choose a project" />
                            </SelectTrigger>
                            <SelectContent>
                              {projects.map((project) => (
                                <SelectItem key={project.id} value={project.id}>
                                  {project.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="apiKey">API Key / Token</Label>
                          <Input
                            id="apiKey"
                            type="password"
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            placeholder="Enter API key"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="webhook">Webhook URL (Optional)</Label>
                          <Input
                            id="webhook"
                            value={webhookUrl}
                            onChange={(e) => setWebhookUrl(e.target.value)}
                            placeholder="https://..."
                          />
                        </div>
                        <Button onClick={handleConnect} className="w-full">
                          Connect App
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
                {appIntegrations.length > 0 && (
                  <div className="space-y-1 text-sm">
                    {appIntegrations.map((integration) => {
                      const user = users.find(u => u.id === integration.user_id);
                      return (
                        <div key={integration.id} className="flex items-center justify-between p-2 bg-muted rounded">
                          <span className="text-xs">{user?.full_name || user?.email}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDisconnect(integration.id, app.name)}
                          >
                            Remove
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}