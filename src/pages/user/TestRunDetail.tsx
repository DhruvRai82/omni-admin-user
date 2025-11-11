import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, Upload, AlertCircle } from "lucide-react";
import { format } from "date-fns";

export default function TestRunDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [testRun, setTestRun] = useState<any>(null);
  const [executions, setExecutions] = useState<any[]>([]);
  const [testCases, setTestCases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [addCaseDialog, setAddCaseDialog] = useState(false);
  const [selectedCase, setSelectedCase] = useState("");
  const [executionDialog, setExecutionDialog] = useState(false);
  const [currentExecution, setCurrentExecution] = useState<any>(null);
  const [executionForm, setExecutionForm] = useState({ status: "", notes: "" });

  useEffect(() => {
    fetchTestRun();
    fetchExecutions();
    fetchAvailableTestCases();
  }, [id]);

  const fetchTestRun = async () => {
    const { data, error } = await supabase
      .from("test_runs")
      .select("*, projects (name)")
      .eq("id", id)
      .single();

    if (!error && data) {
      setTestRun(data);
    }
    setLoading(false);
  };

  const fetchExecutions = async () => {
    const { data, error } = await supabase
      .from("test_executions")
      .select(`
        *,
        test_cases (name, priority),
        profiles!test_executions_executed_by_fkey (full_name, email)
      `)
      .eq("test_run_id", id)
      .order("created_at");

    if (!error && data) {
      setExecutions(data);
    }
  };

  const fetchAvailableTestCases = async () => {
    if (!testRun?.project_id) return;

    const { data, error } = await supabase
      .from("test_cases")
      .select(`
        *,
        test_suites (
          test_plans (project_id)
        )
      `);

    if (!error && data) {
      const filtered = data.filter((tc: any) => tc.test_suites?.test_plans?.project_id === testRun.project_id);
      setTestCases(filtered);
    }
  };

  const addTestCase = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !selectedCase) return;

    const { error } = await supabase.from("test_executions").insert({
      test_case_id: selectedCase,
      test_run_id: id,
      status: "in_progress",
    });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Test case added to run" });
      setAddCaseDialog(false);
      setSelectedCase("");
      fetchExecutions();
    }
  };

  const openExecutionDialog = (execution: any) => {
    setCurrentExecution(execution);
    setExecutionForm({ status: execution.status, notes: execution.notes || "" });
    setExecutionDialog(true);
  };

  const updateExecution = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !currentExecution) return;

    const { error } = await supabase
      .from("test_executions")
      .update({
        status: executionForm.status as any,
        notes: executionForm.notes,
        executed_by: user.id,
        execution_date: new Date().toISOString(),
      })
      .eq("id", currentExecution.id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Execution updated" });
      setExecutionDialog(false);
      fetchExecutions();
      
      // If failed, prompt to create bug
      if (executionForm.status === "failed") {
        navigate(`/bugs/new?execution_id=${currentExecution.id}&test_case_id=${currentExecution.test_case_id}`);
      }
    }
  };

  const completeRun = async () => {
    const { error } = await supabase
      .from("test_runs")
      .update({ completed_at: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Test run completed" });
      fetchTestRun();
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      passed: "bg-green-500",
      failed: "bg-red-500",
      blocked: "bg-yellow-500",
      skipped: "bg-gray-500",
      in_progress: "bg-blue-500",
    };
    return colors[status] || "bg-gray-500";
  };

  if (loading) return <div>Loading...</div>;
  if (!testRun) return <div>Test run not found</div>;

  const stats = {
    total: executions.length,
    passed: executions.filter(e => e.status === "passed").length,
    failed: executions.filter(e => e.status === "failed").length,
    blocked: executions.filter(e => e.status === "blocked").length,
    inProgress: executions.filter(e => e.status === "in_progress").length,
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/test-runs")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">{testRun.name}</h1>
          <p className="text-muted-foreground">{testRun.projects?.name}</p>
        </div>
        <Button onClick={() => setAddCaseDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Test Case
        </Button>
        {!testRun.completed_at && executions.length > 0 && (
          <Button variant="outline" onClick={completeRun}>
            Complete Run
          </Button>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-600">Passed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.passed}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-600">Failed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-yellow-600">Blocked</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.blocked}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-600">In Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.inProgress}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Test Executions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {executions.map((execution) => (
              <div
                key={execution.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent cursor-pointer"
                onClick={() => openExecutionDialog(execution)}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${getStatusColor(execution.status)}`} />
                  <div>
                    <p className="font-medium">{execution.test_cases?.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {execution.profiles?.full_name || "Unassigned"} • 
                      {execution.execution_date ? format(new Date(execution.execution_date), "PPp") : "Not executed"}
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className={execution.test_cases?.priority === "critical" ? "border-red-500" : ""}>
                  {execution.test_cases?.priority}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={addCaseDialog} onOpenChange={setAddCaseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Test Case</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Select value={selectedCase} onValueChange={setSelectedCase}>
              <SelectTrigger>
                <SelectValue placeholder="Select test case" />
              </SelectTrigger>
              <SelectContent>
                {testCases.map((tc) => (
                  <SelectItem key={tc.id} value={tc.id}>
                    {tc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={addTestCase} className="w-full">Add</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={executionDialog} onOpenChange={setExecutionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Execution</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Status</label>
              <Select value={executionForm.status} onValueChange={(value) => setExecutionForm({ ...executionForm, status: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="passed">Passed</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="blocked">Blocked</SelectItem>
                  <SelectItem value="skipped">Skipped</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Notes</label>
              <Textarea
                value={executionForm.notes}
                onChange={(e) => setExecutionForm({ ...executionForm, notes: e.target.value })}
                placeholder="Execution notes..."
              />
            </div>
            {executionForm.status === "failed" && (
              <div className="flex items-start gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div className="text-sm text-yellow-800 dark:text-yellow-200">
                  After saving, you'll be redirected to create a bug report for this failure.
                </div>
              </div>
            )}
            <Button onClick={updateExecution} className="w-full">Update</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}