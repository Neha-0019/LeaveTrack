import os
import tempfile
import pytest
from datetime import date, timedelta
import app as flask_app
from app import app, init_db

@pytest.fixture
def client():
    db_fd, db_path = tempfile.mkstemp()
    flask_app.DATABASE = db_path
    app.config['TESTING'] = True

    with app.test_client() as client:
        with app.app_context():
            init_db()
        yield client

    os.close(db_fd)
    os.unlink(db_path)

@pytest.fixture
def manager(client):
    res = client.post('/employees', json={'name': 'Manager Bob', 'role': 'manager'})
    return res.get_json()

@pytest.fixture
def employee(client):
    res = client.post('/employees', json={'name': 'Employee Alice', 'role': 'employee'})
    return res.get_json()

def test_rule1_initial_balance(client, employee):
    """Rule 1: An employee has a leave balance starting at 20 days/year."""
    res = client.get(f'/employees/{employee["id"]}')
    assert res.status_code == 200
    assert res.get_json()['leave_balance'] == 20

def test_rule2_required_fields(client):
    """Rule 2: A leave request needs employee_id, start_date, end_date, and reason."""
    res = client.post('/leaves', json={'employee_id': 1})
    assert res.status_code == 400
    assert 'Missing required fields' in res.get_json()['error']

def test_rule3_date_validation(client, employee):
    """Rule 3: end_date cannot be before start_date."""
    res = client.post('/leaves', json={
        'employee_id': employee['id'],
        'start_date': '2026-10-15',
        'end_date': '2026-10-10',
        'reason': 'Vacation'
    })
    assert res.status_code == 400
    assert 'end_date cannot be before start_date' in res.get_json()['error']

def test_rule4_past_dates(client, employee):
    """Rule 4: Cannot request leave entirely in the past."""
    res = client.post('/leaves', json={
        'employee_id': employee['id'],
        'start_date': '2000-01-01',
        'end_date': '2000-01-05',
        'reason': 'Past'
    })
    assert res.status_code == 400
    assert 'entirely in the past' in res.get_json()['error']

def test_rule5_balance_check(client, employee):
    """Rule 5: Cannot request more days than remaining balance."""
    future_start = (date.today() + timedelta(days=10))
    future_end = future_start + timedelta(days=30) # 22+ working days
    res = client.post('/leaves', json={
        'employee_id': employee['id'],
        'start_date': future_start.strftime('%Y-%m-%d'),
        'end_date': future_end.strftime('%Y-%m-%d'),
        'reason': 'Too long'
    })
    assert res.status_code == 400
    assert 'Insufficient leave balance' in res.get_json()['error']

def test_edge_case_exact_balance_request(client, employee, manager):
    """Edge Case: Request exactly max balance (20 working days)."""
    today = date.today()
    next_monday = today + timedelta(days=(7 - today.weekday()))
    future_end = next_monday + timedelta(days=25) # 4 full weeks Mon-Fri = 20 working days
    res = client.post('/leaves', json={
        'employee_id': employee['id'],
        'start_date': next_monday.strftime('%Y-%m-%d'),
        'end_date': future_end.strftime('%Y-%m-%d'),
        'reason': 'Max out'
    })
    assert res.status_code == 201
    
    leave_id = res.get_json()['id']
    res_approve = client.post(f'/leaves/{leave_id}/approve', headers={'Manager-Id': str(manager['id']), 'Authorization': manager['token']})
    assert res_approve.status_code == 200
    assert res_approve.get_json()['new_balance'] == 0

def test_rule6_no_overlaps(client, employee):
    """Rule 6: Cannot have two overlapping PENDING/APPROVED requests."""
    start1 = (date.today() + timedelta(days=10)).strftime('%Y-%m-%d')
    end1 = (date.today() + timedelta(days=15)).strftime('%Y-%m-%d')
    
    res1 = client.post('/leaves', json={
        'employee_id': employee['id'],
        'start_date': start1,
        'end_date': end1,
        'reason': 'First Request'
    })
    assert res1.status_code == 201
    
    # Overlap Request (start date overlaps with end date of first request)
    start2 = (date.today() + timedelta(days=12)).strftime('%Y-%m-%d')
    end2 = (date.today() + timedelta(days=16)).strftime('%Y-%m-%d')
    res2 = client.post('/leaves', json={
        'employee_id': employee['id'],
        'start_date': start2,
        'end_date': end2,
        'reason': 'Overlap Request'
    })
    assert res2.status_code == 400
    assert 'Overlapping' in res2.get_json()['error']

def test_rule7_workflow_state(client, employee):
    """Rule 7: Requests start as PENDING."""
    future = (date.today() + timedelta(days=5)).strftime('%Y-%m-%d')
    res = client.post('/leaves', json={
        'employee_id': employee['id'],
        'start_date': future,
        'end_date': future,
        'reason': 'One day'
    })
    assert res.status_code == 201
    assert res.get_json()['status'] == 'PENDING'

def test_rule8_balance_deduction(client, employee, manager):
    """Rule 8: Balance is only deducted upon APPROVAL, not on request."""
    future = (date.today() + timedelta(days=5)).strftime('%Y-%m-%d')
    client.post('/leaves', json={
        'employee_id': employee['id'],
        'start_date': future,
        'end_date': future,
        'reason': 'One day'
    })
    # Balance should still be 20
    assert client.get(f'/employees/{employee["id"]}').get_json()['leave_balance'] == 20

def test_rule9_state_lock(client, employee, manager):
    """Rule 9: A REJECTED or APPROVED request cannot be processed again."""
    future = (date.today() + timedelta(days=5)).strftime('%Y-%m-%d')
    res = client.post('/leaves', json={
        'employee_id': employee['id'],
        'start_date': future,
        'end_date': future,
        'reason': 'One day'
    })
    leave_id = res.get_json()['id']
    
    # Approve it once
    client.post(f'/leaves/{leave_id}/approve', headers={'Manager-Id': str(manager['id']), 'Authorization': manager['token']})
    
    # Try rejecting it
    res_reject = client.post(f'/leaves/{leave_id}/reject', headers={'Manager-Id': str(manager['id']), 'Authorization': manager['token']})
    assert res_reject.status_code == 400
    assert 'already APPROVED' in res_reject.get_json()['error']

def test_rule10_authorization(client, employee):
    """Rule 10: Only manager-role user can approve/reject."""
    future = (date.today() + timedelta(days=5)).strftime('%Y-%m-%d')
    res = client.post('/leaves', json={
        'employee_id': employee['id'],
        'start_date': future,
        'end_date': future,
        'reason': 'One day'
    })
    leave_id = res.get_json()['id']
    
    res_approve = client.post(f'/leaves/{leave_id}/approve', headers={'Manager-Id': str(employee['id']), 'Authorization': employee['token']})
    assert res_approve.status_code == 403
    assert 'Unauthorized' in res_approve.get_json()['error']

def test_half_day_overlap(client, employee):
    """Half-day: Two half-day requests on the same date (start vs end) do not overlap."""
    future = (date.today() + timedelta(days=5)).strftime('%Y-%m-%d')
    
    res1 = client.post('/leaves', json={
        'employee_id': employee['id'],
        'start_date': future,
        'end_date': future,
        'reason': 'Afternoon doctor',
        'half_day_start': True,
        'half_day_end': False
    })
    assert res1.status_code == 201

    res2 = client.post('/leaves', json={
        'employee_id': employee['id'],
        'start_date': future,
        'end_date': future,
        'reason': 'Morning errands',
        'half_day_start': False,
        'half_day_end': True
    })
    assert res2.status_code == 201

def test_half_day_deduction(client, employee, manager):
    """Half-day: Deducts exactly 0.5 from balance."""
    target_date = date.today() + timedelta(days=5)
    while target_date.weekday() >= 5:
        target_date += timedelta(days=1)
    future = target_date.strftime('%Y-%m-%d')
    res = client.post('/leaves', json={
        'employee_id': employee['id'],
        'start_date': future,
        'end_date': future,
        'reason': 'Half day trip',
        'half_day_start': True,
        'half_day_end': False
    })
    assert res.status_code == 201
    leave_id = res.get_json()['id']
    
    res_approve = client.post(f'/leaves/{leave_id}/approve', headers={'Manager-Id': str(manager['id']), 'Authorization': manager['token']})
    assert res_approve.status_code == 200
    assert res_approve.get_json()['new_balance'] == 19.5

def test_half_day_single_day_invalid(client, employee):
    """Half-day: Single day leave with both half_day_start and half_day_end is invalid."""
    future = (date.today() + timedelta(days=7)).strftime('%Y-%m-%d')
    res = client.post('/leaves', json={
        'employee_id': employee['id'],
        'start_date': future,
        'end_date': future,
        'reason': 'Both halves',
        'half_day_start': True,
        'half_day_end': True
    })
    assert res.status_code == 400
    assert 'Cannot set both half day start and end on a single day leave' in res.get_json()['error']

def test_unauth_manager_approval(client, employee):
    future = (date.today() + timedelta(days=5)).strftime('%Y-%m-%d')
    res = client.post('/leaves', json={
        'employee_id': employee['id'],
        'start_date': future,
        'end_date': future,
        'reason': 'One day'
    })
    leave_id = res.get_json()['id']
    
    res_approve1 = client.post(f'/leaves/{leave_id}/approve')
    assert res_approve1.status_code == 401
    
    res_approve2 = client.post(f'/leaves/{leave_id}/approve', headers={'Manager-Id': 'abc', 'Authorization': 'fake'})
    assert res_approve2.status_code == 401

def test_self_approval_blocked(client, manager):
    future = (date.today() + timedelta(days=5)).strftime('%Y-%m-%d')
    res = client.post('/leaves', json={
        'employee_id': manager['id'],
        'start_date': future,
        'end_date': future,
        'reason': 'Self leave'
    })
    leave_id = res.get_json()['id']
    
    res_approve = client.post(f'/leaves/{leave_id}/approve', headers={'Manager-Id': str(manager['id']), 'Authorization': manager['token']})
    assert res_approve.status_code == 403
    assert 'Cannot approve/reject your own leave' in res_approve.get_json()['error']

def test_negative_leave_balance(client):
    """Bug fix: create_employee should reject negative leave_balance."""
    res = client.post('/employees', json={
        'name': 'Negative Balance',
        'role': 'employee',
        'leave_balance': -5
    })
    assert res.status_code == 400
    assert 'negative' in res.get_json()['error'].lower()

def test_boundary_overlap(client, employee):
    """Bug fix: Overlap check should reject boundary-touching requests."""
    # Request 1: 10th to 15th
    start1 = (date.today() + timedelta(days=20)).strftime('%Y-%m-%d')
    end1 = (date.today() + timedelta(days=25)).strftime('%Y-%m-%d')
    
    res1 = client.post('/leaves', json={
        'employee_id': employee['id'],
        'start_date': start1,
        'end_date': end1,
        'reason': 'First Request'
    })
    assert res1.status_code == 201
    
    # Request 2: 15th to 20th (touches boundary on 15th)
    start2 = end1
    end2 = (date.today() + timedelta(days=30)).strftime('%Y-%m-%d')
    
    res2 = client.post('/leaves', json={
        'employee_id': employee['id'],
        'start_date': start2,
        'end_date': end2,
        'reason': 'Boundary Overlap Request'
    })
    assert res2.status_code == 400
    assert 'Overlapping' in res2.get_json()['error']

def test_missing_token_auth(client, employee, manager):
    """Bug fix: approve/reject should reject requests without Authorization token."""
    future = (date.today() + timedelta(days=5)).strftime('%Y-%m-%d')
    res = client.post('/leaves', json={
        'employee_id': employee['id'],
        'start_date': future,
        'end_date': future,
        'reason': 'Test missing token'
    })
    leave_id = res.get_json()['id']
    
    # Missing token entirely
    res_approve = client.post(f'/leaves/{leave_id}/approve', headers={'Manager-Id': str(manager['id'])})
    assert res_approve.status_code == 401
    assert 'valid token required' in res_approve.get_json()['error']

def test_wrong_token_auth(client, employee, manager):
    """Bug fix: approve/reject should reject requests with wrong Authorization token."""
    future = (date.today() + timedelta(days=5)).strftime('%Y-%m-%d')
    res = client.post('/leaves', json={
        'employee_id': employee['id'],
        'start_date': future,
        'end_date': future,
        'reason': 'Test wrong token'
    })
    leave_id = res.get_json()['id']
    
    # Wrong token
    res_approve = client.post(f'/leaves/{leave_id}/approve', headers={'Manager-Id': str(manager['id']), 'Authorization': 'invalid-token-here'})
    assert res_approve.status_code == 401
    assert 'valid token required' in res_approve.get_json()['error']
