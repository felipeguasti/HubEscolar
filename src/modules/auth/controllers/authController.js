const User = require('../../../models/User');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer'); 


const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    if (!email || !password) {
      return res.status(400).json({ message: 'Email e senha são obrigatórios.' });
    }

    console.log('Buscando usuário com o email:', email); 
    const user = await User.findOne({ where: { email } });
    if (!user) {
      console.log('Usuário não encontrado.');  
      return res.status(404).json({ message: 'Usuário não encontrado.' });
    }

    console.log('Verificando a senha do usuário...');
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      console.log('Senha inválida para o usuário:', email);
      return res.status(401).json({ message: 'Usuário ou senha inválidos.' });
    }

    console.log('Gerando o token JWT...');

    // Definindo o tempo de expiração (1 minuto)
    const expiresInSeconds = 604800;  // 60 (1 minuto), 3600 (1 hora), 86400 (1 dia), 604800 (1 semana)

    // Gerando o token JWT com o tempo de expiração
    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET || 'default_secret',
      { expiresIn: expiresInSeconds }  // Expiração de 1 minuto
    );
    console.log('Token gerado:', token);

    // Decodificando o token para obter o tempo de expiração (exp)
    const decodedToken = jwt.decode(token);
    const expiresAt = decodedToken.exp * 1000;  // Convertendo de segundos para milissegundos

    // Configurando o cookie HTTP-Only com o JWT
    res.cookie('token', token, {
      httpOnly: true,  // O cookie não será acessível via JavaScript
      secure: process.env.NODE_ENV === 'production',  // Só será enviado via HTTPS em produção
      maxAge: expiresInSeconds * 1000,  // O token expira após 1 minuto (em milissegundos)
      sameSite: 'strict',  // Impede o envio do cookie em requisições cross-site
    });

    return res.status(200).json({
      message: 'Login bem-sucedido.',
      token: token,
      expiresAt: expiresAt,  // Envia a data de expiração para o frontend
      redirectTo: '/dashboard' 
    });
    
  } catch (err) {
    console.error('Erro no login:', err);
    return res.status(500).json({ message: 'Erro ao fazer login.' });
  }
};

const register = async (req, res) => {
  const {
    name,
    email,
    password,
    address,
    city,
    state,
    zip,
    school, // Escola
    district, // Secretaria
    gender,
    cpf,
    phone,
    dateOfBirth,
    role,
    horario, // Turno
    userClass, // Turma
    content, // Conteúdo
    profilePic // Foto de perfil
  } = req.body;

  console.log("Dados recebidos:", {
    name,
    email,
    address,
    city,
    state,
    zip,
    school,
    district,
    gender,
    cpf,
    phone,
    dateOfBirth,
    role,
    horario,
    userClass,
    content,
    profilePic
  });

  try {
    // Verifica se o e-mail já está em uso
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: 'Usuário com este e-mail já existe.' });
    }

    // Criptografa a senha antes de salvar no banco
    const hashedPassword = password;

    // Cria o novo usuário com os dados fornecidos
    const newUser = await User.create({
      name,
      email,
      password: hashedPassword,
      address,
      city,
      state,
      zip,
      school, // Novo campo "school"
      district, // Novo campo "district"
      gender,
      cpf,
      phone,
      dateOfBirth,
      role,
      horario,
      userClass,
      content,
      profilePic
    });

    return res.status(201).json({ message: 'Usuário criado com sucesso.', userId: newUser.id });
  } catch (error) {
    console.error('Erro ao criar usuário:', error);
    return res.status(500).json({ message: 'Erro ao criar usuário.' });
  }
};

// Função de logout
const logout = (req, res) => {
  // Limpa o token do cliente (remove o cookie)
  res.clearCookie('token');
  return res.status(200).json({ message: 'Logout realizado com sucesso.' });
};


// Função de verificação de autenticação
const verifyAuth = (req, res) => {
  const user = req.user; // O usuário é anexado pela middleware de autenticação
  if (!user) {
    return res.status(401).json({ message: 'Usuário não autenticado.' });
  }
  return res.status(200).json({ message: 'Usuário autenticado.', user });
};

// Função para verificar a disponibilidade do nome e email
const checkNameAndEmailExistence = async (req, res) => {
  const { name, email } = req.body;

  try {
    // Verifica se o e-mail já existe
    const userByEmail = await User.findOne({ where: { email } });
    if (userByEmail) {
      return res.status(400).json({ message: 'Este e-mail já está registrado.' });
    }

    // Verifica se o nome já existe
    const userByName = await User.findOne({ where: { name } });
    if (userByName) {
      return res.status(400).json({ message: 'Este nome já está registrado.' });
    }

    // Se ambos estiverem disponíveis
    return res.status(200).json({ available: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Erro ao verificar o nome ou e-mail.' });
  }
};


const requestPasswordReset = async (req, res) => {
  const { email } = req.body;

  try {
    // Verifica se o e-mail existe no banco
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado.' });
    }

    // Gera o token de redefinição com prazo curto
    const resetToken = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '15m' });

    // Configura o serviço de e-mail
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST, 
      port: process.env.EMAIL_PORT || 465, 
      secure: process.env.EMAIL_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // Link de redefinição
    const resetLink = `${req.protocol}://${req.get('host')}/auth/reset-password/${resetToken}`;

    // Template HTML com o link de redefinição
    const emailHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 0;
            background-color: #f4f4f4;
          }
          .container {
            max-width: 600px;
            margin: 20px auto;
            background: #fff;
            padding: 30px; 
            border-radius: 8px;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
          }
          .header {
            background-color: #007BFF;
            color: #fff;
            padding: 15px;
            text-align: center;
            border-radius: 8px 8px 0 0;
          }
          .header h1 {
            font-size: 24px;
            margin: 0;
          }
          .content {
            margin: 30px 0;
            font-size: 18px; 
          }
          .button-container {
            text-align: center; 
          }
          .button {
            display: inline-block;
            background: #007BFF;
            color: #fff;
            text-decoration: none;
            padding: 12px 25px; 
            border-radius: 5px;
            font-weight: bold;
            font-size: 16px;
          }
          .footer {
            text-align: center;
            margin-top: 30px;
            color: #888;
            font-size: 14px; 
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Redefinição de Senha</h1>
          </div>
          <div class="content">
            <p>Olá,</p>
            <p>Você solicitou a redefinição de sua senha. Clique no botão abaixo para redefini-la:</p>
            <div class="button-container">
              <a class="button" href="${resetLink}">Redefinir Senha</a>
            </div>
            <p>Se você não solicitou essa alteração, ignore este e-mail.</p>
          </div>
          <div class="footer">
            <p>HubEscolar - Sistema de Gestão Escolar &#169; All rights reserved</p>
          </div>
        </div>
      </body>
      </html>
    `;



    // Enviar o e-mail
    await transporter.sendMail({
      from: '"HubEscolar" <no-reply@felipeguasti.com.br>', // Remetente
      to: email, // Destinatário
      subject: 'Redefinição de Senha',
      html: emailHTML, // Envio em HTML
    });

    return res.status(200).json({ message: 'E-mail de redefinição de senha enviado.' });
  } catch (err) {
    console.error('Erro ao solicitar redefinição de senha:', err);
    return res.status(500).json({ message: 'Erro ao processar a solicitação.' });
  }
};


const resetPassword = async (req, res) => {
  const { token } = req.params;
  const { resetByAdmin, userId, password } = req.body;

  try {
    // Se for o reset por admin, vamos usar a senha padrão
    if (resetByAdmin) {
      const user = await User.findByPk(userId); // Admin passa o ID do usuário para resetar

      if (!user) {
        return res.status(404).json({ message: 'Usuário não encontrado.' });
      }

      const defaultPassword = process.env.DEFAULT_PASSWORD; // Senha definida no .env
      user.password = defaultPassword;
      await user.save();

      return res.status(200).json({
        message: 'Senha redefinida com sucesso para a senha padrão.',
        novaSenha: defaultPassword,  // Retorna a senha padrão, caso necessário para o admin
      });
    }

    // Reset via link de e-mail, o token é necessário
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.id);

    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado.' });
    }

    // Aqui o usuário está definindo a própria senha
    const hashedPassword = password;
    user.password = hashedPassword;
    await user.save();

    return res.status(200).json({ message: 'Senha redefinida com sucesso.' });

  } catch (err) {
    console.error('Erro ao redefinir senha:', err);
    return res.status(400).json({ message: 'Token inválido ou expirado.' });
  }
};

// Exporta as funções do controller
module.exports = {
  login,
  register,
  logout,
  verifyAuth,
  checkNameAndEmailExistence,
  requestPasswordReset,
  resetPassword,
};
