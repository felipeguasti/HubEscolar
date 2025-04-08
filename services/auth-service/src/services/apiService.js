const axios = require('axios');
const logger = require('./logger'); // Importe o logger

const apiService = {
    async get(url) {
        try {
            const response = await axios.get(url);
            logger.debug(`GET request to ${url} successful.`);
            return response;
        } catch (error) {
            logger.error(`Erro ao fazer GET em ${url}:`, error.message);
            logger.debug(`Detalhes do erro GET em ${url}:`, error);
            throw error;
        }
    },

    async post(url, data) {
        try {
            const response = await axios.post(url, data);
            logger.debug(`POST request to ${url} successful.`);
            return response;
        } catch (error) {
            logger.error(`Erro ao fazer POST em ${url}:`, error.message);
            logger.debug(`Detalhes do erro POST em ${url}:`, error);
            throw error; // Rejogue o erro para ser tratado no controller
        }
    },

    async put(url, data) {
        try {
            const response = await axios.put(url, data);
            logger.debug(`PUT request to ${url} successful.`);
            return response;
        } catch (error) {
            logger.error(`Erro ao fazer PUT em ${url}:`, error.message);
            logger.debug(`Detalhes do erro PUT em ${url}:`, error);
            throw error; // Rejogue o erro para ser tratado no controller
        }
    },

    async delete(url) {
        try {
            const response = await axios.delete(url);
            logger.debug(`DELETE request to ${url} successful.`);
            return response;
        } catch (error) {
            logger.error(`Erro ao fazer DELETE em ${url}:`, error.message);
            logger.debug(`Detalhes do erro DELETE em ${url}:`, error);
            throw error; // Rejogue o erro para ser tratado no controller
        }
    },
};

module.exports = apiService;