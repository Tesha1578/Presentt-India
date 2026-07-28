/**
 * Lead file attachments — Supabase Storage (public bucket `lead-files`,
 * objects prefixed per lead). One-time setup SQL (run once in the Supabase
 * SQL Editor):
 *
 *   insert into storage.buckets (id, name, public)
 *   values ('lead-files','lead-files', true) on conflict (id) do nothing;
 */
import { supabase } from "@/lib/supabase";

const BUCKET = "lead-files";

export interface StoredFile {
  name: string;
  size: number;
  createdAt: Date;
  url: string;
}

export async function listLeadFiles(leadId: number): Promise<StoredFile[]> {
  const prefix = `lead-${leadId}`;
  const { data, error } = await supabase.storage.from(BUCKET).list(prefix, {
    limit: 100,
    sortBy: { column: "created_at", order: "desc" },
  });
  if (error) throw new Error(error.message);
  return (data ?? [])
    .filter((f) => f.name && !f.name.endsWith("/"))
    .map((f) => {
      const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(`${prefix}/${f.name}`);
      return {
        name: f.name,
        size: (f.metadata?.size as number) ?? 0,
        createdAt: f.created_at ? new Date(f.created_at) : new Date(),
        url: pub.publicUrl,
      };
    });
}

export async function uploadLeadFile(leadId: number, file: File): Promise<StoredFile> {
  const safeName = file.name.replace(/[^\w.\-() ]+/g, "_");
  const path = `lead-${leadId}/${Date.now()}-${safeName}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw new Error(error.message);
  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return {
    name: safeName,
    size: file.size,
    createdAt: new Date(),
    url: pub.publicUrl,
  };
}
