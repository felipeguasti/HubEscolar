const userService = require('../services/userService');
const aiService = require('../services/aiService');
const logger = require('../services/loggingService');
const faltasDisciplinares = require('../../faltas_disciplinares.json');
const direitosDeveres = require('../../direitos_deveres.json');

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
            logger.info(`Relatório gerado com sucesso para o aluno ID ${studentId}.`);
            return res.status(200).json({ report: reportText });
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
      reportContentIndex, // Índice da opção selecionada
      reportObservation,
      reportRecommendation
    } = req.body;

    const requesterUser = req.user;
    const authorizationHeader = req.headers.authorization;
    const accessToken = authorizationHeader ? authorizationHeader.split(' ')[1] : null;

    logger.info(`Requisição para criar relatório MANUAL recebida pelo usuário ID: ${requesterUser ? requesterUser.id : 'Não autenticado'}, para o aluno ID: ${studentId}, nível: ${reportLevel}, índice: ${reportContentIndex}`);

    // 2. Verificar se o token foi fornecido
    if (!accessToken) {
      logger.warn('Token de autorização não fornecido para relatório manual.');
      return res.status(401).json({ error: 'Token de autorização não fornecido.' });
    }

    // 3. Validar os dados essenciais
    if (!studentId || !reportLevel || reportContentIndex === undefined || reportContentIndex === null) {
      logger.warn('Dados incompletos para criar o relatório manual.');
      return res.status(400).json({ error: 'Dados incompletos para criar o relatório manual. Certifique-se de fornecer studentId, reportLevel e reportContentIndex.' });
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
      if (listaDeFaltas.length > reportContentIndex && listaDeFaltas[reportContentIndex].reportContentOptions && listaDeFaltas[reportContentIndex].reportContentOptions[reportContentIndex]) {
        artigoEncontrado = listaDeFaltas[reportContentIndex];
        artigoReferencia = `${artigoEncontrado.numero}${artigoEncontrado.inciso ? ` ${artigoEncontrado.inciso}` : ''}`;
        textoInfracao = artigoEncontrado.reportContentOptions[reportContentIndex];
      } else {
        logger.warn(`reportContentIndex inválido para o nível ${reportLevel}.`);
        return res.status(400).json({ error: 'Índice de conteúdo do relatório inválido.' });
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
    let reportText = `O(a) aluno(a), ${student.name}, do ${student.class || 'turma não informada'}, na data de hoje, ${hoje}, foi atendido(a) pelo(a) ${requesterUserDetails ? requesterUserDetails.role : 'usuário(a)'} ${requesterUserDetails ? requesterUserDetails.name : 'não identificado(a)'}`;

    if (suspended && suspensionDuration > 0) {
      reportText += ` e foi suspenso(a) por ${suspensionDuration} dia(s)`;
    }

    reportText += ` por infringir o seguinte artigo do Regimento Comum das Escolas da Rede REGIMENTO COMUM DAS ESCOLAS DA REDE ESTADUAL DE ENSINO DO ESTADO DO ESPÍRITO SANTO - ES: ${artigoReferencia} ${textoInfracao}`;

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

    // 10. Responder com o texto do relatório gerado
    logger.info(`Relatório manual gerado com sucesso para o aluno ID ${studentId}.`);
    return res.status(200).json({ report: reportText });

  } catch (error) {
    logger.error('Erro ao criar relatório manual:', error);
    return res.status(500).json({ error: 'Erro interno do servidor ao gerar relatório manual.' });
  }
}
  
module.exports = {
createReport, 
createManualReport,
};