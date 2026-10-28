import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Info, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Field } from '../components/UI';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function Shell({ title, subtitle, children, footer }) {
  const { user, start } = useAuth();
  const nav = useNavigate();
  if (user) return <Navigate to="/" replace />;
  return (
    <div className="grid min-h-screen place-items-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center gap-2"><ShieldCheck className="h-7 w-7 text-indigo-400" aria-hidden /><span className="text-lg font-semibold text-white">Deepfake &amp; Misinformation Trend Tracker</span></div>
        <div className="rounded-2xl border border-slate-800 bg-ink-800 p-6 shadow-xl">
          <h1 className="text-xl font-semibold text-white">{title}</h1>
          <p className="mt-1 text-sm text-slate-400">{subtitle}</p>
          <div className="mt-4 flex gap-2 rounded-lg border border-indigo-500/30 bg-indigo-500/10 p-3 text-xs text-indigo-200">
            <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <p><b>Demo mode.</b> No account is created and no password is stored or sent anywhere. This is a front-end simulation, not secure authentication.</p>
          </div>
          {children}
          <div className="my-4 flex items-center gap-3 text-xs text-slate-500"><span className="h-px flex-1 bg-slate-800" />or<span className="h-px flex-1 bg-slate-800" /></div>
          <button type="button" className="btn-ghost w-full" onClick={() => { start({ name: 'Demo Reviewer', email: 'demo@tracker.example' }); nav('/', { replace: true }); }}>Enter with demo account</button>
        </div>
        <p className="mt-4 text-center text-sm text-slate-400">{footer}</p>
      </div>
    </div>
  );
}

function Password({ id, value, onChange, error, auto }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input id={id} type={show ? 'text' : 'password'} className="input pr-10" value={value} onChange={onChange} autoComplete={auto}
        aria-invalid={!!error} aria-describedby={error ? `${id}-err` : undefined} />
      <button type="button" onClick={() => setShow(!show)} className="absolute right-2 top-2 text-slate-400 hover:text-slate-200" aria-label={show ? 'Hide password' : 'Show password'}>
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

function useForm(initial, validate, onValid) {
  const [v, setV] = useState(initial);
  const [errors, setErrors] = useState({});
  const set = (k) => (e) => setV((p) => ({ ...p, [k]: e.target.value }));
  const submit = (e) => { e.preventDefault(); const er = validate(v); setErrors(er); if (!Object.keys(er).length) onValid(v); };
  return { v, set, errors, submit };
}

export function SignIn() {
  const { start } = useAuth();
  const nav = useNavigate();
  const from = useLocation().state?.from || '/';
  const f = useForm({ email: '', password: '' }, (v) => {
    const e = {};
    if (!v.email.trim()) e.email = 'Enter your email.'; else if (!EMAIL.test(v.email)) e.email = 'Enter a valid email, like name@example.com.';
    if (!v.password) e.password = 'Enter your password.';
    return e;
  }, (v) => { start({ name: v.email.split('@')[0], email: v.email }); nav(from, { replace: true }); });
  return (
    <Shell title="Sign in" subtitle="Access the claims and fact-check dashboard." footer={<>New here? <Link className="text-indigo-300 hover:underline" to="/signup">Create an account</Link></>}>
      <form onSubmit={f.submit} noValidate className="mt-4 space-y-4">
        <Field label="Email" id="email" error={f.errors.email}>
          <input id="email" type="email" className="input" value={f.v.email} onChange={f.set('email')} autoComplete="email" aria-invalid={!!f.errors.email} aria-describedby={f.errors.email ? 'email-err' : undefined} />
        </Field>
        <Field label="Password" id="password" error={f.errors.password}><Password id="password" value={f.v.password} onChange={f.set('password')} error={f.errors.password} auto="current-password" /></Field>
        <button className="btn w-full" type="submit">Sign in</button>
      </form>
    </Shell>
  );
}

export function SignUp() {
  const { start } = useAuth();
  const nav = useNavigate();
  const f = useForm({ name: '', email: '', password: '', confirm: '' }, (v) => {
    const e = {};
    if (!v.name.trim()) e.name = 'Enter your full name.';
    if (!v.email.trim()) e.email = 'Enter your email.'; else if (!EMAIL.test(v.email)) e.email = 'Enter a valid email, like name@example.com.';
    if (!v.password) e.password = 'Choose a password.'; else if (v.password.length < 8) e.password = 'Use at least 8 characters.';
    if (!v.confirm) e.confirm = 'Confirm your password.'; else if (v.confirm !== v.password) e.confirm = 'Passwords do not match.';
    return e;
  }, (v) => { start({ name: v.name.trim(), email: v.email }); nav('/', { replace: true }); });
  return (
    <Shell title="Create account" subtitle="Set up a demo profile to explore the tracker." footer={<>Already registered? <Link className="text-indigo-300 hover:underline" to="/signin">Sign in</Link></>}>
      <form onSubmit={f.submit} noValidate className="mt-4 space-y-4">
        <Field label="Full name" id="name" error={f.errors.name}><input id="name" className="input" value={f.v.name} onChange={f.set('name')} autoComplete="name" aria-invalid={!!f.errors.name} aria-describedby={f.errors.name ? 'name-err' : undefined} /></Field>
        <Field label="Email" id="email" error={f.errors.email}><input id="email" type="email" className="input" value={f.v.email} onChange={f.set('email')} autoComplete="email" aria-invalid={!!f.errors.email} aria-describedby={f.errors.email ? 'email-err' : undefined} /></Field>
        <Field label="Password" id="password" error={f.errors.password}><Password id="password" value={f.v.password} onChange={f.set('password')} error={f.errors.password} auto="new-password" /></Field>
        <Field label="Confirm password" id="confirm" error={f.errors.confirm}><Password id="confirm" value={f.v.confirm} onChange={f.set('confirm')} error={f.errors.confirm} auto="new-password" /></Field>
        <button className="btn w-full" type="submit">Create account</button>
      </form>
    </Shell>
  );
}
