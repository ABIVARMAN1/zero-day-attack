import subprocess
import time
import requests
import sys
import os

def run_e2e():
    print("Starting Backend...")
    env = os.environ.copy()
    env["PYTHONPATH"] = "d:/Downloads/zero_day_attack"
    backend = subprocess.Popen(["python", "backend/app.py"], cwd="d:/Downloads/zero_day_attack", env=env, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    
    print("Waiting for Backend to initialize...")
    time.sleep(5) # Wait for backend
    
    # 2. API Health
    print("Checking /api/health...")
    try:
        r = requests.get("http://localhost:5000/api/health")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        assert r.json()['status'] == 'ok', "Expected status='ok'"
        print("Health Check Passed.")
    except Exception as e:
        print(f"Health Check Failed: {e}")
        backend.terminate()
        sys.exit(1)
        
    # 3. Prediction Pipeline
    print("Uploading small valid CSV to /api/predict...")
    csv_data = "col1,col2\n1,2\n3,4"
    try:
        files = {'file': ('test.csv', csv_data, 'text/csv')}
        r = requests.post("http://localhost:5000/api/predict", files=files)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        res = r.json()
        assert 'results' in res, "Expected 'results' in response"
        print(f"Prediction success. Found {res['total_records']} records.")
    except Exception as e:
        print(f"Prediction API Failed: {e}")
        backend.terminate()
        sys.exit(1)
        
    # 4. Database Check
    print("Checking /history...")
    try:
        r = requests.get("http://localhost:5000/history")
        assert r.status_code == 200
        assert len(r.json()['history']) > 0, "Expected history to have records"
        print("Database Check Passed.")
    except Exception as e:
        print(f"Database Check Failed: {e}")
        backend.terminate()
        sys.exit(1)

    print("Checking /dashboard...")
    try:
        r = requests.get("http://localhost:5000/dashboard")
        assert r.status_code == 200
        print("Dashboard Check Passed.")
    except Exception as e:
        print(f"Dashboard Check Failed: {e}")
        backend.terminate()
        sys.exit(1)
        
    print("E2E Backend API tests passed successfully!")
    backend.terminate()
    print("Backend terminated.")

if __name__ == "__main__":
    run_e2e()
