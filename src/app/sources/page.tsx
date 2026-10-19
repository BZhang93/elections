import { prisma } from '@/lib/prisma';
import { setSourceStatus, deleteSource } from './actions';
import { AddSourceModal } from './AddSourceModal';

export default async function SourcesPage() {
  const sources = await prisma.source.findMany({ orderBy: { url: 'asc' } });
  const live = sources.filter((s) => s.status !== 'archived');
  const archived = sources.filter((s) => s.status === 'archived');

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Sources</h1>
          <p className="muted">Non-exclusive list of sources where data and information is accessed from.</p>
        </div>
        <AddSourceModal />
      </div>

      <section className="card">
        <h2>Active Sources</h2>
        {live.length === 0 ? <p className="muted">No active sources.</p> : null}
        <ul className="sources-list">
          {live.map((s) => (
            <li key={s.id}>
              <a href={s.url} target="_blank" rel="noopener noreferrer">{s.url}</a>
              {s.status === 'disabled' ? <span className="pill">Disabled</span> : null}
              <span className="row-actions">
                <form action={setSourceStatus}>
                  <input type="hidden" name="id" value={s.id} />
                  <input type="hidden" name="status" value={s.status === 'disabled' ? 'active' : 'disabled'} />
                  <button type="submit">{s.status === 'disabled' ? 'Enable' : 'Disable'}</button>
                </form>
                <form action={setSourceStatus}>
                  <input type="hidden" name="id" value={s.id} />
                  <input type="hidden" name="status" value="archived" />
                  <button type="submit">Archive</button>
                </form>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="card">
        <h2>Archived Sources</h2>
        {archived.length === 0 ? <p className="muted">No archived sources.</p> : null}
        <ul className="sources-list">
          {archived.map((s) => (
            <li key={s.id}>
              <a href={s.url} target="_blank" rel="noopener noreferrer">{s.url}</a>
              <span className="row-actions">
                <form action={setSourceStatus}>
                  <input type="hidden" name="id" value={s.id} />
                  <input type="hidden" name="status" value="active" />
                  <button type="submit">Unarchive</button>
                </form>
                <form action={deleteSource}>
                  <input type="hidden" name="id" value={s.id} />
                  <button type="submit">Delete</button>
                </form>
              </span>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
