import nodemailer from 'nodemailer';

function createTransporter() {
  if (process.env.SMTP_HOST && process.env.SMTP_USER) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  return null;
}

const transporter = createTransporter();

export async function sendMail(options: {
  to: string;
  subject: string;
  html: string;
}): Promise<void> {
  if (transporter) {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || 'Café POS <noreply@cafepos.local>',
      ...options,
    });
    console.log(`📧 Email sent to ${options.to}`);
  } else {
    // Dev fallback — log to console
    console.log('\n' + '='.repeat(60));
    console.log('📧 EMAIL (dev mode — no SMTP configured)');
    console.log(`   To: ${options.to}`);
    console.log(`   Subject: ${options.subject}`);
    console.log('   Body (HTML stripped):');
    console.log(`   ${options.html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()}`);
    console.log('='.repeat(60) + '\n');
  }
}
