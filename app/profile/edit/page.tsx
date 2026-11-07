import { requireUser } from '@/lib/auth';
import { CITIES } from '@/lib/util';
import { updateProfile } from '@/app/actions';
import { SubmitButton } from '@/components/client';
import Icon from '@/components/Icon';

export default async function EditProfile({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const me = await requireUser();
  const welcome = (await searchParams).welcome;
  return (
    <main className="page" style={{ maxWidth: 820 }}>
      <div className="page-header">
        <span className="icon-tile tile-navy"><Icon name="edit" /></span>
        <div><div className="eyebrow">Profile</div><h1>Edit your profile</h1></div>
      </div>
      {welcome && <div className="alert alert-info" style={{ marginBottom: '1rem' }}>Welcome to MeshLink, {me.name.split(' ')[0]}! Add your skills and city so the right people and jobs can find you.</div>}
      <form action={updateProfile} className="card card-body">
        <div className="form-grid">
          <div className="field"><label><span className="req">*</span>Full name</label><input name="name" className="input" defaultValue={me.name} required maxLength={80} /></div>
          <div className="field"><label>City</label><input name="city" className="input" list="cities" defaultValue={me.city} /><datalist id="cities">{CITIES.map((c) => <option key={c} value={c} />)}</datalist></div>
          <div className="field full"><label>Headline</label><input name="headline" className="input" defaultValue={me.headline} maxLength={160} placeholder="e.g. MuleSoft Developer | DataWeave enthusiast" /></div>
          <div className="field"><label>Role</label><input name="role" className="input" defaultValue={me.role} placeholder="MuleSoft Developer" /></div>
          <div className="field"><label>Company</label><input name="company" className="input" defaultValue={me.company} /></div>
          <div className="field"><label>Years of experience</label><input name="years_exp" type="number" min={0} max={60} className="input" defaultValue={me.years_exp} /></div>
          <div className="field"><label>Certifications</label><input name="certifications" className="input" defaultValue={me.certifications} placeholder="MCD Level 1, Platform Developer I" /></div>
          <div className="field full"><label>Skills (comma-separated)</label><input name="skills" className="input" defaultValue={(me.skills || []).join(', ')} placeholder="MuleSoft, DataWeave, Apex, LWC" /></div>
          <div className="field full"><label>About</label><textarea name="bio" className="input" rows={5} defaultValue={me.bio} maxLength={2000} /></div>
          <label className="checkbox"><input type="checkbox" name="open_to_work" defaultChecked={me.open_to_work} /> Open to work</label>
          <label className="checkbox"><input type="checkbox" name="hiring" defaultChecked={me.hiring} /> I&apos;m hiring</label>
        </div>
        <div className="row" style={{ justifyContent: 'flex-end', marginTop: '1rem' }}>
          <a href={`/profile/${me.id}`} className="btn">Cancel</a>
          <SubmitButton>Save</SubmitButton>
        </div>
      </form>
    </main>
  );
}
