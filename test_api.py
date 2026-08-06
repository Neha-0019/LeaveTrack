import requests

BASE_URL = 'http://127.0.0.1:5000'

def test_api():
    print("--- Test 1: Create a manager ---")
    res = requests.post(f"{BASE_URL}/employees", json={"name": "Alice Manager", "role": "manager"})
    print("Response:", res.json())
    manager_id = res.json()['id']

    print("\n--- Test 2: Create an employee ---")
    res = requests.post(f"{BASE_URL}/employees", json={"name": "Bob Employee", "role": "employee"})
    print("Response:", res.json())
    emp_id = res.json()['id']
    print("Initial balance:", res.json()['leave_balance'])

    print("\n--- Test 3: Submit a valid leave request ---")
    res = requests.post(f"{BASE_URL}/leaves", json={
        "employee_id": emp_id,
        "start_date": "2026-08-10",
        "end_date": "2026-08-14",
        "reason": "Vacation"
    })
    print("Status code:", res.status_code)
    print("Response:", res.json())
    leave_id = res.json()['id']

    print("\n--- Test 4: Approve the request & verify balance ---")
    res = requests.post(f"{BASE_URL}/leaves/{leave_id}/approve", headers={"Manager-Id": str(manager_id)})
    print("Status code:", res.status_code)
    print("Response:", res.json())
    
    # Verify balance
    res = requests.get(f"{BASE_URL}/employees/{emp_id}")
    print("Employee after approval:", res.json())

    print("\n--- Test 5: Try overlapping request (blocked) ---")
    res = requests.post(f"{BASE_URL}/leaves", json={
        "employee_id": emp_id,
        "start_date": "2026-08-12",
        "end_date": "2026-08-15",
        "reason": "Another Vacation"
    })
    print("Status code:", res.status_code)
    print("Response:", res.json())

    print("\n--- Test 6: Try invalid dates (past) ---")
    res = requests.post(f"{BASE_URL}/leaves", json={
        "employee_id": emp_id,
        "start_date": "2020-01-01",
        "end_date": "2020-01-05",
        "reason": "Time travel"
    })
    print("Status code:", res.status_code)
    print("Response:", res.json())

    print("\n--- Test 7: Try insufficient balance ---")
    res = requests.post(f"{BASE_URL}/leaves", json={
        "employee_id": emp_id,
        "start_date": "2026-09-01",
        "end_date": "2026-09-30",
        "reason": "Long trip"
    })
    print("Status code:", res.status_code)
    print("Response:", res.json())

if __name__ == '__main__':
    test_api()
