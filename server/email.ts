import { MailService } from '@sendgrid/mail';
import { db } from '@db';
import { verificationCodes, InsertVerificationCode } from '@shared/schema';
import { eq } from 'drizzle-orm';

// Initialize SendGrid
if (!process.env.SENDGRID_API_KEY) {
  console.warn("SENDGRID_API_KEY not set. Email functionality will not work.");
}

const mailService = new MailService();
if (process.env.SENDGRID_API_KEY) {
  mailService.setApiKey(process.env.SENDGRID_API_KEY);
}

// Email templates
export enum EmailTemplate {
  PARENT_RESULTS = 'parent_results',
  VERIFICATION_CODE = 'verification_code'
}

interface ParentEmailParams {
  parentEmail: string;
  studentName: string;
  score: number;
  incorrectWords: string[];
  listTitle: string;
}

interface VerificationEmailParams {
  email: string;
  code: string;
}

type EmailParams = ParentEmailParams | VerificationEmailParams;

/**
 * Core function to send emails using SendGrid
 */
async function sendEmail(
  template: EmailTemplate,
  to: string,
  subject: string,
  params: EmailParams
): Promise<void> {
  try {
    let html: string;
    
    switch (template) {
      case EmailTemplate.PARENT_RESULTS:
        html = generateParentEmailTemplate(params as ParentEmailParams);
        break;
      case EmailTemplate.VERIFICATION_CODE:
        html = generateVerificationEmailTemplate(params as VerificationEmailParams);
        break;
      default:
        throw new Error(`Unknown email template: ${template}`);
    }
    
    // For development - always log the verification code so we can test without real emails
    if (template === EmailTemplate.VERIFICATION_CODE) {
      const verificationParams = params as VerificationEmailParams;
      console.log(`
==========================================================
🔑 VERIFICATION CODE for ${to}: ${verificationParams.code}
==========================================================
      `);
    }

    // Skip actual email sending in development mode or if SendGrid is having issues
    if (!process.env.SENDGRID_API_KEY || process.env.NODE_ENV !== 'production') {
      console.log(`[MOCK EMAIL] Template: ${template}, To: ${to}, Subject: ${subject}`);
      return;
    }

    const msg = {
      to,
      from: 'noreply@example.com', // This should be changed to a verified sender in production
      subject,
      html,
    };

    try {
      await mailService.send(msg);
      console.log(`Email sent to ${to} using template ${template}`);
    } catch (emailError) {
      // Log but continue - we've already shown the code in console
      console.error("SendGrid error:", emailError);
      console.log(`[FALLBACK] Email would have been sent to ${to}`);
    }
  } catch (error) {
    console.error("Error sending email:", error);
    // Don't throw - we don't want to break the app if email sending fails
  }
}

/**
 * Sends an email to a parent with their child's vocabulary check-up results
 */
export async function sendParentEmail(params: ParentEmailParams): Promise<void> {
  await sendEmail(
    EmailTemplate.PARENT_RESULTS, 
    params.parentEmail, 
    `Vocabulary Check-Up Results for ${params.studentName}`, 
    params
  );
}

/**
 * Sends a verification code email for account registration
 */
export async function sendVerificationEmail(params: VerificationEmailParams): Promise<void> {
  await sendEmail(
    EmailTemplate.VERIFICATION_CODE,
    params.email,
    "Your Verification Code",
    params
  );
}

/**
 * Generates and stores a verification code for email verification
 */
export async function generateVerificationCode(email: string): Promise<string> {
  try {
    // Generate a 6-digit verification code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Set expiration to 10 minutes from now
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10);
    
    // Delete any existing verification codes for this email
    await db.delete(verificationCodes).where(eq(verificationCodes.email, email));
    
    // Create new verification code
    const data: InsertVerificationCode = {
      email,
      code,
      expiresAt,
    };
    
    await db.insert(verificationCodes).values(data);
    
    return code;
  } catch (error) {
    console.error("Error generating verification code:", error);
    throw new Error("Failed to generate verification code");
  }
}

/**
 * Verifies a code sent to an email
 */
export async function verifyCode(email: string, code: string): Promise<boolean> {
  try {
    const now = new Date();
    
    // Find the verification code
    const [storedCode] = await db.select()
      .from(verificationCodes)
      .where(
        eq(verificationCodes.email, email)
      );
    
    if (!storedCode) {
      return false;
    }
    
    // Check if code is expired
    if (storedCode.expiresAt < now) {
      return false;
    }
    
    // Check if code matches
    if (storedCode.code !== code) {
      return false;
    }
    
    // Mark as verified
    await db.update(verificationCodes)
      .set({ isVerified: true })
      .where(eq(verificationCodes.id, storedCode.id));
    
    return true;
  } catch (error) {
    console.error("Error verifying code:", error);
    return false;
  }
}

/**
 * Generates the HTML template for verification codes
 */
function generateVerificationEmailTemplate(params: VerificationEmailParams): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
      <div style="text-align: center; margin-bottom: 20px;">
        <h1 style="color: #3B82F6; margin-bottom: 5px;">VocabCheckUp</h1>
        <p style="color: #6B7280; font-size: 16px;">Email Verification</p>
      </div>
      
      <div style="margin-bottom: 20px;">
        <h2 style="color: #1F2937; font-size: 18px;">Verify Your Email Address</h2>
        <p style="color: #4B5563;">To complete your registration, please enter the verification code below:</p>
        
        <div style="background-color: #F3F4F6; padding: 15px; border-radius: 8px; text-align: center; margin: 15px 0;">
          <span style="font-size: 24px; font-weight: bold; letter-spacing: 5px; color: #3B82F6;">${params.code}</span>
        </div>
        
        <p style="color: #4B5563;">This code will expire in 10 minutes.</p>
      </div>
      
      <div style="background-color: #EFF6FF; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
        <p style="margin: 0; color: #1E40AF; font-weight: bold;">Security Notice</p>
        <p style="margin: 8px 0 0; color: #1E40AF;">
          If you did not request this verification code, please ignore this email.
        </p>
      </div>
      
      <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6B7280; font-size: 14px;">
        <p>This is an automated email from VocabCheckUp.</p>
        <p>Please do not reply to this message.</p>
      </div>
    </div>
  `;
}

/**
 * Generates the HTML template for parent emails
 */
function generateParentEmailTemplate({
  studentName,
  score,
  incorrectWords,
  listTitle,
}: Omit<ParentEmailParams, 'parentEmail'>): string {
  let scoreColor = '#10B981'; // Green for good scores
  if (score < 70) scoreColor = '#F59E0B'; // Yellow for average scores
  if (score < 60) scoreColor = '#EF4444'; // Red for low scores

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
      <div style="text-align: center; margin-bottom: 20px;">
        <h1 style="color: #3B82F6; margin-bottom: 5px;">VocabCheckUp Results</h1>
        <p style="color: #6B7280; font-size: 16px;">Vocabulary Check-Up Summary for ${studentName}</p>
      </div>
      
      <div style="margin-bottom: 20px;">
        <h2 style="color: #1F2937; font-size: 18px;">Performance Summary</h2>
        <p><strong>List:</strong> ${listTitle}</p>
        <div style="background-color: #F3F4F6; padding: 15px; border-radius: 8px; text-align: center; margin: 15px 0;">
          <span style="font-size: 24px; font-weight: bold; color: ${scoreColor};">${score}%</span>
          <p style="margin: 5px 0 0; color: #4B5563;">Overall Score</p>
        </div>
      </div>
      
      ${incorrectWords.length > 0 ? `
        <div style="margin-bottom: 20px;">
          <h2 style="color: #1F2937; font-size: 18px;">Words to Review</h2>
          <p style="color: #4B5563;">The following words were defined incorrectly:</p>
          <ul style="padding-left: 20px;">
            ${incorrectWords.map(word => `<li style="margin-bottom: 8px; color: #4B5563;">${word}</li>`).join('')}
          </ul>
        </div>
        
        <div style="background-color: #FEF3C7; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
          <p style="margin: 0; color: #92400E; font-weight: bold;">Encouragement Tip</p>
          <p style="margin: 8px 0 0; color: #92400E;">
            Help ${studentName} review these words. Consider creating flashcards or practicing them in everyday conversations.
          </p>
        </div>
      ` : `
        <div style="background-color: #D1FAE5; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
          <p style="margin: 0; color: #065F46; font-weight: bold;">Great job!</p>
          <p style="margin: 8px 0 0; color: #065F46;">
            ${studentName} got all words correct. Keep encouraging this excellent vocabulary development!
          </p>
        </div>
      `}
      
      <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6B7280; font-size: 14px;">
        <p>This is an automated email from VocabCheckUp.</p>
        <p>If you have questions, please contact your child's educator.</p>
      </div>
    </div>
  `;
}