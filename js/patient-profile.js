let currentUser = null;
let hasExistingReport = false;
let uploadedFile = null;

// Check authentication and load profile on page load
window.addEventListener('load', async () => {
    try {
        const response = await fetch('http://localhost:5001/api/current-user', {
            credentials: 'include'
        });

        if (response.ok) {
            const data = await response.json();
            if (data.success && data.user) {
                if (data.user.role !== 'patient') {
                    window.location.replace('/doctor-dashboard.html');
                    return;
                }
                currentUser = data.user;
                loadPatientProfile();
            }
        } else {
            window.location.replace('/login.html');
        }
    } catch (error) {
        console.error('Error fetching user data:', error);
        window.location.replace('/login.html');
    }
});

// File upload handler
document.getElementById('medicalReportFile').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        if (file.size > 10 * 1024 * 1024) {
            showAlert('error', 'Error', 'File size exceeds 10MB limit');
            e.target.value = '';
            return;
        }
        if (file.type !== 'application/pdf') {
            showAlert('error', 'Error', 'Only PDF files are allowed');
            e.target.value = '';
            return;
        }
        uploadedFile = file;
        document.getElementById('fileUploadText').textContent = `Selected: ${file.name}`;
        document.getElementById('fileUploadText').style.color = '#4F46E5';
    }
});

async function loadPatientProfile() {
    try {
        const response = await fetch('http://localhost:5001/api/patient-profile', {
            credentials: 'include'
        });

        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                document.getElementById('patientName').value = data.profile.name || '';
                document.getElementById('patientId').value = data.profile.user_id || '';
                document.getElementById('patientEmail').value = data.profile.email || '';
                document.getElementById('patientPhone').value = data.profile.phone || '';

                if (data.profile) {
                    document.getElementById('age').value = data.profile.age || '';
                    document.getElementById('gender').value = data.profile.gender || '';
                    document.getElementById('weight').value = data.profile.weight || '';
                    document.getElementById('height').value = data.profile.height || '';
                    document.getElementById('bloodGroup').value = data.profile.blood_group || '';
                    document.getElementById('address').value = data.profile.address || '';
                    document.getElementById('medicalHistory').value = data.profile.medical_history || '';
                    
                    if (data.profile.medical_report_name) {
                        hasExistingReport = true;
                        document.getElementById('currentReportInfo').style.display = 'block';
                        document.getElementById('currentReportName').textContent = data.profile.medical_report_name;
                        const uploadDate = new Date(data.profile.medical_report_upload_date);
                        document.getElementById('currentReportDate').textContent = `Uploaded: ${uploadDate.toLocaleDateString()}`;
                    }
                    
                    updateProfileStatus(data.profile);
                } else {
                    updateProfileStatus(null);
                }
            }
        }
    } catch (error) {
        console.error('Error loading profile:', error);
    }
}

function updateProfileStatus(profile) {
    const statusBadge = document.getElementById('profileStatus').querySelector('.status-badge');
    
    if (!profile) {
        statusBadge.textContent = 'Incomplete';
        statusBadge.className = 'status-badge incomplete';
        return;
    }
    
    const isComplete = profile.age && profile.gender && profile.weight && 
                        profile.height && profile.blood_group;
    
    if (isComplete) {
        statusBadge.textContent = 'Complete';
        statusBadge.className = 'status-badge complete';
    } else {
        statusBadge.textContent = 'Incomplete';
        statusBadge.className = 'status-badge incomplete';
    }
}

document.getElementById('profileForm').addEventListener('submit', async function(e) {
    e.preventDefault();

    const formData = new FormData();
    formData.append('name', document.getElementById('patientName').value);
    formData.append('phone', document.getElementById('patientPhone').value);
    formData.append('age', document.getElementById('age').value);
    formData.append('gender', document.getElementById('gender').value);
    formData.append('weight', document.getElementById('weight').value);
    formData.append('height', document.getElementById('height').value);
    formData.append('blood_group', document.getElementById('bloodGroup').value);
    formData.append('address', document.getElementById('address').value);
    formData.append('medical_history', document.getElementById('medicalHistory').value);

    if (uploadedFile) {
        formData.append('medical_report', uploadedFile);
    }

    try {
        const response = await fetch('http://localhost:5001/api/patient-profile', {
            method: 'POST',
            credentials: 'include',
            body: formData
        });

        const data = await response.json();

        if (data.success) {
            showAlert('success', 'Success', 'Profile updated successfully!');
            setTimeout(() => {
                window.location.href = 'patient-dashboard.html';
            }, 1500);
        } else {
            showAlert('error', 'Error', data.message || 'Failed to update profile');
        }
    } catch (error) {
        console.error('Error updating profile:', error);
        showAlert('error', 'Error', 'Failed to update profile. Please try again.');
    }
});

async function downloadCurrentReport() {
    try {
        const response = await fetch('http://localhost:5001/api/patient-profile/medical-report', {
            credentials: 'include'
        });

        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = document.getElementById('currentReportName').textContent;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } else {
            showAlert('error', 'Error', 'Failed to download report');
        }
    } catch (error) {
        console.error('Error downloading report:', error);
        showAlert('error', 'Error', 'Failed to download report');
    }
}

async function deleteCurrentReport() {
    if (!confirm('Are you sure you want to delete this medical report?')) {
        return;
    }

    try {
        const response = await fetch('http://localhost:5001/api/patient-profile/medical-report', {
            method: 'DELETE',
            credentials: 'include'
        });

        const data = await response.json();

        if (data.success) {
            showAlert('success', 'Success', 'Medical report deleted successfully');
            document.getElementById('currentReportInfo').style.display = 'none';
            hasExistingReport = false;
            document.getElementById('fileUploadText').textContent = 'Click to upload PDF or drag & drop';
            document.getElementById('fileUploadText').style.color = '';
        } else {
            showAlert('error', 'Error', data.message || 'Failed to delete report');
        }
    } catch (error) {
        console.error('Error deleting report:', error);
        showAlert('error', 'Error', 'Failed to delete report');
    }
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

function showAlert(type, title, message) {
    const overlay = document.getElementById('customAlert');
    const icon = document.getElementById('alertIcon');
    const alertTitle = document.getElementById('alertTitle');
    const alertMessage = document.getElementById('alertMessage');

    if (type === 'success') {
        icon.className = 'custom-alert-icon success';
        icon.textContent = '✓';
    } else {
        icon.className = 'custom-alert-icon error';
        icon.textContent = '✕';
    }

    alertTitle.textContent = title;
    alertMessage.textContent = message;
    overlay.style.display = 'block';
}

function closeCustomAlert() {
    document.getElementById('customAlert').style.display = 'none';
}

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
        } else {
            showAlert('error', 'Error', 'Logout failed. Please try again.');
        }
    } catch (error) {
        console.error('Logout error:', error);
        showAlert('error', 'Error', 'Logout failed. Please try again.');
    }
}

document.getElementById('customAlert').addEventListener('click', function(e) {
    if (e.target === this) {
        closeCustomAlert();
    }
});