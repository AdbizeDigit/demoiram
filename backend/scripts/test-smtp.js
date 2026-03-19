import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '465'),
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 15000,
});

console.log('Testing SMTP...');
console.log('Host:', process.env.SMTP_HOST);
console.log('Port:', process.env.SMTP_PORT);
console.log('User:', process.env.SMTP_USER);

try {
  await transporter.verify();
  console.log('SMTP: Connection verified OK');

  const info = await transporter.sendMail({
    from: `"Test Adbize" <${process.env.SMTP_USER}>`,
    to: 'agustin-em@hotmail.com.ar',
    subject: 'Test SMTP Adbize',
    html: '<p>Test email from Adbize SMTP</p>',
  });
  console.log('Email sent:', info.messageId);
} catch (err) {
  console.error('SMTP Error:', err.message);
  console.error('Code:', err.code);
}

process.exit(0);
