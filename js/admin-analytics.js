const BASE = 'http://localhost:5001';
let charts = {};

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

        const today        = new Date();
        const sixMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 6, 1);
        document.getElementById('endDate').value   = today.toISOString().split('T')[0];
        document.getElementById('startDate').value = sixMonthsAgo.toISOString().split('T')[0];

        await Promise.all([
            loadDemographics(),
            loadAppointmentAnalytics(),
            loadDoctorAnalytics(),
            loadResearch()
        ]);
    } catch {
        window.location.replace('/login.html');
    }
});

// ── Chart helper — always destroys old instance before creating new ──────────

function mkChart(id, type, data, options) {
    const canvas = document.getElementById(id);
    if (!canvas) return;

    // Destroy any existing instance (own registry + Chart.js registry)
    if (charts[id]) { charts[id].destroy(); delete charts[id]; }
    const existing = Chart.getChart(canvas);
    if (existing) existing.destroy();

    charts[id] = new Chart(canvas, {
        type,
        data,
        options: {
            responsive: true,
            maintainAspectRatio: false,   // ← the key change
            ...options
        }
    });
}

// ── Demographics ─────────────────────────────────────────────────────────────

async function loadDemographics() {
    try {
        const r = await fetch(`${BASE}/api/admin/analytics/demographics`, { credentials: 'include' });
        const d = await r.json();
        if (!d.success) { console.error('Demographics failed:', d.message); return; }
        const { gender, ageGroups, bloodGroups, weightCategories, diseaseBurden, allergyFrequency, profileCompletion } = d.demographics;

        const PIE_COLORS = ['#818CF8','#34D399','#F472B6','#FBBF24','#60A5FA','#A78BFA','#4ADE80','#FB7185'];

        // Gender
        if (gender && gender.length) {
            mkChart('genderChart', 'doughnut',
                { labels: gender.map(g => g.gender), datasets: [{ data: gender.map(g => g.count), backgroundColor: PIE_COLORS, borderWidth: 0, hoverOffset: 4 }] },
                { cutout: '55%', plugins: { legend: { position: 'bottom' } } }
            );
        }

        // Age Groups — FIXED: uses group_label from the fixed SQL subquery
        if (ageGroups && ageGroups.length) {
            mkChart('ageChart', 'bar',
                { labels: ageGroups.map(a => a.group_label), datasets: [{ label: 'Patients', data: ageGroups.map(a => a.count), backgroundColor: '#818CF8', borderRadius: 6 }] },
                { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true }, x: { grid: { display: false } } } }
            );
        }

        // Blood Groups
        if (bloodGroups && bloodGroups.length) {
            mkChart('bloodChart', 'doughnut',
                { labels: bloodGroups.map(b => b.blood_group), datasets: [{ data: bloodGroups.map(b => b.count), backgroundColor: PIE_COLORS, borderWidth: 0, hoverOffset: 4 }] },
                { cutout: '55%', plugins: { legend: { position: 'bottom' } } }
            );
        }

        // Weight
        if (weightCategories && weightCategories.length) {
            mkChart('weightChart', 'bar',
                { labels: weightCategories.map(w => w.category), datasets: [{ label: 'Patients', data: weightCategories.map(w => w.count), backgroundColor: ['#34D399','#60A5FA','#FBBF24','#F87171'], borderRadius: 6 }] },
                { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true }, x: { grid: { display: false } } } }
            );
        }

        // Profile Completion
        if (profileCompletion) {
            mkChart('profileChart','doughnut',
                { labels:['Complete','Incomplete'], datasets:[{ data:[profileCompletion.complete, profileCompletion.incomplete], backgroundColor:['#34D399','#FCA5A5'], borderWidth:0 }] },
                { cutout:'55%', plugins:{ legend:{ position:'bottom' } } }
            );
        }

        // Disease Burden
        if (diseaseBurden && diseaseBurden.length) {
            mkChart('diseaseChart', 'bar',
                { labels: diseaseBurden.slice(0, 12).map(d => d.disease), datasets: [{ label: 'Patients', data: diseaseBurden.slice(0, 12).map(d => d.patients), backgroundColor: '#F87171', borderRadius: 4 }] },
                { indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true }, y: { grid: { display: false } } } }
            );
        }   
    } catch (e) {
        console.error('Demographics error:', e);
    }
}

// ── Research ─────────────────────────────────────────────────────────────────

async function loadResearch() {
    try {
        const r = await fetch(`${BASE}/api/admin/research`, { credentials: 'include' });
        const d = await r.json();
        if (!d.success) { console.error('Research failed:', d.message); return; }
        const { clinicalDisease } = d.research;

        if (clinicalDisease && clinicalDisease.length) {
            mkChart('clinicalChart', 'bar',
                { labels: clinicalDisease.slice(0, 12).map(d => d.disease), datasets: [{ label: 'Mentions', data: clinicalDisease.slice(0, 12).map(d => d.clinicalMentions), backgroundColor: '#FB923C', borderRadius: 4 }] },
                { indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true }, y: { grid: { display: false } } } }
            );
        }
    } catch (e) {
        console.error('Research error:', e);
    }
}

// ── Appointment Analytics ────────────────────────────────────────────────────

async function loadAppointmentAnalytics(start, end) {
    // Destroy all appointment charts before fetching new data
    ['dayChart','hourChart','specialtyChart','monthlyAptChart'].forEach(id => {
        if (charts[id]) { charts[id].destroy(); delete charts[id]; }
        const canvas = document.getElementById(id);
        if (canvas) {
            const existing = Chart.getChart(canvas);
            if (existing) existing.destroy();
        }
    });

    try {
        const qs = start && end ? `?startDate=${start}&endDate=${end}` : '';
        const r = await fetch(`${BASE}/api/admin/analytics/appointments${qs}`, { credentials: 'include' });
        const d = await r.json();
        if (!d.success) { console.error('Appointment analytics failed:', d.message); return; }
        const { byDay, bySpecialty, byMonth, byHour } = d.analytics;

        const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

        if (byDay && byDay.length) {
            const dayMap = Object.fromEntries(byDay.map(d => [d.day, d.count]));
            mkChart('dayChart', 'bar',
                { labels: DAYS, datasets: [{ label: 'Appointments', data: DAYS.map(dy => dayMap[dy] || 0), backgroundColor: '#818CF8', borderRadius: 6 }] },
                { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true }, x: { grid: { display: false } } } }
            );
        }

        if (byHour && byHour.length) {
            mkChart('hourChart', 'line',
                { labels: byHour.map(h => h.hour), datasets: [{ label: 'Appointments', data: byHour.map(h => h.count), borderColor: '#4F46E5', backgroundColor: 'rgba(79,70,229,0.08)', tension: 0.4, fill: true, pointRadius: 4 }] },
                { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true }, x: { grid: { display: false } } } }
            );
        }

        if (bySpecialty && bySpecialty.length) {
            mkChart('specialtyChart', 'bar',
                { labels: bySpecialty.map(s => s.speciality), datasets: [{ label: 'Appointments', data: bySpecialty.map(s => s.count), backgroundColor: '#34D399', borderRadius: 4 }] },
                { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true }, x: { grid: { display: false } } } }
            );
        }

        if (byMonth && byMonth.length) {
            mkChart('monthlyAptChart', 'line',
                { labels: byMonth.map(m => m.month), datasets: [
                    { label: 'Total', data: byMonth.map(m => m.total), borderColor: '#4F46E5', backgroundColor: 'rgba(79,70,229,0.08)', tension: 0.4, fill: true, pointRadius: 4 },
                    { label: 'Completed', data: byMonth.map(m => m.completed), borderColor: '#10B981', backgroundColor: 'rgba(16,185,129,0.05)', tension: 0.4, fill: true, pointRadius: 4 }
                ]},
                { plugins: { legend: { position: 'bottom' } }, scales: { y: { beginAtZero: true }, x: { grid: { display: false } } } }
            );
        }
    } catch (e) {
        console.error('Appointment analytics error:', e);
    }
}

// ── Doctor Analytics ─────────────────────────────────────────────────────────

async function loadDoctorAnalytics() {
    try {
        const r = await fetch(`${BASE}/api/admin/analytics/doctors`, { credentials: 'include' });
        const d = await r.json();
        if (!d.success) { console.error('Doctor analytics failed:', d.message); return; }
        const tbody = document.getElementById('doctorTable');
        if (!d.doctors.length) {
            tbody.innerHTML = '<tr><td colspan="8" class="loading-row">No doctors found</td></tr>';
            return;
        }
        tbody.innerHTML = d.doctors.map(doc => {
            const rate = doc.total_appointments > 0 ? Math.round(doc.completed / doc.total_appointments * 100) : 0;
            const rateClass = rate >= 75 ? 'rate-high' : rate >= 40 ? 'rate-mid' : 'rate-low';
            return `
            <tr>
                <td><strong>${doc.name}</strong><br><span style="font-size:0.75rem;color:#9ca3af">${doc.email}</span></td>
                <td>${doc.speciality || '—'}</td>
                <td>${doc.experience || '—'}y</td>
                <td style="text-align:center">${doc.total_appointments}</td>
                <td style="text-align:center">${doc.completed || 0}</td>
                <td style="text-align:center">${doc.unique_patients}</td>
                <td style="text-align:center"><span class="completion-rate ${rateClass}">${rate}%</span></td>
                <td>₹${parseFloat(doc.revenue || 0).toLocaleString('en-IN')}</td>
            </tr>`;
        }).join('');
    } catch (e) {
        console.error('Doctor analytics error:', e);
    }
}

// ── Date filter ───────────────────────────────────────────────────────────────

function applyDateFilter() {
    const start = document.getElementById('startDate').value;
    const end   = document.getElementById('endDate').value;
    if (!start || !end) { showAlert('warning', 'Date Required', 'Please select both start and end dates.'); return; }
    if (new Date(start) > new Date(end)) { showAlert('warning', 'Invalid Range', 'Start date must be before end date.'); return; }
    loadAppointmentAnalytics(start, end);
}

// ── Exports ───────────────────────────────────────────────────────────────────

function exportResearchData(type) {
    exportData(type === 'disease' ? 'patients' : 'appointments');
}

async function exportData(type) {
    try {
        const r = await fetch(`${BASE}/api/admin/export/${type}`, { credentials: 'include' });
        if (!r.ok) { showAlert('error', 'Export Failed', 'Server error during export.'); return; }
        const blob = await r.blob();
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `${type}_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(a.href);
    } catch (e) {
        showAlert('error', 'Export Failed', 'Could not download data.');
    }
}

// ── Misc ──────────────────────────────────────────────────────────────────────

function confirmLogout() {
    showAlert('warning', 'Confirm Logout', 'Are you sure?', true, async () => {
        await fetch(`${BASE}/logout`, { method: 'POST', credentials: 'include' });
        window.location.replace('/login.html');
    });
}

function toggleSidebar() { document.getElementById('sidebar').classList.toggle('open'); }

function showAlert(type, title, message, confirm = false, onConfirm = null) {
    document.getElementById('alertIcon').className = `custom-alert-icon ${type}`;
    document.getElementById('alertIcon').textContent = type === 'success' ? '✓' : type === 'error' ? '✕' : '⚠';
    document.getElementById('alertTitle').textContent = title;
    document.getElementById('alertMessage').textContent = message;
    document.getElementById('alertButtons').innerHTML = confirm
        ? `<button class="custom-alert-button secondary" onclick="closeAlert()">Cancel</button>
           <button class="custom-alert-button primary" id="cBtn">Confirm</button>`
        : `<button class="custom-alert-button primary" onclick="closeAlert()">OK</button>`;
    if (confirm && onConfirm) document.getElementById('cBtn').onclick = () => { closeAlert(); onConfirm(); };
    document.getElementById('customAlert').style.display = 'block';
}

function closeAlert() { document.getElementById('customAlert').style.display = 'none'; }