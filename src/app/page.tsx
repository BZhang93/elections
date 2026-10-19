import Link from 'next/link';
import { prisma } from '@/lib/prisma';

export default async function HomePage() {
  const positions = await prisma.position.findMany({ orderBy: { title: 'asc' } });

  return (
    <>
      <h1>2026 Races</h1>
      {positions.length === 0 ? <p className="muted">No races loaded yet.</p> : null}
      {positions.map((p) => (
        <div key={p.id} className="card">
          <h2>
            <Link href={`/races/${p.slug}`}>{p.title}</Link>
          </h2>
          <span className="muted">{p.jurisdiction}</span>
        </div>
      ))}
    </>
  );
}
