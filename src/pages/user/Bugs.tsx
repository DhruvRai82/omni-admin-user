import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Bug } from "lucide-react";
import { format } from "date-fns";

export default function Bugs() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [bugs, setBugs] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterSeverity, setFilterSeverity] = useState<string>("all");
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    project_id: "",
    severity: "medium",
    test_execution_id: searchParams.get("execution_id") || "",
    test_case_id: searchParams.get("test_case_id") || "",
  });

  useEffect(() => {
    fetchProjects();
    fetchBugs();
    
    // Auto-open dialog if coming from failed execution
    if (searchParams.get("execution_id")) {
      setDialogOpen(true);
    }
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

  const fetchBugs = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("bugs")
        .select(`
          *,
          projects (name),
          test_cases (name),
          profiles!bugs_reported_by_fkey (full_name, email)
        `)
        .order("created_at", { ascending: false });

      if (!error && data) {
        setBugs(data);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("bugs").insert([{
      title: formData.title,
      description: formData.description,
      project_id: formData.project_id,
      severity: formData.severity as any,
      reported_by: user.id,
      test_execution_id: formData.test_execution_id || null,
      test_case_id: formData.test_case_id || null,
    }]);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Bug reported successfully" });
      setDialogOpen(false);
      setFormData({
        title: "",
        description: "",
        project_id: "",
        severity: "medium",
        test_execution_id: "",
        test_case_id: "",
      });
      fetchBugs();
    }
  };

  const getSeverityColor = (severity: string): "default" | "destructive" | "outline" | "secondary" => {
    const colors: Record<string, "default" | "destructive" | "outline" | "secondary"> = {
      critical: "destructive",
      high: "default",
      medium: "secondary",
      low: "outline",
    };
    return colors[severity] || "outline";
  };

  const getStatusColor = (status: string): "default" | "destructive" | "outline" | "secondary" => {
    const colors: Record<string, "default" | "destructive" | "outline" | "secondary"> = {
      open: "destructive",
      in_progress: "default",
      resolved: "secondary",
      closed: "outline",
      reopened: "destructive",
    };
    return colors[status] || "outline";
  };

  const filteredBugs = bugs.filter(bug => {
    const matchesSearch = bug.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         bug.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === "all" || bug.status === filterStatus;
    const matchesSeverity = filterSeverity === "all" || bug.severity === filterSeverity;
    return matchesSearch && matchesStatus && matchesSeverity;
  });

  if (loading) return <div>Loading...</div>;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Bug Tracking</h1>
          <p className="text-muted-foreground">Track and manage defects</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Report Bug
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Report Bug</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Title</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Brief description of the bug"
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
                <Label>Severity</Label>
                <Select value={formData.severity} onValueChange={(value) => setFormData({ ...formData, severity: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Detailed description, steps to reproduce, expected vs actual behavior..."
                  rows={6}
                />
              </div>
              <Button onClick={handleCreate} className="w-full">Report Bug</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search bugs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterSeverity} onValueChange={setFilterSeverity}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Severity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Severity</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        {filteredBugs.map((bug) => (
          <Card key={bug.id} className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate(`/bugs/${bug.id}`)}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  <Bug className="h-5 w-5 text-red-500 mt-1" />
                  <div className="flex-1">
                    <CardTitle className="text-lg">{bug.title}</CardTitle>
                    <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                      <span>{bug.projects?.name}</span>
                      {bug.test_cases && (
                        <>
                          <span>•</span>
                          <span>{bug.test_cases.name}</span>
                        </>
                      )}
                      <span>•</span>
                      <span>{format(new Date(bug.created_at), "PPp")}</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Badge variant={getSeverityColor(bug.severity)}>
                    {bug.severity}
                  </Badge>
                  <Badge variant={getStatusColor(bug.status)}>
                    {bug.status.replace('_', ' ')}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            {bug.description && (
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-2">{bug.description}</p>
              </CardContent>
            )}
          </Card>
        ))}
      </div>

      {filteredBugs.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No bugs found matching your criteria.</p>
        </div>
      )}
    </div>
  );
}