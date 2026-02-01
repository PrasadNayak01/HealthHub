let currentUser = null;

// Check authentication and load profile on page load
window.addEventListener('load', async () => {
    try {
        const response = await fetch('http://localhost:5001/api/current-user', {
            credentials: 'include'
        });

        if (response.ok) {
            const data = await response.json();
            if (data.success && data.user) {
                // Check if user is a doctor
                if (data.user.role !== 'doctor') {
                    window.location.replace('/patient-dashboard.html');
                    return;
                }
                currentUser = data.user;
                loadDoctorProfile();
            }
        } else {
            window.location.replace('/login.html');
        }
    } catch (error) {
        console.error('Error fetching user data:', error);
        window.location.replace('/login.html');
    }
});

async function loadDoctorProfile() {
    try {
        const response = await fetch('http://localhost:5001/api/doctor-profile', {
            credentials: 'include'
        });

        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                // Populate basic user info
                document.getElementById('doctorName').value = data.user.name || '';
                document.getElementById('doctorId').value = data.user.user_id || '';
                document.getElementById('doctorEmail').value = data.user.email || '';
                document.getElementById('doctorPhone').value = data.user.phone || '';

                // Populate profile data if exists
                if (data.profile) {
                    document.getElementById('speciality').value = data.profile.speciality || '';
                    document.getElementById('degree').value = data.profile.degree || '';
                    document.getElementById('experience').value = data.profile.experience || '';
                    document.getElementById('consultationFee').value = data.profile.consultation_fee || '';
                    document.getElementById('address').value = data.profile.address || '';
                    document.getElementById('bio').value = data.profile.bio || '';
                }
            }
        }
    } catch (error) {
        console.error('Error loading profile:', error);
    }
}

document.getElementById('profileForm').addEventListener('submit', async function(e) {
    e.preventDefault();

    const profileData = {
        speciality: document.getElementById('speciality').value,
        degree: document.getElementById('degree').value,
        experience: document.getElementById('experience').value,
        consultation_fee: document.getElementById('consultationFee').value,
        address: document.getElementById('address').value,
        bio: document.getElementById('bio').value
    };

    try {
        const response = await fetch('http://localhost:5001/api/doctor-profile', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify(profileData)
        });

        const data = await response.json();

        if (data.success) {
            showAlert('success', 'Success', 'Profile updated successfully!');
            setTimeout(() => {
                window.location.href = 'doctor-dashboard.html';
            }, 1500);
        } else {
            showAlert('error', 'Error', data.message || 'Failed to update profile');
        }
    } catch (error) {
        console.error('Error updating profile:', error);
        showAlert('error', 'Error', 'Failed to update profile. Please try again.');
    }
});

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('open');
}

// Close sidebar when clicking outside on mobile
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

// Close alert when clicking outside
document.getElementById('customAlert').addEventListener('click', function(e) {
    if (e.target === this) {
        closeCustomAlert();
    }
});