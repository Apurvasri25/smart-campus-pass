
-- ENUMS
CREATE TYPE public.app_role AS ENUM ('student','advisor','hod','dean','vp','security','admin');
CREATE TYPE public.leave_status AS ENUM ('pending','approved','rejected','escalated','cancelled');
CREATE TYPE public.approval_action AS ENUM ('approve','reject','escalate');
CREATE TYPE public.gate_direction AS ENUM ('exit','entry');

-- PROFILES
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  roll_number TEXT UNIQUE,
  email TEXT,
  phone TEXT,
  parent_phone TEXT,
  year INT,
  department TEXT,
  hostel_resident BOOLEAN DEFAULT FALSE,
  placement_eligible BOOLEAN DEFAULT FALSE,
  cgpa NUMERIC(3,2),
  attendance_pct NUMERIC(5,2),
  advisor_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- USER ROLES
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_staff(_user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = _user_id
    AND role IN ('advisor','hod','dean','vp','security','admin'))
$$;

-- LEAVE CATEGORIES
CREATE TABLE public.leave_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  max_days INT DEFAULT 7
);
GRANT SELECT ON public.leave_categories TO authenticated, anon;
GRANT ALL ON public.leave_categories TO service_role;
ALTER TABLE public.leave_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads categories" ON public.leave_categories FOR SELECT USING (true);

INSERT INTO public.leave_categories(name, description, max_days) VALUES
  ('Medical','Medical leave with documentation',15),
  ('Personal','Personal/family matters',5),
  ('Emergency','Urgent emergencies',7),
  ('Academic','Academic event/competition',7),
  ('Festival','Festival/cultural',3);

-- LEAVE REQUESTS
CREATE TABLE public.leave_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.leave_categories(id),
  reason TEXT NOT NULL,
  destination TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status public.leave_status NOT NULL DEFAULT 'pending',
  current_stage TEXT NOT NULL DEFAULT 'advisor',
  ai_risk_score INT,
  ai_risk_explanation TEXT,
  ai_is_emergency BOOLEAN DEFAULT FALSE,
  parent_call_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.leave_requests TO authenticated;
GRANT ALL ON public.leave_requests TO service_role;
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;

-- LEAVE SLOTS (multi-slot)
CREATE TABLE public.leave_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.leave_requests(id) ON DELETE CASCADE,
  slot_start TIMESTAMPTZ NOT NULL,
  slot_end TIMESTAMPTZ NOT NULL
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.leave_slots TO authenticated;
GRANT ALL ON public.leave_slots TO service_role;
ALTER TABLE public.leave_slots ENABLE ROW LEVEL SECURITY;

-- APPROVAL HISTORY
CREATE TABLE public.approval_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.leave_requests(id) ON DELETE CASCADE,
  approver_id UUID NOT NULL REFERENCES auth.users(id),
  stage TEXT NOT NULL,
  action public.approval_action NOT NULL,
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.approval_history TO authenticated;
GRANT ALL ON public.approval_history TO service_role;
ALTER TABLE public.approval_history ENABLE ROW LEVEL SECURITY;

-- GATE PASSES
CREATE TABLE public.gate_passes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL UNIQUE REFERENCES public.leave_requests(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id),
  qr_token TEXT NOT NULL UNIQUE,
  manual_code TEXT NOT NULL UNIQUE,
  valid_from TIMESTAMPTZ NOT NULL,
  valid_until TIMESTAMPTZ NOT NULL,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.gate_passes TO authenticated;
GRANT ALL ON public.gate_passes TO service_role;
ALTER TABLE public.gate_passes ENABLE ROW LEVEL SECURITY;

-- GATE LOGS
CREATE TABLE public.gate_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pass_id UUID NOT NULL REFERENCES public.gate_passes(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id),
  guard_id UUID REFERENCES auth.users(id),
  direction public.gate_direction NOT NULL,
  verified_via TEXT NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.gate_logs TO authenticated;
GRANT ALL ON public.gate_logs TO service_role;
ALTER TABLE public.gate_logs ENABLE ROW LEVEL SECURITY;

-- POLICIES
-- profiles
CREATE POLICY "users read own profile or staff reads all" ON public.profiles
FOR SELECT USING (id = auth.uid() OR public.is_staff(auth.uid()));
CREATE POLICY "users insert own profile" ON public.profiles
FOR INSERT WITH CHECK (id = auth.uid());
CREATE POLICY "users update own profile" ON public.profiles
FOR UPDATE USING (id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- user_roles
CREATE POLICY "user reads own roles" ON public.user_roles
FOR SELECT USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- leave_requests
CREATE POLICY "student reads own requests" ON public.leave_requests
FOR SELECT USING (student_id = auth.uid() OR public.is_staff(auth.uid()));
CREATE POLICY "student inserts own request" ON public.leave_requests
FOR INSERT WITH CHECK (student_id = auth.uid());
CREATE POLICY "student updates own pending or staff updates" ON public.leave_requests
FOR UPDATE USING (
  (student_id = auth.uid() AND status = 'pending')
  OR public.is_staff(auth.uid())
);

-- leave_slots
CREATE POLICY "slots follow parent request read" ON public.leave_slots
FOR SELECT USING (EXISTS(
  SELECT 1 FROM public.leave_requests r WHERE r.id = request_id
    AND (r.student_id = auth.uid() OR public.is_staff(auth.uid()))
));
CREATE POLICY "owner inserts slots" ON public.leave_slots
FOR INSERT WITH CHECK (EXISTS(
  SELECT 1 FROM public.leave_requests r WHERE r.id = request_id AND r.student_id = auth.uid()
));
CREATE POLICY "owner deletes pending slots" ON public.leave_slots
FOR DELETE USING (EXISTS(
  SELECT 1 FROM public.leave_requests r WHERE r.id = request_id
    AND r.student_id = auth.uid() AND r.status = 'pending'
));

-- approval_history
CREATE POLICY "history read by student or staff" ON public.approval_history
FOR SELECT USING (EXISTS(
  SELECT 1 FROM public.leave_requests r WHERE r.id = request_id
    AND (r.student_id = auth.uid() OR public.is_staff(auth.uid()))
));
CREATE POLICY "staff inserts history" ON public.approval_history
FOR INSERT WITH CHECK (public.is_staff(auth.uid()) AND approver_id = auth.uid());

-- gate_passes
CREATE POLICY "student or staff reads passes" ON public.gate_passes
FOR SELECT USING (student_id = auth.uid() OR public.is_staff(auth.uid()));
CREATE POLICY "staff inserts passes" ON public.gate_passes
FOR INSERT WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "staff updates passes" ON public.gate_passes
FOR UPDATE USING (public.is_staff(auth.uid()));

-- gate_logs
CREATE POLICY "student or staff reads logs" ON public.gate_logs
FOR SELECT USING (student_id = auth.uid() OR public.is_staff(auth.uid()));
CREATE POLICY "security inserts logs" ON public.gate_logs
FOR INSERT WITH CHECK (
  public.has_role(auth.uid(),'security') OR public.has_role(auth.uid(),'admin')
);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.touch_updated_at() RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_requests_updated BEFORE UPDATE ON public.leave_requests
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Auto-create profile + default 'student' role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles(id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name','Student'), NEW.email);
  INSERT INTO public.user_roles(user_id, role)
  VALUES (NEW.id, COALESCE((NEW.raw_user_meta_data->>'role')::public.app_role,'student'));
  RETURN NEW;
END $$;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
