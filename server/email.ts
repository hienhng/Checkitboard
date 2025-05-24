import { createTransport } from "nodemailer";

interface ParentEmailParams {
  parentEmail: string;
  studentName: string;
  score: number;
  incorrectWords: string[];
  listTitle: string;
}

/**
 * Sends an email to a parent with their child's vocabulary check-up results
 */
export async function sendParentEmail({
  parentEmail,
  studentName,
  score,
  incorrectWords,
  listTitle,
}: ParentEmailParams): Promise<void> {
  try {
    // In a production environment, we would use environment variables for this
    // For demo purposes, we're simulating the email sending
    console.log(`Sending email to ${parentEmail} about ${studentName}'s vocabulary check-up results`);
    console.log(`Score: ${score}%`);
    console.log(`Incorrect words: ${incorrectWords.join(', ')}`);
    
    // For actual implementation, uncomment this code and set up environment variables:
    /*
    const transporter = createTransport({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT || '587'),
      secure: process.env.EMAIL_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: parentEmail,
      subject: `Vocabulary Check-Up Results for ${studentName}`,
      html: generateEmailTemplate({
        studentName,
        score,
        incorrectWords,
        listTitle,
      }),
    };

    await transporter.sendMail(mailOptions);
    */
  } catch (error) {
    console.error("Error sending parent email:", error);
    // Don't throw - we don't want to break the app if email sending fails
  }
}

function generateEmailTemplate({
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
