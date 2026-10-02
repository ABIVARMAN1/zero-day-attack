with open('backend/api_routes.py', 'r') as f:
    text = f.read()
text = text.replace('request.user_id', '"anonymous"')
with open('backend/api_routes.py', 'w') as f:
    f.write(text)
