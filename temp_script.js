
        let currentUser = null;
        let allRequests = [];

        // ================= UI HELPERS =================
        function showSection(section) {
            document.getElementById('overview_section').style.display = section === 'overview' ? 'block' : 'none';
            document.getElementById('requests_section').style.display = section === 'requests' ? 'block' : 'none';
            document.getElementById('settings_section').style.display = section === 'settings' ? 'block' : 'none';
            document.getElementById('approvals_section').style.display = section === 'approvals' ? 'block' : 'none';
            
            document.getElementById('nav_overview').classList.toggle('active', section === 'overview');
            document.getElementById('nav_requests').classList.toggle('active', section === 'requests');
            document.getElementById('nav_settings').classList.toggle('active', section === 'settings');
            if(document.getElementById('nav_approvals')) document.getElementById('nav_approvals').classList.toggle('active', section === 'approvals');
        }

        function showToast(message, type = 'success') {
            const container = document.getElementById('toast_container');
            const toast = document.createElement('div');
            toast.className = `toast ${type}`;
            
            const icon = type === 'success' ? 'check-circle' : 'alert-circle';
            toast.innerHTML = `<i data-lucide="${icon}"></i> <div><h4 style="margin:0;font-size:13px;">${type === 'success' ? 'Success' : 'Error'}</h4><p style="margin:0;font-size:12px;color:var(--text-muted);">${message}</p></div>`;
            
            container.appendChild(toast);
            lucide.createIcons();

            setTimeout(() => {
                toast.style.animation = 'slideOut 0.2s ease forwards';
                setTimeout(() => toast.remove(), 200);
            }, 4000);
        }

        function toggleAuthView(view) {
            document.getElementById('login_view').style.display = view === 'login' ? 'block' : 'none';
            document.getElementById('register_view').style.display = view === 'register' ? 'block' : 'none';
        }

        function scrollToSection(id) {
            document.getElementById(id).scrollIntoView({ behavior: 'smooth' });
        }

        function renderWorkflowTimeline(status) {
            const isApproved = status === 'APPROVED';
            const isRejected = status === 'REJECTED';
            const isPending = status === 'PENDING';
            
            return `
                <div class="timeline">
                    <div class="tl-node active"></div>
                    <div class="tl-line ${isPending ? '' : 'active'}"></div>
                    <div class="tl-node ${isPending ? '' : 'active'}"></div>
                    <div class="tl-line ${isApproved || isRejected ? 'active' : ''}"></div>
                    <div class="tl-node ${isApproved ? 'success' : isRejected ? 'danger' : ''}"></div>
                </div>
            `;
        }

        // ================= CUSTOM DROPDOWN =================
        function toggleDropdown() {
            document.getElementById('status_dropdown_options').classList.toggle('open');
        }

        function selectStatus(value, text) {
            document.getElementById('status_filter').value = value;
            document.getElementById('selected_status_text').innerText = text;
            
            // Update selected class
            document.querySelectorAll('.select-option').forEach(el => el.classList.remove('selected'));
            event.target.classList.add('selected');
            
            document.getElementById('status_dropdown_options').classList.remove('open');
            filterTable();
        }

        // Close dropdown when clicking outside
        document.addEventListener('click', function(event) {
            const container = document.getElementById('status_dropdown_container');
            if (container && !container.contains(event.target)) {
                const options = document.getElementById('status_dropdown_options');
                if (options) options.classList.remove('open');
            }
        });

        // ================= AUTHENTICATION =================
        async function fetchUser(id) {
            const res = await fetch(`/employees/${id}`);
            if (!res.ok) throw new Error('Employee not found');
            return await res.json();
        }

        async function handleLogin() {
            const btn = document.getElementById('btn_login');
            const idInput = document.getElementById('login_id').value;
            
            if (!idInput) { showToast('Please enter your Employee ID.', 'error'); return; }

            btn.disabled = true; btn.classList.add('loading-btn');
            try {
                const user = await fetchUser(idInput);
                currentUser = user;
                localStorage.setItem('entLeaveAppUserId', user.id);
                initDashboard();
            } catch (err) {
                showToast('Invalid ID. Employee not found.', 'error');
            } finally {
                btn.disabled = false; btn.classList.remove('loading-btn');
            }
        }

        async function handleRegister() {
            const btn = document.getElementById('btn_register');
            const name = document.getElementById('reg_name').value;
            const role = document.getElementById('reg_role').value;

            if (!name) { showToast('Full Name is required.', 'error'); return; }

            btn.disabled = true; btn.classList.add('loading-btn');
            try {
                const res = await fetch('/employees', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, role })
                });
                const data = await res.json();
                
                if (res.ok) {
                    showToast(`Registered successfully! Your ID is: ${data.id}`, 'success');
                    document.getElementById('reg_name').value = '';
                    document.getElementById('login_id').value = data.id; 
                    toggleAuthView('login');
                } else {
                    showToast(data.error || 'Registration failed.', 'error');
                }
            } catch (err) {
                showToast('Network error: ' + err.message, 'error');
            } finally {
                btn.disabled = false; btn.classList.remove('loading-btn');
            }
        }

        function logout() {
            currentUser = null;
            localStorage.removeItem('entLeaveAppUserId');
            document.getElementById('dashboard_page').style.display = 'none';
            document.getElementById('auth_page').style.display = 'flex';
            document.getElementById('login_id').value = '';
        }

        // ================= DASHBOARD & DATA =================
        async function initDashboard() {
            document.getElementById('auth_page').style.display = 'none';
            document.getElementById('dashboard_page').style.display = 'block';
            
            // Adjust UI based on Role
            const isManager = currentUser.role === 'manager';
            document.querySelectorAll('.manager-only').forEach(el => {
                el.style.display = isManager ? 'table-cell' : 'none'; // Works for th/td
                if(el.tagName !== 'TH' && el.tagName !== 'TD') el.style.display = isManager ? 'inline-block' : 'none';
            });

            await loadDashboardData();
        }

        async function loadDashboardData() {
            try {
                // Refresh user data
                currentUser = await fetchUser(currentUser.id);
                
                // Update Employee Card
                const firstName = currentUser.name.split(' ')[0];
                document.getElementById('nav_user_name').innerText = firstName;
                document.getElementById('nav_avatar').innerText = firstName.charAt(0).toUpperCase();
                
                document.getElementById('info_name').innerText = currentUser.name;
                document.getElementById('info_id').innerText = `ID: ${currentUser.id} · Engineering`;
                document.getElementById('badge_role').innerText = currentUser.role.toUpperCase();
                document.getElementById('setting_id').value = currentUser.id;
                document.getElementById('setting_name').value = currentUser.name;
                document.getElementById('setting_role').value = currentUser.role;
                document.getElementById('setting_token').value = currentUser.token || 'N/A';

                
                // Fetch all requests
                const res = await fetch('/leaves');
                
                allRequests = await res.json();

                const empNames = {};
                for (let r of allRequests) {
                    if (!empNames[r.employee_id]) {
                        try {
                            const empRes = await fetch('/employees/' + r.employee_id);
                            if (empRes.ok) {
                                const empData = await empRes.json();
                                empNames[r.employee_id] = empData.name;
                            }
                        } catch(e) {}
                    }
                    r.employee_name = empNames[r.employee_id] || ('Employee ' + r.employee_id);
                    
                    let sd = new Date(r.start_date);
                    let ed = new Date(r.end_date);
                    let diffDays = Math.ceil(Math.abs(ed - sd) / (1000 * 60 * 60 * 24)) + 1;
                    if (r.half_day_start) diffDays -= 0.5;
                    if (r.half_day_end && diffDays > 0.5) diffDays -= 0.5;
                    r.duration = diffDays;
                }

                
                // Calculate KPIs
                let pendingCount = 0, approvedCount = 0, rejectedCount = 0;
                
                const relevantRequests = currentUser.role === 'manager' ? allRequests : allRequests.filter(r => r.employee_id === currentUser.id);
                
                relevantRequests.forEach(r => {
                    if (r.status === 'PENDING') pendingCount++;
                    if (r.status === 'APPROVED') approvedCount++;
                    if (r.status === 'REJECTED') rejectedCount++;
                });

                document.getElementById('kpi_balance').innerText = currentUser.leave_balance;
                
                // Visual System Update: Bar progress
                const totalDays = 20;
                const usedDays = totalDays - currentUser.leave_balance;
                const usedPercent = Math.max(0, Math.min(100, (usedDays / totalDays) * 100));
                
                const fillBar = document.getElementById('balance_fill_bar');
                if (fillBar) fillBar.style.width = usedPercent + '%';
                
                const usedLabel = document.getElementById('balance_used_label');
                if (usedLabel) usedLabel.innerText = usedDays + ' used';
                document.getElementById('kpi_pending').innerText = pendingCount;
                document.getElementById('kpi_approved').innerText = approvedCount;
                document.getElementById('kpi_rejected').innerText = rejectedCount;

                filterTable();
                renderManagerQueue();
            } catch (err) {
                console.error(err);
                document.body.innerHTML += '<div style="position:fixed;top:0;left:0;z-index:9999;background:red;color:white;padding:20px;">' + err.stack + '</div>';
                showToast('Failed to load dashboard data.', 'error');
            }
        }

        // ================= ACTIONS =================
        async function handleSubmitLeave() {
            const btn = document.getElementById('btn_submit');
            const start_date = document.getElementById('start_date').value;
            const end_date = document.getElementById('end_date').value;
            const reason = document.getElementById('reason').value;
            const half_day_start = document.getElementById('half_day_start').checked;
            const half_day_end = document.getElementById('half_day_end').checked;

            if (!start_date || !end_date || !reason) { showToast('All fields are required.', 'error'); return; }

            btn.disabled = true; btn.classList.add('loading-btn');
            try {
                const res = await fetch('/leaves', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        employee_id: currentUser.id, 
                        start_date, end_date, reason, half_day_start, half_day_end
                    })
                });
                const data = await res.json();
                
                if (res.ok) {
                    showToast('Leave request submitted successfully.', 'success');
                    document.getElementById('start_date').value = '';
                    document.getElementById('end_date').value = '';
                    document.getElementById('reason').value = '';
                    document.getElementById('half_day_start').checked = false;
                    document.getElementById('half_day_end').checked = false;
                    loadDashboardData();
                } else {
                    showToast(data.error || 'Submission failed.', 'error');
                }
            } catch (err) {
                showToast('Network error: ' + err.message, 'error');
            } finally {
                btn.disabled = false; btn.classList.remove('loading-btn');
            }
        }

        async function handleActionLeave(id, action) {
            try {
                const res = await fetch(`/leaves/${id}/${action}`, {
                    method: 'POST',
                    headers: { 
                        'Manager-Id': currentUser.id,
                        'Authorization': currentUser.token
                    }
                });
                const data = await res.json();
                if (res.ok) {
                    showToast(`Request #${id} successfully ${action}d.`, 'success');
                    loadDashboardData();
                } else {
                    showToast(data.error || 'Action failed.', 'error');
                }
            } catch (err) {
                showToast('Network error: ' + err.message, 'error');
            }
        }

        // ================= TABLE RENDERING =================
        function toggleTracker(id) {
            const tr = document.getElementById('tracker_' + id);
            if (tr) tr.classList.toggle('expanded');
        }

        async function handleInlineAction(requestId, action, btnElement) {
            if(event) event.stopPropagation();
            
            const row = document.getElementById('queue_row_' + requestId);
            const errSpan = document.getElementById('queue_err_' + requestId);
            const originalHtml = btnElement.innerHTML;
            
            btnElement.innerHTML = '<span class="spinner" style="display:inline-block; border-width:2px; width:14px; height:14px; margin-right:6px;"></span>' + (action === 'approve' ? 'Approving...' : 'Rejecting...');
            btnElement.disabled = true;
            if (errSpan) errSpan.style.display = 'none';

            try {
                const res = await fetch(`/leaves/${requestId}/${action}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Manager-Id': currentUser.id.toString(),
                        'Authorization': currentUser.token || ''
                    }
                });
                
                const data = await res.json();
                if (res.ok) {
                    if (row) {
                        row.style.background = action === 'approve' ? 'var(--status-approved-bg)' : 'var(--status-rejected-bg)';
                        row.style.transition = 'opacity 0.4s';
                        row.style.opacity = '0';
                        setTimeout(() => row.remove(), 400);
                    }
                    
                    const reqObj = allRequests.find(r => r.id === requestId);
                    if (reqObj) reqObj.status = action === 'approve' ? 'APPROVED' : 'REJECTED';
                    filterTable();
                    lucide.createIcons();
                } else {
                    if (errSpan) {
                        errSpan.innerText = data.error || 'Failed to ' + action;
                        errSpan.style.display = 'block';
                    }
                    btnElement.innerHTML = originalHtml;
                    btnElement.disabled = false;
                }
            } catch (err) {
                if (errSpan) {
                    errSpan.innerText = 'Network error';
                    errSpan.style.display = 'block';
                }
                btnElement.innerHTML = originalHtml;
                btnElement.disabled = false;
            }
        }

        function renderManagerQueue() {
            const queueContainer = document.getElementById('manager_queue_container');
            const queueContent = document.getElementById('manager_queue_content');
            
            if (currentUser.role !== 'manager') {
                queueContainer.style.display = 'none';
                return;
            }
            
            queueContainer.style.display = 'block';

            const pending = allRequests.filter(r => r.status === 'PENDING' && r.employee_id !== currentUser.id);
            if (pending.length === 0) {
                queueContent.innerHTML = `<div class="empty-state" style="padding: 2rem; text-align: center; color: var(--text-muted); background: var(--card-bg); border: 1px solid var(--border); border-radius: var(--radius-card);"><i data-lucide="check-circle" style="width: 32px; height: 32px; margin: 0 auto 0.5rem auto; display: block; opacity: 0.5;"></i>You have no pending requests to approve.</div>`;
                return;
            }
            
            const grouped = {};
            pending.forEach(r => {
                if (!grouped[r.employee_name]) grouped[r.employee_name] = [];
                grouped[r.employee_name].push(r);
            });
            
            let html = '';
            for (const [empName, reqs] of Object.entries(grouped)) {
                html += `<div style="background: var(--card-bg); border: 1px solid var(--border); border-radius: var(--radius-card); margin-bottom: var(--sp-3); padding: var(--sp-3);">`;
                html += `<h3 style="margin-bottom: var(--sp-2);">${empName} &mdash; ${reqs.length} pending</h3>`;
                
                reqs.forEach(r => {
                    let startDisplay = r.start_date + (r.half_day_start ? ' (0.5)' : '');
                    let endDisplay = r.end_date + (r.half_day_end ? ' (0.5)' : '');
                    
                    html += `<div id="queue_row_${r.id}" style="display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-top: 1px solid var(--border);">
                        <div>
                            <div style="font-size: 14px; font-weight: 500; color: var(--primary-text); margin-bottom: 2px;">${startDisplay} &rarr; ${endDisplay} (${r.duration} days)</div>
                            <div style="font-size: 13px; color: var(--text-muted);">${r.reason}</div>
                            <div id="queue_err_${r.id}" class="inline-error"></div>
                        </div>
                        <div style="display: flex; gap: 8px;">
                            <button class="btn btn-outline" style="height: 36px; padding: 0 16px;" onclick="handleInlineAction(${r.id}, 'reject', this)">Reject</button>
                            <button class="btn btn-primary" style="height: 36px; padding: 0 16px;" onclick="handleInlineAction(${r.id}, 'approve', this)">Approve</button>
                        </div>
                    </div>`;
                });
                html += `</div>`;
            }
            queueContent.innerHTML = html;
        }

        function renderStatusTracker(status) {
            const isApproved = status === 'APPROVED';
            const isRejected = status === 'REJECTED';
            const isPending = status === 'PENDING';
            const isFinal = isApproved || isRejected;
            
            return `
                <div class="timeline">
                    <div class="timeline-step completed">
                        <div class="timeline-dot"><i data-lucide="check" style="width: 14px; height: 14px;"></i></div>
                        <div class="timeline-label">Submitted</div>
                        <div class="timeline-date"></div>
                    </div>
                    <div class="timeline-step ${isFinal ? 'completed' : 'active'}">
                        <div class="timeline-dot">
                            ${isFinal 
                                ? '<i data-lucide="check" style="width: 14px; height: 14px;"></i>' 
                                : '<i data-lucide="clock" style="width: 14px; height: 14px;"></i>'}
                        </div>
                        <div class="timeline-label">Under Review</div>
                        <div class="timeline-date"></div>
                    </div>
                    <div class="timeline-step ${isApproved ? 'completed' : isRejected ? 'rejected' : ''}">
                        <div class="timeline-dot">
                            ${isApproved 
                                ? '<i data-lucide="check" style="width: 14px; height: 14px;"></i>' 
                                : isRejected 
                                    ? '<i data-lucide="x" style="width: 14px; height: 14px;"></i>' 
                                    : ''}
                        </div>
                        <div class="timeline-label">${isApproved ? 'Approved' : isRejected ? 'Rejected' : 'Decision'}</div>
                        <div class="timeline-date"></div>
                    </div>
                </div>
            `;
        }

        function filterTable() {
            const searchTerm = document.getElementById('search_input').value.toLowerCase();
            const statusFilter = document.getElementById('status_filter').value;
            const tbody = document.getElementById('table_body');
            
            let filtered = allRequests.filter(req => {
                if (currentUser.role !== 'manager' && req.employee_id !== currentUser.id) return false;
                const matchesSearch = req.reason.toLowerCase().includes(searchTerm) || req.id.toString().includes(searchTerm) || req.employee_id.toString().includes(searchTerm) || (req.employee_name && req.employee_name.toLowerCase().includes(searchTerm));
                const matchesStatus = statusFilter === 'ALL' || req.status === statusFilter;
                return matchesSearch && matchesStatus;
            });

            filtered.sort((a, b) => b.id - a.id);
            tbody.innerHTML = '';
            
            if (filtered.length === 0) {
                tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state"><i data-lucide="inbox" style="margin: 0 auto 0.5rem auto; display: block; opacity: 0.5;"></i>No requests match your filters.</div></td></tr>`;
            } else {
                filtered.forEach(req => {
                    let startDisplay = req.start_date + (req.half_day_start ? ' <span style="color:var(--text-muted);font-size:0.75rem;">(0.5)</span>' : '');
                    let endDisplay = req.end_date + (req.half_day_end ? ' <span style="color:var(--text-muted);font-size:0.75rem;">(0.5)</span>' : '');
                    let statusBadge = `<span class="badge badge-${req.status.toLowerCase()}"><i data-lucide="${req.status === 'APPROVED'?'check':req.status==='REJECTED'?'x':'clock'}" style="width:12px;height:12px;"></i> ${req.status}</span>`;

                    tbody.innerHTML += `
                        <tr class="clickable-row" onclick="toggleTracker(${req.id})">
                            <td>#${req.id}</td>
                            <td>${req.employee_name}</td>
                            <td class="date-col">${startDisplay} &rarr; ${endDisplay} (${req.duration} days)</td>
                            <td>${req.reason}</td>
                            <td>${statusBadge}</td>
                        </tr>
                        <tr class="tracker-row" id="tracker_${req.id}">
                            <td colspan="5">
                                <div class="tracker-container">
                                    ${renderStatusTracker(req.status)}
                                </div>
                            </td>
                        </tr>
                    `;
                });
            }
            lucide.createIcons();
        }
        // ================= STARTUP =================
        window.onload = async () => {
            lucide.createIcons();
            const savedId = localStorage.getItem('entLeaveAppUserId');
            if (savedId) {
                try {
                    currentUser = await fetchUser(savedId);
                    initDashboard();
                } catch {
                    localStorage.removeItem('entLeaveAppUserId');
                }
            }
        };
    