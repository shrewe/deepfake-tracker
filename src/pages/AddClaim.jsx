import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useAsync from '../hooks/useAsync';
import * as api from '../services/api';
import { Card, Field, PageHeader, State } from '../components/UI';

const MEDIA = ['Text', 'Image', 'Video', 'Audio'];
const URL_RE = /^https?:\/\/[^\s/$.?#][^\s]*$/i;

export default function AddClaim() {
  const nav = useNavigate();
  const { data: platforms, loading, error, reload } = useAsync(api.getPlatformAnalytics, []);
  const [v, setV] = useState({ claim_text: '', username: '', media_type: 'Text', platform_id: '', evidence_url: '' });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const set = (k) => (e) => setV((p) => ({ ...p, [k]: e.target.value }));

  const validate = () => {
    const e = {};
    if (v.claim_text.trim().length < 15) e.claim_text = 'Describe the claim in at least 15 characters.';
    if (!/^@?[A-Za-z0-9_]{3,30}$/.test(v.username.trim())) e.username = 'Use 3 to 30 letters, numbers or underscores.';
    if (!v.platform_id) e.platform_id = 'Choose a platform.';
    if (v.evidence_url.trim() && !URL_RE.test(v.evidence_url.trim())) e.evidence_url = 'Enter a full link starting with http:// or https://.';
    return e;
  };
  const submit = async (ev) => {
    ev.preventDefault();
    const er = validate(); setErrors(er);
    if (Object.keys(er).length) return;
    setSaving(true); setSubmitError('');
    try { const c = await api.createClaim(v); nav(`/claims/${c.claim_id}`); }
    catch (e) { setSubmitError(e.message); setSaving(false); }
  };
  const a = (k) => ({ 'aria-invalid': !!errors[k], 'aria-describedby': errors[k] ? `${k}-err` : undefined });

  return (
    <>
      <PageHeader title="Add claim" text="New claims are saved as Unverified until a fact-check report exists." />
      <Card className="max-w-2xl">
        <State loading={loading} error={error} onRetry={reload}>
          <form onSubmit={submit} noValidate className="space-y-4">
            <Field label="Claim text" id="claim_text" error={errors.claim_text}>
              <textarea id="claim_text" rows={4} className="input" value={v.claim_text} onChange={set('claim_text')} {...a('claim_text')} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Source username" id="username" error={errors.username} hint="Example: @demo_account"><input id="username" className="input" value={v.username} onChange={set('username')} {...a('username')} /></Field>
              <Field label="Media type" id="media_type"><select id="media_type" className="input" value={v.media_type} onChange={set('media_type')}>{MEDIA.map((m) => <option key={m}>{m}</option>)}</select></Field>
            </div>
            <Field label="Platform" id="platform_id" error={errors.platform_id}>
              <select id="platform_id" className="input" value={v.platform_id} onChange={set('platform_id')} {...a('platform_id')}>
                <option value="">Select a platform</option>{(platforms || []).map((p) => <option key={p.platform_id} value={p.platform_id}>{p.platform_name}</option>)}
              </select>
            </Field>
            <Field label="Evidence URL (optional)" id="evidence_url" error={errors.evidence_url}><input id="evidence_url" className="input" value={v.evidence_url} onChange={set('evidence_url')} placeholder="https://" {...a('evidence_url')} /></Field>
            {submitError && <p role="alert" className="text-sm text-red-400">{submitError}</p>}
            <div className="flex gap-3"><button className="btn" disabled={saving}>{saving ? 'Saving…' : 'Add claim'}</button><Link to="/claims" className="btn-ghost">Cancel</Link></div>
          </form>
        </State>
      </Card>
    </>
  );
}
