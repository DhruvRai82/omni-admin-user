import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Play, Trash2, Calendar, CheckCircle } from "lucide-react";
import { format } from "date-fns";

export default function TestRuns() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [testRuns, setTestRuns] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    project_id: "",
    scheduled_date: "",
  });

  useEffect(() => {
    fetchProjects();
    fetchTestRuns();
  }, []);

  const fetchProjects = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .eq("owner_id", user.id)
      .order("name");

    if (!error && data) {
      setProjects(data);
    }
  };

  const fetchTestRuns = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("test_runs")
        .select(`
          *,
          projects (name),
          test_executions (id, status)
        `)
        .order("created_at", { ascending: false });

      if (!error && data) {
        setTestRuns(data);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("test_runs").insert({
      ...formData,
      created_by: user.id,
      scheduled_date: formData.scheduled_date || null,
    });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Test run created successfully" });
      setDialogOpen(false);
      setFormData({ name: "", description: "", project_id: "", scheduled_date: "" });
      fetchTestRuns();
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("test_runs").delete().eq("id", id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Test run deleted successfully" });
      fetchTestRuns();
    }
  };

  const handleStart = async (id: string) => {
    const { error } = await supabase
      .from("test_runs")
      .update({ started_at: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Test run started" });
      navigate(`/test-runs/${id}`);
    }
  };

  const getRunProgress = (run: any) => {
    const executions = run.test_executions || [];
    if (executions.length === 0) return { total: 0, completed: 0, passed: 0 };
    
    const completed = executions.filter((e: any) => 
      ['passed', 'failed', 'blocked', 'skipped'].includes(e.status)
    ).length;
    const passed = executions.filter((e: any) => e.status === 'passed').length;
    
    return { total: executions.length, completed, passed };
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Test Runs</h1>
          <p className="text-muted-foreground">Schedule and execute test runs</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Test Run
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Test Run</DialogTitle>
              <DialogDescription>Create a new test run to execute test cases</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Name</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Sprint 1 Regression Tests"
                />
              </div>
              <div>
                <Label>Project</Label>
                <Select value={formData.project_id} onValueChange={(value) => setFormData({ ...formData, project_id: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select project" />
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
              <div>
                <Label>Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Test run description"
                />
              </div>
              <div>
                <Label>Scheduled Date (Optional)</Label>
                <Input
                  type="datetime-local"
                  value={formData.scheduled_date}
                  onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleCreate}>Create</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {testRuns.map((run) => {
          const progress = getRunProgress(run);
          const progressPercent = progress.total > 0 ? (progress.completed / progress.total) * 100 : 0;
          
          return (
            <Card key={run.id} className="cursor-pointer hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{run.name}</CardTitle>
                    <CardDescription>{run.projects?.name}</CardDescription>
                  </div>
                  <Button variant="ghost" size="icon" onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(run.id);
                  }}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {run.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">{run.description}</p>
                )}
                
                {run.scheduled_date && (
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Calendar className="mr-2 h-4 w-4" />
                    {format(new Date(run.scheduled_date), "PPp")}
                  </div>
                )}

                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>Progress</span>
                    <span>{progress.completed}/{progress.total}</span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2">
                    <div 
                      className="bg-primary h-2 rounded-full transition-all" 
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>

                {progress.total > 0 && (
                  <div className="flex gap-4 text-sm">
                    <span className="text-green-600 flex items-center">
                      <CheckCircle className="mr-1 h-3 w-3" />
                      {progress.passed} passed
                    </span>
                  </div>
                )}

                <div className="flex gap-2">
                  {!run.started_at ? (
                    <Button size="sm" className="w-full" onClick={() => handleStart(run.id)}>
                      <Play className="mr-2 h-4 w-4" />
                      Start Run
                    </Button>
                  ) : (
                    <Button size="sm" className="w-full" variant="outline" onClick={() => navigate(`/test-runs/${run.id}`)}>
                      View Details
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {testRuns.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No test runs yet. Create your first test run to get started.</p>
        </div>
      )}
    </div>
  );
}