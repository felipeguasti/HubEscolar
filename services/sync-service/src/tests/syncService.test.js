const axios = require('axios');
const fs = require('fs');
const path = require('path');
const syncService = require('../services/syncService');
const { SyncJob, SyncItem } = require('../models');

// Mock das dependências externas
jest.mock('axios');
jest.mock('../models', () => ({
  SyncJob: {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    count: jest.fn()
  },
  SyncItem: {
    create: jest.fn()
  }
}));

describe('SyncService', () => {
  // Configurar mocks antes de cada teste
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock dos dados de teste
    const testDataPath = path.join(__dirname, '../../data/turmas.json');
    if (!fs.existsSync(testDataPath)) {
      // Criar diretório se não existir
      if (!fs.existsSync(path.dirname(testDataPath))) {
        fs.mkdirSync(path.dirname(testDataPath), { recursive: true });
      }
      
      // Criar dados de teste mock
      const mockData = {
        metadados: { versao: "1.0.0" },
        "1ªIV01-EM": [
          { nome: "João da Silva", dt_nascimento: "01/01/2010", sexo: "masculino" },
          { nome: "Maria Souza", dt_nascimento: "15/03/2010", sexo: "feminino" }
        ],
        "2ªM01-EF": [
          { nome: "Pedro Santos", dt_nascimento: "22/05/2009", sexo: "masculino" },
          { nome: "Ana Oliveira", dt_nascimento: "12/12/2009", sexo: "feminino" }
        ]
      };
      
      fs.writeFileSync(testDataPath, JSON.stringify(mockData, null, 2));
    }
  });

  describe('verificarDisponibilidadeSEGES', () => {
    test('deve retornar disponível quando o serviço responde', async () => {
      // Configurar mock do axios para retornar sucesso
      axios.get.mockResolvedValueOnce({ data: { status: 'OK' } });
      
      const result = await syncService.verificarDisponibilidadeSEGES('token-mock');
      
      expect(result.disponivel).toBe(true);
      expect(result.status).toBe('OK');
      expect(axios.get).toHaveBeenCalledWith(
        expect.stringContaining('/status'),
        expect.objectContaining({
          headers: { 'Authorization': 'Bearer token-mock' }
        })
      );
    });
    
    test('deve retornar dados de fallback quando o serviço não responde', async () => {
      // Configurar mock do axios para retornar erro
      axios.get.mockRejectedValueOnce(new Error('Serviço não disponível'));
      
      const result = await syncService.verificarDisponibilidadeSEGES('token-mock');
      
      expect(result.disponivel).toBe(true);
      expect(result.status).toBe('FALLBACK');
    });
  });

  describe('processarTurmasSEGES', () => {
    test('deve processar corretamente as turmas do SEGES', () => {
      const mockData = {
        metadados: { versao: "1.0.0" },
        "1ªIV01-EM": [{ nome: "Aluno 1" }],
        "2ªM01-EF": [{ nome: "Aluno 2" }]
      };
      
      const result = syncService.processarTurmasSEGES(mockData, 1, 2);
      
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe("1ªIV01-EM");
      expect(result[0].schoolId).toBe(1);
      expect(result[0].districtId).toBe(2);
      expect(result[1].name).toBe("2ªM01-EF");
    });
    
    test('deve ignorar a chave metadados', () => {
      const mockData = {
        metadados: { versao: "1.0.0" },
        "1ªIV01-EM": [{ nome: "Aluno 1" }]
      };
      
      const result = syncService.processarTurmasSEGES(mockData, 1, 2);
      
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("1ªIV01-EM");
    });
    
    test('deve identificar o turno corretamente', () => {
      const mockData = {
        "1ªIV01-EM": [], // Integral/Vespertino
        "2ªM01-EM": [],  // Matutino
        "3ªV01-EM": [],  // Vespertino
        "4ªN01-EM": []   // Noturno
      };
      
      const result = syncService.processarTurmasSEGES(mockData, 1, 2);
      
      // Verificar se as turmas foram encontradas
      const integralVespertino = result.find(t => t.name === "1ªIV01-EM");
      const matutino = result.find(t => t.name === "2ªM01-EM");
      const vespertino = result.find(t => t.name === "3ªV01-EM");
      const noturno = result.find(t => t.name === "4ªN01-EM");
      
      expect(integralVespertino).toBeDefined();
      expect(matutino).toBeDefined();
      expect(vespertino).toBeDefined();
      expect(noturno).toBeDefined();
      
      // Verificar os turnos identificados
      expect(integralVespertino.shift).toBe("integral");
      expect(matutino.shift).toBe("matutino");
      expect(vespertino.shift).toBe("vespertino");
      expect(noturno.shift).toBe("noturno");
    });
    
    test('deve identificar o turno corretamente pela terceira letra', () => {
      const mockData = {
        "1ªM01-EM": [],  // Matutino (terceira letra = M)
        "2ªV01-EM": [],  // Vespertino (terceira letra = V)
        "3ªN01-EM": [],  // Noturno (terceira letra = N)
        "4ªI01-EM": [],  // Integral (terceira letra = I)
        "5ªA01-EM": []   // Outra letra = padrão (integral)
      };
      
      const result = syncService.processarTurmasSEGES(mockData, 1, 2);
      
      // Verificar os resultados
      expect(result.find(t => t.name === "1ªM01-EM").shift).toBe("matutino");
      expect(result.find(t => t.name === "2ªV01-EM").shift).toBe("vespertino");
      expect(result.find(t => t.name === "3ªN01-EM").shift).toBe("noturno");
      expect(result.find(t => t.name === "4ªI01-EM").shift).toBe("integral");
      expect(result.find(t => t.name === "5ªA01-EM").shift).toBe("integral"); // Padrão para letras não reconhecidas
    });
  });

  describe('filtrarTurmasExistentes', () => {
    test('deve identificar corretamente as turmas novas e existentes', () => {
      const turmasProcessadas = [
        { name: "1ª A-EF", year: 2025 },
        { name: "2ª B-EF", year: 2025 },
        { name: "3ª C-EF", year: 2025 }
      ];
      
      const turmasExistentes = [
        { id: 1, name: "1ª A-EF", year: 2025 },
        { id: 2, name: "3ª C-EF", year: 2025 },
        { id: 3, name: "4ª D-EF", year: 2025 } // Não está nas processadas
      ];
      
      const { turmasNovas, turmasExistentes: existentes } = syncService.filtrarTurmasExistentes(
        turmasProcessadas, 
        turmasExistentes
      );
      
      expect(turmasNovas).toHaveLength(1);
      expect(turmasNovas[0].name).toBe("2ª B-EF");
      
      expect(existentes).toHaveLength(2);
      expect(existentes[0].name).toBe("1ª A-EF");
      expect(existentes[0].id).toBe(1);
      expect(existentes[1].name).toBe("3ª C-EF");
      expect(existentes[1].id).toBe(2);
    });
  });

  describe('processarAlunosSEGES', () => {
    test('deve processar corretamente os alunos de todas as turmas', async () => {
      const mockData = {
        metadados: { versao: "1.0.0" },
        "1ªIV01-EM": [
          { nome: "João da Silva", dt_nascimento: "01/01/2010", sexo: "masculino" },
          { nome: "Maria Souza", dt_nascimento: "15/03/2010", sexo: "feminino" }
        ]
      };
      
      const turmas = [
        { id: 1, name: "1ªIV01-EM", year: 2025 }
      ];
      
      const result = await syncService.processarAlunosSEGES(mockData, 1, 2, turmas);
      
      expect(result).toHaveLength(2);
      
      // Verificar o primeiro aluno
      expect(result[0].name).toBe("João da Silva");
      expect(result[0].username).toBe("joao.silva");
      expect(result[0].role).toBe("Aluno");
      expect(result[0].gradeId).toBe(1);
      expect(result[0].schoolId).toBe(1);
      expect(result[0].districtId).toBe(2);
      expect(result[0].dateOfBirth).toBe("2010-01-01");
      expect(result[0].gender).toBe("Masculino");
      
      // Verificar o segundo aluno
      expect(result[1].name).toBe("Maria Souza");
      expect(result[1].username).toBe("maria.souza");
    });
    
    test('deve pular turmas que não existem na lista fornecida', async () => {
      const mockData = {
        "1ªIV01-EM": [{ nome: "João da Silva" }],
        "2ªM01-EF": [{ nome: "Maria Souza" }]
      };
      
      const turmas = [
        { id: 1, name: "1ªIV01-EM", year: 2025 }
        // Turma 2ªM01-EF não está na lista
      ];
      
      const result = await syncService.processarAlunosSEGES(mockData, 1, 2, turmas);
      
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("João da Silva");
    });
  });

  describe('getUserData', () => {
    test('deve retornar dados do usuário quando a API responde', async () => {
      const mockUserData = { 
        id: 1, 
        name: 'Admin User', 
        districtId: 5, 
        role: 'Admin' 
      };
      
      axios.get.mockResolvedValueOnce({ data: mockUserData });
      
      const result = await syncService.getUserData('token-mock');
      
      expect(result).toEqual(mockUserData);
      expect(axios.get).toHaveBeenCalledWith(
        expect.stringContaining('/me'),
        expect.objectContaining({
          headers: { 'Authorization': 'Bearer token-mock' }
        })
      );
    });
    
    test('deve lançar um erro quando a API falha', async () => {
      axios.get.mockRejectedValueOnce(new Error('Falha na API'));
      
      await expect(syncService.getUserData('token-mock'))
        .rejects
        .toThrow('Não foi possível obter dados do usuário');
    });
  });

  describe('fetchSegesData', () => {
    test('deve retornar dados do SEGES quando a API responde', async () => {
      const mockSegesData = {
        metadados: { versao: "1.0.0" },
        "1ªIV01-EM": [{ nome: "Aluno 1" }]
      };
      
      axios.get.mockResolvedValueOnce({ data: mockSegesData });
      
      const result = await syncService.fetchSegesData('token-mock');
      
      expect(result).toEqual(mockSegesData);
      expect(axios.get).toHaveBeenCalledWith(
        expect.stringContaining('/turmas'),
        expect.objectContaining({
          headers: { 'Authorization': 'Bearer token-mock' }
        })
      );
    });
    
    test('deve usar dados de teste quando a API falha', async () => {
      axios.get.mockRejectedValueOnce(new Error('Falha na API'));
      
      const result = await syncService.fetchSegesData('token-mock');
      
      // Verificar se o resultado contém as chaves esperadas dos dados de teste
      expect(result).toHaveProperty('metadados');
      // Verificar se contém pelo menos uma turma (o formato exato pode variar)
      expect(Object.keys(result).length).toBeGreaterThan(1);
    });
  });

  describe('importTurmas', () => {
    test('deve criar um job, processar turmas e atualizar o job ao concluir', async () => {
      // Mock dos dados necessários
      const mockUserData = { id: 1, districtId: 2 };
      const mockSegesData = {
        metadados: { versao: "1.0.0" },
        "1ªIV01-EM": [{ nome: "Aluno 1" }],
        "2ªM01-EF": [{ nome: "Aluno 2" }]
      };
      const mockExistingClasses = [
        { id: 5, name: "1ªIV01-EM", year: 2025 }
      ];
      const mockCreatedClass = { id: 6, name: "2ªM01-EF" };
      
      // Mock das funções do serviço
      syncService.getUserData = jest.fn().mockResolvedValue(mockUserData);
      syncService.fetchSegesData = jest.fn().mockResolvedValue(mockSegesData);
      syncService.fetchExistingClasses = jest.fn().mockResolvedValue(mockExistingClasses);
      syncService.criarTurmasNovas = jest.fn().mockResolvedValue({
        criadas: [mockCreatedClass],
        erros: []
      });
      
      // Mock do SyncJob
      const mockJob = {
        id: '123',
        update: jest.fn().mockResolvedValue({})
      };
      SyncJob.create.mockResolvedValue(mockJob);
      
      // Executar o método
      const result = await syncService.importTurmas('token-mock', 10);
      
      // Verificar se todas as funções foram chamadas corretamente
      expect(syncService.getUserData).toHaveBeenCalledWith('token-mock');
      expect(syncService.fetchSegesData).toHaveBeenCalledWith('token-mock');
      expect(syncService.fetchExistingClasses).toHaveBeenCalledWith('token-mock', 10);
      
      // Verificar se o job foi criado e atualizado
      expect(SyncJob.create).toHaveBeenCalledWith({
        schoolId: 10,
        userId: 1,
        jobType: 'classes',
        status: 'processing'
      });
      expect(mockJob.update).toHaveBeenCalledWith(expect.objectContaining({
        status: 'completed'
      }));
      
      // Verificar o resultado retornado
      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('jobId', '123');
      expect(result).toHaveProperty('turmasJaExistentes', 1);
      expect(result).toHaveProperty('turmasCriadas', 1);
    });
  });

  describe('obterMetricasSincronizacao', () => {
    test('deve retornar estatísticas consolidadas dos jobs', async () => {
      // Mock das consultas ao banco
      SyncJob.findAll.mockResolvedValue([
        { jobType: 'classes', status: 'completed', count: '2' },
        { jobType: 'students', status: 'completed', count: '1' },
        { jobType: 'classes', status: 'failed', count: '1' }
      ]);
      
      SyncJob.count.mockImplementation((query) => {
        // Sem query = total
        if (!query) return Promise.resolve(4);
        
        // Por status
        if (query.where?.status === 'completed') return Promise.resolve(3);
        if (query.where?.status === 'processing') return Promise.resolve(0);
        if (query.where?.status === 'failed') return Promise.resolve(1);
        
        // Por tipo
        if (query.where?.jobType === 'classes') return Promise.resolve(3);
        if (query.where?.jobType === 'students') return Promise.resolve(1);
        if (query.where?.jobType === 'all') return Promise.resolve(0);
        
        return Promise.resolve(0);
      });
      
      // Mock do último job bem-sucedido
      SyncJob.findOne.mockResolvedValue({
        id: '123',
        jobType: 'classes',
        endTime: '2025-05-20T14:30:00Z',
        totalItems: 10,
        createdItems: 8,
        updatedItems: 0,
        failedItems: 2
      });
      
      // Executar o método
      const result = await syncService.obterMetricasSincronizacao();
      
      // Verificar o resultado
      expect(result).toHaveProperty('totalJobs', 4);
      expect(result.porStatus).toEqual({
        concluidos: 3,
        emProcessamento: 0,
        falhos: 1
      });
      expect(result.porTipo).toEqual({
        turmas: 3,
        alunos: 1,
        completos: 0 // Agora corresponde ao valor retornado pelo mock
      });
      expect(result).toHaveProperty('detalhado');
      expect(result).toHaveProperty('ultimaSincronizacaoSucesso');
      expect(result.ultimaSincronizacaoSucesso.id).toBe('123');
    });
  });
});