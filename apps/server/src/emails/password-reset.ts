export const PASSWORD_RESET_EMAIL_TEMPLATE = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reset your password | Phase Analytics</title>
  </head>
  <body style="margin: 0; padding: 0; background-color: #fafafa; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
    <div style="display: none; max-height: 0; overflow: hidden;">
      Reset your password for Phase Analytics
    </div>

    <div style="padding: 40px 20px;">
      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width: 560px; margin: 0 auto; background-color: #ffffff; padding: 48px 40px;">
        <!-- Logo -->
        <tr>
          <td style="padding-bottom: 16px;">
            <img src="https://phase.sh/light-typography.svg" alt="Phase" width="78" height="48" style="display: block;">
          </td>
        </tr>

        <tr>
          <td>
            <h1 style="color: #2e2e2e; font-size: 24px; font-weight: 600; line-height: 1.3; margin: 0 0 12px 0;">
              Reset your password
            </h1>
          </td>
        </tr>

        <tr>
          <td>
            <p style="color: #8e8e8e; font-size: 16px; line-height: 1.5; margin: 0 0 32px 0;">
              Please reset your password by clicking the button below.
            </p>
          </td>
        </tr>

        <tr>
          <td style="padding-bottom: 24px;">
            <a href="{{resetUrl}}" style="background-color: #000000; border-radius: 8px; color: #ffffff; font-size: 16px; font-weight: 500; text-decoration: none; text-align: center; display: inline-block; padding: 12px 32px; line-height: 1.5;">
              Reset password
            </a>
          </td>
        </tr>

        <tr>
          <td>
            <div style="background-color: #f8f8f8; border: 1px solid #ebebeb; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
              <p style="color: #8e8e8e; font-size: 13px; line-height: 1.6; margin: 0 0 8px 0;">
                Or copy and paste this link into your browser:
              </p>
              <a href="{{resetUrl}}" style="color: #2e2e2e; font-size: 13px; text-decoration: underline; word-break: break-all; display: block;">
                {{resetUrl}}
              </a>
            </div>
          </td>
        </tr>

        <tr>
          <td>
            <hr style="border: none; border-top: 1px solid #ebebeb; margin: 16px 0;">
          </td>
        </tr>

        <tr>
          <td>
            <p style="color: #8e8e8e; font-size: 14px; line-height: 1.6; margin: 0 0 24px 0;">
              This link will expire in 1 hour for security reasons. If you didn't request this password reset, you can safely ignore this email.
            </p>
          </td>
        </tr>

        <tr>
          <td style="text-align: center; padding-bottom: 16px;">
            <a href="https://phase.sh" style="color: #2e2e2e; font-size: 14px; text-decoration: none; display: inline-block; margin: 0 8px;">
              Website
            </a>
            <span style="color: #d1d1d1; font-size: 14px; display: inline-block; margin: 0 4px;">•</span>
            <a href="https://phase.sh/dashboard" style="color: #2e2e2e; font-size: 14px; text-decoration: none; display: inline-block; margin: 0 8px;">
              Dashboard
            </a>
          </td>
        </tr>

        <tr>
          <td>
            <p style="color: #b5b5b5; font-size: 12px; text-align: center; margin: 0;">
              © 2025 Phase Analytics. All rights reserved.
            </p>
          </td>
        </tr>
      </table>
    </div>
  </body>
</html>`;
