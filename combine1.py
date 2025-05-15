import os
from tqdm import tqdm  # Asegúrate de tener instalada la librería tqdm

extensions = {'.css', '.jsx'}
root_dir = r'C:\parking-app'
output_file = 'combined.txt'

# Paso 1: Recolectar todos los archivos a procesar (excluyendo node_modules y package-lock.json)
file_list = []
for root, dirs, files in os.walk(root_dir):
    dirs[:] = [d for d in dirs if d != 'node_modules']
    for file in files:
        if file == 'package-lock.json':
            continue  # Excluir package-lock.json
        if os.path.splitext(file)[1].lower() in extensions:
            file_list.append(os.path.join(root, file))

total_files = len(file_list)
print(f"Total de archivos a procesar: {total_files}")

# Paso 2: Escribir la lista de archivos al inicio del archivo de salida
with open(output_file, 'w', encoding='utf-8') as outfile:
    outfile.write("LISTA DE ARCHIVOS PROCESADOS:\n")
    for path in file_list:
        outfile.write(f"{path}\n")
    outfile.write("\n" + "="*60 + "\n\n")

    # Paso 3: Procesar y combinar archivos con barra de progreso porcentual
    for file_path in tqdm(file_list, desc="Progreso", unit="archivo"):
        try:
            with open(file_path, 'r', encoding='utf-8') as infile:
                outfile.write(f'\n\n----- {file_path} -----\n\n')
                outfile.write(infile.read())
        except Exception as e:
            print(f"Error leyendo {file_path}: {e}")

print(f"\n¡Combinación completada! Archivo generado: {output_file}")
