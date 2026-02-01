let currentDoctor = null;
let selectedFiles = [];
let currentAppointmentId = null;
let patientDataCache = null;

// Check authentication on page load
window.addEventListener('load', async () => {
    // Set minimum date to today
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('appointmentDate').setAttribute('min', today);

    try {
        const response = await fetch('http://localhost:5001/api/current-user', {
            credentials: 'include'
        });

        if (response.ok) {
            const data = await response.json();
            if (data.success && data.user) {
                if (data.user.role !== 'doctor') {
                    window.location.replace('/patient-dashboard.html');
                    return;
                }
                currentDoctor = data.user;
                loadAppointments();
            }
        } else {
            window.location.replace('/login.html');
        }
    } catch (error) {
        console.error('Error fetching user data:', error);
        window.location.replace('/login.html');
    }
});

// Fetch patient details by ID
async function fetchPatientDetails() {
    const patientId = document.getElementById('patientId').value.trim();
    const detailsDiv = document.getElementById('patientDetails');

    if (!patientId) {
        detailsDiv.style.display = 'none';
        patientDataCache = null;
        return;
    }

    if (!patientId.toUpperCase().startsWith('PID-')) {
        showAlert('warning', 'Invalid Format', 'Patient ID must start with "PID-"');
        detailsDiv.style.display = 'none';
        patientDataCache = null;
        return;
    }

    try {
        const response = await fetch(`http://localhost:5001/api/search-patient/${encodeURIComponent(patientId)}`, {
            credentials: 'include'
        });

        const data = await response.json();

        if (response.ok && data.success) {
            patientDataCache = data.patient;
            displayPatientDetails(data.patient);
        } else {
            showAlert('warning', 'Patient Not Found', data.message || 'No patient found with this ID');
            detailsDiv.style.display = 'none';
            patientDataCache = null;
        }
    } catch (error) {
        console.error('Error fetching patient:', error);
        showAlert('warning', 'Error', 'Failed to fetch patient details');
        detailsDiv.style.display = 'none';
        patientDataCache = null;
    }
}

function displayPatientDetails(patient) {
    const detailsDiv = document.getElementById('patientDetails');
    const profile = patient.profile;

    document.getElementById('detailName').textContent = patient.name;
    document.getElementById('detailEmail').textContent = patient.email;
    document.getElementById('detailPhone').textContent = patient.phone;
    document.getElementById('detailAge').textContent = profile ? `${profile.age} years` : 'N/A';
    document.getElementById('detailGender').textContent = profile ? profile.gender : 'N/A';
    document.getElementById('detailBlood').textContent = profile ? profile.blood_group : 'N/A';

    detailsDiv.style.display = 'block';
}

// Add new appointment
async function addAppointment() {
    const patientId = document.getElementById('patientId').value.trim();
    const appointmentDate = document.getElementById('appointmentDate').value;
    const appointmentTime = document.getElementById('appointmentTime').value;

    if (!patientId || !appointmentDate) {
        showAlert('warning', 'Required Fields', 'Please enter Patient ID and Appointment Date');
        return;
    }

    if (!patientDataCache) {
        showAlert('warning', 'Patient Not Found', 'Please verify the patient details before adding appointment');
        return;
    }

    try {
        const response = await fetch('http://localhost:5001/api/appointments', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({
                patientId,
                appointmentDate,
                appointmentTime: appointmentTime || null
            })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            // Clear form first
            document.getElementById('patientId').value = '';
            document.getElementById('appointmentDate').value = '';
            document.getElementById('appointmentTime').value = '';
            document.getElementById('patientDetails').style.display = 'none';
            patientDataCache = null;

            // Reload appointments and wait for it to complete
            await loadAppointments();
            
            // Show success message after reload
            showAlert('success', 'Success', 'Appointment added successfully');
        } else {
            showAlert('warning', 'Error', data.message || 'Failed to add appointment');
        }
    } catch (error) {
        console.error('Error adding appointment:', error);
        showAlert('warning', 'Error', 'Failed to add appointment');
    }
}

// Load all appointments
async function loadAppointments() {
    try {
        const loadingSpinner = document.getElementById('loadingSpinner');
        const appointmentsList = document.getElementById('appointmentsList');
        
        // Show loading spinner
        loadingSpinner.style.display = 'flex';
        
        // Clear existing appointments
        const existingGroups = appointmentsList.querySelectorAll('.date-group, .empty-state');
        existingGroups.forEach(el => el.remove());

        const response = await fetch('http://localhost:5001/api/appointments', {
            credentials: 'include'
        });

        const data = await response.json();

        // Hide loading spinner
        loadingSpinner.style.display = 'none';

        if (response.ok && data.success) {
            displayAppointments(data.appointments);
        } else {
            console.error('Failed to load appointments:', data);
        }
    } catch (error) {
        console.error('Error loading appointments:', error);
        document.getElementById('loadingSpinner').style.display = 'none';
    }
}

function displayAppointments(appointments) {
    const listDiv = document.getElementById('appointmentsList');
    const loadingSpinner = document.getElementById('loadingSpinner');
    
    // Clear everything except the loading spinner
    Array.from(listDiv.children).forEach(child => {
        if (child.id !== 'loadingSpinner') {
            child.remove();
        }
    });
    
    if (appointments.length === 0) {
        const emptyDiv = document.createElement('div');
        emptyDiv.className = 'empty-state';
        emptyDiv.innerHTML = '<p>No appointments scheduled</p>';
        listDiv.appendChild(emptyDiv);
        return;
    }

    // Group appointments by date
    const groupedByDate = {};
    appointments.forEach(apt => {
        // Extract just the date part (YYYY-MM-DD) from the ISO string
        const dateStr = apt.appointment_date.split('T')[0];
        if (!groupedByDate[dateStr]) {
            groupedByDate[dateStr] = [];
        }
        groupedByDate[dateStr].push(apt);
    });

    // Sort appointments within each date group by time
    Object.keys(groupedByDate).forEach(dateStr => {
        groupedByDate[dateStr].sort((a, b) => {
            // Handle null times - put them at the end
            if (!a.appointment_time && !b.appointment_time) return 0;
            if (!a.appointment_time) return 1;
            if (!b.appointment_time) return -1;
            
            // Compare times as strings (format: HH:MM:SS or HH:MM AM/PM)
            return a.appointment_time.localeCompare(b.appointment_time);
        });
    });

    // Sort dates
    const sortedDates = Object.keys(groupedByDate).sort((a, b) => new Date(a) - new Date(b));

    // Create date groups
    sortedDates.forEach(dateStr => {
        const appointments = groupedByDate[dateStr];
        
        // Parse the date correctly - create date object from YYYY-MM-DD string
        const [year, month, day] = dateStr.split('-').map(num => parseInt(num));
        const dateObj = new Date(year, month - 1, day);
        
        const formattedDate = dateObj.toLocaleDateString('en-IN', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        const dateGroupDiv = document.createElement('div');
        dateGroupDiv.className = 'date-group';
        dateGroupDiv.innerHTML = `
            <div class="date-header">
                <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zM7 12h5v5H7z"/>
                </svg>
                <h2>${formattedDate}</h2>
            </div>
            ${appointments.map(apt => createAppointmentCard(apt)).join('')}
        `;
        
        listDiv.appendChild(dateGroupDiv);
    });
}

function createAppointmentCard(apt) {
    return `
        <div class="appointment-card ${apt.status === 'completed' ? 'completed' : ''}">
            <div class="appointment-header">
                <div class="appointment-info">
                    <h3>${apt.patient_name}</h3>
                    <p class="appointment-id">${apt.patient_id}</p>
                </div>
                ${apt.appointment_time ? `<div class="appointment-time">🕐 ${apt.appointment_time}</div>` : ''}
            </div>
            
            <div class="appointment-details">
                <div class="detail">
                    <strong>Email</strong>
                    <span>${apt.patient_email}</span>
                </div>
                <div class="detail">
                    <strong>Phone</strong>
                    <span>${apt.patient_phone}</span>
                </div>
                <div class="detail">
                    <strong>Age</strong>
                    <span>${apt.patient_age || 'N/A'}</span>
                </div>
                <div class="detail">
                    <strong>Gender</strong>
                    <span>${apt.patient_gender || 'N/A'}</span>
                </div>
                <div class="detail">
                    <strong>Blood Group</strong>
                    <span>${apt.patient_blood_group || 'N/A'}</span>
                </div>
                <div class="detail">
                    <strong>Status</strong>
                    <span style="color: ${apt.status === 'completed' ? '#10b981' : '#f59e0b'}; font-weight: 600;">
                        ${apt.status.charAt(0).toUpperCase() + apt.status.slice(1)}
                    </span>
                </div>
            </div>
            
            ${apt.status === 'pending' ? `
                <div class="appointment-actions">
                    <button class="btn-done" onclick="showUploadModal('${apt.appointment_id}', '${apt.patient_id}', '${apt.patient_name}')">
                        Complete Appointment
                    </button>
                    <button class="btn-delete" onclick="deleteAppointment('${apt.appointment_id}')">
                        Delete
                    </button>
                </div>
            ` : ''}
        </div>
    `;
}

// Show upload modal
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

// Handle file selection
function handleFileSelect() {
    const fileInput = document.getElementById('fileInput');
    const files = Array.from(fileInput.files);
    
    files.forEach(file => {
        // Check file size (max 10MB per file)
        if (file.size > 10 * 1024 * 1024) {
            showAlert('warning', 'File Too Large', `${file.name} exceeds 10MB limit`);
            return;
        }

        selectedFiles.push(file);
    });

    displaySelectedFiles();
    fileInput.value = ''; // Reset input
}

function displaySelectedFiles() {
    const container = document.getElementById('selectedFiles');
    
    if (selectedFiles.length === 0) {
        container.innerHTML = '';
        return;
    }

    container.innerHTML = selectedFiles.map((file, index) => `
        <div class="file-item">
            <div class="file-info">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11z"/>
                </svg>
                <div>
                    <div class="file-name">${file.name}</div>
                    <div class="file-size">${(file.size / 1024).toFixed(2)} KB</div>
                </div>
            </div>
            <button class="remove-file" onclick="removeFile(${index})">Remove</button>
        </div>
    `).join('');
}

function removeFile(index) {
    selectedFiles.splice(index, 1);
    displaySelectedFiles();
}

// CRITICAL: Complete appointment - This adds patient to patient_records
async function completeAppointment() {
    const notes = document.getElementById('appointmentNotes').value.trim();

    try {
        const formData = new FormData();
        formData.append('appointmentId', currentAppointmentId);
        formData.append('notes', notes);

        // Append all selected files
        selectedFiles.forEach(file => {
            formData.append('documents', file);
        });

        const response = await fetch('http://localhost:5001/api/appointments/complete', {
            method: 'POST',
            credentials: 'include',
            body: formData
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
        console.error('Error completing appointment:', error);
        showAlert('warning', 'Error', 'Failed to complete appointment');
    }
}

// Delete appointment
async function deleteAppointment(appointmentId) {
    // Show custom confirmation dialog
    showDeleteConfirm(appointmentId);
}

function showDeleteConfirm(appointmentId) {
    const overlay = document.getElementById('customAlert');
    const icon = document.getElementById('alertIcon');
    const title = document.getElementById('alertTitle');
    const message = document.getElementById('alertMessage');
    const buttons = document.getElementById('alertButtons');

    icon.className = 'custom-alert-icon warning';
    icon.textContent = '⚠';
    title.textContent = 'Delete Appointment';
    message.textContent = 'Are you sure you want to delete this appointment? This action cannot be undone.';
    
    buttons.innerHTML = `
        <button class="custom-alert-button secondary" onclick="closeCustomAlert()">Cancel</button>
        <button class="custom-alert-button primary" onclick="confirmDeleteAppointment('${appointmentId}')">Delete</button>
    `;

    overlay.style.display = 'block';
}

async function confirmDeleteAppointment(appointmentId) {
    closeCustomAlert();
    
    try {
        const response = await fetch(`http://localhost:5001/api/appointments/${appointmentId}`, {
            method: 'DELETE',
            credentials: 'include'
        });

        const data = await response.json();

        if (response.ok && data.success) {
            await loadAppointments();
            showAlert('success', 'Success', 'Appointment deleted successfully');
        } else {
            showAlert('warning', 'Error', data.message || 'Failed to delete appointment');
        }
    } catch (error) {
        console.error('Error deleting appointment:', error);
        showAlert('warning', 'Error', 'Failed to delete appointment');
    }
}

// Utility functions
function showAlert(type, title, message) {
    const overlay = document.getElementById('customAlert');
    const icon = document.getElementById('alertIcon');
    const titleEl = document.getElementById('alertTitle');
    const messageEl = document.getElementById('alertMessage');
    const buttons = document.getElementById('alertButtons');

    icon.className = `custom-alert-icon ${type}`;
    icon.textContent = type === 'warning' ? '⚠' : '✓';
    titleEl.textContent = title;
    messageEl.textContent = message;
    
    // Reset buttons to single OK button for alerts
    buttons.innerHTML = `
        <button class="custom-alert-button primary" onclick="closeCustomAlert()">OK</button>
    `;

    overlay.style.display = 'block';
}

function closeCustomAlert() {
    document.getElementById('customAlert').style.display = 'none';
}

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('open');
}

document.addEventListener('click', function(event) {
    const sidebar = document.getElementById('sidebar');
    const menuToggle = document.querySelector('.menu-toggle');
    
    if (window.innerWidth <= 768 && 
        sidebar.classList.contains('open') && 
        !sidebar.contains(event.target) && 
        !menuToggle.contains(event.target)) {
        sidebar.classList.remove('open');
    }
});

function showLogoutConfirm() {
    const overlay = document.getElementById('customAlert');
    const icon = document.getElementById('alertIcon');
    const title = document.getElementById('alertTitle');
    const message = document.getElementById('alertMessage');
    const buttons = document.getElementById('alertButtons');

    icon.className = 'custom-alert-icon warning';
    icon.textContent = '⚠';
    title.textContent = 'Confirm Logout';
    message.textContent = 'Are you sure you want to logout?';
    
    buttons.innerHTML = `
        <button class="custom-alert-button secondary" onclick="closeCustomAlert()">Cancel</button>
        <button class="custom-alert-button primary" onclick="confirmLogout()">Logout</button>
    `;

    overlay.style.display = 'block';
}

async function confirmLogout() {
    try {
        const response = await fetch('http://localhost:5001/logout', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include'
        });

        const data = await response.json();

        if (data.success) {
            closeCustomAlert();
            setTimeout(() => {
                window.location.replace('/login.html');
            }, 100);
        }
    } catch (error) {
        console.error('Logout error:', error);
    }
}

document.getElementById('customAlert').addEventListener('click', function(e) {
    if (e.target === this) {
        closeCustomAlert();
    }
});

document.getElementById('uploadModal').addEventListener('click', function(e) {
    if (e.target === this) {
        closeUploadModal();
    }
});