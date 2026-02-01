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
            }
        } else {
            window.location.replace('/login.html');
        }
    } catch (error) {
        console.error('Error fetching user data:', error);
        window.location.replace('/login.html');
    }
});

// Show/hide clear button
document.getElementById('searchInput').addEventListener('input', function() {
    const clearBtn = document.getElementById('clearBtn');
    clearBtn.style.display = this.value ? 'flex' : 'none';
});

// Search on Enter key
document.getElementById('searchInput').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        searchPatient();
    }
});

async function searchPatient() {
    const searchInput = document.getElementById('searchInput');
    const patientId = searchInput.value.trim();

    if (!patientId) {
        showAlert('warning', 'Input Required', 'Please enter a Patient ID');
        return;
    }

    if (!patientId.toUpperCase().startsWith('PID-')) {
        showAlert('warning', 'Invalid Format', 'Patient ID must start with "PID-"');
        return;
    }

    // Show loading
    document.getElementById('emptyState').style.display = 'none';
    document.getElementById('resultsSection').style.display = 'block';
    document.getElementById('loadingSpinner').style.display = 'flex';
    document.getElementById('patientDetails').style.display = 'none';

    try {
        const response = await fetch(`http://localhost:5001/api/search-patient/${encodeURIComponent(patientId)}`, {
            credentials: 'include'
        });

        const data = await response.json();

        document.getElementById('loadingSpinner').style.display = 'none';

        if (response.ok && data.success) {
            await displayPatientDetails(data.patient);
        } else {
            document.getElementById('resultsSection').style.display = 'none';
            document.getElementById('emptyState').style.display = 'flex';
            showAlert('warning', 'Patient Not Found', data.message || 'No patient found with this ID');
        }
    } catch (error) {
        console.error('Search error:', error);
        document.getElementById('loadingSpinner').style.display = 'none';
        document.getElementById('resultsSection').style.display = 'none';
        document.getElementById('emptyState').style.display = 'flex';
        showAlert('warning', 'Error', 'Failed to search patient. Please try again.');
    }
}

async function displayPatientDetails(patient) {
    const detailsDiv = document.getElementById('patientDetails');
    const profile = patient.profile;

    // Fetch documents
    let documentsHTML = '';
    try {
        const docsResponse = await fetch(`http://localhost:5001/api/patient-documents/${patient.user_id}`, {
            credentials: 'include'
        });

        if (docsResponse.ok) {
            const docsData = await docsResponse.json();
            if (docsData.success && docsData.documents.length > 0) {
                documentsHTML = `
                    <div class="patient-section">
                        <div class="section-header-with-button">
                            <h4 class="section-title">Medical Documents (${docsData.documents.length})</h4>
                            <!-- <button onclick="showUploadModal('${patient.user_id}')" class="btn-upload-doc">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                    <polyline points="17 8 12 3 7 8"></polyline>
                                    <line x1="12" y1="3" x2="12" y2="15"></line>
                                </svg>
                                Upload Document
                            </button> -->
                        </div>
                        <div class="documents-list">
                            ${docsData.documents.map(doc => `
                                <div class="document-item">
                                    <div class="document-left">
                                        <div class="document-icon-wrapper">
                                            <svg viewBox="0 0 24 24" fill="currentColor">
                                                <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
                                            </svg>
                                        </div>
                                        <div class="document-details">
                                            <div class="document-name">${doc.document_name}</div>
                                            <div class="document-metadata">
                                                <span class="upload-badge ${doc.uploaded_by_role}">
                                                    ${doc.uploaded_by_role === 'patient' ? '👤 Patient' : '👨‍⚕️ Doctor'}
                                                </span>
                                                <span class="separator">•</span>
                                                <span class="uploader-info">
                                                    ${doc.uploaded_by_role === 'doctor' ? doc.uploaded_by_name + ' (' + doc.uploaded_by_id + ')' : doc.uploaded_by_name}
                                                </span>
                                                <span class="separator">•</span>
                                                <span class="upload-date">
                                                    ${new Date(doc.uploaded_at).toLocaleDateString('en-US', { 
                                                        year: 'numeric', 
                                                        month: 'short', 
                                                        day: 'numeric'
                                                    })}
                                                </span>
                                            </div>
                                            ${doc.notes ? `<div class="document-notes">${doc.notes}</div>` : ''}
                                        </div>
                                    </div>
                                    <button onclick="downloadDocument('${patient.user_id}', '${doc.document_id}', '${doc.document_name}')" class="btn-download-doc">
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                            <polyline points="7 10 12 15 17 10"></polyline>
                                            <line x1="12" y1="15" x2="12" y2="3"></line>
                                        </svg>
                                        Download
                                    </button>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `;
            } else {
                documentsHTML = `
                    <div class="patient-section">
                        <div class="section-header-with-button">
                            <h4 class="section-title">Medical Documents</h4>
                            <button onclick="showUploadModal('${patient.user_id}')" class="btn-upload-doc">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                    <polyline points="17 8 12 3 7 8"></polyline>
                                    <line x1="12" y1="3" x2="12" y2="15"></line>
                                </svg>
                                Upload Document
                            </button>
                        </div>
                        <div class="empty-documents">
                            <svg viewBox="0 0 24 24" fill="currentColor" width="64" height="64">
                                <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
                            </svg>
                            <p>No medical documents found</p>
                            <span>Upload documents for this patient</span>
                        </div>
                    </div>
                `;
            }
        }
    } catch (error) {
        console.error('Error fetching documents:', error);
    }

    detailsDiv.innerHTML = `
        <div class="patient-card">
            <div class="patient-header">
                <div class="patient-avatar">
                    ${patient.name.charAt(0).toUpperCase()}
                </div>
                <div class="patient-info">
                    <h3 class="patient-name">${patient.name}</h3>
                    <p class="patient-id">${patient.user_id}</p>
                </div>
            </div>

            <div class="patient-section">
                <h4 class="section-title">Contact Information</h4>
                <div class="patient-grid">
                    <div class="detail-item">
                        <svg class="detail-icon" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
                        </svg>
                        <div>
                            <span class="detail-label">Email</span>
                            <span class="detail-value">${patient.email}</span>
                        </div>
                    </div>

                    <div class="detail-item">
                        <svg class="detail-icon" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
                        </svg>
                        <div>
                            <span class="detail-label">Phone</span>
                            <span class="detail-value">${patient.phone}</span>
                        </div>
                    </div>
                </div>
            </div>

            ${profile ? `
                <div class="patient-section">
                    <h4 class="section-title">Personal Information</h4>
                    <div class="patient-grid">
                        <div class="detail-item">
                            <svg class="detail-icon" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/>
                            </svg>
                            <div>
                                <span class="detail-label">Age</span>
                                <span class="detail-value">${profile.age} years</span>
                            </div>
                        </div>

                        <div class="detail-item">
                            <svg class="detail-icon" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                            </svg>
                            <div>
                                <span class="detail-label">Gender</span>
                                <span class="detail-value">${profile.gender}</span>
                            </div>
                        </div>

                        <div class="detail-item">
                            <svg class="detail-icon" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M19 3h-4.18C14.4 1.84 13.3 1 12 1c-1.3 0-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm2 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
                            </svg>
                            <div>
                                <span class="detail-label">Blood Group</span>
                                <span class="detail-value">${profile.blood_group}</span>
                            </div>
                        </div>

                        <div class="detail-item">
                            <svg class="detail-icon" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                            </svg>
                            <div>
                                <span class="detail-label">Weight</span>
                                <span class="detail-value">${profile.weight} kg</span>
                            </div>
                        </div>

                        <div class="detail-item">
                            <svg class="detail-icon" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                            </svg>
                            <div>
                                <span class="detail-label">Height</span>
                                <span class="detail-value">${profile.height} cm</span>
                            </div>
                        </div>

                        <div class="detail-item full-width">
                            <svg class="detail-icon" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                            </svg>
                            <div>
                                <span class="detail-label">Address</span>
                                <span class="detail-value">${profile.address || 'Not provided'}</span>
                            </div>
                        </div>
                    </div>
                </div>

                ${profile.medical_history ? `
                    <div class="patient-section">
                        <h4 class="section-title">Medical History</h4>
                        <div class="medical-history">
                            <p>${profile.medical_history}</p>
                        </div>
                    </div>
                ` : ''}
            ` : `
                <div class="no-profile">
                    <p>Patient profile is incomplete. Basic information only.</p>
                </div>
            `}

            ${documentsHTML}
        </div>
    `;

    detailsDiv.style.display = 'block';
}

function showUploadModal(patientId) {
    const modal = document.createElement('div');
    modal.id = 'uploadModal';
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-box">
            <div class="modal-header">
                <h3>Upload Medical Document</h3>
                <button class="close-modal" onclick="closeUploadModal()">×</button>
            </div>
            <div class="modal-content">
                <p class="upload-hint">Upload a PDF document for this patient</p>
                
                <div class="file-input-wrapper">
                    <input type="file" id="docFile" accept=".pdf" onchange="handleDocumentSelect()" style="display: none;">
                    <label for="docFile" class="file-label">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="17 8 12 3 7 8"></polyline>
                            <line x1="12" y1="3" x2="12" y2="15"></line>
                        </svg>
                        Choose PDF File
                    </label>
                </div>

                <div id="selectedFile" class="selected-file"></div>

                <div class="notes-section">
                    <label>Notes (Optional)</label>
                    <textarea id="docNotes" rows="4" placeholder="Add any notes about this document..."></textarea>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn-modal-cancel" onclick="closeUploadModal()">Cancel</button>
                <button class="btn-modal-complete" onclick="uploadDocument('${patientId}')">Upload Document</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

function handleDocumentSelect() {
    const fileInput = document.getElementById('docFile');
    const selectedFileDiv = document.getElementById('selectedFile');
    
    if (fileInput.files.length > 0) {
        const file = fileInput.files[0];
        const fileSizeKB = (file.size / 1024).toFixed(2);
        
        selectedFileDiv.innerHTML = `
            <div class="file-item">
                <div class="file-info">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11z"/>
                    </svg>
                    <div>
                        <div class="file-name">${file.name}</div>
                        <div class="file-size">${fileSizeKB} KB</div>
                    </div>
                </div>
                <button class="remove-file" onclick="removeSelectedFile()">Remove</button>
            </div>
        `;
        selectedFileDiv.style.display = 'block';
    }
}

function removeSelectedFile() {
    document.getElementById('docFile').value = '';
    document.getElementById('selectedFile').innerHTML = '';
    document.getElementById('selectedFile').style.display = 'none';
}

function closeUploadModal() {
    const modal = document.getElementById('uploadModal');
    if (modal) {
        modal.remove();
    }
}

async function uploadDocument(patientId) {
    const fileInput = document.getElementById('docFile');
    const notesInput = document.getElementById('docNotes');

    if (!fileInput.files.length) {
        showAlert('warning', 'No File Selected', 'Please select a PDF file to upload');
        return;
    }

    const formData = new FormData();
    formData.append('document', fileInput.files[0]);
    formData.append('notes', notesInput.value);

    try {
        const response = await fetch(`http://localhost:5001/api/patient-documents/${patientId}/upload`, {
            method: 'POST',
            credentials: 'include',
            body: formData
        });

        const data = await response.json();

        if (response.ok && data.success) {
            closeUploadModal();
            showAlert('success', 'Success', 'Document uploaded successfully');
            // Refresh patient details
            searchPatient();
        } else {
            showAlert('warning', 'Upload Failed', data.message || 'Failed to upload document');
        }
    } catch (error) {
        console.error('Upload error:', error);
        showAlert('warning', 'Error', 'Failed to upload document. Please try again.');
    }
}

async function downloadDocument(patientId, documentId, fileName) {
    try {
        const response = await fetch(`http://localhost:5001/api/patient-documents/${patientId}/${documentId}/download`, {
            credentials: 'include'
        });

        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } else {
            showAlert('warning', 'Download Failed', 'Failed to download document');
        }
    } catch (error) {
        console.error('Download error:', error);
        showAlert('warning', 'Error', 'Failed to download document');
    }
}

function clearSearch() {
    document.getElementById('searchInput').value = '';
    document.getElementById('clearBtn').style.display = 'none';
    document.getElementById('resultsSection').style.display = 'none';
    document.getElementById('emptyState').style.display = 'flex';
}

function showAlert(type, title, message) {
    const overlay = document.getElementById('customAlert');
    const icon = document.getElementById('alertIcon');
    const titleEl = document.getElementById('alertTitle');
    const messageEl = document.getElementById('alertMessage');
    const buttons = document.getElementById('alertButtons');

    icon.className = `custom-alert-icon ${type}`;
    icon.textContent = type === 'warning' ? '⚠' : type === 'success' ? '✓' : 'ℹ';
    titleEl.textContent = title;
    messageEl.textContent = message;
    
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