const userService = require('../services/userService');
const aiService = require('../services/aiService');
const logger = require('../services/loggingService');
const faltasDisciplinares = require('../../faltas_disciplinares.json');
const direitosDeveres = require('../../direitos_deveres.json');
const Report = require('../models/Report');
const { Op } = require('sequelize');

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
            studentClass: student.class || 'Não informada',
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
      let reportText = `O(a) aluno(a), ${student.name}, ${student.class ? `do ${student.class},` : 'da turma não informada,'} na data de hoje, ${hoje}, foi atendido(a) pelo(a) ${requesterUserDetails ? requesterUserDetails.role : 'usuário(a)'} ${requesterUserDetails ? requesterUserDetails.name : 'não identificado(a)'}`;

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
        studentClass: student.class || 'Não informada',
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
        console.log(`ID fornecido: ${req.query.id}`);
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

                const enrichedReport = {
                    ...reportData,
                    studentName: studentData?.name || 'Nome não disponível',
                    createdByName: creatorData?.name || 'Nome não disponível'
                };

                return res.status(200).json({
                    total: 1,
                    limit: 1,
                    offset: 0,
                    reports: [enrichedReport]
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

        // Log para debug
        logger.info(`Filtros aplicados: ${JSON.stringify(whereClause)}`);

        const { count, rows: reports } = await Report.findAndCountAll({
            where: whereClause,
            limit: parseInt(limit),
            offset: parseInt(offset),
            order: [['createdAt', 'DESC']],
            attributes: { 
                exclude: ['updatedAt']
            }
        });

        const authToken = req.headers.authorization?.split(' ')[1];

        // Buscar nomes dos alunos e criadores
        const enrichedReports = await Promise.all(reports.map(async (report) => {
            const reportData = report.toJSON();
            
            try {
                const studentData = await userService.fetchUser(report.studentId, authToken);
                const creatorData = await userService.fetchUser(report.createdById, authToken);
                
                return {
                    ...reportData,
                    studentName: studentData?.name || 'Nome não disponível',
                    createdByName: creatorData?.name || 'Nome não disponível'
                };
            } catch (error) {
                logger.warn(`Erro ao buscar dados de usuários para o relatório ${report.id}`);
                return {
                    ...reportData,
                    studentName: 'Nome não disponível',
                    createdByName: 'Nome não disponível'
                };
            }
        }));
        
        return res.status(200).json({
            total: count,
            limit: parseInt(limit),
            offset: parseInt(offset),
            reports: enrichedReports
        });

    } catch (error) {
        logger.error(`Erro ao listar relatórios: ${error.message}`);
        return res.status(500).json({ error: 'Erro ao listar relatórios.' });
    }
}
  
module.exports = {
  createReport,
  createManualReport,
  deleteReport,
  listReports
};