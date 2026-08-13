import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { listAllFeedback, updateFeedbackStatus, type FeedbackRow } from "@/lib/feedback.functions";

type StatusFilter = "all" | "new" | "reviewed" | "resolved";

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString();
}

export function FeedbackSection() {
  const fetchAll = useServerFn(listAllFeedback);
  const update = useServerFn(updateFeedbackStatus);
  const qc = useQueryClient();

  const [status, setStatus] = useState<StatusFilter>("all");
  const [page, setPage] = useState(1);
  const pageSize = 25;

  const { data, isLoading } = useQuery({
    queryKey: ["admin-feedback", status, page],
    queryFn: () => fetchAll({ data: { status, page, pageSize } }),
  });

  const mutation = useMutation({
    mutationFn: async (vars: { id: string; status: "new" | "reviewed" | "resolved"; adminNote?: string | null }) =>
      update({ data: { id: vars.id, status: vars.status, adminNote: vars.adminNote ?? null } }),
    onSuccess: () => {
      toast.success("Feedback updated");
      qc.invalidateQueries({ queryKey: ["admin-feedback"] });
    },
    onError: (e: Error) => toast.error("Update failed", { description: e.message }),
  });

  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / pageSize));
  const stats = data?.stats;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Total feedback</p>
          <p className="mt-1 font-display text-2xl font-bold">{stats?.total ?? 0}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Unreviewed</p>
          <p className="mt-1 font-display text-2xl font-bold">{stats?.newCount ?? 0}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Average rating</p>
          <p className="mt-1 font-display text-2xl font-bold">{stats?.avgRating ?? "—"}</p>
        </div>
      </div>

      <section className="rounded-xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-sm font-semibold">User feedback</h2>
          <Select
            value={status}
            onValueChange={(v) => {
              setStatus(v as StatusFilter);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="reviewed">Reviewed</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="mt-4 space-y-3">
          {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {!isLoading && (data?.rows ?? []).length === 0 && (
            <p className="text-sm text-muted-foreground">No feedback yet.</p>
          )}
          {(data?.rows ?? []).map((row) => (
            <FeedbackCard
              key={row.id}
              row={row}
              pending={mutation.isPending}
              onSave={(next, note) => mutation.mutate({ id: row.id, status: next, adminNote: note })}
            />
          ))}
        </div>
      </section>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          Page {page} of {totalPages}
        </span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </Button>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}

function FeedbackCard({
  row,
  pending,
  onSave,
}: {
  row: FeedbackRow;
  pending: boolean;
  onSave: (status: "new" | "reviewed" | "resolved", note: string | null) => void;
}) {
  const [note, setNote] = useState(row.admin_note ?? "");

  return (
    <article className="rounded-lg border border-border p-4">
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span className="rounded-full border border-border px-2 py-0.5 font-medium text-foreground">{row.category}</span>
        <span className="rounded-full border border-border px-2 py-0.5 capitalize">{row.status}</span>
        {row.rating ? <span>{row.rating}/5</span> : null}
        <span>{row.email ?? "anonymous"}</span>
        <span>{fmtDate(row.created_at)}</span>
        {row.page ? <span className="font-mono">{row.page}</span> : null}
      </div>
      <p className="mt-2 whitespace-pre-wrap text-sm">{row.message}</p>
      <Textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Internal note / reply to the user…"
        className="mt-3 min-h-16 text-sm"
        maxLength={2000}
      />
      <div className="mt-2 flex flex-wrap gap-2">
        <Button size="sm" variant="outline" disabled={pending} onClick={() => onSave("reviewed", note || null)}>
          Mark reviewed
        </Button>
        <Button size="sm" disabled={pending} onClick={() => onSave("resolved", note || null)}>
          Resolve
        </Button>
        <Button size="sm" variant="ghost" disabled={pending} onClick={() => onSave("new", note || null)}>
          Reopen
        </Button>
      </div>
    </article>
  );
}
