import { Express, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import {hashPassword} from '../services/hashService';
//import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { sendEmail, sendEmail2, sendConfirmationEmail } from '../services/emailService';
import { generateToken, verifyToken } from '../services/jwtService';
//import { sendEmail } from '../config/email';

const prisma = new PrismaClient();

//---------------------------------------------------------------------------------------------
// LOGIN
//---------------------------------------------------------------------------------------------
export const login = async (req: Request, res: Response):Promise<any> => {
    const { email, password } = req.body;
    
    // Buscando registro
    const user = await prisma.user.findUnique({ where: { email: email } });
    
    // buscando registro, se nao encontrar mostra erro
    if (!user) {
      return res.status(401).json({ message: 'Usuario ou senha inválido!'});
    }

    // buscando registro se password for diferente mostra erro
    if (!(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: "Usuário ou senha inválida." });
    }

    // verifica se usuario esta verificado
    if (!user.isVerified) {
      return res.status(403).json({ message: 'Confirme seu email antes de acessar.' });
    }

    // gerando o token
    const token = generateToken({email: user.email},'1d');

    res.json({ token });
};
  

//---------------------------------------------------------------------------------------------
// REGISTRO
//---------------------------------------------------------------------------------------------
export const register = async (req: Request, res: Response):Promise<any> => {
  const { usuario, email, password, verificationToken, phone, imagem, ativo } = req.body;
  try {

    // Buscando registros
    const user = await prisma.user.findUnique({ where: { email: email } });

    // Buscar registro se encontrar mostra como ja registrado
    if (user) {
      return res.status(401).json({ message: 'Usuário já registrado com este e-mail !'});
    }

    // criptografa a senha
    const hashedPassword = await bcrypt.hash(password, 8);

    // gerando o token
    const verificaToken = generateToken({email},'1d');

    // registrando o usuario no cadastro de usuarios
    const registro = await prisma.user.create(
      { data: { usuario, email, password: hashedPassword , verificationToken: verificaToken, phone, imagem, ativo} 
    });
    
    // Buscando registro se nao existir mostra o erro
    if (!registro) { res.status(401).json({error: "Ocorreu um erro no registro!"}) }

    // enviando email de verificacao
    await sendConfirmationEmail(email, verificaToken);

    res.status(201).json({ message: 'Usuário registrado. Confirme seu email.' });

  } catch(error: any) {

    if (error.code === 11000) {
      return { error: 'This username already in use!' };
    } else {
      throw new Error(`Failed: ${error.message}`);
    }    

  }
};


//---------------------------------------------------------------------------------------------
// ATIVACAO
//---------------------------------------------------------------------------------------------
export const ativacao = async (req: Request, res: Response):Promise<any> => {
  const { usuario, email, password, verificationToken, phone, imagem, ativo } = req.body;
  try {

    // Buscando registros
    const user = await prisma.user.findUnique({ where: { email: email } });

    // Buscar registro se encontrar mostra como ja registrado
    if (!user) {
      return res.status(401).json({ message: 'Usuário não encontrado !'});
    }

    // criptografa a senha
    //const hashedPassword = await bcrypt.hash(password, 8);

    // gerando o token
    const verificaToken = generateToken({email},'1d');

    // registrando o usuario no cadastro de usuarios
    const registro = await prisma.user.update(
      { where: { email: email },
        data: { verificationToken: verificaToken } 
        //data: { password: hashedPassword , verificationToken: verificaToken } 
    });
    
    // Buscando registro se nao existir mostra o erro
    if (!registro) { res.status(401).json({error: "Registro não encontrado!"}) }

    // enviando email de verificacao
    await sendConfirmationEmail(email, verificaToken);

    res.status(200).json({ message: 'Link de ativação enviado com sucesso.' });

  } catch(error: any) {

    if (error.code === 11000) {
      return { error: 'Este nome de usuário já está em uso!' };
    } else {
      throw new Error(`Failed: ${error.message}`);
    }    

  }
};






//---------------------------------------------------------------------------------------------
// VERIFICAR EMAIL
//---------------------------------------------------------------------------------------------
export const verifyEmail = async (req: Request, res: Response):Promise<any> => {
  const { token } = req.query as { token: string };
  try {
    // verifica token
    const payload = verifyToken(token) as {email: string};
    
    // atualizando verificacao de email
    await prisma.user.update(
      { 
        where: { email: payload.email }, 
        data: { isVerified: true, verificationToken: null } 
      });
    
    res.json({ message: 'Email verificado com sucesso!' });
  } catch (error) {
    res.status(400).json({ message: 'Token inválido ou expirado' });
  }
};


//---------------------------------------------------------------------------------------------
// VERIFICAR EMAIL e confere o token
//---------------------------------------------------------------------------------------------
export const verifyEmail2 = async (req: Request, res: Response):Promise<any> => {
  const { token } = req.query as { token: string };
  try {
    //const payload = jwt.verify(token, process.env.JWT_SECRET!) as { email: string };
    /*
    export function verifyToken(token: string) {
      return jwt.verify(token, JWT_SECRET);
    }
    */
    //console.log(token);

    // validando token
    const payload: any = verifyToken(token) as {email: string};

    // Verificar se token esta ok
    //const payload: any = verifyToken(resetToken);

    // verifica se tem registro
    if (!payload) return res.status(400).json({ message: 'Token inválido' });
    
    /*
    await prisma.user.update(
      { 
        where: { email: payload.email }, 
        data: { resetToken: null } 
      });
    */

    // Enviar para pagina de alteracao de Senha
    // http://localhost:3000/user/resetSenha?token=dfsdf2334092uffuy92329442402u4203410ddhdhifbibiqueq  
    

    res.json({ message: 'Email/Token verificado com sucesso!' });
  } catch (error) {
    res.status(400).json({ message: 'Token inválido ou expirado' });
  }
};



//---------------------------------------------------------------------------------------------
// ENVIAR EMAIL REDEFINICAO DE SENHA
//---------------------------------------------------------------------------------------------
export const requestPasswordReset = async (req: Request, res: Response):Promise<any> => {
  try {
    const { email } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });

    // verifica se encontrou registros
    if (!user) return res.status(404).json({ message: 'Usuário não encontrado' });

    // gerando o token
    const resetToken = generateToken({email},'1d');

    // atualização do campo resetToken
    await prisma.user.update({ where: { email }, data: { resetToken: resetToken } });

    // eviando email com token 
    await sendEmail2(email, `${resetToken}`);
    res.json({ message: 'Email de redefinição de senha enviado.' });

  } catch(error: any) {
    if (error.code === 11000) {
      return { error: 'Este nome de usuário já está em uso!' };
    } else {
      throw new Error(`Failed: ${error.message}`);
    }    
  }
};



//---------------------------------------------------------------------------------------------
// RESET DE SENHA
//---------------------------------------------------------------------------------------------
export const resetPassword = async (req: Request, res: Response):Promise<any> => {
  try {
    const { resetToken, newPassword } = req.body;
    const payload: any = verifyToken(resetToken);

    // verifica se tem registro
    if (!payload) return res.status(400).json({ message: 'Token inválido' });

    // Buscar o codigo do usuario pelo email
    const userid = await prisma.user.findUnique({ where: { email: payload.email } });

    // verifica se tem registro
    if (!userid) return res.status(400).json({ message: 'Usuario não encontrado !'}) 

    // criptografando a senha
    const hashedPassword = await hashPassword(newPassword);

    // atualizando senha criptografada
    await prisma.user.update({
      where: { id: userid?.id },  
      data: { password: hashedPassword, resetToken: null },
    });

    //const user = await prisma.user.findUnique({ where: { email: payload.email } });

    res.json({ message: 'Senha alterada com sucesso!' });

  } catch(error: any) {
    if (error.code === 11000) {
      return { error: 'Este nome de usuário já está em uso!' };
    } else {
      throw new Error(`Failed: ${error.message}`);
    }    
  }
};
