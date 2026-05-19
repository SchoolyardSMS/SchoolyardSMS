import { Resend } from 'resend';
import { env } from './env';

const resend = new Resend(env.RESEND_API_KEY);

export async function sendInviteEmail(email: string, inviteLink: string, role: string) {
  if (process.env.DISABLE_EMAILS === 'true') {
    console.log(`[MAIL MOCKED] Invite sent to ${email}. Role: ${role}. Link: ${inviteLink}`);
    return { success: true, data: { id: 'mocked_id' } };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: `Schoolyard SMS <onboarding@${env.RESEND_DOMAIN}>`,
      to: [email],
      replyTo: `support@${env.RESEND_DOMAIN}`,
      subject: 'You are invited to Schoolyard',
      text: `Welcome to Schoolyard!\n\nYou have been invited to join the school as a ${role}.\n\nPlease set up your account by visiting:\n${inviteLink}\n\nIf you did not expect this invitation, please ignore this email.`,
      headers: {
        'List-Unsubscribe': `<mailto:unsubscribe@${env.RESEND_DOMAIN}>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        'Precedence': 'bulk'
      },
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; rounded: 12px;">
          <h2 style="color: #4f46e5; text-transform: uppercase; letter-spacing: 0.1em;">Welcome to Schoolyard</h2>
          <p>You have been invited to join the school as a <strong>${role}</strong>.</p>
          <p>Please click the button below to set up your account and choose your password:</p>
          <div style="margin: 30px 0;">
            <a href="${inviteLink}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">Set Up Account</a>
          </div>
          <p style="font-size: 12px; color: #64748b;">If you did not expect this invitation, please ignore this email.</p>
        </div>
      `,
    });

    if (error) {
      console.error('Resend Error:', error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (err) {
    console.error('Mail Exception:', err);
    return { success: false, error: err };
  }
}

export async function sendPasswordResetEmail(email: string, resetLink: string) {
  if (process.env.DISABLE_EMAILS === 'true') {
    console.log(`[MAIL MOCKED] Password reset sent to ${email}. Link: ${resetLink}`);
    return { success: true, data: { id: 'mocked_id' } };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: `Schoolyard SMS <security@${env.RESEND_DOMAIN}>`,
      to: [email],
      replyTo: `security@${env.RESEND_DOMAIN}`,
      subject: 'Reset your Schoolyard password',
      text: `Password Reset Request\n\nWe received a request to reset the password for your Schoolyard account.\n\nPlease reset your password by visiting:\n${resetLink}\n\nIf you did not request a password reset, please ignore this email or contact support if you have concerns.`,
      headers: {
        'List-Unsubscribe': `<mailto:unsubscribe@${env.RESEND_DOMAIN}>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        'Precedence': 'bulk'
      },
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; rounded: 12px;">
          <h2 style="color: #4f46e5; text-transform: uppercase; letter-spacing: 0.1em;">Password Reset Request</h2>
          <p>We received a request to reset the password for your Schoolyard account.</p>
          <p>Please click the button below to choose a new password. This link will expire in 1 hour.</p>
          <div style="margin: 30px 0;">
            <a href="${resetLink}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">Reset Password</a>
          </div>
          <p style="font-size: 12px; color: #64748b;">If you did not request a password reset, please ignore this email or contact support if you have concerns.</p>
        </div>
      `,
    });

    if (error) {
      console.error('Resend Error:', error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (err) {
    console.error('Mail Exception:', err);
    return { success: false, error: err };
  }
}
