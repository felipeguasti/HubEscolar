const PDFDocument = require('pdfkit');
const logger = require('../services/loggingService');
const headerService = require('../services/headerService');
const Report = require('../models/Report');
const axios = require('axios');
const { Op } = require('sequelize');

const USERS_SERVICE_URL = process.env.USERS_SERVICE_URL;
const GRADE_SERVICE_URL = process.env.GRADE_SERVICE_URL;

/**
 * Gera um PDF com todas as ocorrências de um aluno específico
 */
async function generateStudentOccurrencesReport(studentId, requesterUser, authToken, logos, filters = {}) {
    try {
        logger.info(`Iniciando geração de relatório de ocorrências para o aluno ID: ${studentId}`);
        logger.info('Logos recebidos:', logos); // Adicionar log para depuração das logos
        
        // 1. Buscar informações do aluno através do microserviço de usuários
        const studentDetails = await axios.get(`${USERS_SERVICE_URL}/users/list/${studentId}`, {
            headers: { Authorization: `Bearer ${authToken}` },
            timeout: 5000
        }).then(response => response.data)
        .catch(error => {
            logger.error(`Erro ao buscar detalhes do aluno ID ${studentId}: ${error.message}`);
            return { name: 'Nome não disponível', schoolId: null };
        });

        // 2. Buscar informações do solicitante
        const requesterDetails = await axios.get(`${USERS_SERVICE_URL}/users/list/${requesterUser.id}`, {
            headers: { Authorization: `Bearer ${authToken}` },
            timeout: 5000
        }).then(response => response.data)
        .catch(error => {
            logger.error(`Erro ao buscar detalhes do solicitante ID ${requesterUser.id}: ${error.message}`);
            return { 
                name: requesterUser.name || 'Nome não disponível',
                role: requesterUser.role
            };
        });

        // 3. Buscar o nome da turma do aluno, se tiver gradeId
        let className = 'Turma não disponível';
        if (studentDetails.gradeId) {
            try {
                const response = await axios.get(`${GRADE_SERVICE_URL}/grades/${studentDetails.gradeId}`, {
                    headers: { Authorization: `Bearer ${authToken}` },
                    timeout: 5000
                });
                
                if (response.status === 200 && response.data && response.data.status === 'success' && response.data.data) {
                    className = response.data.data.name;
                }
            } catch (error) {
                logger.error(`Erro ao buscar turma ID ${studentDetails.gradeId}: ${error.message}`);
                className = studentDetails.className || studentDetails.userClass || 'Turma não disponível';
            }
        } else {
            className = studentDetails.className || studentDetails.userClass || 'Turma não disponível';
        }

        // 4. Buscar as ocorrências do aluno com filtros
        const whereClause = { studentId };
        
        if (filters.startDate || filters.endDate) {
            whereClause.createdAt = {};
            if (filters.startDate) {
                whereClause.createdAt[Op.gte] = new Date(filters.startDate);
            }
            if (filters.endDate) {
                whereClause.createdAt[Op.lte] = new Date(filters.endDate);
            }
        }
        
        if (filters.reportLevel) {
            whereClause.reportLevel = filters.reportLevel;
        }
        
        const occurrences = await Report.findAll({
            where: whereClause,
            order: [['createdAt', 'DESC']],
            raw: true
        });

        // 5. Obter dados do header
        const schoolId = requesterDetails.schoolId;
        const header = await headerService.getOrCreateHeader(schoolId, authToken)
            .catch(error => {
                logger.error('Erro ao obter header:', error.message);
                return {
                    line1: 'GOVERNO DO ESTADO DO ESPÍRITO SANTO',
                    line2: 'SECRETARIA DE ESTADO DA EDUCAÇÃO',
                    cachedSchoolName: 'ESCOLA ESTADUAL'
                };
            });

        // 6. Gerar o PDF
        return new Promise((resolve, reject) => {
            const doc = new PDFDocument({
                size: 'A4',
                margin: 50,
                bufferPages: true
            });

            const chunks = [];
            doc.on('data', chunk => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);

            try {
                // Definir constantes de layout
                const pageWidth = doc.page.width;
                const pageHeight = doc.page.height;
                const margin = 50;
                const tableWidth = pageWidth - (margin * 2);
                
                // Adicionar cabeçalho com logos
                logger.info('Tentando adicionar logos ao relatório:', logos);
                addHeaderToPage(doc, logos, header);

                // Título e informações do aluno
                doc.fontSize(16)
                   .font('Helvetica-Bold')
                   .text('RELATÓRIO DE OCORRÊNCIAS DO ALUNO', { 
                       align: 'center',
                       width: pageWidth - 100
                   })
                   .moveDown(1);
                
                // Informações do aluno em formato de tabela
                const tableLeft = 70;
                const infoTableWidth = 450;
                const rowHeight = 25;
                
                // Fundo cinza claro para o cabeçalho da tabela de informações
                doc.rect(tableLeft, doc.y, infoTableWidth, rowHeight)
                   .fillAndStroke('#f0f0f0', '#000000');
                
                // Título da tabela de informações
                doc.fillColor('#000000')
                   .fontSize(12)
                   .font('Helvetica-Bold')
                   .text('INFORMAÇÕES DO ALUNO', tableLeft + 10, doc.y + 7, { width: infoTableWidth - 20 });
                
                doc.moveDown(0.5);
                let currentY = doc.y;
                
                // Função para adicionar linha na tabela de informações
                function addInfoRow(label, value) {
                    doc.font('Helvetica-Bold')
                       .fontSize(10)
                       .text(label, tableLeft, currentY, { width: 120 });
                    
                    doc.font('Helvetica')
                       .text(value || 'Não informado', tableLeft + 130, currentY, { width: infoTableWidth - 140 });
                    
                    currentY += rowHeight;
                }
                
                // Adicionar linhas com as informações do aluno
                addInfoRow('Nome:', studentDetails.name);
                
                // Usar className para exibir a turma
                const turma = className || 
                             (studentDetails.userClass ? studentDetails.userClass : 'Turma não disponível');
                addInfoRow('Turma:', turma);
                
                // Adicionar data do relatório
                const currentDate = new Date().toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric'
                });
                
                addInfoRow('Data do relatório:', currentDate);
                
                // Adicionar período das ocorrências
                let periodoTexto = 'Todas as ocorrências';
                if (filters.startDate && filters.endDate) {
                    periodoTexto = `De ${new Date(filters.startDate).toLocaleDateString('pt-BR')} a ${new Date(filters.endDate).toLocaleDateString('pt-BR')}`;
                } else if (filters.startDate) {
                    periodoTexto = `A partir de ${new Date(filters.startDate).toLocaleDateString('pt-BR')}`;
                } else if (filters.endDate) {
                    periodoTexto = `Até ${new Date(filters.endDate).toLocaleDateString('pt-BR')}`;
                }
                
                addInfoRow('Período:', periodoTexto);
                
                doc.moveDown(1);

                // Verificar se há ocorrências para exibir
                if (!occurrences || occurrences.length === 0) {
                    doc.fontSize(12)
                       .font('Helvetica-Oblique')
                       .text('Não há ocorrências registradas para este aluno no período selecionado.', {
                           align: 'center'
                       })
                       .moveDown(2);
                } else {
                    // 7. Adicionar título da tabela de ocorrências
                    doc.fontSize(14)
                       .font('Helvetica-Bold')
                       .text('HISTÓRICO DE OCORRÊNCIAS', { 
                           align: 'center',
                           width: pageWidth - 100
                       })
                       .moveDown(0.5);
                    
                    // 8. Adicionar tabela de ocorrências
                    const tableLeft2 = 50;
                    const headerHeight = 30;
                    const rowHeight2 = 40;
                    const colWidths = {
                        date: 80,                 // Data
                        level: 80,                // Nível
                        summary: tableWidth - 240,  // Resumo
                        id: 80                    // ID
                    };
                    
                    // Desenhar cabeçalho da tabela
                    doc.rect(tableLeft2, doc.y, tableWidth, headerHeight)
                       .fillAndStroke('#cccccc', '#000000');
                    
                    let headerY = doc.y + 10;
                    
                    // Textos do cabeçalho
                    doc.fillColor('#000000')
                       .fontSize(10)
                       .font('Helvetica-Bold');
                    
                    doc.text('Data', tableLeft2 + 5, headerY, { width: colWidths.date, align: 'center' });
                    doc.text('Nível', tableLeft2 + colWidths.date + 5, headerY, { width: colWidths.level, align: 'center' });
                    doc.text('Resumo da Ocorrência', tableLeft2 + colWidths.date + colWidths.level + 5, headerY, 
                             { width: colWidths.summary, align: 'center' });
                    doc.text('ID', tableLeft2 + colWidths.date + colWidths.level + colWidths.summary + 5, headerY, 
                             { width: colWidths.id, align: 'center' });
                    
                    let rowY = doc.y + headerHeight;
                    
                    // Função para verificar espaço na página e adicionar nova se necessário
                    function checkPageBreak(heightNeeded) {
                        if (rowY + heightNeeded > pageHeight - 100) {
                            doc.addPage();
                            
                            // IMPORTANTE: Garantir que as logos sejam passadas corretamente
                            logger.info('Adicionando nova página com logos:', logos);
                            
                            // Importante: Usar o header original, não criar um novo objeto
                            // apenas adicionar a indicação de continuação
                            const headerWithContinuation = {
                                line1: header.line1,
                                line2: header.line2,
                                cachedSchoolName: header.cachedSchoolName + ' - CONTINUAÇÃO',
                                schoolLogo: header.schoolLogo,
                                districtLogo: header.districtLogo
                            };
                            
                            // Adicionar o cabeçalho completo com logos na nova página
                            addHeaderToPage(doc, logos, headerWithContinuation);
                            
                            // Redesenhar cabeçalho da tabela na nova página
                            doc.rect(tableLeft2, doc.y, tableWidth, headerHeight)
                               .fillAndStroke('#cccccc', '#000000');
                            
                            headerY = doc.y + 10;
                            
                            doc.fillColor('#000000')
                               .fontSize(10)
                               .font('Helvetica-Bold');
                            
                            doc.text('Data', tableLeft2 + 5, headerY, { width: colWidths.date, align: 'center' });
                            doc.text('Nível', tableLeft2 + colWidths.date + 5, headerY, { width: colWidths.level, align: 'center' });
                            doc.text('Resumo da Ocorrência', tableLeft2 + colWidths.date + colWidths.level + 5, headerY, 
                                     { width: colWidths.summary, align: 'center' });
                            doc.text('ID', tableLeft2 + colWidths.date + colWidths.level + colWidths.summary + 5, headerY, 
                                     { width: colWidths.id, align: 'center' });
                            
                            rowY = doc.y + headerHeight;
                        }
                    }
                    
                    // Adicionar linhas para cada ocorrência
                    for (let i = 0; i < occurrences.length; i++) {
                        const occurrence = occurrences[i];
                        
                        // Verificar se precisa de nova página
                        checkPageBreak(rowHeight2);
                        
                        // Alternância de cores para linhas (zebra striping)
                        const fillColor = i % 2 === 0 ? '#f9f9f9' : '#ffffff';
                        
                        // Fundo da linha
                        doc.rect(tableLeft2, rowY, tableWidth, rowHeight2)
                           .fillAndStroke(fillColor, '#cccccc');
                        
                        // Formatação da data
                        const date = new Date(occurrence.createdAt);
                        const formattedDate = date.toLocaleDateString('pt-BR');
                        
                        // Formatação do nível
                        let level = 'N/A';
                        if (occurrence.reportLevel) {
                            level = occurrence.reportLevel === 'leves' ? 'Leve' :
                                  occurrence.reportLevel === 'graves' ? 'Grave' :
                                  occurrence.reportLevel === 'gravissimas' ? 'Gravíssima' :
                                  occurrence.reportLevel === 'automatic' ? 'Automática' :
                                  occurrence.reportLevel;
                        }
                        
                        // Resumo (primeiros caracteres do conteúdo ou observação)
                        let summary = '';
                        if (occurrence.reportObservation) {
                            summary = occurrence.reportObservation;
                        } else if (occurrence.content) {
                            // Limitar o resumo a um número razoável de caracteres
                            summary = occurrence.content.substring(0, 100);
                            if (occurrence.content.length > 100) {
                                summary += '...';
                            }
                        } else {
                            summary = 'Sem detalhes';
                        }
                        
                        // Escrever os dados na linha
                        doc.fillColor('#000000')
                           .fontSize(9)
                           .font('Helvetica');
                        
                        const textY = rowY + 10; // Ajustado para melhor centralização vertical
                        doc.text(formattedDate, tableLeft2 + 5, textY, { width: colWidths.date - 10, align: 'center' });
                        doc.text(level, tableLeft2 + colWidths.date + 5, textY, { width: colWidths.level - 10, align: 'center' });
                        doc.text(summary, tableLeft2 + colWidths.date + colWidths.level + 5, textY, 
                                { width: colWidths.summary - 10, align: 'left' });
                        doc.text(occurrence.id.toString(), tableLeft2 + colWidths.date + colWidths.level + colWidths.summary + 5, textY, 
                                { width: colWidths.id - 10, align: 'center' });
                        
                        // Atualizar posição Y para a próxima linha
                        rowY += rowHeight2;
                    }
                    
                    // Adicionar estatísticas após a tabela
                    doc.moveDown(1);
                    doc.fontSize(12)
                       .font('Helvetica-Bold')
                       .text('RESUMO DAS OCORRÊNCIAS', {
                           align: 'center',
                           width: pageWidth - 100
                       })
                       .moveDown(0.5);
                    
                    // Calcular estatísticas
                    const totalOcorrencias = occurrences.length;
                    const ocorrenciasLeves = occurrences.filter(o => o.reportLevel === 'leves').length;
                    const ocorrenciasGraves = occurrences.filter(o => o.reportLevel === 'graves').length;
                    const ocorrenciasGravissimas = occurrences.filter(o => o.reportLevel === 'gravissimas').length;
                    const outrasOcorrencias = totalOcorrencias - ocorrenciasLeves - ocorrenciasGraves - ocorrenciasGravissimas;
                    
                    // Desenhar tabela de estatísticas
                    const statsLeft = 150;
                    const statsWidth = 300;
                    
                    doc.font('Helvetica')
                       .fontSize(10);
                    
                    const statsRows = [
                        { label: 'Total de ocorrências:', value: totalOcorrencias },
                        { label: 'Ocorrências leves:', value: ocorrenciasLeves },
                        { label: 'Ocorrências graves:', value: ocorrenciasGraves },
                        { label: 'Ocorrências gravíssimas:', value: ocorrenciasGravissimas }
                    ];
                    
                    if (outrasOcorrencias > 0) {
                        statsRows.push({ label: 'Outras ocorrências:', value: outrasOcorrencias });
                    }
                    
                    let statsY = doc.y;
                    statsRows.forEach(row => {
                        doc.font('Helvetica-Bold')
                           .text(row.label, statsLeft, statsY, { width: 200, align: 'right' })
                           .font('Helvetica')
                           .text(row.value.toString(), statsLeft + 210, statsY, { width: 50 });
                        
                        statsY += 20;
                    });
                }

                // Assinaturas
                doc.moveDown(2);
                addFooterWithSignatures(doc, requesterDetails);
                
                // Adicionar numeração de páginas
                const pageCount = doc.bufferedPageCount;
                for (let i = 0; i < pageCount; i++) {
                    doc.switchToPage(i);
                    
                    doc.fontSize(8)
                       .font('Helvetica')
                       .text(
                           `Página ${i + 1} de ${pageCount}`,
                           50,
                           pageHeight - 30,
                           { align: 'center', width: pageWidth - 100 }
                       );
                       
                    doc.text(
                        `Documento gerado em ${new Date().toLocaleString('pt-BR')}`,
                        50,
                        pageHeight - 20,
                        { align: 'center', width: pageWidth - 100 }
                    );
                }

                doc.end();
            } catch (error) {
                logger.error('Erro ao gerar PDF de ocorrências:', error);
                reject(error);
            }
        });

    } catch (error) {
        logger.error(`Erro ao gerar relatório de ocorrências do aluno: ${error.message}`);
        throw error;
    }
}

/**
 * Gera o PDF de um relatório específico
 */
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
        let creatorDetails, requesterDetails, studentDetails;
        try {
            // Buscar dados em paralelo com Promise.all
            const [creatorResponse, requesterResponse, studentResponse] = await Promise.all([
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
                }),
                
                axios.get(`${USERS_SERVICE_URL}/users/list/${report.studentId}`, {
                    headers: { Authorization: `Bearer ${authToken}` },
                    timeout: 5000
                }).catch(error => {
                    logger.error(`Erro ao buscar dados do aluno: ${error.message}`);
                    return { data: { 
                        name: 'Nome não disponível',
                        className: report.studentClass
                    }};
                })
            ]);

            creatorDetails = creatorResponse.data;
            requesterDetails = requesterResponse.data;
            studentDetails = studentResponse.data;

            logger.info('Dados dos usuários obtidos:', { 
                creator: { id: creatorDetails.id, schoolId: creatorDetails.schoolId },
                requester: { id: requesterDetails.id },
                student: { id: studentDetails.id }
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
                    // --- PRIMEIRA PÁGINA (Relatório completo) ---
                    
                    // Header Layout - Usando os logos recebidos via parâmetro
                    logger.info('Tentando carregar logos:', {
                        districtLogo: logos.districtLogo,
                        schoolLogo: logos.schoolLogo
                    });

                    // Adicionar logos e cabeçalho
                    addHeaderToPage(doc, logos, header);

                    // Title
                    doc.fontSize(16)
                        .text(`ADVERTÊNCIA DISCIPLINAR - ID: ${report.id}`, { align: 'center' })
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
                    
                    // --- SEGUNDA PÁGINA (Canhoto para o aluno) ---
                    doc.addPage();
                    
                    // Adicionar logos e cabeçalho na segunda página
                    addHeaderToPage(doc, logos, header);
                    
                    // Título da segunda página com ID do relatório
                    doc.fontSize(16)
                       .font('Helvetica-Bold')
                       .text(`COMPROVANTE DE ADVERTÊNCIA - ID: ${report.id}`, { align: 'center' })
                       .moveDown(0.5);
                    
                    // Data
                    const currentDate = new Date().toLocaleDateString('pt-BR');
                    doc.fontSize(10)
                       .font('Helvetica')
                       .text(`Data: ${currentDate}`, { align: 'right' })
                       .moveDown();
                       
                    // Dados do aluno e ocorrência em formato mais simples
                    doc.fontSize(12)
                       .font('Helvetica-Bold')
                       .text('DADOS DA OCORRÊNCIA', { align: 'center' })
                       .moveDown(0.5);
                    
                    // Tabela com os dados
                    const tableTop = doc.y;
                    const tableLeft = 70;
                    const colWidth = 450;
                    const rowHeight = 25;
                    let currentTop = tableTop;
                    
                    // Função helper para adicionar linha na tabela
                    function addTableRow(label, value) {
                        doc.font('Helvetica-Bold')
                           .text(label, tableLeft, currentTop, { width: 150 });
                        
                        doc.font('Helvetica')
                           .text(value, tableLeft + 150, currentTop, { width: colWidth - 150 });
                        
                        currentTop += rowHeight;
                    }
                    
                    // Adicionar as linhas da tabela
                    addTableRow('Aluno:', studentDetails.name || 'Nome não disponível');
                    addTableRow('Turma:', report.studentClass || 'Turma não disponível');
                    addTableRow('Nível:', report.reportLevel === 'leves' ? 'Leve' : 
                                            report.reportLevel === 'graves' ? 'Grave' : 
                                            report.reportLevel === 'gravissimas' ? 'Gravíssima' : 
                                            report.reportLevel);
                        
                    addTableRow('Observação:', report.reportObservation || 'Sem observações');
                    
                    if (report.suspended) {
                        addTableRow('Suspensão:', `${report.suspensionDuration} dia(s)`);
                    }
                    
                    if (report.callParents) {
                        const meetingDate = report.parentsMeeting ? 
                            new Date(report.parentsMeeting).toLocaleString('pt-BR') : 
                            'Data não definida';
                        addTableRow('Reunião com responsáveis:', meetingDate);
                    }
                    
                    addTableRow('Encaminhamentos:', report.reportRecommendation || 'Não especificado');

                    // A partir daqui, sair do formato de tabela e usar toda a largura da página
                    currentTop += 20; // Espaço adicional após a última linha da tabela

                    // Declaração de ciência - usando toda a largura disponível
                    doc.fontSize(12)
                       .font('Helvetica-Bold')
                       .text('DECLARAÇÃO DE CIÊNCIA', tableLeft, currentTop, { 
                           align: 'center',
                           width: colWidth // Usar a largura total da tabela
                       })
                       .moveDown(0.5);

                    currentTop = doc.y; // Atualizar a posição vertical

                    doc.fontSize(10)
                       .font('Helvetica')
                       .text('Declaro que recebi uma cópia desta advertência disciplinar e estou ciente do seu conteúdo.', tableLeft, currentTop, {
                           align: 'center',
                           width: colWidth
                       })
                       .moveDown(1);

                    currentTop = doc.y + 15; // Atualizar a posição vertical
                    
                    // Linha para assinatura do aluno
                    doc.text('_______________________________', tableLeft, currentTop, {
                        align: 'center',
                        width: colWidth
                    });

                    currentTop = doc.y; // Atualizar a posição vertical

                    doc.text('Assinatura do(a) Aluno(a)', tableLeft, currentTop, {
                        align: 'center',
                        width: colWidth
                    })
                    .moveDown();

                    currentTop = doc.y; // Atualizar a posição vertical

                    // Linha para data da assinatura
                    doc.moveDown(1)
                       .text('Data: ____/____/________', tableLeft, currentTop, {
                           align: 'center',
                           width: colWidth
                       })
                       .moveDown(1);

                    currentTop = doc.y; // Atualizar a posição vertical

                    doc.fontSize(8)
                       .text(`ID da Ocorrência: ${report.id}`, tableLeft, currentTop, {
                           align: 'center',
                           width: colWidth
                       });

                    // Continuar com a linha tracejada para recorte
                    currentTop = doc.y + 10; // Adicionar espaço antes da linha tracejada

                    // Linha tracejada para recorte
                    doc.moveDown(1)
                       .fontSize(8)
                       .text('- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -', {
                           align: 'center',
                           width: doc.page.width - 100
                       })
                       .moveDown(0.5)
                       .text('Recorte na linha acima e mantenha a parte inferior para seu controle', {
                           align: 'center',
                           width: doc.page.width - 100
                       })
                       .moveDown(1);

                    // COMPROVANTE DE RECEBIMENTO (agora abaixo da linha pontilhada)
                    doc.fontSize(12)
                       .font('Helvetica-Bold')
                       .text(`COMPROVANTE DO ALUNO - ID: ${report.id}`, { align: 'center' })
                       .moveDown(0.5);

                    doc.fontSize(10)
                       .font('Helvetica-Bold')
                       .text('Aluno:', { continued: true })
                       .font('Helvetica')
                       .text(` ${studentDetails.name || 'Nome não disponível'}`)
                       .font('Helvetica-Bold')
                       .text('Turma:', { continued: true })
                       .font('Helvetica')
                       .text(` ${report.studentClass || 'Turma não disponível'}`)
                       .moveDown(0.5);

                    // Resumo da ocorrência para o canhoto do aluno
                    doc.font('Helvetica-Bold')
                       .text('Resumo da ocorrência:', { underline: true })
                       .moveDown(0.5)
                       .font('Helvetica');

                    // Criar um resumo conciso a partir do conteúdo ou observação
                    let resumo = '';
                    if (report.reportObservation && report.reportObservation.length > 0) {
                        // Usar a observação se disponível
                        resumo = report.reportObservation;
                    } else {
                        // Extrair as primeiras 150 caracteres do conteúdo como resumo
                        resumo = report.content.substring(0, 150);
                        if (report.content.length > 150) {
                            resumo += '...';
                        }
                    }

                    // Adicionar informações adicionais relevantes
                    if (report.suspended) {
                        resumo += ` Suspensão: ${report.suspensionDuration} dia(s).`;
                    }

                    doc.text(resumo, {
                        align: 'justify',
                        width: doc.page.width - 100
                    })
                    .moveDown(0.5);

                    // Data da ocorrência
                    doc.font('Helvetica-Bold')
                       .text('Data da ocorrência:', { continued: true })
                       .font('Helvetica')
                       .text(` ${new Date(report.createdAt).toLocaleDateString('pt-BR')}`)
                       .moveDown(0.5);

                    // Indicação de reunião se aplicável
                    if (report.callParents) {
                        const meetingDate = report.parentsMeeting ? 
                            new Date(report.parentsMeeting).toLocaleString('pt-BR') : 
                            'Data não definida';
                        doc.font('Helvetica-Bold')
                           .text('Reunião com responsáveis:', { continued: true })
                           .font('Helvetica')
                           .text(` ${meetingDate}`)
                           .moveDown(0.5);
                    }

                    // Informação de contato
                    doc.moveDown(0.5)
                       .fontSize(8)
                       .text('Para mais informações, entre em contato com a coordenação da escola.', { align: 'left' })
                       .text(`ID da Ocorrência: ${report.id}`, { align: 'left' });

                    const currentPosition = doc.y;
                    const footerHeight = 30; // Estimativa da altura do footer
                    const pageHeight = doc.page.height;
                    const marginBottom = 30;

                    // Se não tiver espaço suficiente, adicionar uma nova página
                    if (currentPosition + footerHeight > pageHeight - marginBottom) {
                        doc.addPage();
                    }

                    // Adicionar o footer - versão simplificada para a segunda página
                    doc.moveDown(0.5)
                    doc.fontSize(8)
                    .font('Helvetica')
                    .text(`Documento gerado em ${new Date().toLocaleString('pt-BR')}`, {
                        align: 'center',
                        width: doc.page.width - 100
                    });
                       
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

/**
 * Adiciona o cabeçalho à página - USANDO CÓDIGO DO CONTROLLER
 */
function addHeaderToPage(doc, logos, header) {
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
       .moveDown(2);
}

/**
 * Adiciona informações do aluno ao PDF
 */
function addStudentInfo(doc, studentDetails, className) {
    // Título do relatório - Usando largura total e centralizado
    doc.fontSize(16)
       .font('Helvetica-Bold')
       .text('RELATÓRIO DE OCORRÊNCIAS DO ALUNO', { 
           align: 'center',
           width: doc.page.width - 100
       })
       .moveDown(1);
    
    // Informações do aluno em formato de tabela
    const tableLeft = 70;
    const tableWidth = 450;
    const rowHeight = 25;
    
    // Fundo cinza claro para o cabeçalho da tabela de informações
    doc.rect(tableLeft, doc.y, tableWidth, rowHeight)
       .fillAndStroke('#f0f0f0', '#000000');
    
    // Título da tabela de informações
    doc.fillColor('#000000')
       .fontSize(12)
       .font('Helvetica-Bold')
       .text('INFORMAÇÕES DO ALUNO', tableLeft + 10, doc.y + 7, { width: tableWidth - 20 });
    
    doc.moveDown(0.5);
    let currentY = doc.y;
    
    // Função para adicionar linha na tabela de informações
    function addInfoRow(label, value) {
        doc.font('Helvetica-Bold')
           .fontSize(10)
           .text(label, tableLeft, currentY, { width: 120 });
        
        doc.font('Helvetica')
           .text(value || 'Não informado', tableLeft + 130, currentY, { width: tableWidth - 140 });
        
        currentY += rowHeight;
    }
    
    // Adicionar linhas com as informações do aluno - removendo matrícula/ID
    addInfoRow('Nome:', studentDetails.name);
    
    // Usar className em vez de gradeId para exibir a turma
    const turma = className || 
                 (studentDetails.userClass ? studentDetails.userClass : 'Turma não disponível');
    addInfoRow('Turma:', turma);
    
    // Adicionar data do relatório
    const currentDate = new Date().toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
    
    addInfoRow('Data do relatório:', currentDate);
    
    doc.moveDown(1);
}

/**
 * Adiciona a tabela de ocorrências ao PDF
 */
function addOccurrencesTable(doc, occurrences, logos, header) {
    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;
    const margin = 50;
    
    // Se não houver ocorrências
    if (!occurrences || occurrences.length === 0) {
        doc.fontSize(12)
           .font('Helvetica-Oblique')
           .text('Não há ocorrências registradas para este aluno.', {
               align: 'center'
           })
           .moveDown(2);
        return;
    }
    
    // Título da tabela de ocorrências - ocupando largura total
    doc.fontSize(14)
       .font('Helvetica-Bold')
       .text('HISTÓRICO DE OCORRÊNCIAS', { 
           align: 'center',
           width: doc.page.width - 100
       })
       .moveDown(0.5);
    
    const tableLeft = 50;
    const tableWidth = pageWidth - (margin * 2);
    const headerHeight = 30;
    const rowHeight = 40;
    const colWidths = {
        date: 80,      // Data
        level: 80,      // Nível
        summary: tableWidth - 240,  // Resumo
        id: 80        // ID
    };
    
    // Desenhar cabeçalho da tabela
    doc.rect(tableLeft, doc.y, tableWidth, headerHeight)
       .fillAndStroke('#cccccc', '#000000');
    
    let headerY = doc.y + 10;
    
    // Textos do cabeçalho
    doc.fillColor('#000000')
       .fontSize(10)
       .font('Helvetica-Bold');
    
    doc.text('Data', tableLeft + 5, headerY, { width: colWidths.date, align: 'center' });
    doc.text('Nível', tableLeft + colWidths.date + 5, headerY, { width: colWidths.level, align: 'center' });
    doc.text('Resumo da Ocorrência', tableLeft + colWidths.date + colWidths.level + 5, headerY, 
             { width: colWidths.summary, align: 'center' });
    doc.text('ID', tableLeft + colWidths.date + colWidths.level + colWidths.summary + 5, headerY, 
             { width: colWidths.id, align: 'center' });
    
    let rowY = doc.y + headerHeight;
    
    // Função para verificar espaço na página e adicionar nova se necessário
    function checkPageBreak(heightNeeded) {
        if (rowY + heightNeeded > pageHeight - 100) {
            doc.addPage();
            
            // IMPORTANTE: Usar EXATAMENTE a mesma abordagem do controller
            addHeaderToPage(doc, logos, {
                line1: 'GOVERNO DO ESTADO DO ESPÍRITO SANTO',
                line2: 'SECRETARIA DE ESTADO DA EDUCAÇÃO',
                cachedSchoolName: 'CONTINUAÇÃO - HISTÓRICO DE OCORRÊNCIAS'
            });
            
            // Redesenhar cabeçalho da tabela na nova página
            doc.rect(tableLeft, doc.y, tableWidth, headerHeight)
               .fillAndStroke('#cccccc', '#000000');
            
            headerY = doc.y + 10;
            
            doc.fillColor('#000000')
               .fontSize(10)
               .font('Helvetica-Bold');
            
            doc.text('Data', tableLeft + 5, headerY, { width: colWidths.date, align: 'center' });
            doc.text('Nível', tableLeft + colWidths.date + 5, headerY, { width: colWidths.level, align: 'center' });
            doc.text('Resumo da Ocorrência', tableLeft + colWidths.date + colWidths.level + 5, headerY, 
                     { width: colWidths.summary, align: 'center' });
            doc.text('ID', tableLeft + colWidths.date + colWidths.level + colWidths.summary + 5, headerY, 
                     { width: colWidths.id, align: 'center' });
            
            rowY = doc.y + headerHeight;
        }
    }
    
    // Adicionar linhas para cada ocorrência
    for (let i = 0; i < occurrences.length; i++) {
        const occurrence = occurrences[i];
        
        // Verificar se precisa de nova página
        checkPageBreak(rowHeight);
        
        // Alternância de cores para linhas (zebra striping)
        const fillColor = i % 2 === 0 ? '#f9f9f9' : '#ffffff';
        
        // Fundo da linha
        doc.rect(tableLeft, rowY, tableWidth, rowHeight)
           .fillAndStroke(fillColor, '#cccccc');
        
        // Formatação da data
        const date = new Date(occurrence.createdAt);
        const formattedDate = date.toLocaleDateString('pt-BR');
        
        // Formatação do nível
        let level = 'N/A';
        if (occurrence.reportLevel) {
            level = occurrence.reportLevel === 'leves' ? 'Leve' :
                   occurrence.reportLevel === 'graves' ? 'Grave' :
                   occurrence.reportLevel === 'gravissimas' ? 'Gravíssima' :
                   occurrence.reportLevel === 'automatic' ? 'Automática' :
                   occurrence.reportLevel;
        }
        
        // Resumo (primeiros caracteres do conteúdo ou observação)
        let summary = '';
        if (occurrence.reportObservation) {
            summary = occurrence.reportObservation;
        } else if (occurrence.content) {
            // Limitar o resumo a um número razoável de caracteres
            summary = occurrence.content.substring(0, 100);
            if (occurrence.content.length > 100) {
                summary += '...';
            }
        } else {
            summary = 'Sem detalhes';
        }
        
        // Escrever os dados na linha
        doc.fillColor('#000000')
           .fontSize(9)
           .font('Helvetica');
        
        const textY = rowY + 10; // Ajustado para melhor centralização vertical
        doc.text(formattedDate, tableLeft + 5, textY, { width: colWidths.date - 10, align: 'center' });
        doc.text(level, tableLeft + colWidths.date + 5, textY, { width: colWidths.level - 10, align: 'center' });
        doc.text(summary, tableLeft + colWidths.date + colWidths.level + 5, textY, 
                { width: colWidths.summary - 10, align: 'left' });
        doc.text(occurrence.id.toString(), tableLeft + colWidths.date + colWidths.level + colWidths.summary + 5, textY, 
                { width: colWidths.id - 10, align: 'center' });
        
        // Atualizar posição Y para a próxima linha
        rowY += rowHeight;
    }
    
    // Espaço após a tabela
    doc.moveDown(2);
}

/**
 * Helper function for footer with signatures - USANDO EXATAMENTE O CÓDIGO DO CONTROLLER
 */
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
           creatorDetails ? 
           (creatorDetails.role === 'Master' ? 'Master' : 
           creatorDetails.role === 'Diretor' ? 'Diretor(a)' :
           creatorDetails.role === 'Coordenador' ? 'Coordenador(a)' :
           creatorDetails.role === 'Professor' ? 'Professor(a)' :
           creatorDetails.role === 'Secretario' ? 'Secretário(a)' :
           creatorDetails.role === 'Pedagogo' ? 'Pedagogo(a)' : 
           creatorDetails.role) :
           requesterDetails.role === 'Master' ? 'Master' : 
           requesterDetails.role === 'Diretor' ? 'Diretor(a)' :
           requesterDetails.role === 'Coordenador' ? 'Coordenador(a)' :
           requesterDetails.role === 'Professor' ? 'Professor(a)' :
           requesterDetails.role === 'Secretario' ? 'Secretário(a)' :
           requesterDetails.role === 'Pedagogo' ? 'Pedagogo(a)' : 
           requesterDetails.role
       }`, { align: 'center' })
       .text(`${creatorDetails ? creatorDetails.name : requesterDetails.name}`, { align: 'center' })
       .moveDown(2);

    // Footer text no final da página
    doc.fontSize(10)
       .text(footerText, 50, doc.page.height - bottomMargin - footerTextHeight, {
           align: 'right',
           width: doc.page.width - 100
       });
}

/**
 * Adiciona numeração de páginas ao documento
 */
function addPageNumbers(doc) {
    const pageCount = doc.bufferedPageCount;
    
    for (let i = 0; i < pageCount; i++) {
        doc.switchToPage(i);
        
        doc.fontSize(8)
           .font('Helvetica')
           .text(
               `Página ${i + 1} de ${pageCount}`,
               50,
               doc.page.height - 30,
               { align: 'right', width: doc.page.width - 100 }
           );
    }
}

module.exports = {
    generateStudentOccurrencesReport,
    generateReportPDF
};