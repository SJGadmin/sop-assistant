import os
import re

def extract_files_from_artifact(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Find all file sections using regex
    file_pattern = r'### ([^\n]+)\n```(?:[a-zA-Z]*\n)?(.*?)```'
    matches = re.findall(file_pattern, content, re.DOTALL)
    
    for file_path, file_content in matches:
        file_path = file_path.strip()
        
        # Skip if not a valid file path
        if not ('/' in file_path or '.' in file_path):
            continue
            
        # Create directory if it doesn't exist
        dir_path = os.path.dirname(file_path)
        if dir_path:
            os.makedirs(dir_path, exist_ok=True)
        
        # Write file
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(file_content.strip())
        
        print(f"Created: {file_path}")

# Usage
extract_files_from_artifact('sop-assistant-files.txt')
print("All files created successfully!")
