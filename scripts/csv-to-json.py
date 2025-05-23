import csv
import json
import re
import os
from datetime import datetime

def clean_text(text):
    """Limpa o texto removendo quebras de linha e espaços extras."""
    if not text:
        return ""
    return ' '.join(text.replace('\n', ' ').split())

def extract_phones(phones_text):
    """
    Extrai todos os telefones de uma string.
    Identifica telefones no formato (XX) XXXXX-XXXX ou (XX) XXXX-XXXX.
    """
    if not phones_text or phones_text.strip() == "":
        return []
    
    # Regex para telefones no formato (DD) DDDDD-DDDD ou (DD) DDDD-DDDD
    phone_pattern = r'\(\d{2}\)\s*\d{4,5}-\d{4}'
    phones = re.findall(phone_pattern, phones_text)
    
    # Normaliza o formato dos telefones
    normalized_phones = []
    for phone in phones:
        # Remove espaços extras
        clean_phone = re.sub(r'\s+', ' ', phone).strip()
        normalized_phones.append(clean_phone)
    
    return normalized_phones

def normalize_gender(gender):
    """Converte o código de sexo (M/F) para formato completo."""
    if not gender:
        return ""
    
    gender = gender.strip().upper()
    if gender == 'M':
        return 'masculino'
    elif gender == 'F':
        return 'feminino'
    return gender

def normalize_age(age_str):
    """Remove 'anos' e retorna apenas o número."""
    if not age_str:
        return ""
    
    return re.sub(r'anos', '', age_str).strip()

def process_csv_to_json(csv_file_path):
    """
    Processa o arquivo CSV e o converte para o formato JSON desejado.
    """
    data = {
        "metadados": {
            "data_emissao": datetime.now().strftime("%a, %d de %B de %Y, %H:%M"),
            "escola": "EEEFM JOAO CRISOSTOMO BELESA",
            "arquivo_origem": os.path.basename(csv_file_path).replace(".csv", ".PDF")
        }
    }
    
    current_class = None
    
    with open(csv_file_path, 'r', encoding='utf-8') as csvfile:
        csvreader = csv.reader(csvfile)
        headers = next(csvreader)  # Pular cabeçalho
        
        for row in csvreader:
            if not row or len(row) < 9:  # Verificar se a linha tem dados suficientes
                continue
            
            turma = row[0]
            
            # Verificar se é uma linha de cabeçalho de turma
            if "Col0" in row[1:] or "ID" in row[1:]:
                continue
                
            # Inicializar a turma no dicionário se ela não existir
            if turma != current_class:
                current_class = turma
                if turma not in data:
                    data[turma] = []
            
            # Extrair e processar os dados do aluno
            nome = clean_text(row[3])  # Nome está na coluna 3
            dt_nascimento = clean_text(row[4])  # Data de nascimento na coluna 4
            sexo = normalize_gender(row[5])  # Sexo na coluna 5
            idade = normalize_age(row[6])  # Idade na coluna 6
            
            # Processar telefones
            telefones = extract_phones(row[7])  # Telefones na coluna 7
            telefone = telefones[0] if telefones else ""
            
            # Criar objeto do aluno apenas se tiver nome
            if nome:
                aluno = {
                    "nome": nome,
                    "dt_nascimento": dt_nascimento,
                    "sexo": sexo,
                    "idade": idade,
                    "telefone": telefone,
                    "telefones": telefones
                }
                
                data[turma].append(aluno)
    
    return data

def save_json(data, output_file):
    """
    Salva os dados como JSON formatado no arquivo especificado.
    """
    with open(output_file, 'w', encoding='utf-8') as jsonfile:
        json.dump(data, jsonfile, ensure_ascii=False, indent=4)
    
    print(f"Arquivo JSON salvo com sucesso: {output_file}")

if __name__ == "__main__":
    # Definir caminhos de arquivo
    input_csv = "Alunos por turma - EEEFM JOAO CRISOSTOMO BELESA (2).csv"
    output_json = "Alunos por turma - EEEFM JOAO CRISOSTOMO BELESA.json"
    
    # Processar o CSV e gerar o JSON
    json_data = process_csv_to_json(input_csv)
    
    # Salvar o resultado
    save_json(json_data, output_json)