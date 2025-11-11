-- Create enums for test execution and bug tracking
CREATE TYPE public.execution_status AS ENUM ('passed', 'failed', 'blocked', 'skipped', 'in_progress');
CREATE TYPE public.bug_status AS ENUM ('open', 'in_progress', 'resolved', 'closed', 'reopened');
CREATE TYPE public.bug_severity AS ENUM ('low', 'medium', 'high', 'critical');

-- Test Runs table (groups test case executions together)
CREATE TABLE public.test_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  scheduled_date TIMESTAMP WITH TIME ZONE,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Test Executions table (individual test case execution records)
CREATE TABLE public.test_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_case_id UUID NOT NULL REFERENCES public.test_cases(id) ON DELETE CASCADE,
  test_run_id UUID REFERENCES public.test_runs(id) ON DELETE CASCADE,
  status public.execution_status NOT NULL DEFAULT 'in_progress',
  assigned_to UUID,
  executed_by UUID,
  execution_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  duration_seconds INTEGER,
  notes TEXT,
  screenshots JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Bugs/Defects table
CREATE TABLE public.bugs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  test_execution_id UUID REFERENCES public.test_executions(id) ON DELETE SET NULL,
  test_case_id UUID REFERENCES public.test_cases(id) ON DELETE SET NULL,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  status public.bug_status NOT NULL DEFAULT 'open',
  severity public.bug_severity NOT NULL DEFAULT 'medium',
  reported_by UUID NOT NULL,
  assigned_to UUID,
  attachments JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  resolved_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.test_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bugs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for test_runs
CREATE POLICY "Users can view own test runs"
  ON public.test_runs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = test_runs.project_id
      AND projects.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own test runs"
  ON public.test_runs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = test_runs.project_id
      AND projects.owner_id = auth.uid()
    )
    AND auth.uid() = created_by
  );

CREATE POLICY "Users can update own test runs"
  ON public.test_runs FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = test_runs.project_id
      AND projects.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own test runs"
  ON public.test_runs FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = test_runs.project_id
      AND projects.owner_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all test runs"
  ON public.test_runs FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for test_executions
CREATE POLICY "Users can view own test executions"
  ON public.test_executions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.test_cases
      JOIN public.test_suites ON test_suites.id = test_cases.test_suite_id
      JOIN public.test_plans ON test_plans.id = test_suites.test_plan_id
      JOIN public.projects ON projects.id = test_plans.project_id
      WHERE test_cases.id = test_executions.test_case_id
      AND projects.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own test executions"
  ON public.test_executions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.test_cases
      JOIN public.test_suites ON test_suites.id = test_cases.test_suite_id
      JOIN public.test_plans ON test_plans.id = test_suites.test_plan_id
      JOIN public.projects ON projects.id = test_plans.project_id
      WHERE test_cases.id = test_executions.test_case_id
      AND projects.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own test executions"
  ON public.test_executions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.test_cases
      JOIN public.test_suites ON test_suites.id = test_cases.test_suite_id
      JOIN public.test_plans ON test_plans.id = test_suites.test_plan_id
      JOIN public.projects ON projects.id = test_plans.project_id
      WHERE test_cases.id = test_executions.test_case_id
      AND projects.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own test executions"
  ON public.test_executions FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.test_cases
      JOIN public.test_suites ON test_suites.id = test_cases.test_suite_id
      JOIN public.test_plans ON test_plans.id = test_suites.test_plan_id
      JOIN public.projects ON projects.id = test_plans.project_id
      WHERE test_cases.id = test_executions.test_case_id
      AND projects.owner_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all test executions"
  ON public.test_executions FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for bugs
CREATE POLICY "Users can view own bugs"
  ON public.bugs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = bugs.project_id
      AND projects.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own bugs"
  ON public.bugs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = bugs.project_id
      AND projects.owner_id = auth.uid()
    )
    AND auth.uid() = reported_by
  );

CREATE POLICY "Users can update own bugs"
  ON public.bugs FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = bugs.project_id
      AND projects.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own bugs"
  ON public.bugs FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = bugs.project_id
      AND projects.owner_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all bugs"
  ON public.bugs FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Create triggers for updated_at
CREATE TRIGGER update_test_runs_updated_at
  BEFORE UPDATE ON public.test_runs
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_test_executions_updated_at
  BEFORE UPDATE ON public.test_executions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_bugs_updated_at
  BEFORE UPDATE ON public.bugs
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();