import { PASSWORD_RESET_EMAIL_TEMPLATE } from '@/emails/password-reset';

type SendEmailParams = {
  to: string;
  subject: string;
  body: string;
  from?: string;
};

type PlunkResponse = {
  success: boolean;
  emails?: Array<{
    contact: {
      id: string;
      email: string;
    };
    email: string;
  }>;
  timestamp?: string;
  error?: string;
};

export async function sendEmail(params: SendEmailParams): Promise<void> {
  const secretKey = process.env.PLUNK_SECRET_KEY;

  if (!secretKey) {
    console.warn('PLUNK_SECRET_KEY not configured. Skipping email sending.');
    return;
  }

  const {
    to,
    subject,
    body,
    from = 'Phase Analytics <no-reply@phase.sh>',
  } = params;

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
      const errorText = await response.text();
      console.error('Plunk API error response:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText,
      });
      throw new Error(
        `Plunk API returned ${response.status}: ${response.statusText}. Body: ${errorText}`
      );
    }

    const data = (await response.json()) as PlunkResponse;

    if (!data.success) {
      const errorMessage = data.error || 'Unknown error occurred';
      console.error('Plunk API unsuccessful response:', data);
      throw new Error(`Plunk API error: ${errorMessage}`);
    }
  } catch (error) {
    console.error('Failed to send email:', {
      error,
      to,
      subject,
    });
    throw error;
  }
}

export async function sendPasswordResetEmail(params: {
  to: string;
  resetUrl: string;
  from?: string;
}): Promise<void> {
  const html = PASSWORD_RESET_EMAIL_TEMPLATE.replaceAll(
    '{{resetUrl}}',
    params.resetUrl
  );

  await sendEmail({
    to: params.to,
    subject: 'Reset your password',
    body: html,
    from: params.from,
  });
}
