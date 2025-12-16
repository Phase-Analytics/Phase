import { render } from '@react-email/render';
import type { ReactElement } from 'react';

type SendEmailParams = {
  to: string;
  subject: string;
  body: string;
  from?: string;
};

type PlunkResponse = {
  success: boolean;
  data?: {
    contact: string;
    event: string;
    timestamp: string;
  };
  error?: {
    code: string;
    message: string;
  };
};

export async function sendEmail(params: SendEmailParams): Promise<void> {
  const secretKey = process.env.PLUNK_SECRET_KEY;

  if (!secretKey) {
    console.warn('PLUNK_SECRET_KEY not configured. Skipping email sending.');
    return;
  }

  const { to, subject, body, from = 'Phase <no-reply@phase.sh>' } = params;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10_000);

    const response = await fetch('https://next-api.useplunk.com/v1/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ to, subject, body, from }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(
        `Plunk API returned ${response.status}: ${response.statusText}`
      );
    }

    const data = (await response.json()) as PlunkResponse;

    if (!data.success) {
      const errorMessage = data.error
        ? `[${data.error.code}] ${data.error.message}`
        : 'Unknown error occurred';
      throw new Error(errorMessage);
    }
  } catch (error) {
    console.error('Failed to send email:', error);
    throw error;
  }
}

export async function sendReactEmail(params: {
  to: string;
  subject: string;
  react: ReactElement;
  from?: string;
}): Promise<void> {
  const html = await render(params.react);

  return sendEmail({
    to: params.to,
    subject: params.subject,
    body: html,
    from: params.from,
  });
}
