const syncService = require('../services/syncService');
const logger = require('../utils/logger');

class SyncController {
    /**
     * Importa turmas do SEGES para a escola
     * @param {Object} req - Request do Express
     * @param {Object} res - Response do Express
     */
    async importTurmas(req, res) {
        try {
            const { schoolId } = req.params;
            
            if (!schoolId) {
                return res.status(400).json({
                    success: false,
                    message: 'ID da escola é obrigatório'
                });
            }
            
            // Extrair token da requisição
            const token = req.headers.authorization?.split(' ')[1];
            if (!token) {
                return res.status(401).json({
                    success: false,
                    message: 'Token de autenticação não fornecido'
                });
            }
            
            logger.info(`Solicitação de importação de turmas para escola ${schoolId}`);
            
            // Chamar o serviço de sincronização
            const resultado = await syncService.importTurmas(token, schoolId);
            
            return res.status(200).json({
                success: true,
                message: 'Importação de turmas concluída com sucesso',
                resultado
            });
            
        } catch (error) {
            logger.error('Erro na importação de turmas:', error);
            
            return res.status(500).json({
                success: false,
                message: 'Erro ao importar turmas',
                error: error.message
            });
        }
    }
    
    /**
     * Importa alunos do SEGES para a escola
     * @param {Object} req - Request do Express
     * @param {Object} res - Response do Express
     */
    async importAlunos(req, res) {
        try {
            const { schoolId } = req.params;
            
            if (!schoolId) {
                return res.status(400).json({
                    success: false,
                    message: 'ID da escola é obrigatório'
                });
            }
            
            // Extrair token da requisição
            const token = req.headers.authorization?.split(' ')[1];
            if (!token) {
                return res.status(401).json({
                    success: false,
                    message: 'Token de autenticação não fornecido'
                });
            }
            
            logger.info(`Solicitação de importação de alunos para escola ${schoolId}`);
            
            // Chamar o serviço de sincronização
            const resultado = await syncService.importAlunos(token, schoolId);
            
            return res.status(200).json({
                success: true,
                message: 'Importação de alunos concluída com sucesso',
                resultado
            });
            
        } catch (error) {
            logger.error('Erro na importação de alunos:', error);
            
            return res.status(500).json({
                success: false,
                message: 'Erro ao importar alunos',
                error: error.message
            });
        }
    }
    
    /**
     * Importa turmas e alunos do SEGES para a escola
     * @param {Object} req - Request do Express
     * @param {Object} res - Response do Express
     */
    async importTurmasEAlunos(req, res) {
        try {
            const { schoolId } = req.params;
            
            if (!schoolId) {
                return res.status(400).json({
                    success: false,
                    message: 'ID da escola é obrigatório'
                });
            }
            
            // Extrair token da requisição
            const token = req.headers.authorization?.split(' ')[1];
            if (!token) {
                return res.status(401).json({
                    success: false,
                    message: 'Token de autenticação não fornecido'
                });
            }
            
            logger.info(`Solicitação de importação completa (turmas e alunos) para escola ${schoolId}`);
            
            // Chamar o serviço de sincronização
            const resultado = await syncService.importTurmasEAlunos(token, schoolId);
            
            return res.status(200).json({
                success: true,
                message: 'Importação completa concluída com sucesso',
                resultado
            });
            
        } catch (error) {
            logger.error('Erro na importação completa:', error);
            
            return res.status(500).json({
                success: false,
                message: 'Erro ao realizar importação completa',
                error: error.message
            });
        }
    }
    
    /**
     * Verifica a disponibilidade do serviço SEGES
     * @param {Object} req - Request do Express
     * @param {Object} res - Response do Express
     */
    async verificarStatusSEGES(req, res) {
        try {
            // Extrair token da requisição
            const token = req.headers.authorization?.split(' ')[1];
            if (!token) {
                return res.status(401).json({
                    success: false,
                    message: 'Token de autenticação não fornecido'
                });
            }
            
            // Verificar disponibilidade do serviço SEGES
            const resultado = await syncService.verificarDisponibilidadeSEGES(token);
            
            return res.status(200).json({
                success: true,
                disponivel: resultado.disponivel,
                status: resultado.status,
                message: resultado.mensagem || (resultado.disponivel ? 
                    'Serviço SEGES está disponível' : 
                    'Serviço SEGES não está disponível no momento')
            });
            
        } catch (error) {
            logger.error('Erro ao verificar status do SEGES:', error);
            
            return res.status(500).json({
                success: false,
                disponivel: false,
                message: 'Erro ao verificar disponibilidade do serviço SEGES',
                error: error.message
            });
        }
    }
    
    /**
     * Retorna métricas de sincronização para a escola
     * @param {Object} req - Request do Express
     * @param {Object} res - Response do Express
     */
    async getMetricas(req, res) {
        try {
            const { schoolId } = req.params;
            
            if (!schoolId) {
                return res.status(400).json({
                    success: false,
                    message: 'ID da escola é obrigatório'
                });
            }
            
            // Extrair token da requisição
            const token = req.headers.authorization?.split(' ')[1];
            if (!token) {
                return res.status(401).json({
                    success: false,
                    message: 'Token de autenticação não fornecido'
                });
            }
            
            // Obter metricas de sincronização
            const metricas = await syncService.obterMetricasSincronizacao(token, schoolId);
            
            return res.status(200).json({
                success: true,
                metricas
            });
            
        } catch (error) {
            logger.error('Erro ao buscar métricas de sincronização:', error);
            
            return res.status(500).json({
                success: false,
                message: 'Erro ao obter métricas de sincronização',
                error: error.message
            });
        }
    }
}

// Adicionar estes métodos no serviço caso não existam
async function verificarDisponibilidadeSEGES(token) {
    try {
        const response = await axios.get(`${this.segesServiceUrl}/status`, {
            headers: {
                'Authorization': `Bearer ${token}`
            },
            timeout: 5000 // Timeout de 5 segundos
        });
        
        return response.status === 200;
    } catch (error) {
        logger.warn('Serviço SEGES indisponível:', error.message);
        return false;
    }
}

async function obterMetricasSincronizacao(token, schoolId) {
    try {
        // Contagem de turmas
        const turmas = await this.fetchExistingClasses(token, schoolId);
        
        // Contagem de alunos
        const alunosResponse = await axios.get(
            `${this.usersServiceUrl}/users/list?schoolId=${schoolId}&role=Aluno&countOnly=true`,
            {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            }
        );
        
        // Última sincronização (implementar tabela de histórico se necessário)
        let ultimaSincronizacao = null;
        // TODO: Buscar da tabela de histórico
        
        return {
            totalTurmas: turmas.length,
            totalAlunos: alunosResponse.data.count || 0,
            ultimaSincronizacao
        };
    } catch (error) {
        logger.error('Erro ao obter métricas:', error);
        throw new Error(`Falha ao buscar métricas: ${error.message}`);
    }
}

module.exports = new SyncController();