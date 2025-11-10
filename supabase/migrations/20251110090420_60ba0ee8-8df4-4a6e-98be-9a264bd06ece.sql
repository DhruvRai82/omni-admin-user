-- Create enum for test case priority
CREATE TYPE public.test_priority AS ENUM ('low', 'medium', 'high', 'critical');

-- Create enum for test case status
CREATE TYPE public.test_status AS ENUM ('draft', 'ready', 'deprecated');

-- Create test_plans table
CREATE TABLE public.test_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create test_suites table
CREATE TABLE public.test_suites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  test_plan_id UUID NOT NULL REFERENCES public.test_plans(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create test_cases table
CREATE TABLE public.test_cases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  test_suite_id UUID NOT NULL REFERENCES public.test_suites(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  preconditions TEXT,
  expected_result TEXT NOT NULL,
  priority test_priority NOT NULL DEFAULT 'medium',
  status test_status NOT NULL DEFAULT 'draft',
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create test_steps table
CREATE TABLE public.test_steps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  test_case_id UUID NOT NULL REFERENCES public.test_cases(id) ON DELETE CASCADE,
  step_number INTEGER NOT NULL,
  action TEXT NOT NULL,
  expected_result TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(test_case_id, step_number)
);

-- Enable RLS
ALTER TABLE public.test_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_suites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_steps ENABLE ROW LEVEL SECURITY;

-- RLS Policies for test_plans
CREATE POLICY "Users can view own test plans"
  ON public.test_plans FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = test_plans.project_id
      AND projects.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own test plans"
  ON public.test_plans FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = test_plans.project_id
      AND projects.owner_id = auth.uid()
    )
    AND auth.uid() = created_by
  );

CREATE POLICY "Users can update own test plans"
  ON public.test_plans FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = test_plans.project_id
      AND projects.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own test plans"
  ON public.test_plans FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = test_plans.project_id
      AND projects.owner_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all test plans"
  ON public.test_plans FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for test_suites
CREATE POLICY "Users can view own test suites"
  ON public.test_suites FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.test_plans
      JOIN public.projects ON projects.id = test_plans.project_id
      WHERE test_plans.id = test_suites.test_plan_id
      AND projects.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own test suites"
  ON public.test_suites FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.test_plans
      JOIN public.projects ON projects.id = test_plans.project_id
      WHERE test_plans.id = test_suites.test_plan_id
      AND projects.owner_id = auth.uid()
    )
    AND auth.uid() = created_by
  );

CREATE POLICY "Users can update own test suites"
  ON public.test_suites FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.test_plans
      JOIN public.projects ON projects.id = test_plans.project_id
      WHERE test_plans.id = test_suites.test_plan_id
      AND projects.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own test suites"
  ON public.test_suites FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.test_plans
      JOIN public.projects ON projects.id = test_plans.project_id
      WHERE test_plans.id = test_suites.test_plan_id
      AND projects.owner_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all test suites"
  ON public.test_suites FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for test_cases
CREATE POLICY "Users can view own test cases"
  ON public.test_cases FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.test_suites
      JOIN public.test_plans ON test_plans.id = test_suites.test_plan_id
      JOIN public.projects ON projects.id = test_plans.project_id
      WHERE test_suites.id = test_cases.test_suite_id
      AND projects.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own test cases"
  ON public.test_cases FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.test_suites
      JOIN public.test_plans ON test_plans.id = test_suites.test_plan_id
      JOIN public.projects ON projects.id = test_plans.project_id
      WHERE test_suites.id = test_cases.test_suite_id
      AND projects.owner_id = auth.uid()
    )
    AND auth.uid() = created_by
  );

CREATE POLICY "Users can update own test cases"
  ON public.test_cases FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.test_suites
      JOIN public.test_plans ON test_plans.id = test_suites.test_plan_id
      JOIN public.projects ON projects.id = test_plans.project_id
      WHERE test_suites.id = test_cases.test_suite_id
      AND projects.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own test cases"
  ON public.test_cases FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.test_suites
      JOIN public.test_plans ON test_plans.id = test_suites.test_plan_id
      JOIN public.projects ON projects.id = test_plans.project_id
      WHERE test_suites.id = test_cases.test_suite_id
      AND projects.owner_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all test cases"
  ON public.test_cases FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for test_steps
CREATE POLICY "Users can view own test steps"
  ON public.test_steps FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.test_cases
      JOIN public.test_suites ON test_suites.id = test_cases.test_suite_id
      JOIN public.test_plans ON test_plans.id = test_suites.test_plan_id
      JOIN public.projects ON projects.id = test_plans.project_id
      WHERE test_cases.id = test_steps.test_case_id
      AND projects.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own test steps"
  ON public.test_steps FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.test_cases
      JOIN public.test_suites ON test_suites.id = test_cases.test_suite_id
      JOIN public.test_plans ON test_plans.id = test_suites.test_plan_id
      JOIN public.projects ON projects.id = test_plans.project_id
      WHERE test_cases.id = test_steps.test_case_id
      AND projects.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own test steps"
  ON public.test_steps FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.test_cases
      JOIN public.test_suites ON test_suites.id = test_cases.test_suite_id
      JOIN public.test_plans ON test_plans.id = test_suites.test_plan_id
      JOIN public.projects ON projects.id = test_plans.project_id
      WHERE test_cases.id = test_steps.test_case_id
      AND projects.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own test steps"
  ON public.test_steps FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.test_cases
      JOIN public.test_suites ON test_suites.id = test_cases.test_suite_id
      JOIN public.test_plans ON test_plans.id = test_suites.test_plan_id
      JOIN public.projects ON projects.id = test_plans.project_id
      WHERE test_cases.id = test_steps.test_case_id
      AND projects.owner_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all test steps"
  ON public.test_steps FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create triggers for updated_at
CREATE TRIGGER update_test_plans_updated_at
  BEFORE UPDATE ON public.test_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_test_suites_updated_at
  BEFORE UPDATE ON public.test_suites
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_test_cases_updated_at
  BEFORE UPDATE ON public.test_cases
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_test_steps_updated_at
  BEFORE UPDATE ON public.test_steps
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();