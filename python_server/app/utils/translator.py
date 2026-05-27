import os
import re

js_dir = '../server'
py_dir = '.'

files = [f for f in os.listdir(js_dir) if f.endswith('.js') and f not in ('index.js', 'db.js', 'setup_db.js')]

def translate_js_to_py(js_code, func_name):
    py_code = f"""import os
import pymysql
import pymysql.cursors
from dotenv import load_dotenv

load_dotenv()

def {func_name}():
    connection = pymysql.connect(
        host=os.getenv("DB_HOST", "localhost"),
        port=int(os.getenv("DB_PORT", 3306)),
        user=os.getenv("DB_USER", "root"),
        password=os.getenv("DB_PASS", ""),
        database=os.getenv("DB_NAME", "votersms"),
        cursorclass=pymysql.cursors.DictCursor,
        autocommit=True
    )
    try:
        with connection.cursor() as cursor:
"""
    
    # Extract SQL queries
    queries = re.findall(r"(?:connection\.execute|connection\.query)\(\s*(['\"`])(.*?)\1(?:,\s*(\[[^\]]+\]))?\s*\)", js_code, re.DOTALL)
    for q in queries:
        sql = q[1].replace('\n', ' ').strip()
        params = q[2]
        if params:
            # simple replacement of JS arrays to Python tuples
            params = params.replace('[', '(').replace(']', ')')
            py_code += f"            cursor.execute(\"{sql}\", {params})\n"
        else:
            py_code += f"            cursor.execute(\"{sql}\")\n"
            py_code += f"            print(cursor.fetchall())\n"
    
    py_code += f"""    except Exception as e:
        print("Error:", e)
    finally:
        connection.close()

if __name__ == '__main__':
    {func_name}()
"""
    return py_code

for f in files:
    with open(os.path.join(js_dir, f), 'r') as file:
        js_code = file.read()
    
    func_match = re.search(r'async function (\w+)', js_code)
    func_name = func_match.group(1) if func_match else f.split('.')[0].replace('-', '_')
    
    py_code = translate_js_to_py(js_code, func_name)
    
    with open(os.path.join(py_dir, f.replace('.js', '.py')), 'w') as file:
        file.write(py_code)

print(f"Translated {len(files)} scripts.")
