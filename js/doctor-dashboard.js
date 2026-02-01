let currentDoctor = null;
let todaysAppointments = [];
let recentPatients = [];

// Check authentication on page load
window.addEventListener('load', async () => {
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
                document.getElementById('welcomeMessage').textContent = `Welcome back, Dr. ${data.user.name}!`;
                document.getElementById('doctorId').textContent = `${data.user.user_id}`;
                
                // Load all data
                await Promise.all([
                    loadTodaysAppointments(),
                    loadRecentPatients()
                ]);
            }
        } else {
            window.location.replace('/login.html');
        }
    } catch (error) {
        console.error('Error fetching user data:', error);
        window.location.replace('/login.html');
    }
});

// Load today's appointments
async function loadTodaysAppointments() {
    try {
        const response = await fetch('http://localhost:5001/api/appointments', {
            credentials: 'include'
        });

        const data = await response.json();

        if (response.ok && data.success) {
            todaysAppointments = data.appointments;
            
            // Filter for today's appointments
            const today = new Date().toISOString().split('T')[0];
            const todayAppointments = data.appointments.filter(apt => {
                return apt.appointment_date && apt.appointment_date.startsWith(today);
            });

            // Get unique patients count from ALL appointments
            const uniquePatients = new Set(data.appointments.map(apt => apt.patient_id));
            const totalUniquePatients = uniquePatients.size;

            // Calculate stats
            const stats = {
                today: todayAppointments.length,
                totalPatients: totalUniquePatients,
                completed: todayAppointments.filter(apt => apt.status === 'completed').length,
                pending: todayAppointments.filter(apt => apt.status === 'pending').length
            };

            updateDashboardStats(stats);
            displayTodaysAppointments(todayAppointments);
        } else {
            console.error('Failed to load appointments:', data);
            displayTodaysAppointments([]);
        }
    } catch (error) {
        console.error('Error loading appointments:', error);
        displayTodaysAppointments([]);
    }
}

// Load recent patients - with detailed logging
async function loadRecentPatients() {
    console.log('\n🔵 FRONTEND: Loading recent patients...');
    
    try {
        const response = await fetch('http://localhost:5001/api/doctor/recent-patients', {
            credentials: 'include'
        });

        const data = await response.json();
        
        console.log('🔵 FRONTEND: Response received');
        console.log('Success:', data.success);
        console.log('Patients count:', data.patients ? data.patients.length : 0);
        console.log('Full data:', JSON.stringify(data, null, 2));

        if (response.ok && data.success) {
            recentPatients = data.patients.slice(0, 3);
            console.log('🔵 FRONTEND: About to display', recentPatients.length, 'patients');
            displayRecentPatients(recentPatients);
        } else {
            console.error('🔴 FRONTEND: Failed to load recent patients:', data);
            displayRecentPatients([]);
        }
    } catch (error) {
        console.error('🔴 FRONTEND: Error loading recent patients:', error);
        displayRecentPatients([]);
    }
}

// Update dashboard statistics
function updateDashboardStats(stats) {
    document.querySelector('.stat-card:nth-child(1) .stat-value').textContent = stats.today;
    document.querySelector('.stat-card:nth-child(2) .stat-value').textContent = stats.totalPatients;
    document.querySelector('.stat-card:nth-child(3) .stat-value').textContent = stats.completed;
    document.querySelector('.stat-card:nth-child(4) .stat-value').textContent = stats.pending;
}

// Display today's appointments with scrollable container
function displayTodaysAppointments(appointments) {
    const container = document.querySelector('.card:first-of-type');
    
    if (!container) {
        console.error('Appointments container not found');
        return;
    }

    const cardHeader = container.querySelector('.card-header');
    const viewAllBtn = container.querySelector('.btn-view-all');
    
    // Remove loading message
    const loadingDiv = container.querySelector('.empty-appointments');
    if (loadingDiv) {
        loadingDiv.remove();
    }

    // Remove existing scroll container if it exists
    const existingScrollContainer = container.querySelector('.appointments-scroll-container');
    if (existingScrollContainer) {
        existingScrollContainer.remove();
    }
    
    if (!appointments || appointments.length === 0) {
        const emptyDiv = document.createElement('div');
        emptyDiv.className = 'empty-appointments';
        emptyDiv.style.cssText = 'text-align: center; padding: 40px 20px; color: #999;';
        emptyDiv.innerHTML = `
            <svg viewBox="0 0 24 24" fill="currentColor" width="48" height="48" style="opacity: 0.3; margin-bottom: 10px;">
                <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zM7 12h5v5H7z"/>
            </svg>
            <p>No appointments scheduled for today</p>
        `;
        
        if (viewAllBtn && viewAllBtn.previousSibling) {
            container.insertBefore(emptyDiv, viewAllBtn);
        } else {
            container.appendChild(emptyDiv);
        }
        return;
    }

    // Sort appointments by time
    appointments.sort((a, b) => {
        if (!a.appointment_time) return 1;
        if (!b.appointment_time) return -1;
        return a.appointment_time.localeCompare(b.appointment_time);
    });

    // Create scrollable container for ALL appointments
    const scrollContainer = document.createElement('div');
    scrollContainer.className = 'appointments-scroll-container';
    
    appointments.forEach(apt => {
        const div = document.createElement('div');
        div.className = 'appointment-item';
        div.innerHTML = `
            <div class="appointment-time">
                <div class="time">${apt.appointment_time || 'No Time'}</div>
                <div class="duration">30 min</div>
            </div>
            <div class="appointment-details">
                <h4>${apt.patient_name}</h4>
                <p>${apt.patient_id}</p>
                <span class="badge ${apt.status === 'completed' ? 'badge-confirmed' : 'badge-pending'}">
                    ${apt.status.charAt(0).toUpperCase() + apt.status.slice(1)}
                </span>
            </div>
        `;
        scrollContainer.appendChild(div);
    });

    // Insert scrollable container after card header
    if (cardHeader && cardHeader.nextSibling) {
        container.insertBefore(scrollContainer, cardHeader.nextSibling);
    } else {
        container.appendChild(scrollContainer);
    }
    
    // Make sure view all button is at the end
    if (viewAllBtn) {
        container.appendChild(viewAllBtn);
    }
}

// Display recent patients - with detailed logging
function displayRecentPatients(patients) {
    console.log('\n🟢 DISPLAY: Starting to display patients');
    console.log('Patients received:', patients);
    
    const container = document.querySelector('.card:last-of-type');
    
    if (!container) {
        console.error('🔴 DISPLAY: Container not found!');
        return;
    }

    const cardHeader = container.querySelector('.card-header');
    const viewAllBtn = container.querySelector('.btn-view-all');

    // Remove loading message
    const loadingDiv = container.querySelector('.empty-appointments');
    if (loadingDiv) {
        loadingDiv.remove();
    }

    // Remove existing patient items
    const existingItems = container.querySelectorAll('.patient-item');
    existingItems.forEach(item => item.remove());

    if (!patients || patients.length === 0) {
        console.log('🟡 DISPLAY: No patients to display');
        const emptyDiv = document.createElement('div');
        emptyDiv.className = 'empty-appointments';
        emptyDiv.style.cssText = 'text-align: center; padding: 40px 20px; color: #999;';
        emptyDiv.innerHTML = `
            <svg viewBox="0 0 24 24" fill="currentColor" width="48" height="48" style="opacity: 0.3; margin-bottom: 10px;">
                <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
            </svg>
            <p>No patients yet</p>
        `;
        
        if (viewAllBtn && viewAllBtn.previousSibling) {
            container.insertBefore(emptyDiv, viewAllBtn);
        } else {
            container.appendChild(emptyDiv);
        }
        return;
    }

    console.log('🟢 DISPLAY: Creating patient cards...');
    const fragment = document.createDocumentFragment();

    patients.forEach((patient, index) => {
        console.log(`\n🟢 DISPLAY: Processing patient ${index + 1}`);
        console.log('  Raw patient object:', patient);
        console.log('  patient_name:', patient.patient_name);
        console.log('  last_appointment:', patient.last_appointment);
        console.log('  Type of last_appointment:', typeof patient.last_appointment);
        console.log('  Is null?:', patient.last_appointment === null);
        console.log('  Is undefined?:', patient.last_appointment === undefined);
        
        const initials = patient.patient_name
            .split(' ')
            .map(word => word[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);

        console.log('  Calling formatLastVisit with:', patient.last_appointment);
        const lastVisit = formatLastVisit(patient.last_appointment);
        console.log('  formatLastVisit returned:', lastVisit);

        const div = document.createElement('div');
        div.className = 'patient-item';
        div.innerHTML = `
            <div class="patient-avatar">${initials}</div>
            <div class="patient-info">
                <h4>${patient.patient_name}</h4>
                <p>Last visited: ${lastVisit}</p>
            </div>
            <button class="btn-action" onclick="viewPatient('${patient.patient_id}')">View</button>
        `;
        fragment.appendChild(div);
    });

    if (cardHeader && cardHeader.nextSibling) {
        container.insertBefore(fragment, cardHeader.nextSibling);
    } else {
        container.appendChild(fragment);
    }

    if (viewAllBtn) {
        container.appendChild(viewAllBtn);
    }
    
    console.log('🟢 DISPLAY: Done displaying patients\n');
}

// Updated formatLastVisit function with extensive logging
function formatLastVisit(dateString) {
    console.log('    📅 formatLastVisit called');
    console.log('      Input:', dateString);
    console.log('      Type:', typeof dateString);
    console.log('      Value:', JSON.stringify(dateString));
    
    if (!dateString || dateString === null || dateString === 'null' || dateString === undefined) {
        console.log('      ❌ Returning "Never" - falsy value');
        return 'Never';
    }
    
    try {
        // If it's already a Date object
        let date;
        if (dateString instanceof Date) {
            date = dateString;
            console.log('      ✓ Already a Date object');
        } else {
            date = new Date(dateString);
            console.log('      ✓ Created Date object:', date);
        }
        
        // Check if date is valid
        if (isNaN(date.getTime())) {
            console.error('      ❌ Invalid date - returning Never');
            return 'Never';
        }
        
        const now = new Date();
        const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        const nowOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        const diffTime = nowOnly - dateOnly;
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        
        console.log('      Days difference:', diffDays);
        
        let result;
        if (diffDays === 0) result = 'Today';
        else if (diffDays === 1) result = 'Yesterday';
        else if (diffDays < 7) result = `${diffDays} days ago`;
        else if (diffDays < 30) {
            const weeks = Math.floor(diffDays / 7);
            result = `${weeks} week${weeks > 1 ? 's' : ''} ago`;
        } else if (diffDays < 365) {
            const months = Math.floor(diffDays / 30);
            result = `${months} month${months > 1 ? 's' : ''} ago`;
        } else {
            const years = Math.floor(diffDays / 365);
            result = `${years} year${years > 1 ? 's' : ''} ago`;
        }
        
        console.log('      ✓ Returning:', result);
        return result;
    } catch (error) {
        console.error('      ❌ Error formatting date:', error);
        return 'Never';
    }
}

// View patient details
function viewPatient(patientId) {
    window.location.href = `patients.html`;
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

// Logout functions
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
        } else {
            alert('Logout failed. Please try again.');
        }
    } catch (error) {
        console.error('Logout error:', error);
        alert('Logout failed. Please try again.');
    }
}

// Close alert when clicking outside
document.getElementById('customAlert').addEventListener('click', function(e) {
    if (e.target === this) {
        closeCustomAlert();
    }
});