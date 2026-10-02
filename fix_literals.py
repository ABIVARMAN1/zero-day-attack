import os

target = '${"$"}{API_BASE_URL}'
replacement = '${API_BASE_URL}'

count = 0
for root, _, files in os.walk('d:/Downloads/zero_day_attack/frontend/src'):
    for f in files:
        if f.endswith('.jsx'):
            p = os.path.join(root, f)
            with open(p, 'r', encoding='utf-8') as file:
                content = file.read()
            new_content = content.replace(target, replacement)
            if new_content != content:
                with open(p, 'w', encoding='utf-8') as file:
                    file.write(new_content)
                count += 1
print(f"Fixed {count} files.")
