import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2, Plus, Trash2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface TestStep {
  id: string;
  step_number: number;
  action: string;
  expected_result: string;
}

export default function TestCaseDetail() {
  const { id: projectId, planId, suiteId, caseId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [preconditions, setPreconditions] = useState("");
  const [expectedResult, setExpectedResult] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high" | "critical">("medium");
  const [status, setStatus] = useState<"draft" | "ready" | "deprecated">("draft");
  const [steps, setSteps] = useState<TestStep[]>([]);
  const [newStepAction, setNewStepAction] = useState("");
  const [newStepExpected, setNewStepExpected] = useState("");

  const isNewCase = caseId === "new";

  useEffect(() => {
    if (!isNewCase) {
      fetchTestCase();
      fetchTestSteps();
    } else {
      setLoading(false);
    }
  }, [caseId]);

  const fetchTestCase = async () => {
    try {
      const { data, error } = await supabase
        .from("test_cases")
        .select("*")
        .eq("id", caseId)
        .single();

      if (error) throw error;

      setName(data.name);
      setDescription(data.description || "");
      setPreconditions(data.preconditions || "");
      setExpectedResult(data.expected_result);
      setPriority(data.priority);
      setStatus(data.status);
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

  const fetchTestSteps = async () => {
    try {
      const { data, error } = await supabase
        .from("test_steps")
        .select("*")
        .eq("test_case_id", caseId)
        .order("step_number");

      if (error) throw error;
      setSteps(data || []);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  };

  const handleSave = async () => {
    if (!name.trim() || !expectedResult.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Name and expected result are required",
      });
      return;
    }

    setSaving(true);
    try {
      if (isNewCase) {
        const { data, error } = await supabase
          .from("test_cases")
          .insert({
            test_suite_id: suiteId,
            name,
            description,
            preconditions,
            expected_result: expectedResult,
            priority,
            status,
            created_by: user?.id,
          })
          .select()
          .single();

        if (error) throw error;
        toast({ title: "Test case created successfully" });
        navigate(`/projects/${projectId}/test-plans/${planId}/suites/${suiteId}/cases/${data.id}`);
      } else {
        const { error } = await supabase
          .from("test_cases")
          .update({
            name,
            description,
            preconditions,
            expected_result: expectedResult,
            priority,
            status,
          })
          .eq("id", caseId);

        if (error) throw error;
        toast({ title: "Test case updated successfully" });
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleAddStep = async () => {
    if (!newStepAction.trim() || !newStepExpected.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Action and expected result are required",
      });
      return;
    }

    if (isNewCase) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please save the test case before adding steps",
      });
      return;
    }

    try {
      const nextStepNumber = steps.length > 0 ? Math.max(...steps.map(s => s.step_number)) + 1 : 1;

      const { error } = await supabase
        .from("test_steps")
        .insert({
          test_case_id: caseId,
          step_number: nextStepNumber,
          action: newStepAction,
          expected_result: newStepExpected,
        });

      if (error) throw error;

      setNewStepAction("");
      setNewStepExpected("");
      fetchTestSteps();
      toast({ title: "Step added successfully" });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  };

  const handleDeleteStep = async (stepId: string) => {
    try {
      const { error } = await supabase
        .from("test_steps")
        .delete()
        .eq("id", stepId);

      if (error) throw error;
      fetchTestSteps();
      toast({ title: "Step deleted successfully" });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/projects/${projectId}/test-plans/${planId}/suites/${suiteId}`)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-3xl font-bold flex-1">
          {isNewCase ? "New Test Case" : "Edit Test Case"}
        </h1>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          {isNewCase ? "Create" : "Save Changes"}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="name">Test Case Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Verify user can login with valid credentials"
            />
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detailed description of what this test case covers"
              rows={3}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="priority">Priority</Label>
              <Select value={priority} onValueChange={(value: any) => setPriority(value)}>
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
              <Label htmlFor="status">Status</Label>
              <Select value={status} onValueChange={(value: any) => setStatus(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="ready">Ready</SelectItem>
                  <SelectItem value="deprecated">Deprecated</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label htmlFor="preconditions">Preconditions</Label>
            <Textarea
              id="preconditions"
              value={preconditions}
              onChange={(e) => setPreconditions(e.target.value)}
              placeholder="What needs to be true before executing this test"
              rows={2}
            />
          </div>
          <div>
            <Label htmlFor="expectedResult">Expected Result *</Label>
            <Textarea
              id="expectedResult"
              value={expectedResult}
              onChange={(e) => setExpectedResult(e.target.value)}
              placeholder="What should happen when the test passes"
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {!isNewCase && (
        <Card>
          <CardHeader>
            <CardTitle>Test Steps</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {steps.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">#</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Expected Result</TableHead>
                    <TableHead className="w-16"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {steps.map((step) => (
                    <TableRow key={step.id}>
                      <TableCell>{step.step_number}</TableCell>
                      <TableCell>{step.action}</TableCell>
                      <TableCell>{step.expected_result}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteStep(step.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            <div className="space-y-4 pt-4 border-t">
              <h3 className="font-semibold">Add New Step</h3>
              <div>
                <Label htmlFor="stepAction">Action</Label>
                <Textarea
                  id="stepAction"
                  value={newStepAction}
                  onChange={(e) => setNewStepAction(e.target.value)}
                  placeholder="What action to perform"
                  rows={2}
                />
              </div>
              <div>
                <Label htmlFor="stepExpected">Expected Result</Label>
                <Textarea
                  id="stepExpected"
                  value={newStepExpected}
                  onChange={(e) => setNewStepExpected(e.target.value)}
                  placeholder="What should happen"
                  rows={2}
                />
              </div>
              <Button onClick={handleAddStep}>
                <Plus className="h-4 w-4 mr-2" />
                Add Step
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
