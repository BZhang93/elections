'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';

export type AddSourcesState = { error: string | null; added: number };

function normalize(raw: string): string | null {
  try {
    const url = new URL(raw.trim());
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
    return url.origin;
  } catch {
    return null;
  }
}

export async function addSources(_prev: AddSourcesState, formData: FormData): Promise<AddSourcesState> {
  const lines = String(formData.get('urls') ?? '')
    .split(/[\n,]/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length === 0) return { error: 'Enter at least one URL.', added: 0 };

  const normalized: string[] = [];
  for (const line of lines) {
    const origin = normalize(line);
    if (!origin) return { error: `"${line}" is not a valid http or https URL.`, added: 0 };
    if (!normalized.includes(origin)) normalized.push(origin);
  }

  const existing = await prisma.source.findMany({ where: { url: { in: normalized } } });
  const active = existing.find((s) => s.status !== 'archived');
  if (active) return { error: `${active.url} is already active`, added: 0 };

  for (const origin of normalized) {
    const archived = existing.find((s) => s.url === origin);
    if (archived) {
      await prisma.source.update({ where: { id: archived.id }, data: { status: 'active' } });
    } else {
      await prisma.source.create({ data: { url: origin, status: 'active' } });
    }
  }

  revalidatePath('/sources');
  return { error: null, added: normalized.length };
}

export async function setSourceStatus(formData: FormData) {
  const id = String(formData.get('id'));
  const status = String(formData.get('status'));
  if (status !== 'active' && status !== 'disabled' && status !== 'archived') throw new Error('Invalid status');
  await prisma.source.update({ where: { id }, data: { status } });
  revalidatePath('/sources');
}

export async function deleteSource(formData: FormData) {
  const id = String(formData.get('id'));
  await prisma.source.delete({ where: { id } });
  revalidatePath('/sources');
}
