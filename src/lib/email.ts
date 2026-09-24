import { Resend } from "resend";

let client: Resend | null = null;

function getClient(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  if (!client) client = new Resend(key);
  return client;
}

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface SendEmailResult {
  ok: boolean;
  skipped?: boolean;
  error?: string;
}

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const resend = getClient();
  if (!resend) {
    console.warn("[email] RESEND_API_KEY غير مضبوط — تم تخطي الإرسال");
    return { ok: false, skipped: true };
  }

  const from = process.env.EMAIL_FROM ?? "Alzain Tea <onboarding@resend.dev>";
  const { error } = await resend.emails.send({
    from,
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text,
  });

  if (error) {
    console.error("[email] فشل الإرسال:", error);
    return { ok: false, error: error.message };
  }
  return { ok: true };
}