import os
import csv
import camelot
import re
import fitz  # PyMuPDF
from dotenv import load_dotenv

class PDFExtractor:
    def extract_tables_from_pdf(self, pdf_path, pages='all'):
        """Extrai tabelas do PDF sem processamento complexo"""
        try:
            # Tentando flavor='lattice' primeiro (para tabelas com linhas)
            try:
                print("Tentando extração com flavor='lattice'...")
                tables = camelot.read_pdf(
                    pdf_path,
                    pages=pages,
                    flavor='lattice'  # Simplificado para evitar erros
                )
                
                if len(tables) > 0 and tables[0].shape[0] > 5:
                    print(f"Extração com lattice bem-sucedida. Tabelas encontradas: {len(tables)}")
                    return tables
            except Exception as lattice_error:
                print(f"Falha ao extrair com flavor='lattice': {lattice_error}")
            
            # Se lattice falhar, tentar com stream
            print("Tentando extração com flavor='stream'...")
            tables = camelot.read_pdf(
                pdf_path,
                pages=pages,
                flavor='stream'  # Simplificado para evitar erros
            )
            
            print(f"Total de tabelas encontradas com stream: {len(tables)}")
            return tables
            
        except Exception as e:
            print(f"Erro ao extrair tabelas do PDF: {e}")
            raise

    def extract_text_by_page(self, pdf_path):
        """Extrai todo o texto de cada página do PDF usando PyMuPDF"""
        text_by_page = []
        try:
            doc = fitz.open(pdf_path)
            for page in doc:
                text = page.get_text()
                text_by_page.append(text)
            doc.close()
            return text_by_page
        except Exception as e:
            print(f"Erro ao extrair texto com PyMuPDF: {e}")
            raise

    def find_turmas_in_text(self, text_by_page):
        """
        Encontra todas as turmas mencionadas no texto e suas posições aproximadas
        Retorna um dicionário {página: [(posição_no_texto, nome_turma), ...]}
        """
        turmas_by_page = {}
        
        for page_num, page_text in enumerate(text_by_page):
            turmas_in_page = []
            
            # Procurar por padrões de turma (tanto com "Turma:" quanto diretos)
            patterns = [
                r"Turma:\s*(\d+[ªº][A-Z]{2}\d{2}-[A-Z]+)",    # Formato típico: Turma: 1ºIV01-EM
                r"Turma:\s*([^\s\n,;]+(?:-[A-Z]+)?)",         # Qualquer texto após "Turma:" incluindo sufixo
                r"(?<!\w)(\d+[ªº][A-Z]{2}\d{2}-[A-Z]+)(?!\w)" # Direto: 1ºIV01-EM (sem "Turma:")
            ]
            
            for pattern in patterns:
                for match in re.finditer(pattern, page_text, re.IGNORECASE):
                    turma = match.group(1).strip()
                    position = match.start()
                    turmas_in_page.append((position, turma))
                    print(f"Turma encontrada na página {page_num+1}, posição {position}: '{turma}'")
            
            if turmas_in_page:
                turmas_by_page[page_num] = sorted(turmas_in_page)  # Ordenar por posição
                
        return turmas_by_page

    def get_turma_from_text(self, text):
        """
        Extrai o nome da turma do texto, mantendo o sufixo após o hífen
        """
        # Procurar por padrões como "Turma: 1ªIV01-EM"
        match = re.search(r"Turma:\s*([\dªºA-Z0-9\-]+(?:-[A-Z]+)?)", text, re.IGNORECASE)
        
        if match:
            # Retorna o nome da turma sem o prefixo "Turma:"
            return match.group(1).strip()
        
        # Padrão direto para turmas como 1ªIV01-EM sem o prefixo "Turma:"
        match = re.search(r"(\d+[ªº][A-Z]{2}\d{2}-[A-Z]+)", text)
        if match:
            return match.group(1).strip()
        
        return "Turma Não Identificada"


def main():
    # Instalar PyMuPDF se necessário
    try:
        import fitz
    except ImportError:
        print("PyMuPDF não está instalado. Instalando...")
        import subprocess
        subprocess.check_call(["pip", "install", "PyMuPDF"])
        import fitz
    
    # Carrega as variáveis de ambiente
    dotenv_path = os.path.join(os.path.dirname(__file__), '..', '.env')
    load_dotenv(dotenv_path=dotenv_path)
    
    # Define o caminho do PDF
    pdf_file_path = os.getenv('PDF_FILE_PATH')
    if not pdf_file_path:
        potential_path = os.path.join(os.path.dirname(__file__), '..', 'services', 'seges-service', 'data', 
                                     'Alunos por turma - EEEFM JOAO CRISOSTOMO BELESA (2).pdf')
        if os.path.exists(potential_path):
            pdf_file_path = potential_path
        else:
            raise ValueError("PDF_FILE_PATH não definido e arquivo padrão não encontrado")
    
    # Define o caminho de saída CSV
    output_filename = os.path.splitext(os.path.basename(pdf_file_path))[0] + ".csv"
    output_dir = os.path.join(os.path.dirname(__file__), '..', 'services', 'seges-service', 'data')
    os.makedirs(output_dir, exist_ok=True)
    output_full_path = os.path.join(output_dir, output_filename)
    
    try:
        print(f"Processando PDF: {pdf_file_path}")
        extractor = PDFExtractor()
        
        # Primeiro, extrair todo o texto do PDF para encontrar as turmas
        print("Extraindo todo o texto do PDF para encontrar turmas...")
        text_by_page = extractor.extract_text_by_page(pdf_file_path)
        
        # Encontrar turmas no texto e suas posições
        turmas_by_page = extractor.find_turmas_in_text(text_by_page)
        
        if not turmas_by_page:
            print("Aviso: Nenhuma turma foi encontrada no texto do PDF!")
            print("Conteúdo de amostra do PDF:")
            for i, text in enumerate(text_by_page[:2]):  # Mostrar primeiras 2 páginas
                print(f"\n--- Página {i+1} (primeiros 500 caracteres) ---")
                print(text[:500])
        
        # Extrair tabelas do PDF
        tables = extractor.extract_tables_from_pdf(pdf_file_path)
        
        if not tables or len(tables) == 0:
            print("Nenhuma tabela encontrada no PDF")
            return
        
        # Abrir arquivo CSV para escrita
        with open(output_full_path, 'w', newline='', encoding='utf-8') as csvfile:
            csv_writer = None  # Será inicializado com os cabeçalhos corretos
            
            current_turma = "Turma Não Identificada"
            last_turma_position = -1
            rows_written = 0
            turmas_encontradas = set()
            
            # Processar cada tabela
            for table_idx, table in enumerate(tables):
                df = table.df
                
                # Tentar identificar a página aproximada onde esta tabela está
                # (Esta é uma estimativa simples baseada no índice da tabela)
                estimated_page = min(table_idx, len(text_by_page) - 1)
                
                # Ver se há turmas detectadas nesta página
                if estimated_page in turmas_by_page:
                    # Pegar a turma mais recente antes desta tabela
                    turmas_in_page = turmas_by_page[estimated_page]
                    if turmas_in_page:
                        # Usar a primeira turma na página como turma atual
                        _, current_turma = turmas_in_page[0]
                        print(f"Usando turma da página {estimated_page+1}: '{current_turma}'")
                        turmas_encontradas.add(current_turma)
                
                # Imprimir algumas linhas da tabela para diagnóstico
                print(f"\n--- Tabela {table_idx+1} (Primeiras 3 linhas) ---")
                for i in range(min(3, df.shape[0])):
                    row_text = ' '.join(str(cell) for cell in df.iloc[i].tolist())
                    print(f"Linha {i}: {row_text[:100]}...")
                
                # Processar todas as linhas da tabela atual
                for i, row in df.iterrows():
                    row_data = row.tolist()
                    
                    # Se é a primeira linha e csv_writer ainda não foi inicializado, configure os cabeçalhos
                    if csv_writer is None:
                        # Adicionar 'Turma' como primeiro cabeçalho
                        headers = ['Turma'] + [f"Col{i}" for i in range(len(row_data))]
                        csv_writer = csv.writer(csvfile)
                        csv_writer.writerow(headers)
                    
                    # Adicionar o nome da turma como primeira coluna e escrever no CSV
                    # Se o primeiro valor de row_data contiver "Turma:"
                    if isinstance(row_data[0], str) and "Turma:" in row_data[0]:
                        # Extrair nome da turma da própria linha
                        turma_match = re.search(r"Turma:\s*([\dªºA-Z0-9\-]+(?:-[A-Z]+)?)", row_data[0])
                        if turma_match:
                            csv_writer.writerow([turma_match.group(1).strip()] + row_data)
                        else:
                            csv_writer.writerow([current_turma] + row_data)
                    else:
                        # Usar a turma atual
                        csv_writer.writerow([current_turma] + row_data)
                    rows_written += 1
            
            print(f"Conversão concluída! {rows_written} linhas escritas no CSV.")
            print(f"Turmas encontradas: {', '.join(turmas_encontradas)}")
            print(f"Arquivo CSV salvo em: {output_full_path}")
    
    except Exception as e:
        print(f"Erro durante a conversão: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()