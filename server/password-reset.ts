import nodemailer from 'nodemailer';
import crypto from 'crypto';

/**
 * Creates a Nodemailer transporter using environment variables
 */
function createTransporter() {
  // Check if Gmail credentials are provided
  if (process.env.EMAIL_USER && process.env.EMAIL_APP_PASSWORD) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_APP_PASSWORD,
      },
    });
  }

  // Check if SMTP credentials are provided
  if (process.env.SMTP_HOST && process.env.SMTP_PORT && process.env.SMTP_USER && process.env.SMTP_PASSWORD) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT),
      secure: process.env.SMTP_PORT === '465',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });
  }

  throw new Error('Email configuration not found. Please set up EMAIL_USER and EMAIL_APP_PASSWORD for Gmail, or SMTP_HOST, SMTP_PORT, SMTP_USER, and SMTP_PASSWORD for SMTP.');
}

interface PasswordResetParams {
  email: string;
  name: string;
  resetToken: string;
}

/**
 * Generates a secure random password reset token
 */
export function generatePasswordResetToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Generates the password reset URL
 */
function getPasswordResetUrl(token: string): string {
  const baseUrl = process.env.REPLIT_DEV_DOMAIN 
    ? `https://${process.env.REPLIT_DEV_DOMAIN}`
    : 'http://localhost:5000';
  return `${baseUrl}/reset-password?token=${token}`;
}

/**
 * Generates the password reset email HTML template
 */
function generatePasswordResetEmailTemplate({
  name,
  resetToken,
}: {
  name: string;
  resetToken: string;
}): string {
  const resetUrl = getPasswordResetUrl(resetToken);

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Password Reset - Checkit</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; background-color: white; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center; }
        .logo { color: white; font-size: 32px; font-weight: bold; margin: 0; font-family: 'Modak', cursive; }
        .content { padding: 40px 20px; }
        .title { color: #333; font-size: 24px; margin-bottom: 20px; }
        .text { color: #666; line-height: 1.6; margin-bottom: 20px; }
        .button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 15px 30px; border-radius: 5px; font-weight: bold; margin: 20px 0; }
        .button:hover { opacity: 0.9; }
        .footer { background-color: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 14px; border-top: 1px solid #eee; }
        .warning { background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0; color: #856404; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 class="logo">checkit</h1>
        </div>
        <div class="content">
          <h2 class="title">Password Reset Request</h2>
          <p class="text">Hello ${name},</p>
          <p class="text">We received a request to reset your password for your Checkit account. If you made this request, click the button below to reset your password:</p>

          <div style="text-align: center;">
            <a href="${resetUrl}" class="button">Reset My Password</a>
          </div>

          <div class="warning">
            <strong>Important:</strong> This link will expire in 1 hour for security reasons. If you didn't request this password reset, you can safely ignore this email.
          </div>

          <p class="text">If the button doesn't work, you can copy and paste this link into your browser:</p>
          <p class="text" style="word-break: break-all; color: #667eea;">${resetUrl}</p>

          <p class="text">If you're having trouble, please contact our support team.</p>

          <p class="text">Best regards,<br>The Checkit Team</p>
        </div>
        <div class="footer">
          <p>This is an automated message. Please do not reply to this email.</p>
          <p>© ${new Date().getFullYear()} Checkit. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Sends a password reset email to the user
 */
export async function sendPasswordResetEmail({
  email,
  name,
  resetToken,
}: PasswordResetParams): Promise<void> {
  try {
    const transporter = createTransporter();
    const resetUrl = getPasswordResetUrl(resetToken);
    const htmlContent = generatePasswordResetEmailTemplate({ name, resetToken });

    const mailOptions = {
      from: `"Checkit" <${process.env.EMAIL_USER || process.env.SMTP_USER}>`,
      to: email,
      subject: 'Reset Your Password - Checkit',
      html: htmlContent,
      text: `Hello ${name},

We received a request to reset your password for your Checkit account.

Reset your password by clicking this link: ${resetUrl}

This link will expire in 1 hour for security reasons.

If you didn't request this password reset, you can safely ignore this email.

Best regards,
The Checkit Team`,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Password reset email sent successfully to ${email}`);
  } catch (error) {
    console.error('Error sending password reset email:', error);
    throw new Error('Failed to send password reset email');
  }
}

/**
 * Sends a password reset confirmation email
 */
export async function sendPasswordResetConfirmationEmail({
  email,
  name,
}: {
  email: string;
  name: string;
}): Promise<void> {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: `"Checkit" <${process.env.EMAIL_USER || process.env.SMTP_USER}>`,
      to: email,
      subject: 'Password Successfully Reset - Checkit',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Password Reset Confirmation - Checkit</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; background-color: white; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center; }
            .logo { color: white; font-size: 32px; font-weight: bold; margin: 0; font-family: 'Modak', cursive; }
            .content { padding: 40px 20px; }
            .title { color: #333; font-size: 24px; margin-bottom: 20px; }
            .text { color: #666; line-height: 1.6; margin-bottom: 20px; }
            .success { background-color: #d4edda; border: 1px solid #c3e6cb; padding: 15px; border-radius: 5px; margin: 20px 0; color: #155724; }
            .footer { background-color: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 14px; border-top: 1px solid #eee; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 class="logo">checkit</h1>
            </div>
            <div class="content">
              <h2 class="title">Password Successfully Reset</h2>
              <p class="text">Hello ${name},</p>

              <div class="success">
                <strong>Success!</strong> Your password has been successfully reset for your Checkit account.
              </div>

              <p class="text">You can now log in with your new password. If you didn't make this change, please contact our support team immediately.</p>

              <p class="text">For your security, you've been logged out of all devices and will need to log in again.</p>

              <p class="text">Best regards,<br>The Checkit Team</p>
            </div>
            <div class="footer">
              <p>This is an automated message. Please do not reply to this email.</p>
              <p>© ${new Date().getFullYear()} Checkit. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `Hello ${name},

Your password has been successfully reset for your Checkit account.

You can now log in with your new password. If you didn't make this change, please contact our support team immediately.

For your security, you've been logged out of all devices and will need to log in again.

Best regards,
The Checkit Team`,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Password reset confirmation email sent successfully to ${email}`);
  } catch (error) {
    console.error('Error sending password reset confirmation email:', error);
    throw new Error('Failed to send password reset confirmation email');
  }
}