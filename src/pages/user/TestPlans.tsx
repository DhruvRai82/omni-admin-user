import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus, FolderOpen, Loader2, Search, Trash2, Edit } from "lucide-react";

interface TestPlan {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  suite_count?: number;
}

export default function TestPlans() {
  const { id: projectId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [testPlans, setTestPlans] = useState<TestPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<TestPlan | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchTestPlans();
  }, [projectId]);

  const fetchTestPlans = async () => {
    try {
      const { data, error } = await supabase
        .from("test_plans")
        .select(`
          *,
          test_suites (count)
        `)
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const plansWithCount = data?.map(plan => ({
        ...plan,
        suite_count: plan.test_suites?.[0]?.count || 0
      }));

      setTestPlans(plansWithCount || []);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please enter a test plan name",
      });
      return;
    }

    try {
      if (editingPlan) {
        const { error } = await supabase
          .from("test_plans")
          .update({ name, description })
          .eq("id", editingPlan.id);

        if (error) throw error;
        toast({ title: "Test plan updated successfully" });
      } else {
        const { error } = await supabase
          .from("test_plans")
          .insert({
            project_id: projectId,
            name,
            description,
            created_by: user?.id,
          });

        if (error) throw error;
        toast({ title: "Test plan created successfully" });
      }

      setDialogOpen(false);
      setName("");
      setDescription("");
      setEditingPlan(null);
      fetchTestPlans();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  };

  const handleDelete = async (planId: string) => {
    if (!confirm("Are you sure you want to delete this test plan? All test suites and cases will be deleted.")) {
      return;
    }

    try {
      const { error } = await supabase
        .from("test_plans")
        .delete()
        .eq("id", planId);

      if (error) throw error;
      toast({ title: "Test plan deleted successfully" });
      fetchTestPlans();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  };

  const handleEdit = (plan: TestPlan) => {
    setEditingPlan(plan);
    setName(plan.name);
    setDescription(plan.description || "");
    setDialogOpen(true);
  };

  const filteredPlans = testPlans.filter(plan =>
    plan.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    plan.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Test Plans</h1>
          <p className="text-muted-foreground">Organize your test cases into plans and suites</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              setEditingPlan(null);
              setName("");
              setDescription("");
            }}>
              <Plus className="h-4 w-4 mr-2" />
              New Test Plan
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingPlan ? "Edit" : "Create"} Test Plan</DialogTitle>
              <DialogDescription>
                {editingPlan ? "Update the test plan details" : "Create a new test plan to organize your test suites"}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Release 1.0 Testing"
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the purpose of this test plan"
                  rows={4}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave}>
                {editingPlan ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search test plans..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {filteredPlans.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FolderOpen className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">
              {searchQuery ? "No test plans found matching your search" : "No test plans yet. Create your first test plan to get started!"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredPlans.map((plan) => (
            <Card key={plan.id} className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1" onClick={() => navigate(`/projects/${projectId}/test-plans/${plan.id}`)}>
                    <CardTitle className="text-xl">{plan.name}</CardTitle>
                    <CardDescription className="mt-2 line-clamp-2">
                      {plan.description || "No description"}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(plan);
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(plan.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent onClick={() => navigate(`/projects/${projectId}/test-plans/${plan.id}`)}>
                <div className="text-sm text-muted-foreground">
                  {plan.suite_count} test suite{plan.suite_count !== 1 ? 's' : ''}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
