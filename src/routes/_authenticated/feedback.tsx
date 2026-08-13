import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient, queryOptions } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, Loader2, MessageSquareHeart, Star } from "lucide-react";
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
import {
  FEEDBACK_CATEGORIES,
  listMyFeedback,
  submitFeedback,
  type FeedbackCategory,
  type FeedbackRow,
} from "@/lib/feedback.functions";

const CATEGORY_LABELS: Record<FeedbackCategory, string> = {
  general: "General feedback",
  bug: "Bug report",
  "feature-request": "Feature request",
  "ai-quality": "AI output quality",
  performance: "Performance",
  billing: "Billing & plans",
};

const myFeedbackQO = (fn: () => Promise<FeedbackRow[]>) =>
  queryOptions({ queryKey: ["my_feedback"], queryFn: fn });

export const Route = createFileRoute("/_authenticated/feedback")({
  head: () => ({
    meta: [
      { title: "Send Feedback · NetAssist AI" },
      { name: "description", content: "Share bugs, feature requests and AI output quality feedback with the NetAssist AI team." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: FeedbackPage,
});

function FeedbackPage() {
  const navigate = useNavigate();
  const send = useServerFn(submitFeedback);
  const list = useServerFn(listMyFeedback);
  const qc = useQueryClient();

  const [category, setCategory] = useState<FeedbackCategory>("general");
  const [rating, setRating] = useState<number | null>(null);
  const [message, setMessage] = useState("");

  const { data: mine, isLoading } = useQuery(myFeedbackQO(() => list()));

  const mutation = useMutation({
    mutationFn: async () =>
      send({
        data: {
          category,
          rating,
          message: message.trim(),
          page: typeof window !== "undefined" ? window.location.pathname : null,
        },
      }),
    onSuccess: () => {
      toast.success("Thanks! Your feedback was sent.");
      setMessage("");
      setRating(null);
      setCategory("general");
      qc.invalidateQueries({ queryKey: ["my_feedback"] });
    },
    onError: (e: Error) => toast.error("Could not send feedback", { description: e.message }),
  });

  const tooShort = message.trim().length < 5;

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <button
        onClick={() => navigate({ to: "/dashboard" })}
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to dashboard
      </button>

      <div className="flex items-start gap-4">
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-primary text-primary-foreground shadow-glow">
          <MessageSquareHeart className="h-6 w-6" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">Feedback</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Tell us what works, what breaks, and what you want next. Every submission reaches the team.
          </p>
        </div>
      </div>

      <section className="mt-8 rounded-2xl border border-border bg-card p-5 sm:p-6">
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="text-sm font-medium">Category</label>
            <Select value={category} onValueChange={(v) => setCategory(v as FeedbackCategory)}>
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FEEDBACK_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {CATEGORY_LABELS[c]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium">How would you rate NetAssist AI?</label>
            <div className="mt-2 flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  aria-label={`Rate ${n} out of 5`}
                  onClick={() => setRating(rating === n ? null : n)}
                  className="rounded-md p-1 transition-transform hover:scale-110"
                >
                  <Star
                    className={`h-6 w-6 ${
                      rating !== null && n <= rating
                        ? "fill-primary text-primary"
                        : "text-muted-foreground"
                    }`}
                  />
                </button>
              ))}
              {rating !== null && (
                <span className="ml-2 text-xs text-muted-foreground">{rating}/5</span>
              )}
            </div>
          </div>
        </div>

        <div className="mt-5">
          <label className="text-sm font-medium" htmlFor="feedback-message">
            Your feedback
          </label>
          <Textarea
            id="feedback-message"
            value={message}
            maxLength={4000}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Describe the issue, the idea, or what you'd like improved…"
            className="mt-2 min-h-36"
          />
          <div className="mt-1 text-right text-xs text-muted-foreground">{message.length}/4000</div>
        </div>

        <Button
          className="mt-3 w-full sm:w-auto"
          disabled={tooShort || mutation.isPending}
          onClick={() => mutation.mutate()}
        >
          {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {mutation.isPending ? "Sending…" : "Send feedback"}
        </Button>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-lg font-semibold">Your previous feedback</h2>
        {isLoading ? (
          <p className="mt-3 text-sm text-muted-foreground">Loading…</p>
        ) : !mine || mine.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">You haven&apos;t submitted feedback yet.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {mine.map((f) => (
              <li key={f.id} className="rounded-xl border border-border bg-card p-4">
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span className="rounded-full border border-border px-2 py-0.5 font-medium text-foreground">
                    {CATEGORY_LABELS[f.category as FeedbackCategory] ?? f.category}
                  </span>
                  <span className="rounded-full border border-border px-2 py-0.5 capitalize">{f.status}</span>
                  {f.rating ? <span>{f.rating}/5</span> : null}
                  <span>{new Date(f.created_at).toLocaleString()}</span>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm">{f.message}</p>
                {f.admin_note ? (
                  <p className="mt-2 rounded-lg bg-muted p-2 text-sm">
                    <span className="font-medium">Team reply: </span>
                    {f.admin_note}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
