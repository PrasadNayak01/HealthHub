let currentPatient = null;

// Check authentication on page load
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
                currentPatient = data.user;
                document.getElementById('welcomeMessage').textContent = `Welcome back, ${data.user.name}!`;
                document.getElementById('patientId').textContent = data.user.user_id;
                
                // Load all dashboard data
                await Promise.all([
                    loadProfileStatus(),
                    loadDashboardStats(),
                    loadRecentReports(),
                    loadPersonalDetails()
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

// ✅ Load profile completion status
async function loadProfileStatus() {
    try {
        const response = await fetch('http://localhost:5001/api/patient-profile', {
            credentials: 'include'
        });

        if (response.ok) {
            const data = await response.json();
            const statusDiv = document.getElementById('profileStatus');
            
            if (data.profile && data.profile.age && data.profile.gender && 
                data.profile.weight && data.profile.height && data.profile.blood_group) {
                statusDiv.textContent = 'Complete';
                statusDiv.style.color = '#10b981';
            } else {
                statusDiv.textContent = 'Incomplete';
                statusDiv.style.color = '#f59e0b';
            }
        }
    } catch (error) {
        console.error('Error loading profile status:', error);
        const statusDiv = document.getElementById('profileStatus');
        statusDiv.textContent = 'Incomplete';
        statusDiv.style.color = '#f59e0b';
    }
}

// ✅ Load personal details
async function loadPersonalDetails() {
    try {
        const response = await fetch('http://localhost:5001/api/patient-profile', {
            credentials: 'include'
        });

        if (response.ok) {
            const data = await response.json();
            if (data.success && data.profile) {
                const profile = data.profile;
                
                // Update personal details in the dashboard
                document.getElementById('ageValue').textContent = 
                    profile.age ? `${profile.age} years` : '--';
                document.getElementById('genderValue').textContent = 
                    profile.gender || '--';
                document.getElementById('weightValue').textContent = 
                    profile.weight ? `${profile.weight} kg` : '--';
                document.getElementById('heightValue').textContent = 
                    profile.height ? `${profile.height} cm` : '--';
                document.getElementById('bloodGroupValue').textContent = 
                    profile.blood_group || '--';
            } else {
                console.log('No profile data available');
            }
        }
    } catch (error) {
        console.error('Error loading personal details:', error);
    }
}

// ✅ Load dashboard statistics
async function loadDashboardStats() {
    try {
        const response = await fetch('http://localhost:5001/api/patient/dashboard-stats', {
            credentials: 'include'
        });

        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                // Update Reports count
                document.querySelector('.stat-card:nth-child(2) .stat-value').textContent = 
                    data.stats.totalReports || 0;
                
                // Update Appointments count
                document.querySelector('.stat-card:nth-child(3) .stat-value').textContent = 
                    data.stats.totalAppointments || 0;
                
                // Update Doctors count
                document.querySelector('.stat-card:nth-child(4) .stat-value').textContent = 
                    data.stats.uniqueDoctors || 0;
            }
        }
    } catch (error) {
        console.error('Error loading dashboard stats:', error);
    }
}

// ✅ Load recent reports - FIXED
async function loadRecentReports() {
    try {
        // Fixed: Use correct endpoint without patient ID in URL
        const response = await fetch('http://localhost:5001/api/patient/documents', {
            credentials: 'include'
        });

        if (response.ok) {
            const data = await response.json();
            console.log('Documents loaded:', data); // Debug log
            
            if (data.success && data.documents && data.documents.length > 0) {
                displayRecentReports(data.documents.slice(0, 3));
            } else {
                displayEmptyReports();
            }
        } else {
            console.error('Failed to load documents:', response.status);
            displayEmptyReports();
        }
    } catch (error) {
        console.error('Error loading reports:', error);
        displayEmptyReports();
    }
}

// ✅ Display recent reports - FIXED to use uploaded_at
function displayRecentReports(reports) {
    const container = document.querySelector('.reports-list');
    
    if (!container) {
        console.error('Reports container not found');
        return;
    }
    
    container.innerHTML = '';
    
    reports.forEach(report => {
        const reportItem = document.createElement('div');
        reportItem.className = 'report-item';
        
        // Use uploaded_at instead of created_at
        const uploadDate = new Date(report.uploaded_at);
        const formattedDate = uploadDate.toISOString().split('T')[0];
        
        const doctorPrefix = report.uploaded_by_role === 'doctor' ? 'Dr. ' : '';
        
        reportItem.innerHTML = `
            <div class="report-icon">
                <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
                </svg>
            </div>
            <div class="report-info">
                <h4>${report.document_name}</h4>
                <p>${doctorPrefix}${report.uploaded_by_name} • ${formattedDate}</p>
            </div>
            <button class="btn-view" onclick="viewReport('${report.document_id}')">
                <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                </svg>
            </button>
        `;
        
        container.appendChild(reportItem);
    });
}

// ✅ Display empty state
function displayEmptyReports() {
    const container = document.querySelector('.reports-list');
    
    if (!container) {
        return;
    }
    
    container.innerHTML = `
        <div class="empty-reports" style="text-align: center; padding: 40px 20px; color: #999;">
            <svg viewBox="0 0 24 24" fill="currentColor" width="48" height="48" style="opacity: 0.3; margin-bottom: 10px;">
                <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
            </svg>
            <p>No medical reports available</p>
        </div>
    `;
}

// ✅ View report details
function viewReport(documentId) {
    window.location.href = 'medical-reports.html';
}

// Toggle sidebar
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