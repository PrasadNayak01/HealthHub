let currentDoctor = null;
let selectedFiles = [];
let currentAppointmentId = null;

window.addEventListener('load', async () => {
    try {
        const response = await fetch('http://localhost:5001/api/current-user', { credentials: 'include' });
        if (response.ok) {
            const data = await response.json();
            if (data.success && data.user) {
                if (data.user.role !== 'doctor') {
                    window.location.replace('/login.html');
                    return;
                }
                currentDoctor = data.user;
                loadAppointments();
            }
        } else {
            window.location.replace('/login.html');
        }
    } catch (error) {
        window.location.replace('/login.html');
    }
});

async function loadAppointments() {
    try {
        const loadingSpinner = document.getElementById('loadingSpinner');
        const appointmentsList = document.getElementById('appointmentsList');
        loadingSpinner.style.display = 'flex';
        const existingGroups = appointmentsList.querySelectorAll('.date-group, .empty-state');
        existingGroups.forEach(el => el.remove());

        const response = await fetch('http://localhost:5001/api/appointments', { credentials: 'include' });
        const data = await response.json();
        loadingSpinner.style.display = 'none';
        if (response.ok && data.success) {
            displayAppointments(data.appointments);
        }
    } catch (error) {
        document.getElementById('loadingSpinner').style.display = 'none';
    }
}

function displayAppointments(appointments) {
    const listDiv = document.getElementById('appointmentsList');
    Array.from(listDiv.children).forEach(child => {
        if (child.id !== 'loadingSpinner') child.remove();
    });

    if (appointments.length === 0) {
        const emptyDiv = document.createElement('div');
        emptyDiv.className = 'empty-state';
        emptyDiv.innerHTML = '<p>No appointments yet. Patients will appear here once they book.</p>';
        listDiv.appendChild(emptyDiv);
        return;
    }

    const groupedByDate = {};
    appointments.forEach(apt => {
        const dateStr = apt.appointment_date.split('T')[0];
        if (!groupedByDate[dateStr]) groupedByDate[dateStr] = [];
        groupedByDate[dateStr].push(apt);
    });

    Object.keys(groupedByDate).forEach(dateStr => {
        groupedByDate[dateStr].sort((a, b) => {
            if (!a.appointment_time && !b.appointment_time) return 0;
            if (!a.appointment_time) return 1;
            if (!b.appointment_time) return -1;
            return a.appointment_time.localeCompare(b.appointment_time);
        });
    });

    const sortedDates = Object.keys(groupedByDate).sort((a, b) => new Date(a) - new Date(b));

    sortedDates.forEach(dateStr => {
        const apts = groupedByDate[dateStr];
        const [year, month, day] = dateStr.split('-').map(Number);
        const dateObj = new Date(year, month - 1, day);
        const formattedDate = dateObj.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

        const dateGroupDiv = document.createElement('div');
        dateGroupDiv.className = 'date-group';
        dateGroupDiv.innerHTML =
            '<div class="date-header">' +
            '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zM7 12h5v5H7z"/></svg>' +
            '<h2>' + formattedDate + '</h2>' +
            '</div>' +
            apts.map(apt => createAppointmentCard(apt)).join('');

        listDiv.appendChild(dateGroupDiv);
    });
}

function createAppointmentCard(apt) {
    const paymentStatus = apt.payment_status || 'pending';
    const paymentMethod = apt.payment_method || null;
    const isCompleted = apt.status === 'completed' || apt.status === 'done';

    let paymentBadgeClass = 'badge-pending';
    let paymentText = '';

    if (paymentStatus === 'paid') {
        paymentBadgeClass = 'badge-paid';
        if (paymentMethod === 'online') {
            paymentText = '&#10003; Paid (Online)';
        } else if (paymentMethod === 'cash') {
            paymentText = '&#10003; Paid (Cash)';
        } else {
            paymentText = '&#10003; Paid';
        }
    } else {
        if (paymentMethod === 'cash') {
            paymentText = '&#9203; Cash &ndash; Pending';
        } else {
            paymentText = '&#9203; Unpaid';
        }
    }

    let actionsHtml = '';
    if (apt.status === 'pending') {
        const cashBtn = (paymentMethod === 'cash' && paymentStatus === 'pending')
            ? '<button class="btn-cash-paid" onclick="markCashPaid(\'' + apt.appointment_id + '\')">&#128181; Mark Cash Received</button>'
            : '';
        actionsHtml =
            '<div class="appointment-actions">' +
            cashBtn +
            '<button class="btn-done" onclick="showUploadModal(\'' + apt.appointment_id + '\', \'' + apt.patient_id + '\', \'' + apt.patient_name.replace(/'/g, "\\'") + '\')">Complete Appointment</button>' +
            '<button class="btn-delete" onclick="deleteAppointment(\'' + apt.appointment_id + '\')">Delete</button>' +
            '</div>';
    }

    return '<div class="appointment-card ' + (isCompleted ? 'completed' : '') + '">' +
        '<div class="appointment-header">' +
        '<div class="appointment-info">' +
        '<h3>' + apt.patient_name + '</h3>' +
        '<p class="appointment-id">' + apt.patient_id + '</p>' +
        '</div>' +
        (apt.appointment_time ? '<div class="appointment-time">&#128336; ' + apt.appointment_time + '</div>' : '') +
        '</div>' +
        '<div class="appointment-details">' +
        '<div class="detail"><strong>Email</strong><span>' + apt.patient_email + '</span></div>' +
        '<div class="detail"><strong>Phone</strong><span>' + apt.patient_phone + '</span></div>' +
        '<div class="detail"><strong>Age</strong><span>' + (apt.patient_age || 'N/A') + '</span></div>' +
        '<div class="detail"><strong>Gender</strong><span>' + (apt.patient_gender || 'N/A') + '</span></div>' +
        '<div class="detail"><strong>Blood Group</strong><span>' + (apt.patient_blood_group || 'N/A') + '</span></div>' +
        '<div class="detail"><strong>Status</strong><span style="color:' + (isCompleted ? '#10b981' : '#f59e0b') + ';font-weight:600;">' + apt.status.charAt(0).toUpperCase() + apt.status.slice(1) + '</span></div>' +
        '<div class="detail"><strong>Payment</strong><span class="payment-badge ' + paymentBadgeClass + '">' + paymentText + '</span></div>' +
        '</div>' +
        actionsHtml +
        '</div>';
}

async function markCashPaid(appointmentId) {
    try {
        const res = await fetch('http://localhost:5001/api/payment/record-cash', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ appointmentId })
        });
        const data = await res.json();
        if (data.success) {
            showAlert('success', 'Payment Recorded', 'Cash payment marked as received.');
            await loadAppointments();
        } else {
            showAlert('warning', 'Error', data.message || 'Failed to record payment.');
        }
    } catch (e) {
        showAlert('warning', 'Error', 'Something went wrong.');
    }
}

function showUploadModal(appointmentId, patientId, patientName) {
    currentAppointmentId = appointmentId;
    document.getElementById('modalPatientId').textContent = patientId;
    document.getElementById('modalPatientName').textContent = patientName;
    document.getElementById('uploadModal').style.display = 'block';
    selectedFiles = [];
    document.getElementById('selectedFiles').innerHTML = '';
    document.getElementById('appointmentNotes').value = '';
}

function closeUploadModal() {
    document.getElementById('uploadModal').style.display = 'none';
    currentAppointmentId = null;
    selectedFiles = [];
}

function handleFileSelect() {
    const fileInput = document.getElementById('fileInput');
    const files = Array.from(fileInput.files);
    files.forEach(file => {
        if (file.size > 10 * 1024 * 1024) { showAlert('warning', 'File Too Large', file.name + ' exceeds 10MB limit'); return; }
        selectedFiles.push(file);
    });
    displaySelectedFiles();
    fileInput.value = '';
}

function displaySelectedFiles() {
    const container = document.getElementById('selectedFiles');
    if (selectedFiles.length === 0) { container.innerHTML = ''; return; }
    container.innerHTML = selectedFiles.map((file, index) =>
        '<div class="file-item">' +
        '<div class="file-info">' +
        '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11z"/></svg>' +
        '<div><div class="file-name">' + file.name + '</div><div class="file-size">' + (file.size / 1024).toFixed(2) + ' KB</div></div>' +
        '</div>' +
        '<button class="remove-file" onclick="removeFile(' + index + ')">Remove</button>' +
        '</div>'
    ).join('');
}

function removeFile(index) {
    selectedFiles.splice(index, 1);
    displaySelectedFiles();
}

async function completeAppointment() {
    const notes = document.getElementById('appointmentNotes').value.trim();
    try {
        const formData = new FormData();
        formData.append('appointmentId', currentAppointmentId);
        formData.append('notes', notes);
        selectedFiles.forEach(file => formData.append('documents', file));

        const response = await fetch('http://localhost:5001/api/appointments/complete', {
            method: 'POST', credentials: 'include', body: formData
        });
        const data = await response.json();
        if (response.ok && data.success) {
            showAlert('success', 'Success', 'Appointment completed! Patient added to your records.');
            closeUploadModal();
            await loadAppointments();
        } else {
            showAlert('warning', 'Error', data.message || 'Failed to complete appointment');
        }
    } catch (error) {
        showAlert('warning', 'Error', 'Failed to complete appointment');
    }
}

async function deleteAppointment(appointmentId) {
    showDeleteConfirm(appointmentId);
}

function showDeleteConfirm(appointmentId) {
    const overlay = document.getElementById('customAlert');
    document.getElementById('alertIcon').className = 'custom-alert-icon warning';
    document.getElementById('alertIcon').textContent = '⚠';
    document.getElementById('alertTitle').textContent = 'Delete Appointment';
    document.getElementById('alertMessage').textContent = 'Are you sure you want to delete this appointment? This action cannot be undone.';
    document.getElementById('alertButtons').innerHTML =
        '<button class="custom-alert-button secondary" onclick="closeCustomAlert()">Cancel</button>' +
        '<button class="custom-alert-button primary" onclick="confirmDeleteAppointment(\'' + appointmentId + '\')">Delete</button>';
    overlay.style.display = 'block';
}

async function confirmDeleteAppointment(appointmentId) {
    closeCustomAlert();
    try {
        const response = await fetch('http://localhost:5001/api/appointments/' + appointmentId, {
            method: 'DELETE', credentials: 'include'
        });
        const data = await response.json();
        if (response.ok && data.success) {
            await loadAppointments();
            showAlert('success', 'Success', 'Appointment deleted successfully');
        } else {
            showAlert('warning', 'Error', data.message || 'Failed to delete appointment');
        }
    } catch (error) {
        showAlert('warning', 'Error', 'Failed to delete appointment');
    }
}

function showAlert(type, title, message) {
    const overlay = document.getElementById('customAlert');
    document.getElementById('alertIcon').className = 'custom-alert-icon ' + type;
    document.getElementById('alertIcon').textContent = type === 'warning' ? '⚠' : '✓';
    document.getElementById('alertTitle').textContent = title;
    document.getElementById('alertMessage').textContent = message;
    document.getElementById('alertButtons').innerHTML = '<button class="custom-alert-button primary" onclick="closeCustomAlert()">OK</button>';
    overlay.style.display = 'block';
}

function closeCustomAlert() { document.getElementById('customAlert').style.display = 'none'; }

function toggleSidebar() { document.getElementById('sidebar').classList.toggle('open'); }

document.addEventListener('click', function (event) {
    const sidebar = document.getElementById('sidebar');
    const menuToggle = document.querySelector('.menu-toggle');
    if (window.innerWidth <= 768 && sidebar.classList.contains('open') &&
        !sidebar.contains(event.target) && !menuToggle.contains(event.target)) {
        sidebar.classList.remove('open');
    }
});

function showLogoutConfirm() {
    document.getElementById('alertIcon').className = 'custom-alert-icon warning';
    document.getElementById('alertIcon').textContent = '⚠';
    document.getElementById('alertTitle').textContent = 'Confirm Logout';
    document.getElementById('alertMessage').textContent = 'Are you sure you want to logout?';
    document.getElementById('alertButtons').innerHTML =
        '<button class="custom-alert-button secondary" onclick="closeCustomAlert()">Cancel</button>' +
        '<button class="custom-alert-button primary" onclick="confirmLogout()">Logout</button>';
    document.getElementById('customAlert').style.display = 'block';
}

async function confirmLogout() {
    try {
        const response = await fetch('http://localhost:5001/logout', {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include'
        });
        const data = await response.json();
        if (data.success) { closeCustomAlert(); setTimeout(() => window.location.replace('/login.html'), 100); }
    } catch (error) { console.error('Logout error:', error); }
}

document.getElementById('customAlert').addEventListener('click', function (e) { if (e.target === this) closeCustomAlert(); });
document.getElementById('uploadModal').addEventListener('click', function (e) { if (e.target === this) closeUploadModal(); });