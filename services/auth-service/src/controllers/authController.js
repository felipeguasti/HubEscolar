// src/controllers/authController.js
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const apiService = require('../services/apiService');
const { body, param } = require('express-validator');
require('dotenv').config();
const USERS_SERVICE_URL = process.env.USERS_SERVICE_URL;
const { JWT_EXPIRATION_TIME, JWT_REFRESH_EXPIRATION_TIME, getMidnightExpiration } = require('../services/constants');
const logger = require('../services/logger');
const { v4: uuidv4 } = require('uuid');
const RefreshToken = require('../models/RefreshToken');
const moment = require('moment-timezone');


function generateRefreshToken() {
    return uuidv4();
}

const login = async (req, res, next) => {
    const { email, password } = req.body;

    try {
        if (!email || !password) {
            logger.warn('Tentativa de login sem email ou senha.');
            return res.status(400).json({ message: 'Email e senha são obrigatórios.' });
        }

        logger.info(`Consultando users-service para o usuário com o email: ${email}`);
        const response = await apiService.get(`${USERS_SERVICE_URL}/users/email/${email}`);

        if (response.status === 200 && response.data) {
            const user = response.data;
            logger.info(`Usuário encontrado no users-service: ${user.id}`);

            logger.info(`Verificando a senha do usuário: ${user.id}`);
            const isPasswordValid = await bcrypt.compare(password, user.password);
            if (!isPasswordValid) {
                logger.warn(`Senha inválida para o usuário: ${email}`);
                return res.status(401).json({ message: 'Usuário ou senha inválidos.' });
            }

            logger.info(`Gerando o Access Token JWT para o usuário: ${user.id}`);
            const accessToken = jwt.sign(
                { id: user.id, role: user.role },
                process.env.JWT_SECRET,
                { expiresIn: getMidnightExpiration() } // Token expira à meia-noite
            );
            logger.debug(`Access Token gerado para o usuário ${user.id}: ${accessToken}`);

            logger.info(`Gerando Refresh Token para o usuário: ${user.id}`);
            const refreshToken = generateRefreshToken();
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + JWT_REFRESH_EXPIRATION_TIME);

            await RefreshToken.create({
                token: refreshToken,
                userId: user.id,
                expiresAt: expiresAt,
            });
            logger.debug(`Refresh Token gerado e salvo no banco de dados para o usuário ${user.id}: ${refreshToken}`);

            return res.status(200).json({
                message: 'Login bem-sucedido.',
                accessToken: accessToken,
                refreshToken: refreshToken,
            });
        } else if (response.status === 404) {
            logger.warn(`Usuário com o email ${email} não encontrado no users-service.`);
            return res.status(401).json({ message: 'Usuário ou senha inválidos.' });
        } else {
            logger.error(`Erro ao comunicar com o users-service (Status: ${response.status}):`, response.data);
            return res.status(500).json({ message: 'Erro ao fazer login.' });
        }

    } catch (error) {
        logger.error('Erro no login:', error);
        next(error);
    }
};

const refreshToken = async (req, res, next) => {
    const { refreshToken: requestToken } = req.body;

    if (!requestToken) {
        logger.warn('Requisição de refresh token sem token fornecido.');
        return res.status(400).json({ message: 'Refresh token é obrigatório.' });
    }

    try {
        const refreshTokenRecord = await RefreshToken.findOne({ where: { token: requestToken } });

        if (!refreshTokenRecord) {
            logger.warn(`Refresh token inválido ou não encontrado no banco de dados: ${requestToken}`);
            return res.status(401).json({ message: 'Refresh token inválido.' });
        }

        if (refreshTokenRecord.expiresAt < new Date()) {
            logger.warn(`Refresh token expirado: ${requestToken}`);
            await refreshTokenRecord.destroy(); // Remova o token expirado
            return res.status(401).json({ message: 'Refresh token expirado.' });
        }

        const userId = refreshTokenRecord.userId;

        logger.info(`Consultando users-service para obter informações do usuário ID: ${userId}`);
        const response = await apiService.get(`${USERS_SERVICE_URL}/users/filter?id=${userId}`);

        if (response.status === 200 && response.data) {
            const user = response.data;
            logger.info(`Informações do usuário ID ${userId} recebidas do users-service.`);

            const newAccessToken = jwt.sign(
                { id: user.id, role: user.role },
                process.env.JWT_SECRET,
                { expiresIn: JWT_EXPIRATION_TIME }
            );
            logger.debug(`Novo Access Token gerado para o usuário ${userId}: ${newAccessToken}`);

            const newRefreshToken = generateRefreshToken();
            const newExpiresAt = new Date();
            newExpiresAt.setDate(newExpiresAt.getDate() + JWT_REFRESH_EXPIRATION_TIME);

            await refreshTokenRecord.update({ token: newRefreshToken, expiresAt: newExpiresAt });
            logger.debug(`Refresh Token rotacionado e atualizado no banco de dados para o usuário ${userId}: ${newRefreshToken}`);

            return res.status(200).json({
                accessToken: newAccessToken,
                refreshToken: newRefreshToken,
            });
        } else if (response.status === 404) {
            logger.warn(`Usuário ID ${userId} não encontrado no users-service (associado ao refresh token).`);
            await refreshTokenRecord.destroy();
            return res.status(401).json({ message: 'Refresh token inválido.' });
        } else {
            logger.error(`Erro ao comunicar com o users-service ao renovar token (Status: ${response.status}):`, response.data);
            return res.status(500).json({ message: 'Erro ao renovar o token.' });
        }

    } catch (error) {
        logger.error('Erro ao processar a requisição de refresh token:', error);
        next(error);
    }
};

const logout = async (req, res) => {
    const { refreshToken } = req.body;

    if (refreshToken) {
        try {
            const destroyedRows = await RefreshToken.destroy({ where: { token: refreshToken } });
            if (destroyedRows > 0) {
                logger.info(`Refresh token revogado com sucesso: ${refreshToken}`);
                return res.status(204).send(); // 204 No Content - Token removido
            } else {
                logger.warn(`Refresh token não encontrado para revogação: ${refreshToken}`);
                return res.status(400).json({ message: 'Refresh token inválido.' });
            }
        } catch (error) {
            logger.error('Erro ao revogar refresh token:', error);
            return res.status(500).json({ message: 'Erro ao revogar o refresh token.' });
        }
    } else {
        return res.status(400).json({ message: 'Refresh token é obrigatório para logout.' });
    }
};

const verifyAuth = (req, res) => {
    const user = req.user;
    if (!user) {
        logger.warn('Tentativa de acesso não autenticada.');
        return res.status(401).json({ message: 'Usuário não autenticado.' });
    }
    logger.info(`Usuário autenticado: ${user.id}`);
    return res.status(200).json({ message: 'Usuário autenticado.', userId: user.id, role: user.role });
};

const requestPasswordReset = async (req, res, next) => {
    const { email } = req.body;

    try {
        logger.info(`Solicitando redefinição de senha para o e-mail: ${email}`);
        const response = await apiService.post(`${USERS_SERVICE_URL}/users/request-password-reset`, { email });

        if (response.status === 200) {
            logger.info(`Solicitação de redefinição de senha para ${email} enviada ao users-service.`);
            return res.status(200).json({ message: response.data.message });
        } else if (response.status === 404) {
            logger.warn(`Usuário com o e-mail ${email} não encontrado para redefinição de senha.`);
            return res.status(404).json({ message: 'Usuário não encontrado.' });
        } else {
            logger.error(`Erro ao comunicar com o users-service para redefinição de senha (Status: ${response.status}):`, response.data);
            return res.status(500).json({ message: 'Erro ao processar a solicitação de redefinição de senha.' });
        }

    } catch (err) {
        logger.error('Erro ao solicitar redefinição de senha:', err);
        next(err);
    }
};

const resetPassword = async (req, res, next) => {
    const { token } = req.params;
    const { password } = req.body;

    try {
        logger.info(`Redefinindo senha com token: ${token}`);
        const response = await apiService.post(`${USERS_SERVICE_URL}/users/reset-password/${token}`, { password });

        if (response.status === 200) {
            logger.info(`Senha redefinida com sucesso para o token: ${token}`);
            return res.status(200).json({ message: response.data.message });
        } else if (response.status === 400) {
            logger.warn(`Token de redefinição de senha inválido ou expirado: ${token}`);
            return res.status(400).json({ message: 'Token inválido ou expirado.' });
        } else if (response.status === 404) {
            logger.warn(`Usuário não encontrado para o token de redefinição de senha: ${token}`);
            return res.status(404).json({ message: 'Usuário não encontrado.' });
        } else {
            logger.error(`Erro ao comunicar com o users-service para redefinição de senha (Status: ${response.status}):`, response.data);
            return res.status(500).json({ message: 'Erro ao redefinir a senha.' });
        }

    } catch (err) {
        logger.error('Erro ao redefinir senha:', err);
        next(err);
    }
};

module.exports = {
    login,
    logout,
    verifyAuth,
    requestPasswordReset,
    resetPassword,
    refreshToken,
};