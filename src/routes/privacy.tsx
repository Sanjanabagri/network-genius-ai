import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/LegalPage";

const d = "Privacy Policy for NetAssist AI — how we collect, use and protect your data.";
export const Route = createFileRoute("/privacy")({
  head: () => ({ meta: [
    { title: "Privacy Policy · NetAssist AI" }, { name: "description", content: d },
    { property: "og:title", content: "Privacy Policy · NetAssist AI" }, { property: "og:description", content: d },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: () => (
    <LegalPage title="Privacy Policy" updated="October 2026" sections={[
      { h: "Information we collect", p: "Account details (name, email), content you submit to AI tools (prompts, configurations, CLI outputs), saved projects, device inventory, feedback, and basic usage analytics such as logins and page views." },
      { h: "How we use it", p: "To provide and improve the service, generate AI outputs, enforce plan limits, secure accounts, and respond to support requests. We do not sell your data." },
      { h: "AI processing", p: "Prompts are sent to our AI providers solely to generate responses. Do not submit passwords, secrets or keys; redact sensitive values from configurations before uploading." },
      { h: "Storage and security", p: "Data is stored with row-level access controls so only you (and teammates you invite) can see your content. Two-factor authentication is available." },
      { h: "Retention and deletion", p: "You can delete saved projects, devices and workflows at any time. To delete your account and all associated data, contact us." },
      { h: "Contact", p: "For privacy questions or data requests, use the Feedback page inside the app." },
    ]} />
  ),
});
