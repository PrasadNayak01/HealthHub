let allPatients = [];

// Sidebar toggle for mobile
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('open');
}

// Logout function
async function logout() {
    try {
        const response = await fetch('/logout', {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        // Redirect to login page
        window.location.href = '/login.html';
    } catch (error) {
        console.error('Logout error:', error);
        // Even if logout fails, redirect to login
        window.location.href = '/login.html';
    }
}

// Load patient records - FIXED
async function loadPatientRecords() {
    try {
        const response = await fetch('http://localhost:5001/api/patient-records', {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        console.log('Response status:', response.status);

        if (response.status === 401 || response.status === 403) {
            console.error('Authentication failed, redirecting to login...');
            window.location.href = '/login.html';
            return;
        }

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Data received:', data);

        if (data.success) {
            // FIXED: Use data.records instead of data.patients
            allPatients = data.records || [];
            console.log('Total patients loaded:', allPatients.length);
            displayPatients(allPatients);
            updateStats(allPatients);
        } else {
            throw new Error(data.message || 'Failed to load patients');
        }
    } catch (error) {
        console.error('Error loading patient records:', error);
        document.getElementById('loadingContainer').innerHTML = `
            <svg viewBox="0 0 24 24" fill="currentColor" width="60" height="60" style="color: #ef4444; margin-bottom: 1rem;">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
            </svg>
            <h3 style="color: #991b1b; margin-bottom: 0.5rem;">Error Loading Patient Records</h3>
            <p style="color: #6b7280; margin-bottom: 1.5rem;">${error.message}</p>
            <button onclick="location.reload()" style="padding: 0.75rem 1.5rem; background: #4F46E5; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                Retry
            </button>
        `;
    }
}

// Display patients in table - FIXED
function displayPatients(patients) {
    const tableBody = document.getElementById('patientsTable');
    const loadingContainer = document.getElementById('loadingContainer');
    const tableCard = document.getElementById('tableCard');
    const emptyState = document.getElementById('emptyState');

    loadingContainer.style.display = 'none';

    if (patients.length === 0) {
        tableCard.style.display = 'none';
        emptyState.style.display = 'flex';
        return;
    }

    tableCard.style.display = 'block';
    emptyState.style.display = 'none';

    tableBody.innerHTML = patients.map(patient => `
        <tr>
            <td>
                <span class="patient-id-badge">${patient.patient_id}</span>
            </td>
            <td><strong>${escapeHtml(patient.patient_name)}</strong></td>
            <td>
                <div class="contact-info">
                    <div class="contact-email">
                        <span>📧</span>
                        <span>${escapeHtml(patient.patient_email)}</span>
                    </div>
                    <div class="contact-phone">
                        <span>📱</span>
                        <span>${patient.patient_phone ? escapeHtml(patient.patient_phone) : 'N/A'}</span>
                    </div>
                </div>
            </td>
            <td>${patient.age || 'N/A'}</td>
            <td>
                <span class="badge badge-${(patient.gender || 'other').toLowerCase()}">
                    ${patient.gender || 'N/A'}
                </span>
            </td>
            <td><strong style="color: #dc2626;">${patient.blood_group || 'N/A'}</strong></td>
            <td>${formatDate(patient.first_visit_date)}</td>
            <td>${formatDate(patient.last_visit_date)}</td>
            <td>
                <span class="visits-badge">${patient.total_visits}</span>
            </td>
        </tr>
    `).join('');
}

// Update statistics - FIXED
function updateStats(patients) {
    console.log('Updating stats for', patients.length, 'patients');

    // Total Patients
    document.getElementById('totalPatients').textContent = patients.length;

    // Total Visits (sum of all visit counts)
    const totalVisits = patients.reduce((sum, p) => sum + (p.total_visits || 0), 0);
    document.getElementById('totalVisits').textContent = totalVisits;

    // New This Month - FIXED: Use created_at instead of added_to_records_at
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const newThisMonth = patients.filter(p => {
        if (!p.created_at) return false;
        const addedDate = new Date(p.created_at);
        return addedDate.getMonth() === currentMonth && addedDate.getFullYear() === currentYear;
    }).length;
    document.getElementById('newThisMonth').textContent = newThisMonth;

    console.log('Stats updated:', {
        totalPatients: patients.length,
        totalVisits: totalVisits,
        newThisMonth: newThisMonth
    });
}

// Format date
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    try {
        const date = new Date(dateString);
        const options = { year: 'numeric', month: 'short', day: 'numeric' };
        return date.toLocaleDateString('en-US', options);
    } catch (error) {
        return 'Invalid Date';
    }
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

// Search functionality - FIXED property names
document.getElementById('searchInput').addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase().trim();

    if (searchTerm === '') {
        displayPatients(allPatients);
        updateStats(allPatients);
        return;
    }

    const filteredPatients = allPatients.filter(patient => {
        // Search by Patient ID
        const patientIdMatch = patient.patient_id.toString().toLowerCase().includes(searchTerm);

        // Search by Name
        const nameMatch = patient.patient_name && patient.patient_name.toLowerCase().includes(searchTerm);

        // Search by Email
        const emailMatch = patient.patient_email && patient.patient_email.toLowerCase().includes(searchTerm);

        // Search by Phone
        const phoneMatch = patient.patient_phone && patient.patient_phone.toLowerCase().includes(searchTerm);

        return patientIdMatch || nameMatch || emailMatch || phoneMatch;
    });

    displayPatients(filteredPatients);
    updateStats(filteredPatients);
});

// Load data on page load
document.addEventListener('DOMContentLoaded', () => {
    loadPatientRecords();
});

// Close sidebar when clicking outside on mobile
document.addEventListener('click', (e) => {
    const sidebar = document.getElementById('sidebar');
    const menuToggle = document.querySelector('.menu-toggle');
    
    if (window.innerWidth <= 768 && 
        sidebar.classList.contains('open') && 
        !sidebar.contains(e.target) && 
        !menuToggle.contains(e.target)) {
        sidebar.classList.remove('open');
    }
});