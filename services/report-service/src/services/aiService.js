require('dotenv').config();
const axios = require('axios');

const REPORT_SERVICE_BASE_URL = process.env.REPORT_SERVICE_URL || 'http://localhost:3005';
const regimentoArtigos = require('../../direitos_deveres.json');
const faltasDisciplinares = require('../../faltas_disciplinares.json');
const medidasEducativas = require('../../medidas_educativas.json');

async function generateReportText(student, topics, requesterUserDetails) {
    try {
        let requesterInfo = "um usuário do sistema";
        if (requesterUserDetails && requesterUserDetails.name && requesterUserDetails.role) {
            requesterInfo = `a ${requesterUserDetails.role} ${requesterUserDetails.name}`;
        } else if (requesterUserDetails && requesterUserDetails.name) {
            requesterInfo = `o usuário ${requesterUserDetails.name}`;
        } else if (requesterUserDetails && requesterUserDetails.role) {
            requesterInfo = `um(a) ${requesterUserDetails.role}`;
        }

        const currentDate = new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });

        const prompt = `Você é um assistente especializado na criação de relatórios escolares. Analise os seguintes tópicos sobre o aluno ${student.name} (ID: ${student.id}) e gere um relatório que defenda a escola, se paute nas leis relevantes para o contexto educacional brasileiro e mencione a importância da frequência, do desempenho acadêmico e do respeito às normas da escola.

        **Tópicos:** ${topics.join(', ')}

        Utilize como referência o seguinte regimento escolar para embasar suas afirmações e recomendações, citando no máximo 2 artigos relevantes de cada seção (Direitos e Deveres, Faltas Disciplinares e Medidas Educativas) que se relacionem diretamente com os tópicos fornecidos. Seja conciso e evite incluir artigos que não sejam estritamente pertinentes.

        **Regimento Escolar:**

        **Direitos e Deveres:**
        ${regimentoArtigos.direitos_deveres.map(item => `${item.numero}: ${item.texto}`).join('\n')}

        **Faltas Disciplinares:**
        **Atos Indisciplinares Leves:**
        ${faltasDisciplinares.atos_indisciplinares.leves.map(item => `${item.numero}: ${item.texto}`).join('\n')}

        **Atos Indisciplinares Graves:**
        ${faltasDisciplinares.atos_indisciplinares.graves.map(item => `${item.numero}: ${item.texto}`).join('\n')}

        **Atos Infracionais:**
        ${faltasDisciplinares.atos_indisciplinares.infracionais.map(item => `${item.numero}: ${item.texto}`).join('\n')}

        **Medidas Educativas Disciplinares:**
        ${medidasEducativas.medidas_educativas_disciplinares.map(nivel => `Nível ${nivel.nivel} (Art. ${nivel.artigo_referencia}): ${nivel.medidas.map(medida => medida.tipo).join(', ')}`).join('\n')}

        **Procedimentos e Garantias:**
        ${medidasEducativas.procedimentos_e_garantias.map(item => `${item.artigo}: ${item.texto}`).join('\n')}
        `;

        const payload = {
            text: prompt
        };

        const response = await axios.post(`${REPORT_SERVICE_BASE_URL}/ai/response`, payload);

        if (response.data) {
            return response.data;
        } else {
            console.error('Resposta inesperada da rota /ai/response:', response.data);
            throw new Error('Não foi possível obter o texto do relatório da resposta da IA.');
        }

    } catch (error) {
        console.error('Erro ao gerar texto via /ai/response:', error.message, error.response ? error.response.data : '');
        return null;
    }
}

module.exports = {
    generateReportText,
};