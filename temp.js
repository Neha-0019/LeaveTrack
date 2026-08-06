
        // ================= GLOBAL STATE =================
        let currentUser = null;
        let allRequests = [];
        let sessionNotifications = [];

        // ================= UTILS & TOASTS =================
        function showToast(message, type = 'success') {
            const container = document.getElementById('toast_container');
            const toast = document.createElement('div');
            toast.className = `toast ${type}`;
            
            const icon = type === 'success' ? 'check-circle' : 'alert-circle';
            toast.innerHTML = `
                <i data-lucide="${icon}" style="margin-top: 2px;"></i>
                <div style="flex: 1;">
                    <div style="font-weight: 600; font-size: 14px; margin-bottom: 2px;">
                        ${type === 'success' ? 'Success' : 'Error'}
                    </div>
                    <div style="font-size: 13px; color: var(--text-secondary);">${message}</div>
                </div>
                <button class="btn btn-secondary btn-sm" style="padding: 0 4px; height: 24px; border: none;" onclick="this.parentElement.remove()">
                    <i data-lucide="x" style="width: 14px; height: 14px;"></i>
                </button>
            `;
            
            container.appendChild(toast);
            lucide.createIcons();
            
            // Animate in
            requestAnimationFrame(() => toast.classList.add('show'));
            
            setTimeout(() => {
                toast.classList.remove('show');
                setTimeout(() => toast.remove(), 300);
            }, 4000);
            
            // Add to session notifications
            sessionNotifications.unshift({ message, type, time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) });
        }

        // ================= AUTHENTICATION =================
        async function fetchUser(id) {
            try {
                const res = await fetch('/employees/' + id);
                if (res.ok) {
                    return await res.json();
                }
            } catch (e) {
                console.error("Failed to fetch user", e);
            }
            return null;
        }

        async function simulateLogin(id, name, role, balance) {
            document.getElementById('auth_error').innerText = '';
            const user = await fetchUser(id);
            if (!user) {
                document.getElementById('auth_error').innerText = 'User not found in database.';
                return;
            }
            
            currentUser = user;
            // Store token in session (demo only)
            currentUser.token = id === 1 ? 'manager-token-abc' : 'employee-token-xyz'; 
            
            document.getElementById('auth_screen').classList.add('hidden');
            document.getElementById('app_screen').classList.remove('hidden');
            
            initializeDashboard();
        }

        function logout() {
            currentUser = null;
            document.getElementById('app_screen').classList.add('hidden');
            document.getElementById('auth_screen').classList.remove('hidden');
        }

        // ================= NAVIGATION =================
        function navTo(section) {
            document.getElementById('sec_overview').classList.add('hidden');
            document.getElementById('sec_requests').classList.add('hidden');
            document.getElementById('sec_approvals').classList.add('hidden');
            document.getElementById('sec_settings').classList.add('hidden');
            
            document.getElementById('sec_' + section).classList.remove('hidden');
            
            document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
            document.getElementById('nav_' + section).classList.add('active');
            
            if (section === 'requests' || section === 'approvals' || section === 'overview') {
                loadDashboardData();
            }
        }

        // ================= INITIALIZATION & DATA FETCH =================
        async function initializeDashboard() {
            // Set User Details in UI
            const firstName = currentUser.name.split(' ')[0];
            document.getElementById('greeting').innerText = `Good morning, ${firstName}`;
            document.getElementById('sidebar_name').innerText = firstName;
            document.getElementById('sidebar_role').innerText = currentUser.role;
            document.getElementById('sidebar_avatar').innerText = firstName.charAt(0).toUpperCase();
            if(currentUser.role === 'manager') document.getElementById('sidebar_avatar').style.background = 'var(--brand-accent)';
            
            // Settings Profile
            document.getElementById('set_name').value = currentUser.name;
            document.getElementById('set_id').value = currentUser.id;
            document.getElementById('set_role').value = currentUser.role;
            document.getElementById('set_token').value = currentUser.token || 'N/A';
            
            if (currentUser.role === 'manager') {
                document.getElementById('nav_approvals').classList.remove('hidden');
            } else {
                document.getElementById('nav_approvals').classList.add('hidden');
            }
            
            navTo('overview');
        }
        
        function setTableLoadingState() {
            const skeletonRow = `<tr>
                <td><div class="skeleton" style="height: 20px; width: 40px;"></div></td>
                <td><div class="skeleton" style="height: 20px; width: 120px;"></div></td>
                <td><div class="skeleton" style="height: 20px; width: 160px;"></div></td>
                <td><div class="skeleton" style="height: 20px; width: 200px;"></div></td>
                <td><div class="skeleton" style="height: 28px; width: 80px; border-radius: var(--radius-full);"></div></td>
            </tr>`;
            
            document.getElementById('requests_tbody').innerHTML = skeletonRow.repeat(3);
            document.getElementById('recent_activity_tbody').innerHTML = skeletonRow.repeat(3);
        }

        async function loadDashboardData() {
            setTableLoadingState();
            
            try {
                // Refresh user balance
                currentUser = await fetchUser(currentUser.id) || currentUser;
                
                const res = await fetch('/leaves');
                if (res.ok) {
                    allRequests = await res.json();
                    
                    // Add calculated fields to requests
                    allRequests.forEach(req => {
                        req.employee_name = req.employee_id === 1 ? 'Alice Manager' : 'Bob Employee';
                        
                        const start = new Date(req.start_date);
                        const end = new Date(req.end_date);
                        let days = Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1;
                        if (req.half_day_start) days -= 0.5;
                        if (req.half_day_end && req.start_date !== req.end_date) days -= 0.5;
                        req.duration = days;
                    });
                    
                    // Sort by newest first
                    allRequests.sort((a, b) => b.id - a.id);
                    
                    renderKPIs();
                    renderRecentActivity();
                    renderTable();
                    renderManagerQueue();
                    lucide.createIcons();
                } else {
                    showToast('Failed to load data', 'error');
                }
            } catch (e) {
                showToast('Network error loading data', 'error');
            }
        }

        // ================= ANALYTICS & KPIs =================
        function renderKPIs() {
            const container = document.getElementById('kpi_container');
            
            if (currentUser.role === 'manager') {
                // Manager Dashboard
                const today = new Date().toISOString().split('T')[0];
                const teamRequests = allRequests.filter(r => r.employee_id !== currentUser.id);
                
                const pending = teamRequests.filter(r => r.status === 'PENDING').length;
                const approved = teamRequests.filter(r => r.status === 'APPROVED').length;
                const onLeaveToday = teamRequests.filter(r => r.status === 'APPROVED' && r.start_date <= today && r.end_date >= today).length;
                const approvalRate = teamRequests.length > 0 ? Math.round((approved / teamRequests.length) * 100) : 0;
                
                container.innerHTML = `
                    <div class="widget">
                        <span class="widget-label">On Leave Today</span>
                        <span class="widget-value">${onLeaveToday}</span>
                    </div>
                    <div class="widget">
                        <span class="widget-label">Pending Approvals</span>
                        <span class="widget-value">${pending}</span>
                    </div>
                    <div class="widget">
                        <span class="widget-label">Team Approval Rate</span>
                        <span class="widget-value">${approvalRate}%</span>
                    </div>
                `;
            } else {
                // Employee Dashboard
                const myReqs = allRequests.filter(r => r.employee_id === currentUser.id);
                const approvedDays = myReqs.filter(r => r.status === 'APPROVED').reduce((sum, r) => sum + r.duration, 0);
                const remaining = parseFloat(currentUser.leave_balance);
                const total = approvedDays + remaining;
                const usedPercent = total > 0 ? (approvedDays / total) * 100 : 0;
                
                container.innerHTML = `
                    <div class="widget" style="grid-column: span 2;">
                        <span class="widget-label">Annual Leave Balance</span>
                        <div class="flex justify-between items-center" style="margin-bottom: 4px;">
                            <span class="widget-value">${remaining} <span style="font-size: 14px; font-weight: 500; color: var(--text-secondary);">days remaining</span></span>
                            <span style="font-size: 14px; font-weight: 500; color: var(--text-secondary);">${approvedDays} days used</span>
                        </div>
                        <div class="progress-container">
                            <div class="progress-bar" style="width: ${usedPercent}%"></div>
                        </div>
                    </div>
                    <div class="widget">
                        <span class="widget-label">Pending Requests</span>
                        <span class="widget-value">${myReqs.filter(r => r.status === 'PENDING').length}</span>
                    </div>
                `;
            }
        }
        
        function renderRecentActivity() {
            const tbody = document.getElementById('recent_activity_tbody');
            // Show top 3 requests for the current user context
            let reqs = allRequests;
            if (currentUser.role !== 'manager') {
                reqs = allRequests.filter(r => r.employee_id === currentUser.id);
            }
            
            reqs = reqs.slice(0, 3);
            
            if (reqs.length === 0) {
                tbody.innerHTML = `<tr><td colspan="4"><div class="empty-state" style="padding: var(--sp-3);"><div class="empty-desc">No recent activity.</div></div></td></tr>`;
                return;
            }
            
            tbody.innerHTML = reqs.map(req => {
                return `<tr class="clickable" onclick="openDrawer(${req.id})">
                    <td>#${req.id}</td>
                    <td>${req.employee_name}</td>
                    <td>${req.start_date}</td>
                    <td>${getStatusBadge(req.status)}</td>
                </tr>`;
            }).join('');
        }

        // ================= MAIN REQUESTS TABLE =================
        function getStatusBadge(status) {
            if (status === 'APPROVED') return '<span class="badge approved"><i data-lucide="check" style="width: 12px; height: 12px;"></i> Approved</span>';
            if (status === 'REJECTED') return '<span class="badge rejected"><i data-lucide="x" style="width: 12px; height: 12px;"></i> Rejected</span>';
            return '<span class="badge pending"><i data-lucide="clock" style="width: 12px; height: 12px;"></i> Pending</span>';
        }

        function renderTable() {
            const tbody = document.getElementById('requests_tbody');
            const search = document.getElementById('search_input').value.toLowerCase();
            const statusFilter = document.getElementById('status_filter').value;
            
            let filtered = allRequests.filter(req => {
                if (currentUser.role !== 'manager' && req.employee_id !== currentUser.id) return false;
                
                if (statusFilter !== 'ALL' && req.status !== statusFilter) return false;
                
                if (search) {
                    const term = search;
                    return req.reason.toLowerCase().includes(term) || 
                           req.employee_name.toLowerCase().includes(term) ||
                           req.id.toString().includes(term);
                }
                return true;
            });
            
            if (filtered.length === 0) {
                tbody.innerHTML = `<tr><td colspan="5">
                    <div class="empty-state">
                        <i data-lucide="inbox"></i>
                        <div class="empty-title">No requests found</div>
                        <div class="empty-desc">Try adjusting your filters or search terms.</div>
                    </div>
                </td></tr>`;
            } else {
                tbody.innerHTML = filtered.map(req => {
                    return `<tr class="clickable" onclick="openDrawer(${req.id})">
                        <td>#${req.id}</td>
                        <td>
                            <div class="user-profile">
                                <div class="avatar" style="width: 28px; height: 28px; font-size: 11px;">${req.employee_name.charAt(0)}</div>
                                <span>${req.employee_name}</span>
                            </div>
                        </td>
                        <td>${req.start_date} &rarr; ${req.end_date} <br><span style="font-size: 12px; color: var(--text-secondary);">${req.duration} days</span></td>
                        <td><div style="max-width: 250px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${req.reason}</div></td>
                        <td>${getStatusBadge(req.status)}</td>
                    </tr>`;
                }).join('');
            }
            lucide.createIcons();
        }

        // ================= CSV EXPORT =================
        function exportCSV() {
            let csv = 'ID,Employee,Start Date,End Date,Duration,Reason,Status\n';
            let reqs = allRequests;
            if (currentUser.role !== 'manager') {
                reqs = allRequests.filter(r => r.employee_id === currentUser.id);
            }
            
            reqs.forEach(req => {
                csv += `${req.id},${req.employee_name},${req.start_date},${req.end_date},${req.duration},"${req.reason.replace(/"/g, '""')}",${req.status}\n`;
            });
            
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.setAttribute('hidden', '');
            a.setAttribute('href', url);
            a.setAttribute('download', 'LeaveTrack_Export.csv');
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            showToast('Export successful');
        }

        // ================= MANAGER QUEUE =================
        function renderManagerQueue() {
            const container = document.getElementById('approval_queue_container');
            if (currentUser.role !== 'manager') return;
            
            const pending = allRequests.filter(r => r.status === 'PENDING' && r.employee_id !== currentUser.id);
            
            if (pending.length === 0) {
                container.innerHTML = `
                    <div class="card">
                        <div class="empty-state" style="padding: var(--sp-8) var(--sp-4);">
                            <i data-lucide="check-circle" style="width: 64px; height: 64px; color: var(--status-approved-text); opacity: 0.8;"></i>
                            <div class="empty-title" style="font-size: 20px;">All caught up!</div>
                            <div class="empty-desc">You have zero pending leave requests to review.</div>
                        </div>
                    </div>`;
                return;
            }
            
            let html = '';
            // Group by employee
            const grouped = {};
            pending.forEach(req => {
                if(!grouped[req.employee_name]) grouped[req.employee_name] = [];
                grouped[req.employee_name].push(req);
            });
            
            for (const [emp, reqs] of Object.entries(grouped)) {
                html += `
                    <div class="card">
                        <div class="card-header" style="background: var(--bg-subtle);">
                            <div class="user-profile">
                                <div class="avatar">${emp.charAt(0)}</div>
                                <div>
                                    <div class="user-name">${emp}</div>
                                    <div class="user-role">${reqs.length} Pending Request(s)</div>
                                </div>
                            </div>
                        </div>
                        <div>
                `;
                
                reqs.forEach(req => {
                    html += `
                        <div style="padding: var(--sp-3); border-bottom: 1px solid var(--border-light); display: flex; justify-content: space-between; align-items: flex-start; gap: var(--sp-3);">
                            <div style="flex: 1;" class="clickable" onclick="openDrawer(${req.id})">
                                <div style="font-weight: 500; color: var(--text-primary); margin-bottom: 4px;">
                                    ${req.start_date} &rarr; ${req.end_date} <span style="color: var(--text-secondary); font-weight: 400;">(${req.duration} days)</span>
                                </div>
                                <div style="font-size: 13px; color: var(--text-secondary);">${req.reason}</div>
                            </div>
                            <div style="display: flex; gap: 8px;">
                                <button class="btn btn-danger btn-sm" id="btn_reject_${req.id}" onclick="handleApproval(${req.id}, 'reject', this)">Reject</button>
                                <button class="btn btn-primary btn-sm" id="btn_approve_${req.id}" onclick="handleApproval(${req.id}, 'approve', this)">Approve</button>
                            </div>
                        </div>
                    `;
                });
                
                html += `</div></div>`;
            }
            
            container.innerHTML = html;
        }

        async function handleApproval(id, action, btn) {
            if(event) event.stopPropagation();
            const originalHtml = btn.innerHTML;
            btn.innerHTML = '<i data-lucide="loader" class="spin" style="animation: spin 1s linear infinite;"></i>...';
            btn.disabled = true;
            lucide.createIcons();
            
            try {
                const res = await fetch(`/leaves/${id}/${action}`, {
                    method: 'POST',
                    headers: {
                        'Manager-Id': currentUser.id.toString(),
                        'Authorization': currentUser.token
                    }
                });
                
                const data = await res.json();
                if (res.ok) {
                    showToast(`Request ${action}d successfully.`);
                    loadDashboardData(); // Refresh everything
                } else {
                    showToast(data.error || 'Action failed', 'error');
                    btn.innerHTML = originalHtml;
                    btn.disabled = false;
                }
            } catch (err) {
                showToast('Network error', 'error');
                btn.innerHTML = originalHtml;
                btn.disabled = false;
            }
        }

        // ================= DRAWER & TIMELINE =================
        function getTimelineHtml(status) {
            const isApproved = status === 'APPROVED';
            const isRejected = status === 'REJECTED';
            const isFinal = isApproved || isRejected;
            
            return `
                <div class="timeline">
                    <div class="timeline-item completed">
                        <div class="timeline-dot"></div>
                        <div class="timeline-content">
                            <div class="timeline-title">Request Submitted</div>
                            <div class="timeline-desc">Pending manager review</div>
                        </div>
                    </div>
                    <div class="timeline-item ${isFinal ? 'completed' : ''}">
                        <div class="timeline-dot"></div>
                        <div class="timeline-content">
                            <div class="timeline-title">Manager Review</div>
                            <div class="timeline-desc">${isFinal ? 'Review completed' : 'Currently under review by your manager'}</div>
                        </div>
                    </div>
                    ${isFinal ? `
                    <div class="timeline-item ${isApproved ? 'completed' : 'rejected'}">
                        <div class="timeline-dot"></div>
                        <div class="timeline-content">
                            <div class="timeline-title">Final Decision</div>
                            <div class="timeline-desc">Request was <strong>${status}</strong></div>
                        </div>
                    </div>` : ''}
                </div>
            `;
        }

        function openDrawer(id) {
            const req = allRequests.find(r => r.id === id);
            if (!req) return;
            
            const content = document.getElementById('drawer_content');
            const footer = document.getElementById('drawer_footer');
            
            content.innerHTML = `
                <div style="margin-bottom: var(--sp-4);">
                    <div style="font-size: 13px; color: var(--text-secondary); margin-bottom: 4px;">Request ID</div>
                    <div style="font-weight: 600; font-size: 18px;">#${req.id}</div>
                </div>
                
                <div class="grid-2" style="margin-bottom: var(--sp-4);">
                    <div>
                        <div style="font-size: 13px; color: var(--text-secondary); margin-bottom: 4px;">Employee</div>
                        <div class="user-profile">
                            <div class="avatar" style="width: 24px; height: 24px; font-size: 10px;">${req.employee_name.charAt(0)}</div>
                            <span style="font-weight: 500;">${req.employee_name}</span>
                        </div>
                    </div>
                    <div>
                        <div style="font-size: 13px; color: var(--text-secondary); margin-bottom: 4px;">Current Status</div>
                        ${getStatusBadge(req.status)}
                    </div>
                </div>
                
                <div class="card" style="box-shadow: none;">
                    <div class="card-body">
                        <div class="grid-2" style="margin-bottom: var(--sp-3);">
                            <div>
                                <div style="font-size: 13px; color: var(--text-secondary);">Start Date</div>
                                <div style="font-weight: 500;">${req.start_date} ${req.half_day_start ? '(Half)' : ''}</div>
                            </div>
                            <div>
                                <div style="font-size: 13px; color: var(--text-secondary);">End Date</div>
                                <div style="font-weight: 500;">${req.end_date} ${req.half_day_end ? '(Half)' : ''}</div>
                            </div>
                        </div>
                        <div style="margin-bottom: var(--sp-3);">
                            <div style="font-size: 13px; color: var(--text-secondary);">Duration</div>
                            <div style="font-weight: 500;">${req.duration} Days</div>
                        </div>
                        <div>
                            <div style="font-size: 13px; color: var(--text-secondary); margin-bottom: 4px;">Reason</div>
                            <div style="padding: 12px; background: var(--bg-subtle); border-radius: var(--radius-sm); font-size: 13px;">
                                ${req.reason}
                            </div>
                        </div>
                    </div>
                </div>
                
                <div style="margin-top: var(--sp-4);">
                    <h3 style="margin-bottom: var(--sp-2);">Approval Workflow</h3>
                    ${getTimelineHtml(req.status)}
                </div>
            `;
            
            // Footer actions (only if pending and manager)
            if (currentUser.role === 'manager' && req.status === 'PENDING' && req.employee_id !== currentUser.id) {
                footer.innerHTML = `
                    <button class="btn btn-danger" onclick="handleApproval(${req.id}, 'reject', this); closeDrawer();">Reject</button>
                    <button class="btn btn-primary" onclick="handleApproval(${req.id}, 'approve', this); closeDrawer();">Approve Request</button>
                `;
                footer.style.display = 'flex';
            } else {
                footer.style.display = 'none';
            }
            
            document.getElementById('drawer_overlay').classList.add('open');
            document.getElementById('drawer').classList.add('open');
            lucide.createIcons();
        }

        function closeDrawer() {
            document.getElementById('drawer').classList.remove('open');
            document.getElementById('drawer_overlay').classList.remove('open');
        }

        // ================= MODAL & SUBMIT =================
        function openNewRequestModal() {
            document.getElementById('modal_overlay').classList.add('open');
            document.getElementById('start_date').value = '';
            document.getElementById('end_date').value = '';
            document.getElementById('reason').value = '';
            document.getElementById('half_day_start').checked = false;
            document.getElementById('half_day_end').checked = false;
        }

        function closeModal(e) {
            if (e) e.preventDefault();
            document.getElementById('modal_overlay').classList.remove('open');
        }

        async function submitLeave(e) {
            e.preventDefault();
            const btn = document.getElementById('btn_submit');
            const originalHtml = btn.innerHTML;
            btn.innerHTML = '<i data-lucide="loader" class="spin" style="animation: spin 1s linear infinite;"></i> Submitting...';
            btn.disabled = true;
            lucide.createIcons();
            
            const payload = {
                employee_id: currentUser.id,
                start_date: document.getElementById('start_date').value,
                end_date: document.getElementById('end_date').value,
                half_day_start: document.getElementById('half_day_start').checked,
                half_day_end: document.getElementById('half_day_end').checked,
                reason: document.getElementById('reason').value
            };

            try {
                const res = await fetch('/leaves', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                
                const data = await res.json();
                if (res.ok) {
                    showToast('Leave request submitted successfully.');
                    closeModal();
                    loadDashboardData();
                } else {
                    showToast(data.error || 'Submission failed.', 'error');
                }
            } catch (err) {
                showToast('Network error: ' + err.message, 'error');
            }
            
            btn.innerHTML = originalHtml;
            btn.disabled = false;
        }

        // Close dropdowns/drawers on esc
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                closeDrawer();
                closeModal();
            }
        });

        // Initialize icons
        lucide.createIcons();
    