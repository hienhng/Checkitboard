const nodemailer = require('nodemailer');

async function testEmail() {
  console.log('Testing email configuration...');
  console.log('EMAIL_USER:', process.env.EMAIL_USER);
  console.log('EMAIL_APP_PASSWORD:', process.env.EMAIL_APP_PASSWORD ? 'Set' : 'Not set');

  try {
    const transporter = nodemailer.createTransporter({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_APP_PASSWORD,
      },
    });

    console.log('Sending test email...');
    
    const result = await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: 'vinhhoangjade@gmail.com',
      subject: 'Test Email from Checkit',
      text: 'This is a test email to verify the email configuration is working.',
      html: '<h1>Test Email</h1><p>This is a test email to verify the email configuration is working.</p>',
    });

    console.log('Email sent successfully!', result.messageId);
  } catch (error) {
    console.error('Email test failed:', error);
  }
}

testEmail();