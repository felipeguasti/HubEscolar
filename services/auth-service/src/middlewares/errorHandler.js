import logger from '../services/logger.js';

export const errorHandler = (err, req, res, next) => {
    logger.error('Erro detectado:', err);
    logger.error('Stack trace:', err.stack);

    if (err.response && err.response.status && err.config && err.config.url) {
        const { status, data } = err.response;
        const serviceUrl = err.config.url;
        const serviceName = getServiceNameFromUrl(serviceUrl);
        const errorMessage = `Erro ao comunicar com o serviço ${serviceName} (Status: ${status}).`;

        logger.error(errorMessage, { status, serviceUrl, data });

        if (status === 400) {
            return res.status(400).json({ message: 'Requisição inválida.' });
        }
        if (status === 401) {
            return res.status(401).json({ message: 'Não autorizado.' });
        }
        if (status === 404) {
            return res.status(404).json({ message: 'Recurso não encontrado.' });
        }
        return res.status(status).json({ message: 'Erro ao processar a requisição.' });
    }

    if (err.name === 'UnauthorizedError') {
        return res.status(401).json({ message: 'Não autorizado.' });
    }

    if (err.name === 'ValidationError') {
        return res.status(400).json({ message: 'Dados de entrada inválidos.' });
    }

    res.status(500).json({ message: 'Ocorreu um erro ao processar sua requisição.' });
};

function getServiceNameFromUrl(url) {
    try {
        const parsedUrl = new URL(url);
        const hostnameParts = parsedUrl.hostname.split('.');
        if (hostnameParts.length > 1) {
            return hostnameParts[0];
        }
        return parsedUrl.hostname;
    } catch (error) {
        return 'Serviço Externo';
    }
}

export default errorHandler;