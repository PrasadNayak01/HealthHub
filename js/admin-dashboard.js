const BASE = 'http://localhost:5001';

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
        document.getElementById('adminName').textContent = d.user.name;
        document.getElementById('bannerDate').innerHTML =
            `<div>${new Date().toLocaleDateString('en-IN', { weekday:'long', year:'numeric', month:'long', day:'numeric' })}</div>`;
        await loadDashboard();
    } catch {
        window.location.replace('/login.html');
    }
});

async function loadDashboard() {
    try {
        const r = await fetch(`${BASE}/api/admin/dashboard-stats`, { credentials: 'include' });
        const d = await r.json();
        if (!d.success) return;

        const { stats, recentUsers, monthlyRegistrations, appointmentsByStatus, appointmentsByMonth } = d;

        document.getElementById('s-patients').textContent     = stats.totalPatients.toLocaleString();
        document.getElementById('s-doctors').textContent      = stats.totalDoctors.toLocaleString();
        document.getElementById('s-appointments').textContent = stats.totalAppointments.toLocaleString();
        document.getElementById('s-revenue').textContent      = '₹' + parseFloat(stats.totalRevenue).toLocaleString('en-IN');
        document.getElementById('s-completed').textContent    = stats.completedAppointments.toLocaleString();
        document.getElementById('s-pending').textContent      = stats.pendingAppointments.toLocaleString();
        document.getElementById('s-documents').textContent    = stats.totalDocuments.toLocaleString();
        document.getElementById('s-today').textContent        = stats.todayRegistrations.toLocaleString();

        document.querySelectorAll('.stat-card').forEach(c => c.classList.remove('skeleton'));

        buildRegistrationChart(monthlyRegistrations || []);
        buildStatusChart(appointmentsByStatus || []);
        buildTrendChart(appointmentsByMonth || []);
        buildRecentUsersTable(recentUsers || []);
    } catch (e) {
        console.error('Dashboard load error:', e);
    }
}

function buildRegistrationChart(data) {
    if (!data.length) return;
    new Chart(document.getElementById('registrationChart'), {
        type: 'bar',
        data: {
            labels: data.map(d => d.m),
            datasets: [
                { label: 'Patients', data: data.map(d => d.patients), backgroundColor: '#818CF8', borderRadius: 4 },
                { label: 'Doctors',  data: data.map(d => d.doctors),  backgroundColor: '#34D399', borderRadius: 4 }
            ]
        },
        options: {
            responsive: true,
            plugins: { legend: { position: 'bottom' } },
            scales: { x: { grid: { display: false } }, y: { beginAtZero: true, ticks: { stepSize: 1 } } }
        }
    });
}

function buildStatusChart(data) {
    if (!data.length) return;
    const colorMap = { pending: '#FBBF24', completed: '#34D399', done: '#10B981', cancelled: '#F87171' };
    new Chart(document.getElementById('statusChart'), {
        type: 'doughnut',
        data: {
            labels: data.map(d => d.status),
            datasets: [{
                data: data.map(d => d.c),
                backgroundColor: data.map(d => colorMap[d.status] || '#94A3B8'),
                borderWidth: 0,
                hoverOffset: 4
            }]
        },
        options: { responsive: true, cutout: '60%', plugins: { legend: { position: 'bottom' } } }
    });
}

function buildTrendChart(data) {
    if (!data.length) return;
    new Chart(document.getElementById('aptTrendChart'), {
        type: 'line',
        data: {
            labels: data.map(d => d.m),
            datasets: [
                { label: 'Total',     data: data.map(d => d.c),         borderColor: '#4F46E5', backgroundColor: 'rgba(79,70,229,0.08)', tension: 0.4, fill: true, pointRadius: 4 },
                { label: 'Completed', data: data.map(d => d.completed),  borderColor: '#10B981', backgroundColor: 'rgba(16,185,129,0.05)', tension: 0.4, fill: true, pointRadius: 4 }
            ]
        },
        options: {
            responsive: true,
            plugins: { legend: { position: 'bottom' } },
            scales: { y: { beginAtZero: true }, x: { grid: { display: false } } }
        }
    });
}

function buildRecentUsersTable(users) {
    const tbody = document.getElementById('recentUsersTable');
    if (!users.length) {
        tbody.innerHTML = '<tr><td colspan="5" class="loading-row">No recent registrations</td></tr>';
        return;
    }
    tbody.innerHTML = users.map(u => `
        <tr>
            <td><span class="user-id-cell">${u.user_id}</span></td>
            <td>${u.name}</td>
            <td>${u.email}</td>
            <td><span class="role-badge ${u.role}">${u.role}</span></td>
            <td>${new Date(u.created_at).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })}</td>
        </tr>
    `).join('');
}

async function exportData(type) {
    try {
        const r = await fetch(`${BASE}/api/admin/export/${type}`, { credentials: 'include' });
        if (!r.ok) throw new Error('Export failed');
        const blob = await r.blob();
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `${type}_export_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(a.href);
    } catch {
        showAlert('error', 'Export Failed', 'Could not export data. Please try again.');
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
    document.getElementById('alertIcon').className  = `custom-alert-icon ${type}`;
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

document.getElementById('customAlert').addEventListener('click', function(e) {
    if (e.target === this) closeAlert();
});