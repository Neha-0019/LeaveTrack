import os
import sqlite3
import secrets
from flask import Flask, request, jsonify, g, render_template
from datetime import datetime, date, timedelta


def calculate_working_days(start_date, end_date, half_day_start=False, half_day_end=False):
    current = start_date
    working_days = 0
    while current <= end_date:
        if current.weekday() < 5:  # 0=Mon, 1=Tue, 2=Wed, 3=Thu, 4=Fri (5=Sat, 6=Sun)
            working_days += 1
        current += timedelta(days=1)
        
    duration = float(working_days)
    if working_days > 0:
        if half_day_start and start_date.weekday() < 5:
            duration -= 0.5
        if half_day_end and end_date.weekday() < 5 and start_date != end_date:
            duration -= 0.5
    return max(0.0, duration)

app = Flask(__name__)
DATABASE = os.environ.get('DATABASE_PATH', 'leave_app.db')

def get_db():
    db = getattr(g, '_database', None)
    if db is None:
        db = g._database = sqlite3.connect(DATABASE)
        db.row_factory = sqlite3.Row
    return db

@app.teardown_appcontext
def close_connection(exception):
    db = getattr(g, '_database', None)
    if db is not None:
        db.close()

def init_db():
    db = get_db()
    cursor = db.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS Employee (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            role TEXT NOT NULL,
            leave_balance REAL DEFAULT 20.0,
            token TEXT
        )
    ''')
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS LeaveRequest (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            employee_id INTEGER NOT NULL,
            start_date TEXT NOT NULL,
            end_date TEXT NOT NULL,
            reason TEXT NOT NULL,
            status TEXT DEFAULT 'PENDING',
            half_day_start BOOLEAN DEFAULT 0,
            half_day_end BOOLEAN DEFAULT 0,
            FOREIGN KEY(employee_id) REFERENCES Employee(id)
        )
    ''')
    
    # Auto-initialize default accounts so MG001 and EMP002 work out-of-the-box
    cursor.execute('SELECT COUNT(*) FROM Employee')
    if cursor.fetchone()[0] == 0:
        cursor.execute('INSERT INTO Employee (name, role, leave_balance, token) VALUES (?, ?, ?, ?)', ('Alice Manager', 'manager', 20.0, 'demo-token-alice'))
        cursor.execute('INSERT INTO Employee (name, role, leave_balance, token) VALUES (?, ?, ?, ?)', ('Bob Employee', 'employee', 18.0, 'demo-token-bob'))
        cursor.execute('INSERT INTO Employee (name, role, leave_balance, token) VALUES (?, ?, ?, ?)', ('Charlie Employee', 'employee', 20.0, 'demo-token-charlie'))
        
        # Populate initial sample leave requests so calendar, tracker, & requests tables are rich with data
        cursor.execute('''
            INSERT INTO LeaveRequest (employee_id, start_date, end_date, reason, status, half_day_start, half_day_end)
            VALUES (?, ?, ?, ?, 'APPROVED', 0, 0)
        ''', (2, '2026-08-10', '2026-08-12', '[Casual Leave] Family Vacation'))

        cursor.execute('''
            INSERT INTO LeaveRequest (employee_id, start_date, end_date, reason, status, half_day_start, half_day_end)
            VALUES (?, ?, ?, ?, 'PENDING', 0, 0)
        ''', (2, '2026-08-24', '2026-08-25', '[Sick Leave] Medical Appointment'))
        
    db.commit()

# Ensure database tables exist whenever app module is imported (e.g. by gunicorn)
with app.app_context():
    init_db()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/employees', methods=['POST'])
def create_employee():
    data = request.json
    if not data:
        return jsonify({'error': 'JSON payload required'}), 400
        
    name = data.get('name')
    role = data.get('role')
    leave_balance = data.get('leave_balance', 20.0)
    
    if not name or not role:
        return jsonify({'error': 'name and role required'}), 400
        
    if not isinstance(name, str) or not isinstance(role, str):
        return jsonify({'error': 'name and role must be strings'}), 400
        
    role = role.lower().strip()
    if role not in ['employee', 'manager']:
        return jsonify({'error': 'invalid role, must be employee or manager'}), 400
        
    try:
        leave_balance = float(leave_balance)
        if leave_balance < 0:
            return jsonify({'error': 'leave_balance cannot be negative'}), 400
    except (ValueError, TypeError):
        return jsonify({'error': 'leave_balance must be a number'}), 400
        
    token = secrets.token_hex(16)
    db = get_db()
    cursor = db.cursor()
    cursor.execute('INSERT INTO Employee (name, role, leave_balance, token) VALUES (?, ?, ?, ?)', (name, role, leave_balance, token))
    db.commit()
    
    return jsonify({'id': cursor.lastrowid, 'name': name, 'role': role, 'leave_balance': leave_balance, 'token': token}), 201

@app.route('/employees/<int:employee_id>', methods=['GET'])
def get_employee_route(employee_id):
    emp = get_employee(employee_id)
    if not emp:
        return jsonify({'error': 'Not found'}), 404
    return jsonify(dict(emp)), 200

def get_employee(employee_id):
    cursor = get_db().cursor()
    cursor.execute('SELECT * FROM Employee WHERE id = ?', (employee_id,))
    return cursor.fetchone()

@app.route('/leaves', methods=['POST'])
def submit_leave():
    data = request.json
    if not data:
        return jsonify({'error': 'JSON payload required'}), 400
        
    employee_id = data.get('employee_id')
    start_date_str = data.get('start_date')
    end_date_str = data.get('end_date')
    reason = data.get('reason')
    
    if 'half_day_start' in data and not isinstance(data['half_day_start'], bool):
        return jsonify({'error': 'half_day_start must be boolean'}), 400
    if 'half_day_end' in data and not isinstance(data['half_day_end'], bool):
        return jsonify({'error': 'half_day_end must be boolean'}), 400
        
    half_day_start = bool(data.get('half_day_start', False))
    half_day_end = bool(data.get('half_day_end', False))
    
    if not all([employee_id, start_date_str, end_date_str, reason]):
        return jsonify({'error': 'Missing required fields'}), 400
        
    if not isinstance(employee_id, int) or employee_id <= 0:
        return jsonify({'error': 'Invalid employee_id'}), 400
        
    if not isinstance(reason, str) or not reason.strip():
        return jsonify({'error': 'Invalid reason'}), 400
        
    try:
        start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
        end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date()
    except ValueError:
        return jsonify({'error': 'Invalid date format, use YYYY-MM-DD'}), 400
        
    if end_date < start_date:
        return jsonify({'error': 'end_date cannot be before start_date'}), 400
        
    today = date.today()
    if end_date < today:
        return jsonify({'error': 'Cannot request leave entirely in the past'}), 400
        
    if start_date == end_date and half_day_start and half_day_end:
        return jsonify({'error': 'Cannot set both half day start and end on a single day leave'}), 400
        
    employee = get_employee(employee_id)
    if not employee:
        return jsonify({'error': 'Employee not found'}), 404
        
    days_requested = calculate_working_days(start_date, end_date, half_day_start, half_day_end)
        
    if days_requested > float(employee['leave_balance']):
        return jsonify({'error': 'Insufficient leave balance'}), 400
        
    db = get_db()
    cursor = db.cursor()
    cursor.execute('''
        SELECT * FROM LeaveRequest 
        WHERE employee_id = ? AND status IN ('PENDING', 'APPROVED')
        AND start_date <= ? AND end_date >= ?
    ''', (employee_id, end_date_str, start_date_str))
    
    overlaps = cursor.fetchall()
    
    has_overlap = False
    for req in overlaps:
        req_start = datetime.strptime(req['start_date'], '%Y-%m-%d').date()
        req_end = datetime.strptime(req['end_date'], '%Y-%m-%d').date()
        
        overlap_start = max(start_date, req_start)
        overlap_end = min(end_date, req_end)
        
        if overlap_start == overlap_end:
            # Single day overlap check for non-overlapping halves
            if overlap_start == start_date and overlap_start == req_end:
                if half_day_start and req['half_day_end']:
                    continue
            if overlap_start == end_date and overlap_start == req_start:
                if half_day_end and req['half_day_start']:
                    continue
            if start_date == end_date and req_start == req_end:
                if half_day_start and req['half_day_end'] and not req['half_day_start']:
                    continue
                if half_day_end and req['half_day_start'] and not req['half_day_end']:
                    continue
                    
        has_overlap = True
        break
        
    if has_overlap:
        return jsonify({'error': 'Overlapping pending or approved requests exist'}), 400
        
    cursor.execute('''
        INSERT INTO LeaveRequest (employee_id, start_date, end_date, reason, status, half_day_start, half_day_end)
        VALUES (?, ?, ?, ?, 'PENDING', ?, ?)
    ''', (employee_id, start_date_str, end_date_str, reason, half_day_start, half_day_end))
    db.commit()
    
    return jsonify({'id': cursor.lastrowid, 'status': 'PENDING'}), 201

@app.route('/leaves/<int:request_id>/approve', methods=['POST'])
def approve_leave(request_id):
    manager_id_str = request.headers.get('Manager-Id')
    if not manager_id_str or not manager_id_str.isdigit():
        return jsonify({'error': 'Manager-Id header required and must be integer'}), 401
    manager_id = int(manager_id_str)
        
    manager = get_employee(manager_id)
    if not manager or manager['role'] != 'manager':
        return jsonify({'error': 'Unauthorized, manager role required'}), 403
        
    auth_token = request.headers.get('Authorization')
    if not auth_token or auth_token != manager['token']:
        return jsonify({'error': 'Unauthorized, valid token required in Authorization header'}), 401
        
    db = get_db()
    cursor = db.cursor()
    cursor.execute('SELECT * FROM LeaveRequest WHERE id = ?', (request_id,))
    leave_req = cursor.fetchone()
    
    if not leave_req:
        return jsonify({'error': 'Leave request not found'}), 404
        
    if leave_req['employee_id'] == manager_id:
        return jsonify({'error': 'Cannot approve/reject your own leave'}), 403
        
    if leave_req['status'] != 'PENDING':
        return jsonify({'error': f"Request is already {leave_req['status']}"}), 400
        
    start_date = datetime.strptime(leave_req['start_date'], '%Y-%m-%d').date()
    end_date = datetime.strptime(leave_req['end_date'], '%Y-%m-%d').date()
    days_requested = calculate_working_days(start_date, end_date, leave_req['half_day_start'], leave_req['half_day_end'])
    
    employee = get_employee(leave_req['employee_id'])
    
    if days_requested > float(employee['leave_balance']):
        return jsonify({'error': 'Insufficient leave balance at time of approval'}), 400
        
    new_balance = float(employee['leave_balance']) - days_requested
    
    cursor.execute('UPDATE LeaveRequest SET status = ? WHERE id = ?', ('APPROVED', request_id))
    cursor.execute('UPDATE Employee SET leave_balance = ? WHERE id = ?', (new_balance, employee['id']))
    db.commit()
    
    return jsonify({'status': 'APPROVED', 'new_balance': new_balance}), 200

@app.route('/leaves/<int:request_id>/reject', methods=['POST'])
def reject_leave(request_id):
    manager_id_str = request.headers.get('Manager-Id')
    if not manager_id_str or not manager_id_str.isdigit():
        return jsonify({'error': 'Manager-Id header required and must be integer'}), 401
    manager_id = int(manager_id_str)
        
    manager = get_employee(manager_id)
    if not manager or manager['role'] != 'manager':
        return jsonify({'error': 'Unauthorized, manager role required'}), 403
        
    auth_token = request.headers.get('Authorization')
    if not auth_token or auth_token != manager['token']:
        return jsonify({'error': 'Unauthorized, valid token required in Authorization header'}), 401
        
    db = get_db()
    cursor = db.cursor()
    cursor.execute('SELECT * FROM LeaveRequest WHERE id = ?', (request_id,))
    leave_req = cursor.fetchone()
    
    if not leave_req:
        return jsonify({'error': 'Leave request not found'}), 404
        
    if leave_req['employee_id'] == manager_id:
        return jsonify({'error': 'Cannot approve/reject your own leave'}), 403
        
    if leave_req['status'] != 'PENDING':
        return jsonify({'error': f"Request is already {leave_req['status']}"}), 400
        
    cursor.execute('UPDATE LeaveRequest SET status = ? WHERE id = ?', ('REJECTED', request_id))
    db.commit()
    
    return jsonify({'status': 'REJECTED'}), 200

@app.route('/leaves', methods=['GET'])
def list_leaves():
    db = get_db()
    cursor = db.cursor()
    cursor.execute('SELECT * FROM LeaveRequest')
    leaves = [dict(row) for row in cursor.fetchall()]
    return jsonify(leaves), 200

if __name__ == '__main__':
    with app.app_context():
        init_db()
    app.run(debug=True, port=5000)
