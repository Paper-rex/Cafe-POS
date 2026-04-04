import nodemailer from 'nodemailer';

function createTransporter() {
  if (process.env.SMTP_HOST && process.env.SMTP_USER) {
    const isGmail = process.env.SMTP_HOST.includes('gmail');
    
    if (isGmail) {
      return nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
    }

    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  return null;
}

let transporter: ReturnType<typeof createTransporter> | undefined;

function getTransporter() {
  if (transporter === undefined) {
    transporter = createTransporter();
  }
  return transporter;
}

export async function sendMail(options: {
  to: string;
  subject: string;
  html: string;
}): Promise<void> {
  const mailer = getTransporter();
  if (mailer) {
    await mailer.sendMail({
      from: process.env.SMTP_FROM || 'Café POS <noreply@cafepos.local>',
      ...options,
    });
    console.log(`📧 Email sent to ${options.to}`);
  } else {
    // Extract link for clearer dev fallback display
    const linkMatch = options.html.match(/href="([^"]+)"/);
    const inviteUrl = linkMatch ? linkMatch[1] : 'No link found';

    // Dev fallback — log to console
    console.log('\n' + '='.repeat(60));
    console.log('📧 EMAIL (dev mode — no SMTP configured)');
    console.log(`   To: ${options.to}`);
    console.log(`   Subject: ${options.subject}`);
    console.log(`\n   >>> ACTION REQUIRED: Invite Link <<<`);
    console.log(`   ${inviteUrl}\n`);
    console.log('   Body (HTML stripped):');
    console.log(`   ${options.html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()}`);
    console.log('='.repeat(60) + '\n');
  }
}
