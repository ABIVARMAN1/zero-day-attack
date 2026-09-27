import sys

with open('d:/Downloads/zero_day_attack/backend/app.py', 'r', encoding='utf-8') as f:
    content = f.read()

target1 = "    if file.filename == '':\n        return jsonify({\"error\": \"No selected file\"}), 400"
replacement1 = "    if file.filename == '':\n        return jsonify({\"error\": \"No selected file\"}), 400\n    if not file.filename.lower().endswith('.csv'):\n        return jsonify({\"error\": \"Invalid file type. Only CSV allowed.\"}), 400"

target2 = "    try:\n        df = pd.read_csv(file)"
replacement2 = "    try:\n        try:\n            df = pd.read_csv(file)\n            if df.empty or len(df.columns) < 2:\n                raise ValueError()\n        except Exception:\n            return jsonify({\"error\": \"Malformed CSV file\"}), 400"

content = content.replace(target1, replacement1)
content = content.replace(target2, replacement2)

with open('d:/Downloads/zero_day_attack/backend/app.py', 'w', encoding='utf-8') as f:
    f.write(content)
