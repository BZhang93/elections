'use client';

import { useActionState, useEffect, useState } from 'react';
import { addSources, AddSourcesState } from './actions';

const initial: AddSourcesState = { error: null, added: 0 };

export function AddSourceModal() {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(addSources, initial);

  useEffect(() => {
    if (state.added > 0 && !state.error) setOpen(false);
  }, [state]);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>Add Source</button>
      {open ? (
        <div className="modal-backdrop" role="presentation" onClick={() => setOpen(false)}>
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="add-source-title" onClick={(e) => e.stopPropagation()}>
            <h2 id="add-source-title">Add Sources</h2>
            <form action={formAction}>
              <label htmlFor="urls">One URL per line</label>
              <textarea id="urls" name="urls" rows={5} placeholder={'https://ballotpedia.org\nhttps://calmatters.org'} required />
              {state.error ? <p className="error" role="alert">{state.error}</p> : null}
              <div className="modal-actions">
                <button type="button" onClick={() => setOpen(false)}>Cancel</button>
                <button type="submit" disabled={pending}>{pending ? 'Adding...' : 'Add'}</button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
