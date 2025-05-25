import json
import re
import os
import sys
import unicodedata
import random
from datetime import datetime
from PyPDF2 import PdfReader
import tabula
import pandas as pd

# Configurações
INPUT_PDF = sys.argv[1] if len(sys.argv) > 1 else input("Caminho do arquivo PDF: ")
OUTPUT_FILE = sys.argv[2] if len(sys.argv) > 2 else "alunos.json"
SCHOOL_ID = 3  # Fixado em 3 conforme solicitado
DISTRICT_ID = 1  # Fixado em 1 conforme solicitado

# Função para determinar o horário com base no nome da turma
def determine_schedule(class_name):
    if not class_name:
        return "Integral"  # Valor padrão
    
    class_name = class_name.upper()
    
    # Verificar padrões de horário
    if "IV" in class_name or "I" in class_name:
        return "Integral"
    elif "M" in class_name:
        return "Manhã"
    elif "T" in class_name:
        return "Tarde"
    elif "N" in class_name:
        return "Noite"
    else:
        return "Integral"  # Valor padrão

# Função para normalizar texto
def normalize_text(text):
    if not isinstance(text, str):
        return ""
    normalized = unicodedata.normalize('NFKD', text.lower())
    normalized = ''.join([c for c in normalized if not unicodedata.combining(c)])
    normalized = re.sub(r'[^a-z0-9\s]', '', normalized)
    return normalized

# Função para extrair nomes de turmas do texto completo
def extract_class_names(pdf_path):
    try:
        reader = PdfReader(pdf_path)
        class_names = []
        class_pattern = r'Turma:\s*([^\n]+)'
        
        for page in reader.pages:
            text = page.extract_text()
            matches = re.findall(class_pattern, text)
            class_names.extend([name.strip() for name in matches])
        
        return class_names
    except Exception as e:
        print(f"Erro ao extrair nomes das turmas: {e}")
        return []

# Função para gerar email único
def generate_email(name, existing_emails):
    name = name.strip().title()
    name_parts = name.split()
    
    if len(name_parts) < 2:
        email_base = f"{normalize_text(name_parts[0])}"
    else:
        email_base = f"{normalize_text(name_parts[0])}.{normalize_text(name_parts[-1])}"
    
    email = f"{email_base}@aluno.edu.es.gov.br"
    
    if email in existing_emails:
        counter = 1
        while f"{email_base}{counter}@aluno.edu.es.gov.br" in existing_emails:
            counter += 1
        email = f"{email_base}{counter}@aluno.edu.es.gov.br"
    
    return email

# Função para extrair telefone
def extract_phones(phone_text):
    if not isinstance(phone_text, str):
        return []
    
    phone_pattern = r'\((\d{2})\)\s*(\d{4,5})-(\d{4})'
    matches = re.findall(phone_pattern, phone_text)
    
    phones = []
    for match in matches:
        ddd, part1, part2 = match
        formatted_phone = f"55{ddd}{part1}{part2}"
        phones.append(formatted_phone)
    
    return phones

# Função para extrair data de nascimento
def extract_birthdate(date_text):
    if not isinstance(date_text, str):
        return None
    
    date_pattern = r'(\d{2})/(\d{2})/(\d{4})'
    match = re.search(date_pattern, date_text)
    
    if match:
        day, month, year = match.groups()
        return f"{year}-{month}-{day}"
    
    return None

# Função para converter o gênero do formato do PDF para o formato do modelo
def convert_gender(gender_code):
    gender_map = {
        'M': 'Masculino',
        'F': 'Feminino'
    }
    return gender_map.get(gender_code, None)

# Função principal para processar o PDF
def process_pdf(pdf_path, school_id, district_id):
    print(f"Processando o arquivo: {pdf_path}")
    
    try:
        # Extrair os nomes das turmas do PDF
        class_names = extract_class_names(pdf_path)
        if not class_names:
            print("Não foi possível detectar nomes de turmas. Usando nome genérico.")
            class_names = ["Turma não identificada"]
        
        print(f"Turmas detectadas: {class_names}")
        
        # Extrair tabelas
        tables = tabula.read_pdf(pdf_path, pages='all', multiple_tables=True)
        
        if not tables:
            print("Não foi possível extrair tabelas. Verifique o formato do PDF.")
            return []
        
        # Processar as tabelas extraídas
        all_students = []
        existing_emails = set()
        
        # Associar tabelas às turmas
        if len(class_names) == len(tables):
            print("Número de turmas e tabelas coincide. Processando cada tabela...")
            for idx, (table, class_name) in enumerate(zip(tables, class_names)):
                students = process_table(table, class_name, school_id, district_id, idx, existing_emails)
                all_students.extend(students)
        else:
            print("Número de turmas e tabelas não coincide. Tentando associar...")
            # Se o número de tabelas for maior que turmas, pode ser que algumas tabelas sejam continuações
            for idx, table in enumerate(tables):
                if idx < len(class_names):
                    class_name = class_names[idx]
                else:
                    # Tentar deduzir a qual turma pertence
                    class_name = class_names[-1] if class_names else f"Turma {idx+1}"
                
                students = process_table(table, class_name, school_id, district_id, idx, existing_emails)
                all_students.extend(students)
        
        print(f"Total de alunos processados: {len(all_students)}")
        return all_students
        
    except Exception as e:
        print(f"Erro ao processar o PDF: {e}")
        return []

# Função para processar uma tabela específica
def process_table(table, class_name, school_id, district_id, table_idx, existing_emails):
    print(f"Processando tabela {table_idx+1} para turma: {class_name}")
    students = []
    
    # Determinar o horário com base no nome da turma
    schedule = determine_schedule(class_name)
    print(f"Horário determinado para a turma {class_name}: {schedule}")
    
    # Verificar e renomear colunas se necessário
    table.columns = [str(col).strip() for col in table.columns]
    expected_columns = ['ID INEP', 'Nome', 'Dt. Nascimento', 'Sexo', 'Idade', 'Telefones', 'Documentos', 'Situação']
    
    if 'Nome' not in table.columns and len(table.columns) >= 2:
        print("Renomeando colunas da tabela...")
        if len(table.columns) >= len(expected_columns):
            table.columns = expected_columns + table.columns[len(expected_columns):]
        else:
            print("AVISO: A tabela tem menos colunas que o esperado!")
            table.columns = expected_columns[:len(table.columns)]
    
    # Processar cada linha da tabela
    for _, row in table.iterrows():
        try:
            # Extrair valores básicos
            id_inep = str(row.get('ID INEP', '')).strip()
            name = str(row.get('Nome', '')).strip().upper()
            
            # Pular linhas que não são de alunos
            if (not name or 
                name == 'Nome' or 
                'TOTAL' in name or 
                'Relatório' in name or 
                'Página' in name or
                'Data:' in name):
                continue
            
            # Extrair e converter valores para o formato correto
            birthdate_str = extract_birthdate(str(row.get('Dt. Nascimento', '')))
            gender_code = str(row.get('Sexo', '')).strip().upper()
            gender = convert_gender(gender_code)
            
            # Processar telefones - usar o primeiro número se houver múltiplos
            phone_text = str(row.get('Telefones', ''))
            phones = extract_phones(phone_text)
            primary_phone = phones[0] if phones else None
            
            # Gerar email único
            email = generate_email(name, existing_emails)
            existing_emails.add(email)
            
            # Criar objeto do estudante conforme modelo User.js
            student = {
                # Apenas campos que existem no modelo
                "name": name.title(),
                "email": email,
                "password": "trocarSenh@",
                "role": "Aluno",
                "status": "active",
                "schoolId": school_id,
                "districtId": district_id,
                "phone": primary_phone,
                "dateOfBirth": birthdate_str,
                "gender": gender,
                "horario": schedule,
            }
            
            students.append(student)
            
        except Exception as e:
            print(f"Erro ao processar linha: {e}")
            continue
    
    print(f"Alunos processados na turma {class_name}: {len(students)}")
    return students

# Função para salvar em JSON
def save_to_json(students, output_file):
    try:
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(students, f, ensure_ascii=False, indent=2)
        print(f"Dados salvos em {output_file}")
        
        # Salvar estatísticas por turma
        class_stats = {}
        for student in students:
            turma = student.get('content', '').replace('Turma: ', '')
            if turma not in class_stats:
                class_stats[turma] = 0
            class_stats[turma] += 1
        
        stats_file = output_file.replace('.json', '_stats.json')
        with open(stats_file, 'w', encoding='utf-8') as f:
            json.dump(class_stats, f, ensure_ascii=False, indent=2)
        print(f"Estatísticas por turma salvas em {stats_file}")
        
    except Exception as e:
        print(f"Erro ao salvar arquivo JSON: {e}")

# Executar o script
if __name__ == "__main__":
    print("Iniciando conversão de PDF para JSON...")
    
    if not os.path.exists(INPUT_PDF):
        print(f"Arquivo não encontrado: {INPUT_PDF}")
        sys.exit(1)
    
    students = process_pdf(INPUT_PDF, SCHOOL_ID, DISTRICT_ID)
    
    if students:
        save_to_json(students, OUTPUT_FILE)
        print("Conversão concluída com sucesso!")
    else:
        print("Não foi possível extrair dados de alunos do PDF.")