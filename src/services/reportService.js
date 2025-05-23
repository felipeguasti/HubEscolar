// src/services/reportService.js
const axios = require('axios');
const winston = require('winston');
require('dotenv').config();
const REPORT_SERVICE_BASE_URL = process.env.REPORT_SERVICE_URL;

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.Console(),
    ],
});

const reportService = {
    async createReport(accessToken, reportData) {
        try {
            const response = await axios.post(
                `${REPORT_SERVICE_BASE_URL}/reports/create`,
                reportData,
                {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                    },
                }
            );
            return response.data;
        } catch (error) {
            logger.error('Erro ao criar relatório via report-service:', error.response ? error.response.data : error.message);
            throw error;
        }
    },

    async createManualReport(accessToken, reportData) {
        try {
            const response = await axios.post(
                `${REPORT_SERVICE_BASE_URL}/reports/create/manual`,
                reportData,
                {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                    },
                }
            );
            return response.data;
        } catch (error) {
            logger.error('Erro ao criar relatório manual via report-service:', error.response ? error.response.data : error.message);
            throw error;
        }
    },
    async getDisciplinaryOptions(accessToken) {
        try {
            const response = await axios.get(
                `${REPORT_SERVICE_BASE_URL}/reports/disciplinary-options`,
                {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                    },
                }
            );
            return response.data;
        } catch (error) {
            logger.error('Erro ao buscar opções disciplinares via report-service:', error.response ? error.response.data : error.message);
            throw error;
        }
    },

    async listReports(accessToken, filters = {}) {
        try {
            // Construir query string com os filtros
            const queryParams = new URLSearchParams();
            
            // Adicionar filtros à query string se fornecidos
            if (filters.id) queryParams.append('id', filters.id);     // Adicionando id aqui
            if (filters.studentId) queryParams.append('studentId', filters.studentId);
            if (filters.createdById) queryParams.append('createdById', filters.createdById);
            if (filters.reportLevel) queryParams.append('reportLevel', filters.reportLevel);
            if (filters.suspended) queryParams.append('suspended', filters.suspended);
            if (filters.callParents) queryParams.append('callParents', filters.callParents);
            if (filters.startDate) queryParams.append('startDate', filters.startDate);
            if (filters.endDate) queryParams.append('endDate', filters.endDate);
            if (filters.limit) queryParams.append('limit', filters.limit);
            if (filters.offset) queryParams.append('offset', filters.offset);

            console.log('Query params sendo enviados:', queryParams.toString()); // Debug

            const response = await axios.get(
                `${REPORT_SERVICE_BASE_URL}/reports/list?${queryParams.toString()}`,
                {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                    },
                }
            );

            logger.info(`Relatórios listados com sucesso. Total: ${response.data.total}`);
            return response.data;
        } catch (error) {
            logger.error('Erro ao listar relatórios via report-service:', 
                error.response ? error.response.data : error.message);
            throw error;
        }
    },

    async generateReportPDF(accessToken, reportId, logos) {
        try {
            logger.info(`Iniciando geração de PDF para o relatório ID: ${reportId}`);
            logger.info('Logos sendo enviados:', logos);

            // Construir query string com os logos
            const queryParams = new URLSearchParams();
            if (logos?.schoolLogo) queryParams.append('schoolLogo', logos.schoolLogo);
            if (logos?.districtLogo) queryParams.append('districtLogo', logos.districtLogo);

            const response = await axios.get(
                `${REPORT_SERVICE_BASE_URL}/reports/${reportId}/print?${queryParams.toString()}`,
                {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                    },
                    responseType: 'arraybuffer' // Important for PDF binary data
                }
            );

            logger.info(`PDF gerado com sucesso para o relatório ID: ${reportId}`);
            return response.data;
        } catch (error) {
            logger.error('Erro ao gerar PDF do relatório via report-service:', 
                error.response ? error.response.data : error.message);
            throw error;
        }
    },

    async deleteReport(accessToken, reportId) {
        try {
            const response = await axios.delete(
                `${REPORT_SERVICE_BASE_URL}/reports/delete/${reportId}`,
                {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                    },
                }
            );
            logger.info(`Relatório ID ${reportId} excluído com sucesso`);
            return response.data;
        } catch (error) {
            logger.error('Erro ao deletar relatório via report-service:', 
                error.response ? error.response.data : error.message);
            throw error;
        }
    },

    async registerDelivery(accessToken, reportId, deliveryData) {
        try {
            logger.info(`Registrando entrega para o relatório ID: ${reportId}`);
            logger.info('Dados da entrega:', deliveryData);

            const response = await axios.post(
                `${REPORT_SERVICE_BASE_URL}/reports/${reportId}/deliver`,
                deliveryData,
                {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                    }
                }
            );

            logger.info(`Entrega registrada com sucesso para o relatório ID: ${reportId}`);
            return response.data;
        } catch (error) {
            logger.error('Erro ao registrar entrega via report-service:', 
                error.response ? error.response.data : error.message);
            throw error;
        }
    },

    async generateStudentOccurrencesReportPDF(accessToken, studentId, logos = {}, filters = {}) {
        try {
            logger.info(`Gerando relatório de ocorrências para o aluno ID: ${studentId}`);
            
            // Construir query params
            const queryParams = new URLSearchParams();
            if (filters.startDate) queryParams.append('startDate', filters.startDate);
            if (filters.endDate) queryParams.append('endDate', filters.endDate);
            if (filters.reportLevel) queryParams.append('reportLevel', filters.reportLevel);
            
            // Adicionar logos à query string
            if (logos?.schoolLogo) queryParams.append('schoolLogo', logos.schoolLogo);
            if (logos?.districtLogo) queryParams.append('districtLogo', logos.districtLogo);
            
            const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
            
            logger.info(`Query params para relatório de ocorrências: ${queryString}`);
            
            // Chamar o microserviço de relatórios
            const response = await axios.get(
                `${REPORT_SERVICE_BASE_URL}/reports/student/${studentId}/occurrences/pdf${queryString}`,
                {
                    headers: {
                        Authorization: `Bearer ${accessToken}`
                    },
                    responseType: 'arraybuffer' // Importante para receber corretamente o PDF
                }
            );
            
            logger.info(`PDF de ocorrências do aluno ID ${studentId} gerado com sucesso`);
            return response.data;
            
        } catch (error) {
            logger.error('Erro ao gerar relatório de ocorrências do aluno:', 
                error.response ? error.response.data : error.message);
            
            // Se o erro contém resposta e não é um PDF
            if (error.response && error.response.headers['content-type']?.includes('application/json')) {
                try {
                    const errorData = JSON.parse(Buffer.from(error.response.data).toString());
                    throw new Error(errorData.error || errorData.message || 'Erro no serviço de relatórios');
                } catch {
                    throw error;
                }
            }
            
            throw error;
        }
    },
};

module.exports = reportService;