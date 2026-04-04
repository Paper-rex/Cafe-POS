import { sendMail } from '../lib/mailer.js';

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

export async function sendInviteEmail(email: string, role: string, token: string): Promise<void> {
  const setPasswordUrl = `${FRONTEND_URL}/set-password?token=${token}`;

  await sendMail({
    to: email,
    subject: `You're invited to Café POS as ${role}`,
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
        <div style="background: linear-gradient(135deg, #1B4332, #40916C); padding: 32px; border-radius: 16px 16px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">☕ Café POS</h1>
        </div>
        <div style="background: white; padding: 32px; border: 1px solid #DDE8E2; border-top: none; border-radius: 0 0 16px 16px;">
          <h2 style="color: #1B4332; margin-top: 0;">You're invited!</h2>
          <p style="color: #4A6B58; line-height: 1.6;">
            You've been invited to join <strong>Café POS</strong> as a <strong style="color: #40916C;">${role}</strong>.
          </p>
          <p style="color: #4A6B58; line-height: 1.6;">
            Click the button below to set your password and get started.
          </p>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${setPasswordUrl}" style="background: #40916C; color: white; padding: 14px 32px; border-radius: 10px; text-decoration: none; font-weight: 600; display: inline-block;">
              Set Your Password
            </a>
          </div>
          <p style="color: #8FA99A; font-size: 13px;">
            This link expires in 72 hours. If you didn't expect this invite, you can safely ignore this email.
          </p>
        </div>
      </div>
    `,
  });
}

export async function sendPasswordResetEmail(email: string, token: string): Promise<void> {
  const resetUrl = `${FRONTEND_URL}/reset-password?token=${token}`;

  await sendMail({
    to: email,
    subject: 'Reset your Café POS password',
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
        <div style="background: linear-gradient(135deg, #1B4332, #40916C); padding: 32px; border-radius: 16px 16px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">☕ Café POS</h1>
        </div>
        <div style="background: white; padding: 32px; border: 1px solid #DDE8E2; border-top: none; border-radius: 0 0 16px 16px;">
          <h2 style="color: #1B4332; margin-top: 0;">Password Reset</h2>
          <p style="color: #4A6B58; line-height: 1.6;">
            Click the button below to reset your password.
          </p>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${resetUrl}" style="background: #40916C; color: white; padding: 14px 32px; border-radius: 10px; text-decoration: none; font-weight: 600; display: inline-block;">
              Reset Password
            </a>
          </div>
          <p style="color: #8FA99A; font-size: 13px;">
            This link expires in 1 hour.
          </p>
        </div>
      </div>
    `,
  });
}
