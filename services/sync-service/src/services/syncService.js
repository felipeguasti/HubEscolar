const axios = require('axios');
const logger = require('../utils/logger');
const { SyncJob, SyncItem } = require('../models');
const { Sequelize } = require('sequelize');
const db = require('../config/db');

class SyncService {
    constructor() {
        // URLs dos serviços baseados nas variáveis de ambiente
        this.segesServiceUrl = process.env.SEGES_SERVICE_URL || 'http://localhost:3007';
        this.schoolServiceUrl = process.env.SCHOOL_SERVICE_URL || 'http://localhost:3002';
        this.usersServiceUrl = process.env.USERS_SERVICE_URL || 'http://localhost:3001';
    }

    /**
     * Importa turmas do SEGES para o school-service
     * @param {string} token - Token JWT do usuário logado
     * @param {number} schoolId - ID da escola para importar as turmas
     * @returns {Object} Resultado da importação
     */
    async importTurmas(token, schoolId) {
        let job;
        try {
            logger.info(`Iniciando importação de turmas para a escola ID: ${schoolId}`);
            
            // 1. Obter dados do usuário logado para obter districtId
            const userData = await this.getUserData(token);
            
            // 2. Criar registro de job
            job = await SyncJob.create({
                schoolId,
                userId: userData.id,
                jobType: 'classes',
                status: 'processing'
            });
            
            // 3. Obter dados do SEGES
            const segesData = await this.fetchSegesData(token);
            
            // 4. Obter lista de turmas existentes na escola
            const existingClasses = await this.fetchExistingClasses(token, schoolId);
            
            // 5. Processar turmas do SEGES
            const turmasProcessadas = this.processarTurmasSEGES(
                segesData, 
                schoolId, 
                userData.districtId
            );
            
            // 6. Filtrar turmas que já existem
            const { turmasNovas, turmasExistentes } = this.filtrarTurmasExistentes(
                turmasProcessadas, 
                existingClasses
            );
            
            // 7. Criar turmas novas
            const resultadoCriacao = await this.criarTurmasNovas(token, turmasNovas);
            
            // 8. Atualizar job ao concluir
            await job.update({
                status: 'completed',
                endTime: new Date(),
                totalItems: turmasProcessadas.length,
                createdItems: resultadoCriacao.criadas.length,
                failedItems: resultadoCriacao.erros.length,
                result: {
                    totalTurmasSEGES: Object.keys(segesData).length - 1, // -1 para excluir o campo metadados
                    turmasJaExistentes: turmasExistentes.length,
                    turmasCriadas: resultadoCriacao.criadas.length,
                    turmasComErro: resultadoCriacao.erros.length
                }
            });
            
            // 9. Preparar resposta com estatísticas
            return {
                success: true,
                jobId: job.id,
                totalTurmasSEGES: Object.keys(segesData).length - 1, // -1 para excluir o campo metadados
                turmasJaExistentes: turmasExistentes.length,
                turmasCriadas: resultadoCriacao.criadas.length,
                turmasComErro: resultadoCriacao.erros.length,
                erros: resultadoCriacao.erros
            };
            
        } catch (error) {
            // Se houver job criado, atualizar com erro
            if (job) {
                await job.update({
                    status: 'failed',
                    endTime: new Date(),
                    error: error.message
                });
            }
            
            logger.error(`Erro na importação de turmas para escola ${schoolId}:`, error);
            throw new Error(`Falha na importação de turmas: ${error.message}`);
        }
    }

    /**
     * Importa alunos do SEGES para o users-service
     * @param {string} token - Token JWT do usuário logado
     * @param {number} schoolId - ID da escola
     * @returns {Object} Resultado da importação
     */
    async importAlunos(token, schoolId) {
        try {
            logger.info(`Iniciando importação de alunos para a escola ID: ${schoolId}`);
            
            // 1. Obter dados do usuário logado para obter districtId
            const userData = await this.getUserData(token);
            const { districtId } = userData;
            
            // 2. Obter dados do SEGES
            const segesData = await this.fetchSegesData(token);
            
            // 3. Obter lista de turmas existentes na escola
            const existingClasses = await this.fetchExistingClasses(token, schoolId);
            
            // 4. Verificar se todas as turmas existem, se não, criar as que faltam
            const turmasResult = await this.verificarCriarTurmas(token, segesData, schoolId, districtId, existingClasses);
            
            // 5. Obter lista atualizada de turmas (incluindo as recém-criadas)
            const updatedClasses = turmasResult.todasTurmas;
            
            // 6. Processar alunos de todas as turmas
            const alunosProcessados = await this.processarAlunosSEGES(
                segesData, 
                schoolId, 
                districtId, 
                updatedClasses
            );
            
            // 7. Verificar alunos existentes e criar/atualizar conforme necessário
            const resultadoAlunos = await this.criarOuAtualizarAlunos(token, alunosProcessados);
            
            // 8. Preparar resposta com estatísticas
            return {
                success: true,
                totalTurmasSEGES: turmasResult.totalTurmasSEGES,
                turmasCriadas: turmasResult.turmasCriadas,
                totalAlunosSEGES: alunosProcessados.length,
                alunosCriados: resultadoAlunos.criados.length,
                alunosAtualizados: resultadoAlunos.atualizados.length,
                alunosComErro: resultadoAlunos.erros.length,
                erros: resultadoAlunos.erros
            };
            
        } catch (error) {
            logger.error(`Erro na importação de alunos para escola ${schoolId}:`, error);
            throw new Error(`Falha na importação de alunos: ${error.message}`);
        }
    }

    /**
     * Importa turmas e alunos do SEGES de forma sequencial
     * @param {string} token - Token JWT do usuário logado
     * @param {number} schoolId - ID da escola
     * @returns {Object} Resultado da importação completa
     */
    async importTurmasEAlunos(token, schoolId) {
        try {
            logger.info(`Iniciando importação de turmas e alunos para escola ${schoolId}`);
            
            // Obter dados do usuário
            const userData = await this.getUserData(token);
            logger.info(`Usuário autenticado: ${userData.id} (${userData.role})`);
            
            // URL correta para buscar turmas por escola
            const gradesUrl = `${this.schoolServiceUrl}/grades/school/${schoolId}`;
            logger.debug(`Buscando turmas no endpoint: ${gradesUrl}`);
            
            // Obter turmas da escola
            const gradesResponse = await axios.get(gradesUrl, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            // Verificar formato da resposta e extrair o array de turmas
            let grades = [];
            if (gradesResponse.data) {
                if (Array.isArray(gradesResponse.data)) {
                    // Se a resposta já for um array
                    grades = gradesResponse.data;
                } else if (gradesResponse.data.data && Array.isArray(gradesResponse.data.data)) {
                    // Se a resposta estiver no formato { status, data[] }
                    grades = gradesResponse.data.data;
                } else {
                    logger.debug('Formato de resposta inesperado:', JSON.stringify(gradesResponse.data));
                }
            }
            
            logger.info(`${grades.length} turmas encontradas para a escola ${schoolId}`);
            
            // Se não houver turmas na API, tentar buscar dados dos arquivos locais
            if (grades.length === 0) {
                logger.warn('Nenhuma turma encontrada na API, verificando arquivos locais');
                
                try {
                    // Buscar dados do SEGES (que também verifica arquivos locais)
                    const segesData = await this.fetchSegesData(token);
                    
                    // Verificar se há turmas no arquivo local
                    const turmasNomes = Object.keys(segesData).filter(key => key !== "metadados");
                    
                    if (turmasNomes.length > 0) {
                        logger.info(`Encontradas ${turmasNomes.length} turmas nos arquivos locais`);
                        
                        // Verificar se o usuário tem districtId
                        if (!userData.districtId) {
                            logger.warn('Usuário não tem districtId, usando valor padrão 1');
                            userData.districtId = 1; // Valor padrão
                        }
                        
                        // Processar turmas do SEGES
                        const turmasProcessadas = this.processarTurmasSEGES(
                            segesData, 
                            schoolId, 
                            userData.districtId
                        );
                        
                        logger.debug(`Após processamento: ${turmasProcessadas.length} turmas processadas`);
                        
                        // Exibir a primeira turma processada para debug
                        if (turmasProcessadas.length > 0) {
                            logger.debug('Exemplo de turma processada:', JSON.stringify(turmasProcessadas[0]));
                        } else {
                            logger.error('NENHUMA TURMA FOI PROCESSADA!');
                            logger.debug('Dados SEGES recebidos:', Object.keys(segesData));
                            logger.debug('schoolId:', schoolId);
                            logger.debug('districtId:', userData.districtId);
                        }
                        
                        // Criar as turmas
                        const resultadoCriacao = await this.criarTurmasNovas(token, turmasProcessadas);
                        
                        // Verificar se alguma turma foi criada
                        if (resultadoCriacao.criadas.length === 0) {
                            logger.warn('Nenhuma turma foi criada na API, verificando se devemos usar os dados originais');
                            
                            // Se não tem erros, talvez a API não esteja retornando IDs corretamente
                            // Neste caso, vamos usar as turmas processadas com IDs temporários
                            if (resultadoCriacao.erros.length === 0) {
                                // Criar IDs temporários para as turmas para continuar o processo
                                const turmasComIdTemporario = turmasProcessadas.map((turma, index) => ({
                                    ...turma,
                                    id: 9000 + index, // Usar IDs temporários começando de 9000
                                    temporaryId: true
                                }));
                                
                                logger.info(`Criando ${turmasComIdTemporario.length} turmas com IDs temporários para processamento`);
                                
                                // Processar alunos com estas turmas temporárias
                                const alunosProcessados = await this.processarAlunosSEGES(
                                    segesData,
                                    schoolId,
                                    userData.districtId,
                                    turmasComIdTemporario
                                );
                                
                                // Continue com o processamento dos alunos...
                            } else {
                                // Se houver erros, registrar o job com falha
                            }
                        } else {
                            // Processo normal quando as turmas são criadas com sucesso
                            const alunosProcessados = await this.processarAlunosSEGES(
                                segesData,
                                schoolId,
                                userData.districtId,
                                resultadoCriacao.criadas
                            );
                            
                            // Continuar com o processamento...
                        }
                    } else {
                        logger.warn('Nenhuma turma encontrada nos arquivos locais também');
                    }
                } catch (localDataError) {
                    logger.error('Erro ao processar dados locais:', localDataError);
                }
                
                // Se chegarmos aqui, não há turmas na API nem nos arquivos locais
                logger.warn(`Nenhuma turma encontrada para a escola ${schoolId}`);
                
                // Criar um job para registrar a tentativa
                const job = await SyncJob.create({
                    schoolId,
                    userId: userData.id,
                    jobType: 'all',
                    status: 'completed',
                    totalItems: 0,
                    createdItems: 0,
                    updatedItems: 0,
                    failedItems: 0,
                    startTime: new Date(),
                    endTime: new Date(),
                    result: {
                        message: 'Nenhuma turma encontrada para importação na API ou arquivos locais'
                    }
                });
                
                return {
                    success: true,
                    warning: true,
                    message: 'Nenhuma turma encontrada para importação na API ou arquivos locais',
                    jobId: job.id
                };
            }
            
            // Se chegamos aqui, existem turmas na escola, então vamos importar os alunos
            if (grades.length > 0) {
                logger.info(`Usando ${grades.length} turmas existentes para importar alunos`);
                
                try {
                    // Buscar dados do SEGES para os alunos
                    const segesData = await this.fetchSegesData(token);
                    
                    // Processar alunos com as turmas existentes
                    const alunosProcessados = await this.processarAlunosSEGES(
                        segesData,
                        schoolId,
                        userData.districtId,
                        grades,
                        token // Passar o token para poder verificar alunos existentes
                    );
                    
                    // Se não houver alunos para processar, retornar
                    if (alunosProcessados.length === 0) {
                        logger.info("Nenhum aluno novo encontrado para importar");
                        return {
                            success: true,
                            message: `Verificação concluída: ${grades.length} turmas existentes, nenhum aluno novo para importar`
                        };
                    }
                    
                    // Criar ou atualizar os alunos
                    const resultadoAlunos = await this.criarOuAtualizarAlunos(token, alunosProcessados);
                    
                    // Criar um job para registrar o sucesso
                    const job = await SyncJob.create({
                        schoolId,
                        userId: userData.id,
                        jobType: 'all',
                        status: 'completed',
                        totalItems: alunosProcessados.length,
                        createdItems: resultadoAlunos.criados.length,
                        updatedItems: resultadoAlunos.atualizados.length,
                        failedItems: resultadoAlunos.erros.length,
                        startTime: new Date(),
                        endTime: new Date(),
                        result: {
                            turmasExistentes: grades.length,
                            turmasCriadas: 0,
                            alunosCriados: resultadoAlunos.criados.length,
                            alunosAtualizados: resultadoAlunos.atualizados.length,
                            alunosComErro: resultadoAlunos.erros.length
                        }
                    });
                    
                    return {
                        success: true,
                        message: `Importação concluída: ${grades.length} turmas existentes, ${resultadoAlunos.criados.length} alunos novos importados`,
                        jobId: job.id,
                        details: {
                            turmasExistentes: grades.length,
                            alunosCriados: resultadoAlunos.criados.length,
                            alunosAtualizados: resultadoAlunos.atualizados.length,
                            fonteDados: 'dados_locais'
                        }
                    };
                } catch (error) {
                    logger.error('Erro ao processar alunos:', error);
                    throw new Error(`Falha ao processar alunos: ${error.message}`);
                }
            }

            // Se chegou aqui, há turmas mas ocorreu algum problema com o processamento de alunos
            return {
                success: true,
                message: `Importação concluída: ${grades.length} turmas processadas, sem alunos importados`
            };
        } catch (error) {
            // Log detalhado do erro
            if (error.response) {
                logger.error('Erro na resposta da API de turmas:', {
                    status: error.response.status,
                    statusText: error.response.statusText,
                    data: error.response.data,
                    url: error.config?.url
                });
            } else if (error.request) {
                logger.error('Sem resposta da API de turmas:', {
                    message: error.message,
                    code: error.code,
                    url: error.config?.url
                });
            } else {
                logger.error('Erro ao buscar turmas:', error);
            }
            
            throw new Error(`Falha na importação completa: ${error.message}`);
        }
    }

    /**
     * Obtém dados do usuário logado
     * @param {string} token - Token JWT
     * @returns {Object} Dados do usuário
     */
    async getUserData(token) {
        try {
            // 1. Decodificar o token para obter o ID do usuário (sem verificar assinatura)
            const jwt = require('jsonwebtoken');
            const decoded = jwt.decode(token);
            
            if (!decoded || !decoded.id) {
                throw new Error('Token inválido ou sem ID de usuário');
            }
            
            const userId = decoded.id;
            logger.info(`ID extraído do token: ${userId}, buscando dados completos do usuário`);
            
            // 2. Usar a rota /users/list/:id conforme sugerido
            const response = await axios.get(`${this.usersServiceUrl}/users/list/${userId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!response.data) {
                throw new Error(`Nenhum dado retornado para o usuário ID: ${userId}`);
            }
            
            logger.info('Dados do usuário obtidos com sucesso');
            return response.data;
        } catch (error) {
            // Log mais detalhado do erro
            if (error.response) {
                logger.error('Erro na resposta da API:', {
                    status: error.response.status,
                    statusText: error.response.statusText,
                    data: error.response.data,
                    headers: error.response.headers
                });
            } else if (error.request) {
                logger.error('Sem resposta da requisição:', {
                    message: error.message,
                    code: error.code
                });
            } else {
                logger.error('Erro ao configurar requisição:', error);
            }
            
            throw new Error(`Não foi possível obter dados do usuário: ${error.message}`);
        }
    }

    /**
     * Busca dados de turmas e alunos do SEGES ou dos arquivos locais
     * @param {string} token - Token JWT
     * @returns {Object} Dados do SEGES ou arquivos locais
     */
    async fetchSegesData(token) {
        try {
            // 1. Primeiro, verificar se existem arquivos JSON recentes na pasta data
            const fs = require('fs');
            const path = require('path');
            const dataDir = path.join(__dirname, '../../data');
            
            // Verificar se o diretório existe
            if (fs.existsSync(dataDir)) {
                // Obter todos os arquivos na pasta data
                const files = fs.readdirSync(dataDir);
                
                // Filtrar apenas arquivos JSON que começam com dados_alunos_
                const jsonFiles = files.filter(file => 
                    file.endsWith('.json') && file.startsWith('dados_alunos_')
                );
                
                if (jsonFiles.length > 0) {
                    // Ordenar por data de modificação (mais recente primeiro)
                    const sortedFiles = jsonFiles.sort((a, b) => {
                        const statA = fs.statSync(path.join(dataDir, a));
                        const statB = fs.statSync(path.join(dataDir, b));
                        return statB.mtime.getTime() - statA.mtime.getTime();
                    });
                    
                    // Obter o arquivo mais recente
                    const newestFile = sortedFiles[0];
                    const filePath = path.join(dataDir, newestFile);
                    
                    // Verificar a data de modificação
                    const fileStats = fs.statSync(filePath);
                    const fileAge = Date.now() - fileStats.mtime.getTime();
                    const oneDayInMs = 24 * 60 * 60 * 1000;
                    
                    // Se o arquivo tiver menos de 1 dia, usá-lo
                    if (fileAge < oneDayInMs) {
                        logger.info(`Usando arquivo JSON local recente: ${newestFile}`);
                        const jsonData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                        
                        // Logs para debug da estrutura dos dados
                        const turmasNomes = Object.keys(jsonData).filter(key => key !== "metadados");
                        logger.debug(`Arquivo contém ${turmasNomes.length} turmas: ${turmasNomes.join(', ')}`);
                        
                        return jsonData;
                    }
                    
                    logger.info(`Arquivo mais recente (${newestFile}) tem mais de 1 dia, buscando no SEGES`);
                }
            }
            
            // 2. Se não houver arquivos recentes, tentar obter do SEGES
            logger.info('Buscando dados do SEGES via API');
            const response = await axios.get(`${this.segesServiceUrl}/turmas`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            // Se a resposta for bem-sucedida e contiver dados
            if (response.data && Object.keys(response.data).length > 1) {
                logger.info('Dados obtidos do SEGES com sucesso');
                return response.data;
            }
            
            // Se chegou aqui, não há dados no arquivo local nem no SEGES
            logger.warn('Não foi possível obter dados de turmas nem do arquivo local nem do SEGES');
            return { 
                metadados: { 
                    versao: "1.0.0",
                    mensagem: "Não há dados disponíveis"
                } 
            };
            
        } catch (error) {
            // Se houver erro na API, informar claramente
            logger.error(`Erro ao obter dados do SEGES: ${error.message}`);
            throw new Error(`Não foi possível obter dados de turmas: ${error.message}`);
        }
    }

    /**
     * Busca turmas existentes na escola
     * @param {string} token - Token JWT
     * @param {number} schoolId - ID da escola
     * @returns {Array} Lista de turmas existentes
     */
    async fetchExistingClasses(token, schoolId) {
        try {
            const response = await axios.get(`${this.schoolServiceUrl}/grades/list?schoolId=${schoolId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            logger.info(`${response.data.length} turmas existentes encontradas para escola ${schoolId}`);
            return response.data;
        } catch (error) {
            logger.error(`Erro ao obter turmas existentes para escola ${schoolId}:`, error);
            throw new Error(`Falha ao obter turmas existentes: ${error.message}`);
        }
    }

    /**
     * Processa turmas do SEGES para formato do school-service
     * @param {Object} segesData - Dados obtidos do SEGES
     * @param {number} schoolId - ID da escola
     * @param {number} districtId - ID do distrito
     * @returns {Array} Lista de turmas processadas
     */
    processarTurmasSEGES(segesData, schoolId, districtId) {
        const turmasProcessadas = [];
        const currentYear = new Date().getFullYear();
        
        // Verificar a estrutura dos dados recebidos
        logger.debug('Dados recebidos para processamento:', {
            tipoObjeto: typeof segesData,
            temMetadados: 'metadados' in segesData,
            chaves: Object.keys(segesData),
            totalChaves: Object.keys(segesData).length
        });
        
        // Iterar sobre todas as chaves exceto "metadados"
        Object.keys(segesData).forEach(turmaNome => {
            if (turmaNome === "metadados") return;
            
            logger.debug(`Processando turma: ${turmaNome}`);
            
            // Identificar turno baseado APENAS na terceira letra do nome da turma
            let shift = "integral"; // Padrão
            
            // Verificar se o nome da turma tem pelo menos 3 caracteres
            if (turmaNome.length >= 3) {
                // Extrair a terceira letra
                const terceiraLetra = turmaNome.charAt(2).toUpperCase();
                
                // Determinar turno com base na terceira letra
                switch (terceiraLetra) {
                    case 'M':
                        shift = "Manhã";
                        break;
                    case 'V':
                        shift = "Tarde";
                        break;
                    case 'N':
                        shift = "Noite";
                        break;
                    case 'I':
                        shift = "Integral";
                        break;
                    default:
                        shift = "Integral"; // Padrão caso não identifique
                }
            }
            
            // Construir descrição baseada no nome da turma
            let description = "Turma";
            if (turmaNome.includes("1ª")) {
                description = "Turma do primeiro ano";
            } else if (turmaNome.includes("2ª")) {
                description = "Turma do segundo ano";
            } else if (turmaNome.includes("3ª")) {
                description = "Turma do terceiro ano";
            } else if (turmaNome.includes("4ª")) {
                description = "Turma do quarto ano";
            } else if (turmaNome.includes("5ª")) {
                description = "Turma do quinto ano";
            } else if (turmaNome.includes("6ª")) {
                description = "Turma do sexto ano";
            } else if (turmaNome.includes("7ª")) {
                description = "Turma do sétimo ano";
            } else if (turmaNome.includes("8ª")) {
                description = "Turma do oitavo ano";
            } else if (turmaNome.includes("9ª")) {
                description = "Turma do nono ano";
            }
            
            // Adicionar nível de ensino
            if (turmaNome.includes("EM")) {
                description += " do ensino médio";
            } else if (turmaNome.includes("EF")) {
                description += " do ensino fundamental";
            }
            
            description += ` do turno ${shift}`;
            
            // Criar objeto de turma no formato esperado pelo school-service
            const turmaNova = {
                name: turmaNome,
                schoolId: schoolId,
                districtId: districtId || 1, // Usar valor padrão se não houver districtId
                year: currentYear,
                shift: shift,
                startDate: "2025-02-03", // Data fixa conforme especificado
                endDate: "2025-12-23",   // Data fixa conforme especificado
                status: "active",
                description: description
            };
            
            turmasProcessadas.push(turmaNova);
            logger.debug(`Turma ${turmaNome} processada com sucesso`);
        });
        
        logger.info(`${turmasProcessadas.length} turmas processadas do SEGES`);
        return turmasProcessadas;
    }

    /**
     * Filtra turmas que já existem na escola
     * @param {Array} turmasProcessadas - Turmas processadas do SEGES
     * @param {Array} turmasExistentes - Turmas existentes na escola
     * @returns {Object} Turmas novas e existentes
     */
    filtrarTurmasExistentes(turmasProcessadas, turmasExistentes) {
        const turmasNovas = [];
        const turmasExistentesArr = [];
        
        // Filtrar turmas que já existem baseado no nome
        turmasProcessadas.forEach(turma => {
            const turmaExistente = turmasExistentes.find(
                t => t.name === turma.name && t.year === turma.year
            );
            
            if (turmaExistente) {
                turmasExistentesArr.push({ ...turma, id: turmaExistente.id });
            } else {
                turmasNovas.push(turma);
            }
        });
        
        logger.info(`${turmasNovas.length} turmas novas, ${turmasExistentesArr.length} turmas já existentes`);
        
        return {
            turmasNovas,
            turmasExistentes: turmasExistentesArr
        };
    }

    /**
     * Cria turmas novas no school-service
     * @param {string} token - Token JWT
     * @param {Array} turmas - Lista de turmas a criar
     * @returns {Object} Resultado da criação
     */
    async criarTurmasNovas(token, turmas) {
        const criadas = [];
        const erros = [];
        
        // Se não houver turmas para criar, retornar lista vazia
        if (!turmas || turmas.length === 0) {
            logger.warn('Nenhuma turma para criar');
            return { criadas: [], erros: [] };
        }
        
        // Usar o endpoint correto: grades/create
        const endpoint = '/grades/create';
        logger.info(`Criando ${turmas.length} turmas usando endpoint: ${this.schoolServiceUrl}${endpoint}`);
        
        // Criar turmas sequencialmente para evitar problemas
        for (const turma of turmas) {
            try {
                logger.info(`Criando turma: ${turma.name}`, {
                    schoolId: turma.schoolId,
                    districtId: turma.districtId,
                    shift: turma.shift
                });
                
                const response = await axios.post(
                    `${this.schoolServiceUrl}${endpoint}`,
                    turma,
                    {
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        }
                    }
                );
                
                // Log detalhado da resposta para diagnóstico
                logger.debug('Resposta da API:', JSON.stringify(response.data));
                
                // Verificar diferentes formatos de resposta possíveis
                if (response.data) {
                    // Caso 1: { id: number }
                    if (response.data.id) {
                        criadas.push({
                            ...turma,
                            id: response.data.id
                        });
                        logger.info(`Turma ${turma.name} criada com ID: ${response.data.id}`);
                    }
                    // Caso 2: { grade: { id: number } }
                    else if (response.data.grade && response.data.grade.id) {
                        criadas.push({
                            ...turma,
                            id: response.data.grade.id
                        });
                        logger.info(`Turma ${turma.name} criada com ID: ${response.data.grade.id}`);
                    }
                    // Caso 3: { data: { id: number } }
                    else if (response.data.data && response.data.data.id) {
                        criadas.push({
                            ...turma,
                            id: response.data.data.id
                        });
                        logger.info(`Turma ${turma.name} criada com ID: ${response.data.data.id}`);
                    }
                    // Caso 4: A API retornou sucesso mas sem ID claro - CRIAR ID TEMPORÁRIO
                    else {
                        const tempId = Math.floor(Math.random() * 100000) + 1;
                        criadas.push({
                            ...turma,
                            id: tempId,
                            temporaryId: true
                        });
                        logger.warn(`Turma ${turma.name} aparentemente criada mas sem ID retornado. Usando ID temporário: ${tempId}`);
                    }
                }
            } catch (error) {
                logger.error(`Erro ao criar turma ${turma.name}:`, error.response?.data || error.message);
                erros.push({
                    turma: turma.name,
                    erro: error.response?.data?.message || error.message
                });
            }
        }
        
        logger.info(`Resultado da criação: ${criadas.length} criadas, ${erros.length} erros`);
        
        return {
            criadas,
            erros
        };
    }

    /**
     * Verifica se todas as turmas existem e cria as que faltam
     * @param {string} token - Token JWT
     * @param {Object} segesData - Dados do SEGES
     * @param {number} schoolId - ID da escola
     * @param {number} districtId - ID do distrito
     * @param {Array} existingClasses - Turmas existentes
     * @returns {Object} Resultado da verificação e criação
     */
    async verificarCriarTurmas(token, segesData, schoolId, districtId, existingClasses) {
        // Extrair nomes de turmas do SEGES
        const turmasNomes = Object.keys(segesData).filter(key => key !== "metadados");
        
        // Verificar quais turmas não existem
        const turmasFaltantes = turmasNomes.filter(nome => 
            !existingClasses.find(turma => turma.name === nome)
        );
        
        // Se todas existem, retornar as existentes
        if (turmasFaltantes.length === 0) {
            logger.info(`Todas as ${turmasNomes.length} turmas já existem`);
            return {
                todasTurmas: existingClasses,
                totalTurmasSEGES: turmasNomes.length,
                turmasCriadas: 0
            };
        }
        
        // Processar as turmas faltantes
        const turmasProcessadas = this.processarTurmasSEGES(
            segesData, 
            schoolId, 
            districtId
        ).filter(turma => turmasFaltantes.includes(turma.name));
        
        // Criar as turmas faltantes
        const resultadoCriacao = await this.criarTurmasNovas(token, turmasProcessadas);
        
        // Combinar turmas existentes com novas turmas criadas
        const todasTurmas = [
            ...existingClasses,
            ...resultadoCriacao.criadas
        ];
        
        logger.info(`${resultadoCriacao.criadas.length} turmas criadas para permitir importação de alunos`);
        
        return {
            todasTurmas,
            totalTurmasSEGES: turmasNomes.length,
            turmasCriadas: resultadoCriacao.criadas.length
        };
    }

    /**
     * Processa alunos do SEGES para o formato do users-service
     * @param {Object} segesData - Dados do SEGES
     * @param {number} schoolId - ID da escola
     * @param {number} districtId - ID do distrito
     * @param {Array} turmas - Lista de turmas
     * @param {string} token - Token JWT
     * @returns {Array} Alunos processados
     */
    async processarAlunosSEGES(segesData, schoolId, districtId, turmas, token) {
        const alunosProcessados = [];
        
        // Log de debug para verificar se as turmas foram passadas corretamente
        logger.debug(`Processando alunos com ${turmas.length} turmas disponíveis:`, 
            turmas.map(t => `${t.name} (ID: ${t.id})`));
        
        // Iterar sobre todas as turmas (exceto metadados)
        for (const turmaNome of Object.keys(segesData)) {
            if (turmaNome === "metadados") continue;
            
            // Encontrar o ID da turma pelo nome
            const turma = turmas.find(t => t.name === turmaNome);
            if (!turma) {
                logger.warn(`Turma ${turmaNome} não encontrada, pulando alunos desta turma`);
                continue;
            }
            
            const alunosTurma = segesData[turmaNome];
            if (!Array.isArray(alunosTurma)) {
                logger.warn(`Dados inválidos para turma ${turmaNome}`);
                continue;
            }
            
            logger.info(`Processando ${alunosTurma.length} alunos da turma ${turmaNome} (ID: ${turma.id})`);
            
            // Obter lista de alunos já existentes nesta turma
            try {
                const alunosExistentes = await this.obterAlunosDaTurma(token, turma.id);
                logger.info(`Encontrados ${alunosExistentes.length} alunos existentes na turma ${turmaNome}`);
                
                // Nomes dos alunos existentes (normalizados para comparação)
                const nomesExistentes = alunosExistentes.map(a => 
                    this.normalizarNome(a.name)
                );
                
                // Processar apenas alunos que não existem na turma
                let alunosNovos = 0;
                let alunosJaExistentes = 0;
                
                for (const aluno of alunosTurma) {
                    // Normalizar nome para comparação
                    const nomeNormalizado = this.normalizarNome(aluno.nome);
                    
                    // Verificar se aluno já existe na turma pelo nome
                    if (nomesExistentes.includes(nomeNormalizado)) {
                        logger.debug(`Aluno ${aluno.nome} já existe na turma ${turmaNome}, ignorando`);
                        alunosJaExistentes++;
                        continue;
                    }
                    
                    // Se não existe, processar o aluno
                    try {
                        // Limpar o nome antes de processar
                        const nomeLimpo = limparNomeCompletoAteCaractereEspecial(aluno.nome);
                        
                        // Processar o nome do aluno (considerando nome social e caracteres especiais)
                        const nomeTratado = processarNomeAluno(aluno.nome);
                        
                        // Gerar username e email consistentes
                        const username = gerarUsernameValido(aluno.nome);
                        const email = `${username}@escola.edu.br`;
                        
                        // Formatação de telefones (manter todos os telefones)
                        let telefoneFormatado = '';
                        if (aluno.telefones && aluno.telefones.length > 0) {
                            // Formatar cada telefone e juntá-los com |
                            telefoneFormatado = aluno.telefones
                                .map(tel => {
                                    // Limpar formatação estranha mas manter números, parênteses e hífen
                                    return tel.replace(/[^\d() -]/g, '').trim();
                                })
                                .filter(tel => tel.length > 0) // Remover telefones vazios
                                .join('|');
                        } else if (aluno.telefone) {
                            telefoneFormatado = aluno.telefone.replace(/[^\d() -]/g, '').trim();
                        }
                        
                        // Formatar data de nascimento
                        let dataFormatada = null;
                        if (aluno.dt_nascimento) {
                            const partes = aluno.dt_nascimento.split('/');
                            if (partes.length === 3) {
                                dataFormatada = `${partes[2]}-${partes[1]}-${partes[0]}`;
                            }
                        }
                        
                        // Formatar gênero
                        let generoFormatado = 'Prefiro não dizer';
                        if (aluno.sexo) {
                            generoFormatado = aluno.sexo.charAt(0).toUpperCase() + aluno.sexo.slice(1);
                        }
                        
                        // Identificar horário baseado na mesma lógica do turno da turma
                        let horario = "Integral"; // Padrão
                        
                        // Verificar se o nome da turma tem pelo menos 3 caracteres
                        if (turmaNome.length >= 3) {
                            // Extrair a terceira letra
                            const terceiraLetra = turmaNome.charAt(2).toUpperCase();
                            
                            // Determinar horário com base na terceira letra (mesmo critério do turno)
                            switch (terceiraLetra) {
                                case 'M':
                                    horario = "Manhã";
                                    break;
                                case 'V':
                                    horario = "Tarde";
                                    break;
                                case 'N':
                                    horario = "Noite";
                                    break;
                                case 'I':
                                    horario = "Integral";
                                    break;
                                default:
                                    horario = "Integral"; // Padrão caso não identifique
                            }
                        }
                        
                        // Criar objeto do aluno
                        const alunoProcessado = {
                            // Dados básicos
                            name: nomeTratado,  // Usar o nome tratado aqui
                            username: username,
                            email: email,
                            password: 'trocarSenh@',
                            
                            // Dados do aluno
                            cpf: null,
                            phone: telefoneFormatado, 
                            dateOfBirth: dataFormatada,
                            gender: generoFormatado,
                            profilePic: null,
                            
                            // Dados institucionais
                            role: 'Aluno',
                            horario: horario, // Adicionado o horário baseado no turno da turma
                            gradeId: turma.id,
                            schoolId: schoolId,
                            districtId: districtId,
                            
                            // Outros dados
                            address: null,
                            city: null,
                            state: null,
                            zip: null,
                            status: 'active',
                            
                            // Dados auxiliares para processamento
                            _turmaNome: turmaNome,
                            _usernameBase: username
                        };
                        
                        alunosProcessados.push(alunoProcessado);
                        alunosNovos++;
                    } catch (error) {
                        logger.error(`Erro ao processar aluno ${aluno.nome}:`, error);
                    }
                }
                
                logger.info(`Turma ${turmaNome}: ${alunosNovos} alunos novos, ${alunosJaExistentes} já existentes`);
                
            } catch (error) {
                logger.error(`Erro ao obter alunos existentes da turma ${turmaNome}:`, error);
                // Continuar com a próxima turma
            }
        }
        
        logger.info(`Total de ${alunosProcessados.length} alunos novos processados para importação`);
        return alunosProcessados;
    }

    /**
     * Normaliza um nome para comparação (remove acentos, converte para minúsculas)
     * @param {string} nome - Nome a normalizar
     * @returns {string} Nome normalizado
     */
    normalizarNome(nome) {
        return nome
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .trim();
    }

    /**
     * Obtém lista de alunos de uma turma
     * @param {string} token - Token JWT
     * @param {number} turmaId - ID da turma
     * @returns {Array} Lista de alunos
     */
    async obterAlunosDaTurma(token, turmaId) {
        try {
            // Fazer solicitação ao users-service para obter alunos da turma
            const response = await axios.get(
                `${this.usersServiceUrl}/users/filter?gradeId=${turmaId}&role=Aluno`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                }
            );
            
            // Verificar formato da resposta
            if (response.data && response.data.users && Array.isArray(response.data.users)) {
                return response.data.users;
            } else if (Array.isArray(response.data)) {
                return response.data;
            }
            
            logger.warn(`Formato de resposta inesperado ao buscar alunos da turma ${turmaId}`, 
                typeof response.data);
            return [];
        } catch (error) {
            logger.error(`Erro ao obter alunos da turma ${turmaId}:`, error.message);
            return []; // Retornar array vazio em caso de erro
        }
    }
    
    /**
     * Verifica a disponibilidade do serviço SEGES
     * @param {string} token - Token JWT para autenticação
     * @returns {Promise<Object>} Status de disponibilidade
     */
    async verificarDisponibilidadeSEGES(token) {
        try {
            logger.info('Verificando disponibilidade do serviço SEGES');
            
            // Tentar fazer uma requisição para o SEGES
            const response = await axios.get(`${this.segesServiceUrl}/status`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                timeout: 5000 // 5 segundos de timeout
            });
            
            // Se chegou aqui, a requisição foi bem-sucedida
            logger.info('Serviço SEGES está disponível');
            return {
                disponivel: true,
                status: response.data?.status || 'OK',
                mensagem: 'Serviço SEGES está respondendo'
            };
        } catch (error) {
            logger.warn(`Serviço SEGES não está disponível: ${error.message}`);
            
            // Verificação de dados de fallback
            try {
                const fs = require('fs');
                const path = require('path');
                const testDataPath = path.join(__dirname, '../../data/turmas.json');
                
                if (fs.existsSync(testDataPath)) {
                    logger.info('Dados de teste estão disponíveis');
                    return {
                        disponivel: true,
                        status: 'FALLBACK',
                        mensagem: 'Usando dados de teste (SEGES não está disponível)'
                    };
                }
            } catch (fsError) {
                logger.error('Erro ao verificar dados de teste:', fsError);
            }
            
            return {
                disponivel: false,
                status: 'ERROR',
                mensagem: `Serviço SEGES não está disponível: ${error.message}`,
                error: error.message
            };
        }
    }

    /**
     * Obtém métricas de sincronização
     * @returns {Promise<Object>} Métricas de sincronização
     */
    async obterMetricasSincronizacao() {
        try {
            logger.info('Obtendo métricas de sincronização');
            
            // Contar jobs por tipo e status
            const countJobs = await SyncJob.findAll({
                attributes: [
                    'jobType',
                    'status',
                    [db.fn('COUNT', db.col('id')), 'count']  // Use db.fn em vez de sequelize.fn
                ],
                group: ['jobType', 'status'],
                raw: true
            });
            
            // Estatísticas gerais
            const totalJobs = await SyncJob.count();
            const jobsCompletos = await SyncJob.count({ where: { status: 'completed' } });
            const jobsEmProcessamento = await SyncJob.count({ where: { status: 'processing' } });
            const jobsFalharam = await SyncJob.count({ where: { status: 'failed' } });
            
            // Estatísticas por tipo
            const jobsTurmas = await SyncJob.count({ where: { jobType: 'classes' } });
            const jobsAlunos = await SyncJob.count({ where: { jobType: 'students' } });
            const jobsTodosTipos = await SyncJob.count({ where: { jobType: 'all' } }); // Nome alterado
            // Dados do último job bem-sucedido
            const ultimoJobSucesso = await SyncJob.findOne({
                where: { status: 'completed' },
                order: [['endTime', 'DESC']],
                limit: 1
            });
            
            // Construir resultado
            return {
                totalJobs,
                porStatus: {
                    concluidos: jobsCompletos,
                    emProcessamento: jobsEmProcessamento,
                    falhos: jobsFalharam
                },
                porTipo: {
                    turmas: jobsTurmas,
                    alunos: jobsAlunos,
                    completos: jobsTodosTipos
                },
                detalhado: countJobs,
                ultimaSincronizacaoSucesso: ultimoJobSucesso ? {
                    id: ultimoJobSucesso.id,
                    tipo: ultimoJobSucesso.jobType,
                    data: ultimoJobSucesso.endTime,
                    itensProcessados: ultimoJobSucesso.totalItems,
                    itensCriados: ultimoJobSucesso.createdItems,
                    itensAtualizados: ultimoJobSucesso.updatedItems,
                    itensFalhos: ultimoJobSucesso.failedItems
                } : null
            };
        } catch (error) {
            logger.error('Erro ao obter métricas de sincronização:', error);
            throw new Error(`Falha ao obter métricas: ${error.message}`);
        }
    }

    /**
     * Cria ou atualiza alunos no sistema
     * @param {string} token - Token JWT
     * @param {Array} alunos - Lista de alunos processados
     * @returns {Object} Resultado da criação/atualização
     */
    async criarOuAtualizarAlunos(token, alunos) {
        const criados = [];
        const atualizados = [];
        const erros = [];
        
        // Se não houver alunos para processar, retornar
        if (!alunos || alunos.length === 0) {
            logger.warn('Nenhum aluno para criar/atualizar');
            return { criados: [], atualizados: [], erros: [] };
        }
        
        logger.info(`Criando/atualizando ${alunos.length} alunos`);
        
        // Processar alunos sequencialmente para evitar problemas
        for (const aluno of alunos) {
            try {
                // Preparar dados do aluno - garantindo formato adequado para a API
                const dadosAluno = {
                    name: aluno.name,
                    username: aluno.username,
                    email: aluno.email,
                    password: 'trocarSenh@', // senha mais segura
                    role: 'Aluno',
                    gradeId: aluno.gradeId,
                    schoolId: aluno.schoolId,
                    districtId: aluno.districtId,
                    horario: aluno.horario,
                    status: 'active'
                };
                
                // Adicionar campos opcionais apenas se tiverem valor
                if (aluno.phone) dadosAluno.phone = aluno.phone;
                if (aluno.dateOfBirth) dadosAluno.dateOfBirth = aluno.dateOfBirth;
                if (aluno.gender) dadosAluno.gender = aluno.gender;
                
                logger.debug(`Tentando criar aluno: ${dadosAluno.name}`);
                
                // Criar aluno
                const response = await axios.post(
                    `${this.usersServiceUrl}/users/create`,
                    dadosAluno,
                    {
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        }
                    }
                );
                
                // Processar resposta de sucesso
                if (response.data) {
                    if (response.data.id) {
                        // Caso 1: Retornou ID
                        criados.push({
                            ...dadosAluno,
                            id: response.data.id
                        });
                        logger.info(`Aluno ${dadosAluno.name} criado com ID: ${response.data.id}`);
                    } else if (response.data.message && response.data.message.includes('sucesso')) {
                        // Caso 2: Mensagem de sucesso
                        criados.push(dadosAluno);
                        logger.info(`Aluno ${dadosAluno.name} criado com sucesso (sem ID retornado)`);
                    } else {
                        // Caso 3: Outro formato mas sem erro
                        criados.push(dadosAluno);
                        logger.info(`Aluno ${dadosAluno.name} possivelmente criado: ${JSON.stringify(response.data)}`);
                    }
                }
            } catch (error) {
                // Tratar erro 409 - Conflito (usuário já existe)
                if (error.response && error.response.status === 409) {
                    logger.debug(`Aluno ${aluno.name} já existe, pulando`);
                    
                    // Vamos apenas registrar que o aluno já existe
                    atualizados.push({
                        ...aluno,
                        message: 'Aluno já existe, não foi atualizado'
                    });
                }
                // Tratar erro 400 - Bad Request (validação)
                else if (error.response && error.response.status === 400) {
                    logger.warn(`Erro de validação para aluno ${aluno.name}, tentando abordagem alternativa`);
                    
                    const horario = aluno.horario || "Integral";
                    try {
                        // Uso da nova função para gerar username
                        const username = gerarUsernameValido(aluno.name);
                        const email = `${username}@escola.edu.br`;
                        // Criar versão simplificada com apenas os campos essenciais
                        const alunoSimplificado = {
                            name: processarNomeAluno(aluno.name),
                            username: username,
                            email: email,
                            password: 'trocarSenh@',
                            role: 'Aluno',
                            gradeId: aluno.gradeId,
                            schoolId: aluno.schoolId,
                            districtId: aluno.districtId,
                            horario: horario,
                            status: 'active',
                            phone: aluno.phone
                        };
                        
                        logger.debug(`Tentando criar aluno com dados simplificados: ${alunoSimplificado.name}`);
                        
                        // Nova tentativa com dados simplificados
                        const retryResponse = await axios.post(
                            `${this.usersServiceUrl}/users/create`,
                            alunoSimplificado,
                            {
                                headers: {
                                    'Authorization': `Bearer ${token}`,
                                    'Content-Type': 'application/json'
                                }
                            }
                        );
                        
                        if (retryResponse.data) {
                            criados.push({
                                ...alunoSimplificado,
                                id: retryResponse.data.id || 0,
                                simplified: true
                            });
                            logger.info(`Aluno ${alunoSimplificado.name} criado com dados simplificados`);
                        }
                    } catch (retryError) {
                        // Se ainda falhar, registrar erro detalhado
                        const errorMessage = retryError.response?.data?.message || retryError.message;
                        logger.error(`Falha ao criar aluno ${aluno.name} mesmo após simplificação: ${errorMessage}`);
                        
                        erros.push({
                            aluno: aluno.name,
                            erro: errorMessage,
                            status: retryError.response?.status
                        });
                    }
                }
                // Outros erros
                else {
                    const errorMessage = error.response?.data?.message || error.message;
                    logger.error(`Erro ao criar aluno ${aluno.name}: ${errorMessage}`);
                    
                    erros.push({
                        aluno: aluno.name,
                        erro: errorMessage,
                        status: error.response?.status
                    });
                }
            }
        }
        
        logger.info(`Resultado da criação/atualização: ${criados.length} criados, ${atualizados.length} existentes, ${erros.length} erros`);
        
        return {
            criados,
            atualizados,
            erros
        };
    }
    
}

/**
 * Trata nome de aluno considerando nome social entre parênteses e removendo caracteres especiais
 * @param {string} nomeCompleto - Nome completo original do aluno
 * @returns {string} Nome processado
 */
function processarNomeAluno(nomeCompleto) {
    if (!nomeCompleto) return '';
    
    // Substituir todos os caracteres especiais por espaços
    let nomeLimpo = nomeCompleto.replace(/[\r\n\t]/g, ' ').trim();
    
    // Verificar se há nome social entre parênteses
    const regexNomeSocial = /\(([^)]+)\)/;
    const match = nomeLimpo.match(regexNomeSocial);
    
    if (match && match[1]) {
        // Se encontrou nome social entre parênteses, usa ele
        const nomeSocial = match[1].trim();
        logger.debug(`Nome social encontrado: "${nomeSocial}" para aluno "${nomeLimpo}"`);
        // Limpar novamente para garantir que não há caracteres especiais no nome social
        return nomeSocial.replace(/[\r\n\t]/g, ' ').trim();
    }
    
    // Se não encontrou nome social, retorna o nome original limpo
    return nomeLimpo;
}

/**
 * Gera username válido a partir do nome do aluno
 * @param {string} nomeCompleto - Nome completo do aluno
 * @returns {string} Username gerado
 */
function gerarUsernameValido(nomeCompleto) {
    // Processar o nome considerando nome social e caracteres especiais
    const nomeTratado = processarNomeAluno(nomeCompleto);
    
    // Extrair primeiro e último nome
    const nomePartes = nomeTratado.split(' ').filter(part => part.trim().length > 0);
    
    if (nomePartes.length === 0) {
        // Se após todo processamento não houver nome válido, gerar username padrão
        return `aluno${Date.now().toString().substring(8)}`;
    }
    
    const primeiroNome = nomePartes[0].toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const ultimoNome = nomePartes[nomePartes.length - 1].toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    
    // Gerar username no formato primeiro.ultimo
    let username = `${primeiroNome}.${ultimoNome}`;
    
    // Garantir que não exceda 30 caracteres
    if (username.length > 27) {
        username = username.substring(0, 27);
    }
    
    // Adicionar número aleatório para evitar duplicação
    username = `${username}${Math.floor(Math.random() * 100)}`;
    
    return username;
}

/**
 * Remove caracteres especiais e todo conteúdo após eles
 * @param {string} nome - Nome a ser limpo
 * @returns {string} Nome limpo até o primeiro caractere especial
 */
function limparNomeCompletoAteCaractereEspecial(nome) {
    if (!nome) return '';
    
    // Procurar pela primeira ocorrência de qualquer caractere especial
    const match = nome.match(/[\r\n\t]/);
    if (match && match.index > 0) {
        // Se encontrou, retornar apenas a parte antes do caractere especial
        return nome.substring(0, match.index);
    }
    
    // Se não encontrou caractere especial, retornar o nome original
    return nome;
}

module.exports = new SyncService();