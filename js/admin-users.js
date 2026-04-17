const BASE = 'http://localhost:5001';
let currentPage = 1, currentRole = 'all', currentSearch = '', searchTimeout;

window.addEventListener('load', async () => {
    document.body.style.visibility = 'hidden';
    try {
        const r = await fetch(`${BASE}/api/current-user`, { credentials: 'include' });
        if (!r.ok) { window.location.replace('/login.html'); return; }
        const d = await r.json();
        if (!d.success || !d.user || d.user.role !== 'admin') {
            window.location.replace('/login.html'); return;
        }
        document.body.style.visibility = 'visible';

        const params = new URLSearchParams(window.location.search);
        const roleParam = params.get('role');
        if (roleParam && ['patient', 'doctor'].includes(roleParam)) {
            currentRole = roleParam;
            const activeTab = document.querySelector(`[data-role="${roleParam}"]`);
            if (activeTab) {
                document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
                activeTab.classList.add('active');
            }
        }
        await loadUsers();                  // ← the missing call that was just a comment before
    } catch {
        window.location.replace('/login.html');
    }
});

async function loadUsers() {
    const tbody = document.getElementById('usersTable');
    tbody.innerHTML = '<tr><td colspan="9" class="loading-row">Loading users…</td></tr>';
    try {
        const url = `${BASE}/api/admin/users?role=${currentRole}&search=${encodeURIComponent(currentSearch)}&page=${currentPage}&limit=25`;
        const r = await fetch(url, { credentials: 'include' });
        const d = await r.json();
        if (!d.success) throw new Error(d.message || 'Failed to load users');
        renderUsers(d.users);
        renderPagination(d.pagination);
        document.getElementById('totalCount').textContent =
            `Showing ${d.users.length} of ${d.pagination.total} user${d.pagination.total !== 1 ? 's' : ''}`;
    } catch (e) {
        document.getElementById('usersTable').innerHTML =
            `<tr><td colspan="9" class="loading-row" style="color:#ef4444">Error: ${e.message}</td></tr>`;
    }
}

function renderUsers(users) {
    const tbody = document.getElementById('usersTable');
    if (!users.length) {
        tbody.innerHTML = '<tr><td colspan="9" class="loading-row">No users found</td></tr>';
        return;
    }
    tbody.innerHTML = users.map(u => {
        const extra = u.role === 'doctor'
            ? (u.speciality || '—')
            : u.role === 'patient'
                ? (u.age ? `${u.age}y / ${u.gender || '?'} / ${u.blood_group || '?'}` : 'Profile incomplete')
                : '—';
        return `
        <tr>
            <td><span class="user-id-cell">${u.user_id}</span></td>
            <td><strong>${u.name}</strong></td>
            <td>${u.email}</td>
            <td>${u.phone || '—'}</td>
            <td><span class="role-badge ${u.role}">${u.role}</span></td>
            <td style="font-size:0.8rem;color:#6b7280">${extra}</td>
            <td style="text-align:center">${u.appointment_count || 0}</td>
            <td style="font-size:0.8rem;color:#6b7280">${new Date(u.created_at).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })}</td>
            <td>
                <button class="btn-view-user"   onclick="viewUser('${u.user_id}')">View</button>
                <button class="btn-delete-user" onclick="deleteUser('${u.user_id}', '${u.name.replace(/'/g,"\\'")}')">Delete</button>
            </td>
        </tr>`;
    }).join('');
}

function renderPagination({ total, page, limit, totalPages }) {
    const cont = document.getElementById('pagination');
    if (totalPages <= 1) { cont.innerHTML = ''; return; }
    let html = `<button class="page-btn" onclick="goPage(${page - 1})" ${page <= 1 ? 'disabled' : ''}>‹</button>`;
    const start = Math.max(1, page - 2);
    const end   = Math.min(totalPages, page + 2);
    for (let i = start; i <= end; i++) {
        html += `<button class="page-btn ${i === page ? 'active' : ''}" onclick="goPage(${i})">${i}</button>`;
    }
    html += `<button class="page-btn" onclick="goPage(${page + 1})" ${page >= totalPages ? 'disabled' : ''}>›</button>`;
    cont.innerHTML = html;
}

function goPage(p) { currentPage = p; loadUsers(); }

function setRoleFilter(role, el) {
    currentRole = role;
    currentPage = 1;
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    if (el) el.classList.add('active');
    else document.querySelector(`[data-role="${role}"]`)?.classList.add('active');
    loadUsers();
}

function debounceSearch() {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        currentSearch = document.getElementById('searchInput').value.trim();
        currentPage   = 1;
        loadUsers();
    }, 350);
}

async function viewUser(userId) {
    document.getElementById('userModal').classList.add('active');
    document.getElementById('modalBody').innerHTML =
        '<p style="text-align:center;padding:2rem;color:#9ca3af">Loading…</p>';
    try {
        const r = await fetch(`${BASE}/api/admin/users/${userId}`, { credentials: 'include' });
        const d = await r.json();
        if (!d.success) throw new Error(d.message);
        const { user, profile, appointmentCount } = d;
        document.getElementById('modalTitle').textContent = user.name;

        let profileHtml = '';
        if (user.role === 'doctor' && profile) {
            profileHtml = `
                <div class="detail-section"><h4>Professional Details</h4>
                <div class="detail-grid">
                    <div class="detail-item"><label>Speciality</label><span>${profile.speciality || '—'}</span></div>
                    <div class="detail-item"><label>Degree</label><span>${profile.degree || '—'}</span></div>
                    <div class="detail-item"><label>Experience</label><span>${profile.experience || '—'} years</span></div>
                    <div class="detail-item"><label>Consultation Fee</label><span>₹${profile.consultation_fee || '—'}</span></div>
                </div>
                ${profile.address ? `<div class="detail-item" style="margin-top:.75rem"><label>Address</label><span>${profile.address}</span></div>` : ''}
                ${profile.bio     ? `<div class="detail-item" style="margin-top:.75rem"><label>Bio</label><span style="font-size:.85rem">${profile.bio}</span></div>` : ''}
                </div>`;
        } else if (user.role === 'patient' && profile) {
            profileHtml = `
                <div class="detail-section"><h4>Health Details</h4>
                <div class="detail-grid">
                    <div class="detail-item"><label>Age</label><span>${profile.age || '—'}</span></div>
                    <div class="detail-item"><label>Gender</label><span>${profile.gender || '—'}</span></div>
                    <div class="detail-item"><label>Blood Group</label><span>${profile.blood_group || '—'}</span></div>
                    <div class="detail-item"><label>Weight / Height</label><span>${profile.weight || '?'}kg / ${profile.height || '?'}cm</span></div>
                </div>
                ${profile.medical_history ? `<div class="detail-item" style="margin-top:.75rem"><label>Medical History</label><span style="font-size:.85rem">${profile.medical_history}</span></div>` : ''}
                ${profile.allergies       ? `<div class="detail-item" style="margin-top:.5rem"><label>Allergies</label><span style="font-size:.85rem">${profile.allergies}</span></div>` : ''}
                </div>`;
        }

        document.getElementById('modalBody').innerHTML = `
            <div class="detail-grid">
                <div class="detail-item"><label>User ID</label><span style="font-family:monospace;font-size:.8rem">${user.user_id}</span></div>
                <div class="detail-item"><label>Role</label><span><span class="role-badge ${user.role}">${user.role}</span></span></div>
                <div class="detail-item"><label>Email</label><span>${user.email}</span></div>
                <div class="detail-item"><label>Phone</label><span>${user.phone || '—'}</span></div>
                <div class="detail-item"><label>Appointments</label><span>${appointmentCount}</span></div>
                <div class="detail-item"><label>Registered</label><span>${new Date(user.created_at).toLocaleDateString('en-IN', { day:'numeric', month:'long', year:'numeric' })}</span></div>
            </div>
            ${profileHtml}`;
    } catch (e) {
        document.getElementById('modalBody').innerHTML =
            `<p style="color:#ef4444;padding:1rem">Error: ${e.message}</p>`;
    }
}

function closeUserModal() { document.getElementById('userModal').classList.remove('active'); }

function deleteUser(userId, name) {
    showAlert('warning', 'Delete User', `Permanently delete "${name}"? This cannot be undone.`, true, async () => {
        try {
            const r = await fetch(`${BASE}/api/admin/users/${userId}`, {
                method: 'DELETE', credentials: 'include'
            });
            const d = await r.json();
            if (d.success) { showAlert('success', 'Deleted', 'User deleted successfully.'); loadUsers(); }
            else showAlert('error', 'Error', d.message || 'Delete failed.');
        } catch {
            showAlert('error', 'Error', 'Failed to delete user.');
        }
    });
}

function exportCurrentView() {
    const type = currentRole === 'doctor' ? 'doctors' : 'patients';
    exportData(type);
}

async function exportData(type) {
    try {
        const r = await fetch(`${BASE}/api/admin/export/${type}`, { credentials: 'include' });
        if (!r.ok) throw new Error('Export failed');
        const blob = await r.blob();
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `${type}_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(a.href);
    } catch {
        showAlert('error', 'Export Failed', 'Could not download data.');
    }
}

function confirmLogout() {
    showAlert('warning', 'Confirm Logout', 'Are you sure you want to logout?', true, async () => {
        await fetch(`${BASE}/logout`, { method: 'POST', credentials: 'include' });
        window.location.replace('/login.html');
    });
}

function toggleSidebar() { document.getElementById('sidebar').classList.toggle('open'); }

function showAlert(type, title, message, confirm = false, onConfirm = null) {
    document.getElementById('alertIcon').className   = `custom-alert-icon ${type}`;
    document.getElementById('alertIcon').textContent = type === 'success' ? '✓' : type === 'error' ? '✕' : '⚠';
    document.getElementById('alertTitle').textContent   = title;
    document.getElementById('alertMessage').textContent = message;
    document.getElementById('alertButtons').innerHTML   = confirm
        ? `<button class="custom-alert-button secondary" onclick="closeAlert()">Cancel</button>
           <button class="custom-alert-button primary" id="confirmBtn">Confirm</button>`
        : `<button class="custom-alert-button primary" onclick="closeAlert()">OK</button>`;
    if (confirm && onConfirm) {
        document.getElementById('confirmBtn').onclick = () => { closeAlert(); onConfirm(); };
    }
    document.getElementById('customAlert').style.display = 'block';
}

function closeAlert() { document.getElementById('customAlert').style.display = 'none'; }

document.getElementById('userModal').addEventListener('click', function(e) {
    if (e.target === this) closeUserModal();
});
document.getElementById('customAlert').addEventListener('click', function(e) {
    if (e.target === this) closeAlert();
});