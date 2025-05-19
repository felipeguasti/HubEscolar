const userService = require('../services/userService');
const aiService = require('../services/aiService');
const headerService = require('../services/headerService');
const logger = require('../services/loggingService');
const faltasDisciplinares = require('../../faltas_disciplinares.json');
const direitosDeveres = require('../../direitos_deveres.json');
const Report = require('../models/Report');
const { Op } = require('sequelize');
const PDFDocument = require('pdfkit');
const axios = require('axios');
const USERS_SERVICE_URL = process.env.USERS_SERVICE_URL;
const GRADE_SERVICE_URL = process.env.GRADE_SERVICE_URL;

async function getStudentClassName(gradeId, accessToken) {
    if (!gradeId) {
        logger.info('GradeId não fornecido, retornando "Turma não informada"');
        return 'Turma não informada';
    }

    try {
        logger.info(`Buscando informações da turma ID: ${gradeId}`);
        const response = await axios.get(`${GRADE_SERVICE_URL}/grades/${gradeId}`, {
            headers: { 
                Authorization: `Bearer ${accessToken}` 
            },
            timeout: 5000
        });

        if (response.status === 200 && response.data && response.data.status === 'success' && response.data.data) {
            logger.info(`Informações da turma obtidas com sucesso: ${response.data.data.name}`);
            return response.data.data.name;
        } else {
            logger.warn(`Resposta inesperada ao buscar turma ${gradeId}: ${JSON.stringify(response.data)}`);
            return `Turma ${gradeId}`;
        }
    } catch (error) {
        logger.error(`Erro ao buscar informações da turma ${gradeId}: ${error.message}`);
        return `Turma ${gradeId}`;
    }
}

async function createReport(req, res) {
    try {
        const { studentId, topics } = req.body;
        const requesterUser = req.user;
        const authorizationHeader = req.headers.authorization;
        const accessToken = authorizationHeader ? authorizationHeader.split(' ')[1] : null;

        logger.info(`Requisição para criar relatório recebida pelo usuário ID: ${requesterUser ? requesterUser.id : 'Não autenticado'}, para o aluno ID: ${studentId}, com tópicos: ${JSON.stringify(topics)}`);

        if (!accessToken) {
            return res.status(401).json({ error: 'Token de autorização não fornecido.' });
        }

        // 1. Validar se os dados foram fornecidos
        if (!studentId || !topics || !Array.isArray(topics) || topics.length === 0) {
            logger.warn('Dados inválidos para criar o relatório.');
            return res.status(400).json({ error: 'Dados inválidos para criar o relatório. Certifique-se de fornecer studentId e uma lista de tópicos.' });
        }

        // 2. Verificar se o token foi fornecido
        if (!accessToken) {
            logger.warn('Token de autorização não fornecido.');
            return res.status(401).json({ error: 'Token de autorização não fornecido.' });
        }

        // 3. Verificar se o aluno existe e é um aluno
        const studentVerification = await userService.verifyStudentRole(studentId, accessToken);
        if (!studentVerification.success) {
            logger.warn(`Falha ao verificar aluno ID ${studentId}: ${studentVerification.error}`);
            return res.status(400).json({ error: studentVerification.error });
        }
        const student = studentVerification.data;
        logger.info(`Aluno verificado: ID ${student.id}, Nome: ${student.name}`);

        // Buscar o nome da turma do aluno
        let studentClassName = await getStudentClassName(student.gradeId, accessToken);
        logger.info(`Nome da turma do aluno: ${studentClassName}`);

        // 4. Buscar informações do usuário que fez a requisição
        let requesterUserDetails = null;
        if (requesterUser && requesterUser.id) {
            try {
                requesterUserDetails = await userService.fetchUser(requesterUser.id, accessToken);
                logger.info(`Informações do usuário solicitante (ID: ${requesterUserDetails.id}, Role: ${requesterUserDetails.role}, Nome: ${requesterUserDetails.name}) obtidas.`);
            } catch (error) {
                logger.warn(`Erro ao buscar informações do usuário solicitante ID ${requesterUser.id}: ${error.message}`);
                // Não vamos impedir a criação do relatório se falhar ao buscar os detalhes do solicitante
                // mas as informações do solicitante no relatório podem estar limitadas.
            }
        } else {
            logger.warn('Informações do usuário solicitante não disponíveis.');
        }

        // 5. Gerar o texto do relatório usando a IA, passando as informações do aluno e do solicitante
        logger.info(`Gerando texto do relatório para o aluno ID ${studentId} com a IA.`);
        const reportText = await aiService.generateReportText(student, topics, requesterUserDetails);

        if (reportText) {
          const report = await Report.create({
            studentId: student.id,
            studentClass: studentClassName, // Usando o nome da turma obtido
            createdById: requesterUserDetails?.id,
            createdByRole: requesterUserDetails?.role,
            content: reportText,
            reportLevel: 'automatic',
            disciplinaryActIndex: null,
            reportObservation: topics.join(', '),
            reportRecommendation: null,
            suspended: false,
            callParents: false
        });

        logger.info(`Relatório ID ${report.id} salvo no banco de dados para o aluno ID ${studentId}`);
        return res.status(200).json({ 
            report: reportText,
            reportId: report.id 
        });
    } else {
        logger.error(`Falha ao gerar o relatório para o aluno ID ${studentId}.`);
        return res.status(500).json({ error: 'Falha ao gerar o relatório.' });
    }

    } catch (error) {
        logger.error('Erro ao criar relatório:', error);
        return res.status(500).json({ error: 'Erro interno do servidor.' });
    }
}

async function createManualReport(req, res) {
  try {
      // 1. Obter os dados do corpo da requisição
      const {
          studentId,
          suspended,
          suspensionDuration,
          callParents,
          parentsMeeting,
          reportLevel,
          disciplinaryActIndex, // Usar este índice agora
          reportContentText, // O texto selecionado no front
          reportObservation,
          reportRecommendation
      } = req.body;

      const requesterUser = req.user;
      const authorizationHeader = req.headers.authorization;
      const accessToken = authorizationHeader ? authorizationHeader.split(' ')[1] : null;

      logger.info(`Requisição para criar relatório MANUAL recebida pelo usuário ID: ${requesterUser ? requesterUser.id : 'Não autenticado'}, para o aluno ID: ${studentId}, nível: ${reportLevel}, índice do ato: ${disciplinaryActIndex}`);

      // 2. Verificar se o token foi fornecido
      if (!accessToken) {
          logger.warn('Token de autorização não fornecido para relatório manual.');
          return res.status(401).json({ error: 'Token de autorização não fornecido.' });
      }

      // 3. Validar os dados essenciais
      if (!studentId || !reportLevel || disciplinaryActIndex === undefined || disciplinaryActIndex === null) {
          logger.warn('Dados incompletos para criar o relatório manual.');
          return res.status(400).json({ error: 'Dados incompletos para criar o relatório manual. Certifique-se de fornecer studentId, reportLevel e disciplinaryActIndex.' });
      }

      // 4. Verificar se o aluno existe e é um aluno
      const studentVerification = await userService.verifyStudentRole(studentId, accessToken);
      if (!studentVerification.success) {
          logger.warn(`Falha ao verificar aluno ID ${studentId} para relatório manual: ${studentVerification.error}`);
          return res.status(400).json({ error: studentVerification.error });
      }
      const student = studentVerification.data;
      logger.info(`Aluno verificado para relatório manual: ID ${student.id}, Nome: ${student.name}`);

      // Buscar o nome da turma do aluno
      let studentClassName = await getStudentClassName(student.gradeId, accessToken);
      logger.info(`Nome da turma do aluno para relatório manual: ${studentClassName}`);

      // 5. Buscar informações do usuário que fez a requisição
      let requesterUserDetails = null;
      if (requesterUser && requesterUser.id) {
          try {
              requesterUserDetails = await userService.fetchUser(requesterUser.id, accessToken);
              logger.info(`Informações do usuário solicitante (ID: ${requesterUserDetails.id}, Role: ${requesterUserDetails.role}, Nome: ${requesterUserDetails.name}) obtidas para relatório manual.`);
          } catch (error) {
              logger.warn(`Erro ao buscar informações do usuário solicitante ID ${requesterUser.id} para relatório manual: ${error.message}`);
              // Não vamos impedir a criação do relatório se falhar ao buscar os detalhes do solicitante
          }
      } else {
          logger.warn('Informações do usuário solicitante não disponíveis para relatório manual.');
      }

      // 6. Determinar o artigo do regimento e o texto da infração
      let artigoReferencia = 'Artigo não encontrado.';
      let textoInfracao = 'Infração não especificada.';
      let artigoEncontrado = null;

      const listaDeFaltas = faltasDisciplinares.atos_indisciplinares[reportLevel.toLowerCase()];

      if (listaDeFaltas && Array.isArray(listaDeFaltas)) {
          if (listaDeFaltas.length > disciplinaryActIndex) { // Usando disciplinaryActIndex aqui
              artigoEncontrado = listaDeFaltas[disciplinaryActIndex];
              artigoReferencia = `${artigoEncontrado.numero}${artigoEncontrado.inciso ? ` ${artigoEncontrado.inciso}` : ''}`;
              textoInfracao = artigoEncontrado.texto || 'Infração não especificada.';

              // Log para verificar o que foi encontrado
              logger.info(`Artigo encontrado: ${artigoReferencia}, Texto da infração: ${textoInfracao}`);

          } else {
              logger.warn(`disciplinaryActIndex inválido para o nível ${reportLevel}. Índice: ${disciplinaryActIndex}, Tamanho da lista: ${listaDeFaltas.length}`);
              return res.status(400).json({ error: 'Índice de ato disciplinar inválido.' });
          }
      } else {
          logger.warn(`Nível de relatório inválido: ${reportLevel}.`);
          return res.status(400).json({ error: 'Nível de relatório inválido.' });
      }

      // 7. Formatar a data da ocorrência (hoje)
      const hoje = new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });

      // 8. Formatar a data e hora da reunião (se houver)
      let meetingInfo = '';
      if (callParents && parentsMeeting) {
          const meetingDate = new Date(parentsMeeting).toLocaleDateString('pt-BR', { day: 'numeric', month: 'numeric', year: 'numeric' });
          const meetingTime = new Date(parentsMeeting).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
          meetingInfo = `Convocamos o responsável para uma reunião no dia ${meetingDate} às ${meetingTime}.`;
      }

      // 9. Montar o texto do relatório
      let reportText = `O(a) aluno(a), ${student.name}, ${studentClassName ? `do ${studentClassName},` : 'da turma não informada,'} na data de hoje, ${hoje}, foi atendido(a) pelo(a) ${requesterUserDetails ? requesterUserDetails.role : 'usuário'}(a) ${requesterUserDetails ? requesterUserDetails.name : 'não identificado(a)'}`;

      if (suspended && suspensionDuration > 0) {
          reportText += ` e foi suspenso(a) por ${suspensionDuration} dia(s)`;
      }

      reportText += ` por infringir o seguinte artigo do REGIMENTO COMUM DAS ESCOLAS DA REDE ESTADUAL DE ENSINO DO ESTADO DO ESPÍRITO SANTO - ES: ${artigoReferencia} ${textoInfracao}`;

      if (reportObservation) {
          reportText += ` Observação: ${reportObservation}.`;
      }

      reportText += ` ${meetingInfo}`;

      // Adicionar trecho dos Deveres dos Pais
      let responsabilidadePais = "";
      const deverAcompanhar = direitosDeveres.artigos_disciplinares.find(
          item => item.numero === "Art. 76" && item.inciso === "II"
      );
      const deverComparecer = direitosDeveres.artigos_disciplinares.find(
          item => item.numero === "Art. 76" && item.inciso === "IX"
      );

      if (deverAcompanhar) {
          responsabilidadePais += `\nÉ dever do responsável acompanhar o desempenho escolar de seu filho, zelando pela frequência e assiduidade (Art. 76, II).`;
      }

      if (callParents && deverComparecer) {
          responsabilidadePais += `\nDiante da ocorrência e da necessidade de diálogo, é também dever do responsável comparecer à unidade de ensino quando convocado (Art. 76, IX).`;
      }

      reportText += responsabilidadePais;

      reportText += `\n\nEncaminhamentos: ${reportRecommendation}`;

      // Adicionar aqui o salvamento no banco antes do retorno
      const report = await Report.create({
        studentId: student.id,
        studentClass: studentClassName, // Usando o nome da turma obtido
        createdById: requesterUserDetails?.id,
        createdByRole: requesterUserDetails?.role,
        content: reportText,
        reportLevel,
        disciplinaryActIndex,
        reportObservation,
        reportRecommendation,
        suspended,
        suspensionDuration,
        callParents,
        parentsMeeting: callParents ? parentsMeeting : null
    });

    logger.info(`Relatório manual ID ${report.id} salvo no banco de dados para o aluno ID ${studentId}`);
    return res.status(200).json({ 
        report: reportText,
        reportId: report.id 
    });

} catch (error) {
    logger.error('Erro ao criar relatório manual:', error);
    return res.status(500).json({ error: 'Erro interno do servidor ao gerar relatório manual.' });
}
}

async function deleteReport(req, res) {
  try {
      const { id } = req.params;
      const requesterUser = req.user;

      logger.info(`Tentativa de exclusão do relatório ID ${id} pelo usuário ID ${requesterUser.id}`);

      // Buscar o relatório
      const report = await Report.findByPk(id);

      if (!report) {
          logger.warn(`Relatório ID ${id} não encontrado`);
          return res.status(404).json({ error: 'Relatório não encontrado.' });
      }

      // Verificar se o usuário tem permissão para excluir
      // Apenas o criador do relatório ou usuários com roles específicos podem excluir
      if (report.createdById !== requesterUser.id && 
          !['Master', 'Diretor', 'Coordenador'].includes(requesterUser.role)) {
          logger.warn(`Usuário ID ${requesterUser.id} não tem permissão para excluir o relatório ID ${id}`);
          return res.status(403).json({ error: 'Você não tem permissão para excluir este relatório.' });
      }

      // Excluir o relatório
      await report.destroy();
      
      logger.info(`Relatório ID ${id} excluído com sucesso pelo usuário ID ${requesterUser.id}`);
      return res.status(200).json({ 
          message: 'Relatório excluído com sucesso.',
          deletedReportId: id
      });

  } catch (error) {
      logger.error(`Erro ao excluir relatório: ${error.message}`);
      return res.status(500).json({ error: 'Erro ao excluir relatório.' });
  }
}

async function listReports(req, res) {
    try {
        // Log do usuário que faz a requisição
        logger.info(`Usuário fazendo a requisição - ID: ${req.user.id}, Role: ${req.user.role}`);

        // Verificar o role do usuário
        const requesterUser = req.user;
        if (!requesterUser || ['Master', 'Inspetor', 'Aluno'].includes(requesterUser.role)) {
            logger.warn(`Acesso negado para usuário com role ${requesterUser?.role || 'não definido'}`);
            return res.status(403).json({ 
                error: 'Você não tem permissão para visualizar relatórios.' 
            });
        }

        const {
            id,
            studentId,
            createdById,
            reportLevel,
            suspended,
            callParents,
            startDate,
            endDate,
            limit = 10,
            offset = 0
        } = req.query;

        const authorizationHeader = req.headers.authorization;
        const accessToken = authorizationHeader ? authorizationHeader.split(' ')[1] : null;

        // Se ID for fornecido, buscar relatório específico
        logger.info(`ID fornecido: ${req.query.id}`);
        if (id) {
            const report = await Report.findByPk(id);
            
            if (!report) {
                logger.warn(`Relatório ID ${id} não encontrado`);
                return res.status(404).json({ error: 'Relatório não encontrado.' });
            }

            const reportData = report.toJSON();

            try {
                const studentData = await userService.fetchUser(report.studentId, accessToken);
                const creatorData = await userService.fetchUser(report.createdById, accessToken);
                // Buscar dados do usuário logado
                const requesterData = await userService.fetchUser(req.user.id, accessToken);

                // Log detalhado para debug
                logger.info(`
                    Verificando permissões:
                    StudentData: ${JSON.stringify(studentData)}
                    CreatorData: ${JSON.stringify(creatorData)}
                    RequesterData: ${JSON.stringify(requesterData)}
                    SchoolId Match (Requester-Student): ${studentData.schoolId === requesterData.schoolId}
                    DistrictId Match (Requester-Student): ${studentData.districtId === requesterData.districtId}
                `);

                // Verificar se o aluno pertence à mesma escola/distrito do usuário logado
                if (studentData.schoolId === requesterData.schoolId && 
                    studentData.districtId === requesterData.districtId) {
                    return res.status(200).json({
                        total: 1,
                        limit: 1,
                        offset: 0,
                        reports: [{
                            ...reportData,
                            studentName: studentData?.name || 'Nome não disponível',
                            createdByName: creatorData?.name || 'Nome não disponível'
                        }]
                    });
                }
                
                // Se não pertencer à mesma escola/distrito
                return res.status(403).json({ 
                    error: 'Você não tem permissão para ver este relatório.' 
                });
            } catch (error) {
                logger.warn(`Erro ao buscar dados de usuários para o relatório ${id}`);
                return res.status(200).json({
                    total: 1,
                    limit: 1,
                    offset: 0,
                    reports: [{
                        ...reportData,
                        studentName: 'Nome não disponível',
                        createdByName: 'Nome não disponível'
                    }]
                });
            }
        }

        const whereClause = {};

        // Adicionar filtros se fornecidos
        if (studentId) whereClause.studentId = studentId;
        if (createdById) whereClause.createdById = createdById;
        if (reportLevel) whereClause.reportLevel = reportLevel;
        if (suspended) whereClause.suspended = suspended === 'true';
        if (callParents) whereClause.callParents = callParents === 'true';

        // Ajuste no filtro de datas para corresponder ao formato do banco
        if (startDate || endDate) {
            whereClause.createdAt = {};
            if (startDate) {
                whereClause.createdAt[Op.gte] = `${startDate} 00:00:00`;
            }
            if (endDate) {
                whereClause.createdAt[Op.lte] = `${endDate} 23:59:59`;
            }
        }

        // Log dos filtros recebidos
        logger.info(`Filtros recebidos na requisição: ${JSON.stringify(req.query)}`);

        // Log para debug
        logger.info(`Filtros aplicados: ${JSON.stringify(whereClause)}`);

        // Primeiro, vamos obter o total de relatórios que atendem aos critérios
        const totalCount = await Report.count({
            where: whereClause
        });

        // Depois, buscamos os relatórios paginados
        const { rows: reports } = await Report.findAndCountAll({
            where: whereClause,
            limit: parseInt(limit),
            offset: parseInt(offset),
            order: [['createdAt', 'DESC']],
            attributes: { 
                exclude: ['updatedAt']
            }
        });

        const authToken = req.headers.authorization?.split(' ')[1];

        // Log após buscar os relatórios
        logger.info(`Quantidade de relatórios encontrados: ${totalCount}`);
        logger.info(`Relatórios antes do enriquecimento: ${JSON.stringify(reports.map(r => r.id))}`);

        // Durante o enriquecimento dos relatórios
        const requesterData = await userService.fetchUser(req.user.id, authToken);
        logger.info(`Dados do usuário solicitante: SchoolId: ${requesterData.schoolId}, DistrictId: ${requesterData.districtId}`);

        const enrichedReports = await Promise.all(reports.map(async (report) => {
            const reportData = report.toJSON();
            
            try {
                const studentData = await userService.fetchUser(report.studentId, authToken);
                const creatorData = await userService.fetchUser(report.createdById, authToken);
                
                // Verificar se o aluno pertence à mesma escola/distrito do usuário logado
                if (studentData.schoolId === requesterData.schoolId && 
                    studentData.districtId === requesterData.districtId) {
                    
                    logger.info(`
                        Relatório ID: ${report.id}
                        Aluno ID: ${studentData.id}
                        Escola do Aluno: ${studentData.schoolId}
                        Distrito do Aluno: ${studentData.districtId}
                        Criador ID: ${creatorData.id}
                        Escola do Criador: ${creatorData.schoolId}
                        Distrito do Criador: ${creatorData.districtId}
                    `);

                    return {
                        ...reportData,
                        studentName: studentData?.name || 'Nome não disponível',
                        createdByName: creatorData?.name || 'Nome não disponível'
                    };
                }
                return null; // Retorna null se não pertencer à mesma escola/distrito
                
            } catch (error) {
                logger.warn(`Erro ao buscar dados de usuários para o relatório ${report.id}: ${error.message}`);
                return null;
            }
        }));

        // Filtrar relatórios nulos (que não pertencem à mesma escola/distrito)
        const filteredReports = enrichedReports.filter(report => report !== null);

        // Log dos relatórios após o enriquecimento e filtragem
        logger.info(`Relatórios após enriquecimento e filtragem: ${filteredReports.length}`);

        return res.status(200).json({
            total: totalCount, // Total geral de registros
            filtered: filteredReports.length, // Quantidade após filtros de escola/distrito
            limit: parseInt(limit),
            offset: parseInt(offset),
            reports: filteredReports
        });

    } catch (error) {
        logger.error(`Erro ao listar relatórios: ${error.message}`);
        return res.status(500).json({ error: 'Erro ao listar relatórios.' });
    }
}

async function generateReportPDF(reportId, requesterUser, authToken, logos) {
    try {
        logger.info(`Iniciando geração de PDF para o relatório ID: ${reportId}`);
        logger.info('Logos recebidos:', logos);

        // 1. Buscar o relatório
        const report = await Report.findByPk(reportId);
        if (!report) {
            logger.warn(`Relatório ID ${reportId} não encontrado`);
            throw new Error('Relatório não encontrado.');
        }

        // 2. Buscar dados dos usuários com melhor tratamento de erro
        let creatorDetails, requesterDetails;
        try {
            // Buscar dados em paralelo com Promise.all
            const [creatorResponse, requesterResponse] = await Promise.all([
                axios.get(`${USERS_SERVICE_URL}/users/list/${report.createdById}`, {
                    headers: { Authorization: `Bearer ${authToken}` },
                    timeout: 5000 // 5 segundos timeout
                }).catch(error => {
                    logger.error(`Erro ao buscar dados do criador: ${error.message}`);
                    return { data: { 
                        name: 'Nome não disponível',
                        role: report.createdByRole,
                        schoolId: null
                    }};
                }),
                
                axios.get(`${USERS_SERVICE_URL}/users/list/${requesterUser.id}`, {
                    headers: { Authorization: `Bearer ${authToken}` },
                    timeout: 5000
                }).catch(error => {
                    logger.error(`Erro ao buscar dados do solicitante: ${error.message}`);
                    return { data: { 
                        name: requesterUser.name || 'Nome não disponível',
                        role: requesterUser.role
                    }};
                })
            ]);

            creatorDetails = creatorResponse.data;
            requesterDetails = requesterResponse.data;

            logger.info('Dados dos usuários obtidos:', { 
                creator: { id: creatorDetails.id, schoolId: creatorDetails.schoolId },
                requester: { id: requesterDetails.id }
            });

            // 3. Tentar obter o header com fallback para valores padrão
            const header = await headerService.getOrCreateHeader(
                creatorDetails.schoolId, 
                authToken
            ).catch(error => {
                logger.error('Erro ao obter header');
                return {
                    line1: 'LINHA 1 NÃO DISPONÍVEL',
                    line2: 'LINHA 2 NÃO DISPONÍVEL',
                    cachedSchoolName: 'NOME DA ESCOLA'
                };
            });

            // 4. Gerar o PDF
            return new Promise((resolve, reject) => {
                const doc = new PDFDocument({
                    size: 'A4',
                    margin: 50,
                    autoFirstPage: true
                });

                const chunks = [];
                doc.on('data', chunk => chunks.push(chunk));
                doc.on('end', () => resolve(Buffer.concat(chunks)));
                doc.on('error', reject);

                try {
                    // Header Layout - Usando os logos recebidos via parâmetro
                    logger.info('Tentando carregar logos:', {
                        districtLogo: logos.districtLogo,
                        schoolLogo: logos.schoolLogo
                    });

                    // Ajustando posicionamento e tamanho das logos
                    if (logos.districtLogo) {
                        try {
                            doc.image(
                                logos.districtLogo, 
                                50,    // x position 
                                30,    // y position
                                {
                                    width: 60,
                                    align: 'left',
                                    valign: 'top'
                                }
                            );
                            logger.info('Logo do distrito carregada com sucesso');
                        } catch (error) {
                            logger.error('Erro ao carregar logo do distrito:', error.message);
                        }
                    }

                    if (logos.schoolLogo) {
                        try {
                            doc.image(
                                logos.schoolLogo, 
                                485,   // x position
                                30,    // y position
                                {
                                    width: 60,
                                    align: 'right',
                                    valign: 'top'
                                }
                            );
                            logger.info('Logo da escola carregada com sucesso');
                        } catch (error) {
                            logger.error('Erro ao carregar logo da escola:', error.message);
                        }
                    }

                    // Center text information - Reduzindo espaçamento do cabeçalho
                    doc.font('Helvetica-Bold')
                       .fontSize(12)
                       .moveDown(0.2)
                       .text(header.line1.toUpperCase(), { align: 'center' })
                       .moveDown(0.1)
                       .text(header.line2.toUpperCase(), { align: 'center' })
                       .moveDown(0.1)
                       .fontSize(10)
                       .text(header.cachedSchoolName.toUpperCase(), { align: 'center' })
                       .moveDown(2); // Aumentado espaço antes do título

                    // Title
                    doc.fontSize(16)
                       .text('ADVERTÊNCIA DISCIPLINAR', { align: 'center' })
                       .moveDown();

                       doc.font('Helvetica')
                       .fontSize(12)
                       .text(report.content, {
                           align: 'justify',
                           lineGap: 2
                       })
                       .moveDown();

                    // Parent response section
                    if (report.parentResponse) {
                        doc.moveDown()
                        .font('Helvetica-Bold')
                        .text('Resposta do Responsável:', { continued: true })
                        .font('Helvetica')
                        .text(` ${report.parentResponse}`, {
                            align: 'justify',
                            lineGap: 2
                        })
                        .moveDown();
                    }

                    // If the report was delivered, add delivery info
                    if (report.deliveredAt) {
                        doc.moveDown()
                           .font('Helvetica')
                           .fontSize(10)
                           .text(`Entregue em: ${new Date(report.deliveredAt).toLocaleString('pt-BR')}`)
                           .text(`Método de entrega: ${
                               report.deliveryMethod === 'print' ? 'Impresso' :
                               report.deliveryMethod === 'email' ? 'E-mail' :
                               report.deliveryMethod === 'whatsapp' ? 'WhatsApp' :
                               'Não especificado'
                           }`)
                           .moveDown();
                    }

                    addFooterWithSignatures(doc, requesterDetails, creatorDetails);
                    doc.end();  
                } catch (error) {
                    reject(error);
                }
            });

        } catch (error) {
            logger.error('Erro detalhado ao gerar PDF:', {
                message: error.message,
                reportId,
                creatorId: report.createdById,
                requesterId: requesterUser.id
            });
            throw new Error(`Falha ao gerar PDF: ${error.message}`);
        }

    } catch (error) {
        logger.error(`Erro ao gerar PDF: ${error.message}`);
        throw error;
    }
}

// Helper function for footer with signatures
function addFooterWithSignatures(doc, requesterDetails, creatorDetails) {
    const bottomMargin = 50;
    const footerText = `Relatório criado por ${requesterDetails.name} às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} de ${new Date().toLocaleDateString('pt-BR')}.`;
    
    // Cálculos mais precisos das alturas
    const lineHeight = doc.currentLineHeight(true);
    const underlineHeight = doc.heightOfString('_');
    const nameHeight = doc.heightOfString('Nome');
    
    // Altura do bloco de assinatura do responsável
    const responsibleSignatureHeight = underlineHeight + // linha da assinatura
                                     nameHeight +        // texto "Assinatura do Responsável"
                                     lineHeight * 2;     // espaço entre blocos
    
    // Altura do bloco de assinatura do criador
    const creatorSignatureHeight = underlineHeight +    // linha da assinatura
                                 nameHeight * 2 +       // cargo + nome do criador
                                 lineHeight;            // espaço após assinatura
    
    // Altura do footer text
    const footerTextHeight = doc.heightOfString(footerText);
    
    // Altura total com espaçamentos
    const totalFooterHeight = responsibleSignatureHeight + 
                            creatorSignatureHeight + 
                            footerTextHeight + 
                            (lineHeight * 4); // espaço extra para separação

    // Se precisar de nova página
    if (doc.y + totalFooterHeight > doc.page.height - bottomMargin) {
        doc.addPage();
    }

    // Posicionar na parte inferior da página
    const startY = doc.page.height - totalFooterHeight - bottomMargin;
    doc.y = startY;

    // Assinaturas com espaçamento controlado
    doc.text('_______________________________', { align: 'center' })
       .text('Assinatura do Responsável', { align: 'center' })
       .moveDown(2)
       .text('_______________________________', { align: 'center' })
       .text(`Assinatura do(a) ${
           creatorDetails.role === 'Master' ? 'Master' : 
           creatorDetails.role === 'Diretor' ? 'Diretor(a)' :
           creatorDetails.role === 'Coordenador' ? 'Coordenador(a)' :
           creatorDetails.role === 'Professor' ? 'Professor(a)' :
           creatorDetails.role === 'Secretario' ? 'Secretário(a)' :
           creatorDetails.role === 'Pedagogo' ? 'Pedagogo(a)' : 
           creatorDetails.role
       }`, { align: 'center' })
       .text(`${creatorDetails.name}`, { align: 'center' })
       .moveDown(2);

    // Footer text no final da página
    doc.fontSize(10)
       .text(footerText, 50, doc.page.height - bottomMargin - footerTextHeight, {
           align: 'right',
           width: doc.page.width - 100
       });
}

async function registerDelivery(reportId, deliveryData) {
    try {
        logger.info(`Registrando entrega para relatório ID: ${reportId}`);
        
        // 1. Buscar o relatório
        const report = await Report.findByPk(reportId);
        if (!report) {
            logger.warn(`Relatório ID ${reportId} não encontrado`);
            throw new Error('Relatório não encontrado');
        }

        // 2. Preparar dados da entrega
        const now = new Date();
        const updateData = {
            status: 'delivered',
            deliveredAt: deliveryData.deliveredAt,
            deliveredBy: deliveryData.deliveredBy,
            deliveryMethod: deliveryData.method,
            parentResponse: deliveryData.parentResponse,
            signedAt: deliveryData.signedAt || now,  // Usa data da assinatura do frontend ou now como fallback
            signedBy: deliveryData.signedBy
        };

        // 3. Atualizar relatório
        await report.update(updateData);

        logger.info(`Entrega registrada com sucesso para relatório ID: ${reportId}`, updateData);
        return report;

    } catch (error) {
        logger.error(`Erro ao registrar entrega do relatório: ${error.message}`);
        throw error;
    }
}

module.exports = {
    createReport,
    createManualReport,
    deleteReport,
    listReports,
    generateReportPDF,
    registerDelivery
};