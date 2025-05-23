import os
import re
import json
import camelot
import PyPDF2
from datetime import datetime
from typing import List, Dict, Tuple, Optional

# --- Modelos de Dados (Copied from models/ directory for standalone script) ---
from pydantic import BaseModel, Field

class Student(BaseModel):
    """
    Modelo Pydantic para representar os dados de um único aluno.
    """
    nome: str = Field(..., description="Nome completo do aluno.")
    dt_nascimento: Optional[str] = Field("", description="Data de nascimento do aluno (DD/MM/AAAA).")
    sexo: str = Field("indefinido", description="Sexo do aluno ('masculino' ou 'feminino').")
    idade: int = Field(0, ge=0, description="Idade do aluno em anos.")
    telefone: Optional[str] = Field(None, description="Primeiro telefone da lista do aluno, se houver.")
    telefones: List[str] = Field([], description="Lista de todos os telefones do aluno.")

class Metadata(BaseModel):
    """
    Modelo Pydantic para os metadados do documento PDF original.
    """
    data_emissao: str = Field(..., description="Data e hora da emissão do relatório no formato 'Dia, DD de Mês de AAAA, HH:MM'.")
    escola: str = Field(..., description="Nome da escola extraído do PDF.")
    arquivo_origem: str = Field(..., description="Nome do arquivo PDF original.")

class PDFData(BaseModel):
    """
    Modelo Pydantic para a estrutura completa do JSON de saída.
    """
    metadados: Metadata = Field(..., description="Metadados do relatório PDF.")
    # A chave do dicionário será o nome da turma (ex: "1ªIV01-EM")
    # O valor será uma lista de objetos Student
    turmas: Dict[str, List['Student']] = Field(..., description="Dicionário contendo os dados dos alunos organizados por turma.")

    class Config:
        arbitrary_types_allowed = True

# --- Utilitários (Copied/Adapted from utils/ directory) ---

class TextCleaner:
    def clean_cell_text(self, text: str) -> str:
        """
        Limpa o texto de uma célula da tabela.
        Remove aspas extras, espaços múltiplos, quebras de linha que podem vir da extração.
        """
        if text is None:
            return ""
        text = str(text).strip()
        text = text.replace('"', '').strip() # Remove aspas
        text = re.sub(r'\s+', ' ', text) # Substitui múltiplos espaços por um único espaço
        text = text.replace('\n', ' ') # Substitui quebras de linha por espaço
        return text

    def normalize_sexo(self, sexo_raw: str) -> str:
        """
        Converte 'M' para 'masculino' e 'F' para 'feminino'.
        """
        sexo_raw = self.clean_cell_text(sexo_raw).upper()
        if sexo_raw == 'M':
            return 'masculino'
        elif sexo_raw == 'F':
            return 'feminino'
        return 'indefinido' # Ou levantar um erro

    def normalize_idade(self, idade_raw: str) -> int:
        """
        Remove " anos" e converte a idade para inteiro.
        """
        idade_str = self.clean_cell_text(idade_raw).replace('anos', '').strip()
        try:
            return int(idade_str)
        except ValueError:
            return 0 # Ou levantar um erro

    def extract_and_clean_phones(self, phones_raw: str) -> Tuple[Optional[str], List[str]]:
        """
        Extrai todos os telefones de uma string e retorna o primeiro e a lista completa.
        Espera telefones no formato (DD) DDDDD-DDDD ou (DD) DDDD-DDDD.
        """
        clean_phones_raw = self.clean_cell_text(phones_raw)
        # Regex para telefones no formato (DD) DDDDD-DDDD ou (DD) DDDD-DDDD
        # Adicionado \s* para flexibilidade no espaço após o DDD.
        phone_pattern = r'\(\d{2}\)\s*\d{4,5}-\d{4}'
        
        all_phones = re.findall(phone_pattern, clean_phones_raw)
        
        # Remover espaços extras e formatar
        cleaned_phones = [re.sub(r'\s+', '', phone) for phone in all_phones] # Remover todos os espaços
        # O formato '(DD)DDD-DDDD' ou '(DD)DDDDD-DDDD' não tem espaço entre ) e o número
        # A linha original: .replace('(','(').replace(') ',')') não faz muito sentido.
        # Vamos garantir o formato esperado (DD)DDDDD-DDDD ou (DD)DDDD-DDDD
        cleaned_phones = [re.sub(r'(\(\d{2}\))(\d{4,5}-\d{4})', r'\1\2', p) for p in cleaned_phones]


        first_phone = cleaned_phones[0] if cleaned_phones else None
        return first_phone, cleaned_phones

class PDFExtractor:
    def extract_text_from_pdf(self, pdf_path: str) -> str:
        """
        Extrai todo o texto de um PDF.
        """
        text = ""
        try:
            with open(pdf_path, 'rb') as file:
                reader = PyPDF2.PdfReader(file)
                for page_num in range(len(reader.pages)):
                    text += reader.pages[page_num].extract_text() or ""
        except Exception as e:
            print(f"Erro ao extrair texto do PDF com PyPDF2: {e}")
            raise
        return text

    def extract_tables_from_pdf(self, pdf_path: str, pages: str = 'all') -> List[camelot.core.Table]:
        """
        Extrai tabelas de um PDF usando Camelot com configurações aprimoradas.
        """
        try:
            table_areas = ['30,650,580,0']  # [x1,y1,x2,y2]
            
            # Primeiro tenta com flavor='lattice' que suporta process_background=True
            try:
                print("Tentando extração com flavor='lattice'...")
                lattice_tables = camelot.read_pdf(
                    pdf_path,
                    pages=pages,
                    flavor='lattice',
                    table_areas=table_areas,
                    process_background=True,
                    line_scale=40
                )
                
                if len(lattice_tables) > 0 and lattice_tables[0].shape[0] > 5:
                    print(f"Extração com lattice bem-sucedida. Tabelas encontradas: {len(lattice_tables)}")
                    return lattice_tables
            except Exception as lattice_error:
                print(f"Falha ao extrair com flavor='lattice': {lattice_error}")
            
            # Se lattice falhar, tente com flavor='stream' sem process_background
            print("Tentando extração com flavor='stream'...")
            stream_tables = camelot.read_pdf(
                pdf_path,
                pages=pages,
                flavor='stream',
                table_areas=table_areas,
                row_tol=10,
                column_tol=5,
                edge_tol=500,
                strip_text='\n',
                flag_size=True,
                split_text=True
                # SEM process_background=True
            )
            
            print(f"Total de tabelas encontradas com stream: {len(stream_tables)}")
            return stream_tables
            
        except Exception as e:
            print(f"Erro ao extrair tabelas do PDF com Camelot: {e}")
            raise

    def get_school_name_from_header(self, text: str) -> str:
        """
        Tenta extrair o nome da escola do cabeçalho do PDF.
        Baseado no PDF fornecido, o nome da escola está na terceira linha após "GOVERNO DO ESTADO DO ES".
        """
        lines = text.split('\n')
        for i, line in enumerate(lines):
            if "SECRETARIA DE ESTADO DA EDUCACAO" in line:
                # Buscar o nome da escola nas próximas linhas
                for j in range(i + 1, min(i + 5, len(lines))):
                    potential_school_name = lines[j].strip()
                    # Heurística para identificar o nome da escola
                    if (potential_school_name.startswith("EEEFM") or
                        potential_school_name.startswith("EEEM") or
                        potential_school_name.startswith("ESCOLA")
                        ) and "RUA" not in potential_school_name and "SRE" not in potential_school_name:
                        return potential_school_name.replace("\"", "").strip()
        return "Escola Não Identificada"

    def get_turma_from_text(self, text: str) -> str:
        """
        Extrai o nome da turma do texto do PDF.
        Procura por "Turma: XXXXX".
        """
        lines = text.split('\n')
        for line in lines:
            match = re.search(r"Turma:\s*([^\n]+)", line)
            if match:
                return match.group(1).strip()
        return "Turma Não Identificada"

# --- Lógica de Negócio (Adapted from services/ directory) ---

class PDFProcessor:
    def __init__(self):
        self.pdf_extractor = PDFExtractor()
        self.text_cleaner = TextCleaner()

    def process_pdf(self, pdf_path: str) -> dict:
        """
        Orquestra a extração, parsing e transformação dos dados do PDF.
        """
        print(f"Iniciando processamento do PDF: {pdf_path}")

        # 1. Extrair texto e tabelas
        full_text = self.pdf_extractor.extract_text_from_pdf(pdf_path)
        tables = self.pdf_extractor.extract_tables_from_pdf(pdf_path)

        # 2. Extrair metadados
        school_name = self.pdf_extractor.get_school_name_from_header(full_text)
        turma_name = self.pdf_extractor.get_turma_from_text(full_text)
        
        # Formatar data de emissão
        current_time = datetime.now()
        data_emissao_str = current_time.strftime("%a, %d de %B de %Y, %H:%M").replace('Sex', 'Sex,').replace('May', 'Maio').replace('Apr', 'Abril').replace('Jun', 'Junho').replace('Jul', 'Julho').replace('Aug', 'Agosto').replace('Sep', 'Setembro').replace('Oct', 'Outubro').replace('Nov', 'Novembro').replace('Dec', 'Dezembro').replace('Jan', 'Janeiro').replace('Feb', 'Fevereiro').replace('Mar', 'Março') # Simplificação para meses em português

        metadata = Metadata(
            data_emissao=data_emissao_str,
            escola=school_name,
            arquivo_origem=os.path.basename(pdf_path)
        )

        # 3. Processar tabelas
        all_students_by_turma = {}
        if turma_name not in all_students_by_turma:
            all_students_by_turma[turma_name] = []

        if not tables:
            print("Nenhuma tabela detectada no PDF após a extração.")
            # Retorna um JSON com metadados mas sem turmas/alunos
            return PDFData(metadados=metadata, turmas=all_students_by_turma).model_dump(by_alias=True, indent=4)

        # Armazenar todas as linhas da tabela para processamento
        all_table_rows = []
        for table in tables:
            df = table.df
            for r_idx in range(df.shape[0]):
                all_table_rows.append(df.iloc[r_idx].tolist())
            
        # Processar as linhas para identificar o início dos dados e processar cada aluno
        r_idx = 0
        while r_idx < len(all_table_rows):
            row = all_table_rows[r_idx]
            
            first_col_content = self.text_cleaner.clean_cell_text(row[0])
            if first_col_content and re.match(r"^\d+", first_col_content):
                # Esta linha parece ser o início de dados de um aluno (começa com ID numérico)
                try:
                    student_data, rows_used = self.reconstruct_student_data(all_table_rows, r_idx)
                    
                    # Processar os dados coletados
                    nome = student_data['nome']
                    dt_nascimento = student_data['dt_nascimento']
                    sexo = self.text_cleaner.normalize_sexo(student_data['sexo'])
                    idade = self.text_cleaner.normalize_idade(student_data['idade'])
                    telefone, telefones_list = self.text_cleaner.extract_and_clean_phones(student_data['telefones_raw'])
                    
                    # Criar objeto Student e adicionar à lista
                    try:
                        student = Student(
                            nome=nome,
                            dt_nascimento=dt_nascimento,
                            sexo=sexo,
                            idade=idade,
                            telefone=telefone,
                            telefones=telefones_list
                        )
                        # Adicionar apenas se tiver nome válido
                        if nome.strip() and dt_nascimento.strip(): # Adicionar validação de data também
                            all_students_by_turma[turma_name].append(student)
                        else:
                            print(f"Linha ignorada (nome ou data de nascimento inválidos): {row}")
                    except Exception as e:
                        print(f"Erro ao criar objeto Student para a linha: {student_data} - Erro: {e}")
                    
                    # Avançar pelo número de linhas usadas
                    r_idx += rows_used
                except Exception as e:
                    print(f"Erro ao processar linha e reconstruir dados do aluno: {row} - Erro: {e}")
                    r_idx += 1 # Avança para a próxima linha para evitar loop infinito em caso de erro.
            else:
                # Não é o início de dados de um aluno, avançar
                print(f"Linha ignorada (não inicia com ID numérico): {row}")
                r_idx += 1
        
        # 4. Construir o JSON final
        final_pdf_data = PDFData(
            metadados=metadata,
            turmas=all_students_by_turma
        )

        result = final_pdf_data.model_dump(by_alias=True)
        return json.dumps(result, indent=4, ensure_ascii=False)
    def reconstruct_student_data(self, rows, start_idx):
        """
        Reconstruir dados de um aluno que podem estar fragmentados em múltiplas linhas.
        Retorna um dicionário com os dados do aluno e o número de linhas usadas.
        """
        student_data = {
            'nome': '',
            'dt_nascimento': '',
            'sexo': '',
            'idade': '',
            'telefones_raw': ''
        }
        
        current_idx = start_idx
        name_parts = []
        
        # Processa a primeira linha que inicia o registro do aluno
        first_row = rows[current_idx]
        
        # Tenta extrair ID INEP e o início do nome
        col0_cleaned = self.text_cleaner.clean_cell_text(first_row[0])
        id_inep_match = re.match(r"^(\d+)\s*(.*)", col0_cleaned)
        
        if id_inep_match:
            # student_id_inep = id_inep_match.group(1).strip() # Não precisamos armazenar, apenas usar para regex
            name_parts.append(id_inep_match.group(2).strip())
        
        # Coleta partes do nome da segunda coluna, se existir e não estiver vazia
        if len(first_row) > 1 and self.text_cleaner.clean_cell_text(first_row[1]):
            name_parts.append(self.text_cleaner.clean_cell_text(first_row[1]))
        
        # Data de Nascimento
        if len(first_row) > 2:
            dt_nasc_text = self.text_cleaner.clean_cell_text(first_row[2])
            if re.match(r"\d{2}/\d{2}/\d{4}", dt_nasc_text):
                student_data['dt_nascimento'] = dt_nasc_text
        
        # Sexo
        if len(first_row) > 3:
            sexo_text = self.text_cleaner.clean_cell_text(first_row[3])
            if sexo_text in ['M', 'F']:
                student_data['sexo'] = sexo_text
        
        # Idade
        if len(first_row) > 4:
            idade_text = self.text_cleaner.clean_cell_text(first_row[4])
            if re.match(r"^\d+", idade_text):
                student_data['idade'] = idade_text
        
        # Telefones (primeira parte)
        if len(first_row) > 5:
            student_data['telefones_raw'] = self.text_cleaner.clean_cell_text(first_row[5])
        
        rows_used = 1
        
        # Procurar linhas adicionais que possam conter o resto do nome ou outros dados
        # O loop continua enquanto a próxima linha não começar com um ID INEP
        while (current_idx + 1 < len(rows) and 
               not re.match(r"^\d+", self.text_cleaner.clean_cell_text(rows[current_idx + 1][0]))):
            
            current_idx += 1
            rows_used += 1
            additional_row = rows[current_idx]
            
            # Tentar pegar continuação do nome da primeira e segunda coluna da linha adicional
            if len(additional_row) > 0 and self.text_cleaner.clean_cell_text(additional_row[0]):
                # Se a primeira coluna tem texto e não é um número
                if not re.match(r"^\d+", self.text_cleaner.clean_cell_text(additional_row[0])):
                    name_parts.append(self.text_cleaner.clean_cell_text(additional_row[0]))
            
            if len(additional_row) > 1 and self.text_cleaner.clean_cell_text(additional_row[1]):
                name_parts.append(self.text_cleaner.clean_cell_text(additional_row[1]))
            
            # Juntar telefones de linhas subsequentes
            if len(additional_row) > 5 and self.text_cleaner.clean_cell_text(additional_row[5]):
                if student_data['telefones_raw']:
                    student_data['telefones_raw'] += ' ' + self.text_cleaner.clean_cell_text(additional_row[5])
                else:
                    student_data['telefones_raw'] = self.text_cleaner.clean_cell_text(additional_row[5])
        
        # Reconstruir o nome completo
        student_data['nome'] = ' '.join(filter(None, name_parts)).strip() # Use filter(None, ...) para remover strings vazias.
        
        return student_data, rows_used


# --- Função Principal para Executar o Script ---

def main():
    # Defina o caminho do arquivo PDF. 
    # É melhor usar uma variável de ambiente ou um caminho fixo para o desenvolvimento.
    # Exemplo para Windows: pdf_file_path = "D:\\Documents\\GitHub\\hubescolar\\services\\seges-service\\data\\Alunos por turma - EEEFM JOAO CRISOSTOMO BELESA (2).pdf"
    # Exemplo para Linux/macOS: pdf_file_path = "./services/seges-service/data/Alunos por turma - EEEFM JOAO CRISOSTOMO BELESA (2).pdf"
    
    # Tentando carregar do .env primeiro
    pdf_file_path = os.getenv('PDF_FILE_PATH')
    
    # Se não estiver no .env, tenta um caminho relativo comum
    if not pdf_file_path:
        # Caminho relativo baseado na estrutura do seu projeto GitHub
        potential_path = os.path.join(os.path.dirname(__file__), '..', 'services', 'seges-service', 'data', 'Alunos por turma - EEEFM JOAO CRISOSTOMO BELESA (2).pdf')
        if os.path.exists(potential_path):
            pdf_file_path = potential_path
        else:
            print("Erro: A variável de ambiente 'PDF_FILE_PATH' não está definida e o caminho padrão não foi encontrado.")
            print("Por favor, defina-a no seu arquivo .env ou diretamente no script.")
            print("Exemplo: PDF_FILE_PATH=./Alunos por turma - EEEFM JOAO CRISOSTOMO BELESA (2).pdf")
            return

    if not os.path.exists(pdf_file_path):
        print(f"Erro: O arquivo PDF não foi encontrado em: {pdf_file_path}")
        return

    processor = PDFProcessor()
    try:
        json_output = processor.process_pdf(pdf_file_path)
        
        output_filename = os.path.splitext(os.path.basename(pdf_file_path))[0] + ".json"
        # Garante que o arquivo de saída seja criado no mesmo diretório do script, ou em 'data'
        output_dir = os.path.join(os.path.dirname(__file__), '..', 'services', 'seges-service', 'data')
        os.makedirs(output_dir, exist_ok=True) # Cria o diretório se não existir
        output_full_path = os.path.join(output_dir, output_filename)

        with open(output_full_path, 'w', encoding='utf-8') as f:
            f.write(json_output)
        
        print(f"\nConversão concluída! JSON salvo em: {output_full_path}")
        print("\n--- JSON de Saída ---")
        print(json_output)

    except Exception as e:
        print(f"\nOcorreu um erro durante a conversão do PDF: {e}")

if __name__ == "__main__":
    from dotenv import load_dotenv
    # Carrega as variáveis de ambiente do .env que está na raiz do projeto (seges-service)
    # Assumindo que este script está em `seges-service/scripts/` e .env está em `seges-service/`
    dotenv_path = os.path.join(os.path.dirname(__file__), '.env')
    load_dotenv(dotenv_path=dotenv_path) 
    main()