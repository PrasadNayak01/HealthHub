let allDoctors = [];
let currentSearchTerm = '';

// Check authentication on page load
window.addEventListener('load', async () => {
    try {
        const response = await fetch('http://localhost:5001/api/current-user', {
            credentials: 'include'
        });

        if (response.ok) {
            const data = await response.json();
            if (data.success && data.user) {
                // Check if user is a patient
                if (data.user.role !== 'patient') {
                    window.location.replace('/doctor-dashboard.html');
                    return;
                }
                // Load doctors
                loadDoctors();
            }
        } else {
            window.location.replace('/login.html');
        }
    } catch (error) {
        console.error('Error fetching user data:', error);
        window.location.replace('/login.html');
    }
});

async function loadDoctors() {
    try {
        document.getElementById('loadingSpinner').style.display = 'flex';
        document.getElementById('doctorsGrid').style.display = 'none';
        document.getElementById('noResults').style.display = 'none';

        const response = await fetch('http://localhost:5001/api/doctors', {
            credentials: 'include'
        });

        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                allDoctors = data.doctors;
                displayDoctors(allDoctors);
            }
        }
    } catch (error) {
        console.error('Error loading doctors:', error);
        document.getElementById('loadingSpinner').style.display = 'none';
        document.getElementById('noResults').style.display = 'flex';
    }
}

function displayDoctors(doctors) {
    const grid = document.getElementById('doctorsGrid');
    const loadingSpinner = document.getElementById('loadingSpinner');
    const noResults = document.getElementById('noResults');
    const resultsCount = document.getElementById('resultsCount');

    loadingSpinner.style.display = 'none';

    if (doctors.length === 0) {
        grid.style.display = 'none';
        noResults.style.display = 'flex';
        resultsCount.textContent = '0 doctors found';
        return;
    }

    noResults.style.display = 'none';
    grid.style.display = 'grid';
    resultsCount.textContent = `${doctors.length} doctor${doctors.length !== 1 ? 's' : ''} found`;

    grid.innerHTML = doctors.map(doctor => `
        <div class="doctor-card">
            <div class="doctor-header">
                <div class="doctor-avatar">
                    ${doctor.name.charAt(0).toUpperCase()}
                </div>
                <div class="doctor-info">
                    <h3 class="doctor-name">Dr. ${doctor.name}</h3>
                    <p class="doctor-specialty">${doctor.speciality || 'General Physician'}</p>
                </div>
            </div>

            <div class="doctor-details">
                <div class="detail-item">
                    <svg class="detail-icon" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                    </svg>
                    <div>
                        <span class="detail-label">Degree</span>
                        <span class="detail-value">${doctor.degree || 'Not specified'}</span>
                    </div>
                </div>

                <div class="detail-item">
                    <svg class="detail-icon" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/>
                    </svg>
                    <div>
                        <span class="detail-label">Experience</span>
                        <span class="detail-value">${doctor.experience || 0} years</span>
                    </div>
                </div>

                <div class="detail-item">
                    <svg class="detail-icon" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1 1.05.82 1.87 2.65 1.87 1.96 0 2.4-.98 2.4-1.59 0-.83-.44-1.61-2.67-2.14-2.48-.6-4.18-1.62-4.18-3.67 0-1.72 1.39-2.84 3.11-3.21V4h2.67v1.95c1.86.45 2.79 1.86 2.85 3.39H14.3c-.05-1.11-.64-1.87-2.22-1.87-1.5 0-2.4.68-2.4 1.64 0 .84.65 1.39 2.67 1.91s4.18 1.39 4.18 3.91c-.01 1.83-1.38 2.83-3.12 3.16z"/>
                    </svg>
                    <div>
                        <span class="detail-label">Consultation Fee</span>
                        <span class="detail-value">₹${doctor.consultation_fee || 'N/A'}</span>
                    </div>
                </div>

                <div class="detail-item">
                    <svg class="detail-icon" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
                    </svg>
                    <div>
                        <span class="detail-label">Email</span>
                        <span class="detail-value">${doctor.email || 'Not provided'}</span>
                    </div>
                </div>

                <div class="detail-item">
                    <svg class="detail-icon" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
                    </svg>
                    <div>
                        <span class="detail-label">Phone</span>
                        <span class="detail-value">${doctor.phone || 'Not provided'}</span>
                    </div>
                </div>

                <div class="detail-item full-width">
                    <svg class="detail-icon" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                    </svg>
                    <div>
                        <span class="detail-label">Address</span>
                        <span class="detail-value">${doctor.address || 'Not specified'}</span>
                    </div>
                </div>
            </div>

            <!-- <div class="doctor-actions">
                <button class="btn-book">Book Appointment</button>
            </div> -->
        </div>
    `).join('');
}

function handleSearch() {
    const searchInput = document.getElementById('searchInput');
    const clearBtn = document.getElementById('clearBtn');
    currentSearchTerm = searchInput.value.toLowerCase().trim();

    // Show/hide clear button
    clearBtn.style.display = currentSearchTerm ? 'flex' : 'none';

    if (currentSearchTerm === '') {
        displayDoctors(allDoctors);
        document.getElementById('resultsTitle').textContent = 'All Doctors';
        return;
    }

    const filteredDoctors = allDoctors.filter(doctor => {
        const name = doctor.name.toLowerCase();
        const specialty = (doctor.speciality || '').toLowerCase();
        const location = (doctor.address || '').toLowerCase();
        
        return name.includes(currentSearchTerm) || 
                specialty.includes(currentSearchTerm) || 
                location.includes(currentSearchTerm);
    });

    displayDoctors(filteredDoctors);
    document.getElementById('resultsTitle').textContent = 'Search Results';
}

function clearSearch() {
    document.getElementById('searchInput').value = '';
    document.getElementById('clearBtn').style.display = 'none';
    currentSearchTerm = '';
    displayDoctors(allDoctors);
    document.getElementById('resultsTitle').textContent = 'All Doctors';
}

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

function showLogoutConfirm() {
    const overlay = document.getElementById('customAlert');
    const icon = document.getElementById('alertIcon');
    const title = document.getElementById('alertTitle');
    const message = document.getElementById('alertMessage');

    icon.className = 'custom-alert-icon warning';
    icon.textContent = '⚠';
    title.textContent = 'Confirm Logout';
    message.textContent = 'Are you sure you want to logout?';

    overlay.style.display = 'block';
}

function closeCustomAlert() {
    document.getElementById('customAlert').style.display = 'none';
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

// Close alert when clicking outside
document.getElementById('customAlert').addEventListener('click', function(e) {
    if (e.target === this) {
        closeCustomAlert();
    }
});