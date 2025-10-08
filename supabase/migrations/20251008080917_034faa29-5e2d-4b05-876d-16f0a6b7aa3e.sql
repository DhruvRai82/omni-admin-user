-- Allow users to create their own profile rows
CREATE POLICY "Users can insert own profile"
ON public.profiles
FOR INSERT
WITH CHECK (auth.uid() = id);

-- Allow admins to manage all integrations (insert, update, delete, select)
CREATE POLICY "Admins can manage all integrations"
ON public.app_integrations
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));