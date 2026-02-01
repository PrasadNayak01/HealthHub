let allReports = [];
let filteredReports = [];

// Check authentication and load reports on page load
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
                
                // Load medical reports
                await loadMedicalReports();
            }
        } else {
            // Not authenticated, redirect to login
            window.location.replace('/login.html');
        }
    } catch (error) {
        console.error('Error fetching user data:', error);
        window.location.replace('/login.html');
    }
});

// Load all medical reports - FIXED
async function loadMedicalReports() {
    const loadingContainer = document.getElementById('loadingContainer');
    const emptyState = document.getElementById('emptyState');
    const reportsGrid = document.getElementById('reportsGrid');

    try {
        console.log('Fetching all patient documents...'); // Debug log

        // FIXED: Use the correct endpoint that combines both tables
        const response = await fetch('http://localhost:5001/api/patient/documents', {
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        console.log('Response status:', response.status); // Debug log

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Error response:', errorData); // Debug log
            throw new Error(errorData.message || 'Failed to load reports');
        }

        const data = await response.json();
        console.log('Documents received:', data); // Debug log

        if (data.success) {
            allReports = data.documents || [];
            filteredReports = [...allReports];

            // Hide loading, show content
            loadingContainer.style.display = 'none';

            if (allReports.length === 0) {
                emptyState.style.display = 'block';
                reportsGrid.style.display = 'none';
            } else {
                emptyState.style.display = 'none';
                reportsGrid.style.display = 'grid';
                displayReports(filteredReports);
            }

            // Update total count
            document.getElementById('totalReports').textContent = allReports.length;
        }
    } catch (error) {
        console.error('Error loading reports:', error);
        loadingContainer.style.display = 'none';
        showAlert('Error', error.message || 'Failed to load medical reports. Please try again.', 'error');
    }
}

// Display reports in grid
function displayReports(reports) {
    const reportsGrid = document.getElementById('reportsGrid');
    reportsGrid.innerHTML = '';

    reports.forEach(report => {
        const reportCard = createReportCard(report);
        reportsGrid.appendChild(reportCard);
    });
}

// Create report card element
function createReportCard(report) {
    const card = document.createElement('div');
    card.className = 'report-card';

    const uploadDate = new Date(report.uploaded_at);
    const formattedDate = uploadDate.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
    });
    const formattedTime = uploadDate.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });

    const fileSize = formatFileSize(report.document_size);
    
    // Determine if this is a profile document
    const isProfileDoc = report.document_id === 'PROFILE_REPORT';

    card.innerHTML = `
        <div class="report-header">
            <div class="report-icon">
                <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
                </svg>
            </div>
            <div class="report-title">
                <h3>${report.document_name}</h3>
                <p class="report-filename">${report.document_name}</p>
            </div>
        </div>

        <div class="report-details">
            <div class="detail-item">
                <span class="detail-label">Uploaded By</span>
                <div class="detail-value">
                    <span class="doctor-badge">
                        ${report.uploaded_by_role === 'doctor' ? 'Dr. ' : ''}${report.uploaded_by_name}
                    </span>
                </div>
            </div>
            <div class="detail-item">
                <span class="detail-label">Role</span>
                <div class="detail-value">${report.uploaded_by_role === 'doctor' ? 'Doctor' : 'Patient (Self)'}</div>
            </div>
            <div class="detail-item">
                <span class="detail-label">Upload Date</span>
                <div class="detail-value">
                    <span class="date-badge">${formattedDate}</span>
                </div>
            </div>
            <div class="detail-item">
                <span class="detail-label">Upload Time</span>
                <div class="detail-value">${formattedTime}</div>
            </div>
        </div>

        ${report.notes ? `
            <div class="report-notes">
                <h4>Notes</h4>
                <div class="notes-content">${report.notes}</div>
            </div>
        ` : ''}

        <div class="report-meta">
            <span class="file-size">Size: ${fileSize}</span>
            <button class="btn-download" onclick="downloadReport('${report.document_id}', ${isProfileDoc})">
                <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
                </svg>
                Download
            </button>
        </div>
    `;

    return card;
}

// Format file size - FIXED: Handle null/undefined bytes
function formatFileSize(bytes) {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// Download report - FIXED to handle both document types
async function downloadReport(documentId, isProfileDoc) {
    try {
        console.log('Downloading document:', documentId, 'isProfile:', isProfileDoc); // Debug log
        
        let response;
        
        if (isProfileDoc) {
            // Download from patient profile
            response = await fetch('http://localhost:5001/api/patient-profile/medical-report/download', {
                credentials: 'include'
            });
        } else {
            // Download from patient documents - FIXED: Added /patient/ in the path
            response = await fetch(`http://localhost:5001/api/patient/document/${documentId}/download`, {
                credentials: 'include'
            });
        }

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to download report');
        }

        // Get filename from content-disposition header
        const contentDisposition = response.headers.get('content-disposition');
        let filename = 'medical-report.pdf';
        if (contentDisposition) {
            const filenameMatch = contentDisposition.match(/filename="(.+)"/);
            if (filenameMatch) {
                filename = filenameMatch[1];
            }
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        showAlert('Success', 'Report downloaded successfully!', 'success');
    } catch (error) {
        console.error('Error downloading report:', error);
        showAlert('Error', error.message || 'Failed to download report. Please try again.', 'error');
    }
}

// Filter reports
function filterReports() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();

    filteredReports = allReports.filter(report => {
        const doctorName = report.uploaded_by_name.toLowerCase();
        const notes = (report.notes || '').toLowerCase();
        const fileName = report.document_name.toLowerCase();

        return doctorName.includes(searchTerm) || 
               notes.includes(searchTerm) || 
               fileName.includes(searchTerm);
    });

    displayReports(filteredReports);

    // Show/hide empty state
    const emptyState = document.getElementById('emptyState');
    const reportsGrid = document.getElementById('reportsGrid');

    if (filteredReports.length === 0) {
        emptyState.style.display = 'block';
        reportsGrid.style.display = 'none';
        emptyState.querySelector('h3').textContent = 'No Reports Found';
        emptyState.querySelector('p').textContent = 'Try adjusting your search criteria';
    } else {
        emptyState.style.display = 'none';
        reportsGrid.style.display = 'grid';
    }
}

// Sort reports
function sortReports() {
    const sortBy = document.getElementById('sortSelect').value;

    switch (sortBy) {
        case 'date-desc':
            filteredReports.sort((a, b) => new Date(b.uploaded_at) - new Date(a.uploaded_at));
            break;
        case 'date-asc':
            filteredReports.sort((a, b) => new Date(a.uploaded_at) - new Date(b.uploaded_at));
            break;
        case 'doctor-asc':
            filteredReports.sort((a, b) => a.uploaded_by_name.localeCompare(b.uploaded_by_name));
            break;
        case 'doctor-desc':
            filteredReports.sort((a, b) => b.uploaded_by_name.localeCompare(a.uploaded_by_name));
            break;
    }

    displayReports(filteredReports);
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

// Show custom alert
function showAlert(title, message, type = 'success') {
    const overlay = document.getElementById('customAlert');
    const icon = document.getElementById('alertIcon');
    const titleElem = document.getElementById('alertTitle');
    const messageElem = document.getElementById('alertMessage');

    icon.className = `custom-alert-icon ${type}`;
    
    if (type === 'success') {
        icon.textContent = '✓';
    } else if (type === 'error') {
        icon.textContent = '✕';
    } else if (type === 'warning') {
        icon.textContent = '⚠';
    }

    titleElem.textContent = title;
    messageElem.textContent = message;

    overlay.style.display = 'block';
}

// Close custom alert
function closeCustomAlert() {
    document.getElementById('customAlert').style.display = 'none';
}

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
            showAlert('Error', 'Logout failed. Please try again.', 'error');
        }
    } catch (error) {
        console.error('Logout error:', error);
        showAlert('Error', 'Logout failed. Please try again.', 'error');
    }
}

// Close alert when clicking outside
document.getElementById('customAlert').addEventListener('click', function(e) {
    if (e.target === this) {
        closeCustomAlert();
    }
});