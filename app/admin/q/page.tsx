"use server";
import getSupabaseServerComponentClient from "@/clients/server-component-client";
import configuration from "@/configuration";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function PrintQueuePage() {
  const supabase = getSupabaseServerComponentClient();
  const { data: queues, error } = await supabase
    .from("print_queues")
    .select("*")
    .order("created_at", { ascending: false });

  if (error || !queues) notFound();

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Print Queues</h1>
      <div className="grid gap-4">
        {queues.map((queue) => (
          <Link
            key={queue.id}
            href={configuration.paths.admin.q(queue.id)}
            className="p-4 border rounded hover:bg-accent"
          >
            <div>Queue #{queue.id.slice(0, 8)}</div>
            <div className="text-sm text-muted-foreground">
              Created: {new Date(queue.created_at!).toLocaleString()}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
