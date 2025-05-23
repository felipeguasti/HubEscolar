## 1. ESTRUTURA DO PROJETO ##
seges-service/
├── config/
│   └── __init__.py
│   └── settings.py
├── controllers/
│   └── __init__.py
│   └── pdf_conversion_controller.py
├── models/
│   └── __init__.py
│   └── student_model.py
│   └── pdf_data_model.py
├── routes/
│   └── __init__.py
│   └── pdf_conversion_routes.py
├── services/
│   └── __init__.py
│   └── pdf_parser_service.py
│   └── data_transformer_service.py
├── utils/
│   └── __init__.py
│   └── pdf_extractor.py
│   └── text_cleaner.py
│   └── validators.py
├── tests/
│   └── __init__.py
│   └── test_pdf_conversion.py
│   └── test_data_transformer.py
├── .env.example
├── app.py
├── requirements.txt
└── README.md

## 2. DEPENDÊNCIAS ##

fastapi==0.104.1
uvicorn==0.23.2
pydantic==2.4.2
pypdf2==3.0.1
tabula-py==2.8.2
pandas==2.1.1
python-multipart==0.0.6
python-dotenv==1.0.0
pytest==7.4.3
httpx==0.25.1
pillow==10.1.0
camelot-py==0.11.0
opencv-python-headless==4.8.1.78

**3. Etapas de Implementação**
3.1. Configuração Inicial
Ambiente e dependências

Criar ambiente virtual Python
Instalar dependências necessárias
Configurar variáveis de ambiente
Estrutura de arquivos

Criar a estrutura de pastas conforme descrito
Configurar importações e módulos básicos

**3.2. Desenvolvimento dos Componentes Core**
1. Extrator de PDF (utils/pdf_extractor.py)

- Função para ler PDF usando tabula-py e camelot
- Detectar e extrair tabelas de cada página
- Identificar cabeçalhos e turmas

2. Processador de Texto (utils/text_processor.py)
- Limpar e normalizar texto extraído
- Converter formatos (ex: sexo "M/F" para "masculino/feminino")
- Processar telefones em formato adequado
- Extrair metadados (data de emissão, escola, etc.)
- Serviço de PDF (services/pdf_service.py)

3. Orquestrar o processo de extração e transformação
- Gerar estrutura JSON final
- Tratar exceções e casos especiais

## 3.3. Desenvolvimento da API ##

1. Controlador de PDF (controllers/pdf_controller.py)
- Endpoint para upload de arquivos PDF
- Endpoint para obtenção de resultados em JSON
- Tratamento de erros e validação de entrada

2. Rotas (routes/pdf_routes.py)
- Definir rotas REST para operações com PDF
- Conectar rotas aos controladores

3. App Principal (app.py)
- Configurar FastAPI
- Registrar rotas
- Implementar middleware e tratamento global de erros

## 3.4. Testes ##

1. Testes Unitários
- Testar extração de tabelas
- Testar processamento de texto
- Testar conversão de formatos

2. Testes de Integração
- Testar fluxo completo do serviço
- Testar API endpoints

## 4. Detalhamento da Implementação ##

**4.1. Extração de PDF**
Usaremos uma combinação de bibliotecas para garantir extração precisa:

## 5. Desafios e Soluções ##

**1. Extração Precisa de Tabelas**

- Desafio: PDFs podem ter formatação variável e tabelas complexas
- Solução: Combinar tabula-py e camelot-py para melhor precisão

**2. Processamento de Telefones**

- Desafio: Formatos variados e múltiplos telefones por célula
- Solução: Usar expressões regulares para extração precisa

**3. Identificação de Turmas**
- Desafio: Detectar corretamente onde termina uma turma e começa outra
- Solução: Analisar padrões de texto e estrutura de tabelas

**4. Lidar com PDFs Grandes**
- Desafio: Arquivos grandes podem causar problemas de memória
- Solução: Processamento em chunks e otimização de algoritmos

## 6. Próximos Passos ##

**1. Implementação básica**
- Criar estrutura do projeto
- Implementar extração de PDF
- Desenvolver API básica

**2. Testes e refinamento**

- Testar com diferentes PDFs
- Ajustar algoritmos de extração
- Melhorar tratamento de erros

**3. Integração com outros serviços**
- Conectar com sync-service
- Implementar armazenamento de resultados

**4. Documentação e deployment**
- Documentar API com Swagger
- Preparar para implantação em ambiente de produção