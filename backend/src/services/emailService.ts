import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    service: 'gmail',
    secure: true,  // falso para porta 465 // true para outras portas
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
  
export const sendConfirmationEmail = async (email: string, token: string) => {
  const url = `http://localhost:5000/auth/verify?token=${token}`;
  await transporter.sendMail({
    to: email,
    subject: 'Confirmação de Email',
    html: `<p>Clique <a href="${url}">aqui</a> para confirmar seu email.</p>`,
  });
};
  

export async function sendEmail2(email: string, token: string) {
  const url = `http://localhost:5000/auth/verify2?token=${token}`;
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Redefinição de senha',
    html: `<p>Clique <a href="${url}">aqui</a> para confirmar`,
  };

  return transporter.sendMail(mailOptions);
}



export async function sendEmail(to: string, subject: string, text: string) {
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to,
        subject,
        text,
    };

    return transporter.sendMail(mailOptions);
}