import nodemailer from 'nodemailer';
import crypto from 'crypto';

interface EmailVerificationParams {
  email: string;
  name: string;
  verificationToken: string;
}

/**
 * Creates a Nodemailer transporter using environment variables
 */
function createTransporter() {
  console.log('EMAIL_USER:', process.env.EMAIL_USER);
  console.log('EMAIL_APP_PASSWORD:', process.env.EMAIL_APP_PASSWORD ? 'Set' : 'Not set');
  
  // Check if Gmail credentials are provided
  if (process.env.EMAIL_USER && process.env.EMAIL_APP_PASSWORD) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_APP_PASSWORD, // Use App Password for Gmail
      },
    });
  }
  
  // Check if SMTP credentials are provided
  if (process.env.SMTP_HOST && process.env.SMTP_PORT && process.env.SMTP_USER && process.env.SMTP_PASSWORD) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT),
      secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });
  }
  
  throw new Error('Email service not configured. Please provide email credentials.');
}

/**
 * Generates a secure random verification token
 */
export function generateVerificationToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Generates the verification URL
 */
function getVerificationUrl(token: string): string {
  const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5000';
  return `${baseUrl}/verify-email?token=${token}`;
}

/**
 * Generates the email verification HTML template
 */
function generateVerificationEmailTemplate({
  name,
  verificationUrl,
}: {
  name: string;
  verificationUrl: string;
}): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Verify Your Email - Checkit</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #3b82f6; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; }
        .button { display: inline-block; padding: 12px 24px; background: #3b82f6; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎓 Welcome to Checkit!</h1>
        </div>
        <div class="content">
          <h2>Hi ${name}!</h2>
          <p>Thank you for joining Checkit, the vocabulary learning platform that helps educators and learners succeed together.</p>
          
          <p>To complete your registration and start using Checkit, please verify your email address by clicking the button below:</p>
          
          <p style="text-align: center;">
            <a href="${verificationUrl}" class="button">Verify My Email</a>
          </p>
          
          <p>Or copy and paste this link into your browser:</p>
          <p style="word-break: break-all; background: #e2e8f0; padding: 10px; border-radius: 4px;">
            ${verificationUrl}
          </p>
          
          <p><strong>This verification link will expire in 24 hours.</strong></p>
          
          <p>If you didn't create an account with Checkit, you can safely ignore this email.</p>
          
          <p>Welcome aboard!<br>The Checkit Team</p>
        </div>
        <div class="footer">
          <p>© 2025 Checkit. All rights reserved.</p>
          <p>This is an automated email. Please do not reply to this message.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Sends an email verification email to the user
 */
export async function sendVerificationEmail({
  email,
  name,
  verificationToken,
}: EmailVerificationParams): Promise<void> {
  try {
    const transporter = createTransporter();
    const verificationUrl = getVerificationUrl(verificationToken);
    const htmlContent = generateVerificationEmailTemplate({ name, verificationUrl });
    
    const mailOptions = {
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: email,
      subject: 'Verify Your Email - Welcome to Checkit! 🎓',
      html: htmlContent,
      text: `
        Hi ${name}!
        
        Welcome to Checkit! Please verify your email address by visiting this link:
        ${verificationUrl}
        
        This link will expire in 24 hours.
        
        If you didn't create an account with Checkit, you can safely ignore this email.
        
        The Checkit Team
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Verification email sent successfully to ${email}`);
  } catch (error) {
    console.error('Error sending verification email:', error);
    throw new Error('Failed to send verification email. Please check your email configuration.');
  }
}

/**
 * Sends a welcome email after successful verification
 */
export async function sendWelcomeEmail({
  email,
  name,
  role,
}: {
  email: string;
  name: string;
  role: 'educator' | 'learner';
}): Promise<void> {
  try {
    const transporter = createTransporter();
    const dashboardUrl = process.env.FRONTEND_URL || 'http://localhost:5000';
    
    const roleSpecificContent = role === 'educator' 
      ? `
        <p>As an educator, you can:</p>
        <ul>
          <li>Create and manage vocabulary lists</li>
          <li>Organize students into classes</li>
          <li>Track student progress and performance</li>
          <li>Grade vocabulary submissions</li>
          <li>Generate learning insights</li>
        </ul>
      `
      : `
        <p>As a learner, you can:</p>
        <ul>
          <li>Complete vocabulary check-ups</li>
          <li>Join classes with class codes</li>
          <li>Review flashcards for incorrect answers</li>
          <li>Track your learning progress</li>
          <li>Receive performance feedback</li>
        </ul>
      `;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to Checkit!</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #10b981; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f0fdf4; padding: 30px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; padding: 12px 24px; background: #10b981; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 14px; }
          ul { padding-left: 20px; }
          li { margin: 8px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Welcome to Checkit!</h1>
          </div>
          <div class="content">
            <h2>Hi ${name}!</h2>
            <p>Congratulations! Your email has been successfully verified and your Checkit account is now active.</p>
            
            ${roleSpecificContent}
            
            <p style="text-align: center;">
              <a href="${dashboardUrl}" class="button">Start Learning</a>
            </p>
            
            <p>If you have any questions or need help getting started, don't hesitate to reach out to our support team.</p>
            
            <p>Happy learning!<br>The Checkit Team</p>
          </div>
          <div class="footer">
            <p>© 2025 Checkit. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const mailOptions = {
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: email,
      subject: `Welcome to Checkit, ${name}! 🎉`,
      html: htmlContent,
      text: `
        Hi ${name}!
        
        Congratulations! Your email has been successfully verified and your Checkit account is now active.
        
        Visit your dashboard: ${dashboardUrl}
        
        Happy learning!
        The Checkit Team
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Welcome email sent successfully to ${email}`);
  } catch (error) {
    console.error('Error sending welcome email:', error);
    // Don't throw error for welcome email - account is already verified
  }
}