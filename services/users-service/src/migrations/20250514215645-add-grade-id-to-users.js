'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      // Verificar se a coluna já existe para evitar erros
      const tableInfo = await queryInterface.describeTable('users');
      
      // Se a coluna gradeId ainda não existe, criá-la
      if (!tableInfo.gradeId) {
        await queryInterface.addColumn('users', 'gradeId', {
          type: Sequelize.INTEGER,
          allowNull: true,
          comment: 'Id da turma do aluno - referência ao microserviço school-service'
        });
        
        console.log('Coluna gradeId adicionada com sucesso à tabela users');
      } else {
        console.log('Coluna gradeId já existe na tabela users');
      }
      
      // Atualizar os valores de gradeId baseado em userClass existente (opcional)
      // Esta parte requer uma estratégia específica para mapear nomes de turmas para IDs
      // e provavelmente exigirá consultas adicionais ao serviço de turmas
      
      return Promise.resolve();
    } catch (error) {
      console.error('Erro na migração:', error);
      return Promise.reject(error);
    }
  },

  down: async (queryInterface, Sequelize) => {
    try {
      // Verificar se a coluna existe antes de tentar removê-la
      const tableInfo = await queryInterface.describeTable('users');
      
      if (tableInfo.gradeId) {
        await queryInterface.removeColumn('users', 'gradeId');
        console.log('Coluna gradeId removida com sucesso da tabela users');
      } else {
        console.log('Coluna gradeId não existe na tabela users');
      }
      
      return Promise.resolve();
    } catch (error) {
      console.error('Erro ao reverter migração:', error);
      return Promise.reject(error);
    }
  }
};