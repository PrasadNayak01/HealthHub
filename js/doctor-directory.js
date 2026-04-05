let allDoctors = [];
let currentSearchTerm = '';
let selectedDoctor = null;

const MORNING_START = 10 * 60;
const MORNING_END   = 14 * 60;
const EVENING_START = 18 * 60;
const EVENING_END   = 23 * 60;
const SLOT_DURATION = 30;

function generateAllSlots() {
  const slots = [];
  for (let t = MORNING_START; t < MORNING_END; t += SLOT_DURATION) slots.push(minutesToTime(t));
  for (let t = EVENING_START; t < EVENING_END; t += SLOT_DURATION) slots.push(minutesToTime(t));
  return slots;
}

function minutesToTime(minutes) {
  const h = Math.floor(minutes / 60).toString().padStart(2, '0');
  const m = (minutes % 60).toString().padStart(2, '0');
  return h + ':' + m + ':00';
}

function formatDisplayTime(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return 'N/A';
  const parts = timeStr.split(':');
  const h = parseInt(parts[0]);
  const m = parseInt(parts[1]);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return hour12 + ':' + m.toString().padStart(2, '0') + ' ' + period;
}

window.addEventListener('load', async () => {
  try {
    const response = await fetch('http://localhost:5001/api/current-user', { credentials: 'include' });
    if (response.ok) {
      const data = await response.json();
      if (data.success && data.user) {
        if (data.user.role !== 'patient') { window.location.replace('/doctor-dashboard.html'); return; }
        loadDoctors();
      }
    } else {
      window.location.replace('/login.html');
    }
  } catch (error) {
    window.location.replace('/login.html');
  }
});

async function loadDoctors() {
  try {
    document.getElementById('loadingSpinner').style.display = 'flex';
    document.getElementById('doctorsGrid').style.display = 'none';
    document.getElementById('noResults').style.display = 'none';
    const response = await fetch('http://localhost:5001/api/doctors', { credentials: 'include' });
    if (response.ok) {
      const data = await response.json();
      if (data.success) { allDoctors = data.doctors; displayDoctors(allDoctors); }
    }
  } catch (error) {
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
  resultsCount.textContent = doctors.length + ' doctor' + (doctors.length !== 1 ? 's' : '') + ' found';
  grid.innerHTML = doctors.map(function(doctor) {
    const doctorJson = JSON.stringify(doctor).replace(/"/g, '&quot;');
    return '<div class="doctor-card">' +
      '<div class="doctor-header">' +
        '<div class="doctor-avatar">' + doctor.name.charAt(0).toUpperCase() + '</div>' +
        '<div class="doctor-info">' +
          '<h3 class="doctor-name">Dr. ' + doctor.name + '</h3>' +
          '<p class="doctor-specialty">' + (doctor.speciality || 'General Physician') + '</p>' +
        '</div>' +
      '</div>' +
      '<div class="doctor-details">' +
        '<div class="detail-item">' +
          '<svg class="detail-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>' +
          '<div><span class="detail-label">Degree</span><span class="detail-value">' + (doctor.degree || 'Not specified') + '</span></div>' +
        '</div>' +
        '<div class="detail-item">' +
          '<svg class="detail-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg>' +
          '<div><span class="detail-label">Experience</span><span class="detail-value">' + (doctor.experience || 0) + ' years</span></div>' +
        '</div>' +
        '<div class="detail-item">' +
          '<svg class="detail-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1 1.05.82 1.87 2.65 1.87 1.96 0 2.4-.98 2.4-1.59 0-.83-.44-1.61-2.67-2.14-2.48-.6-4.18-1.62-4.18-3.67 0-1.72 1.39-2.84 3.11-3.21V4h2.67v1.95c1.86.45 2.79 1.86 2.85 3.39H14.3c-.05-1.11-.64-1.87-2.22-1.87-1.5 0-2.4.68-2.4 1.64 0 .84.65 1.39 2.67 1.91s4.18 1.39 4.18 3.91c-.01 1.83-1.38 2.83-3.12 3.16z"/></svg>' +
          '<div><span class="detail-label">Consultation Fee</span><span class="detail-value">&#8377;' + (doctor.consultation_fee || 'N/A') + '</span></div>' +
        '</div>' +
        '<div class="detail-item">' +
          '<svg class="detail-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>' +
          '<div><span class="detail-label">Email</span><span class="detail-value">' + (doctor.email || 'Not provided') + '</span></div>' +
        '</div>' +
        '<div class="detail-item">' +
          '<svg class="detail-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>' +
          '<div><span class="detail-label">Phone</span><span class="detail-value">' + (doctor.phone || 'Not provided') + '</span></div>' +
        '</div>' +
        '<div class="detail-item full-width">' +
          '<svg class="detail-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>' +
          '<div><span class="detail-label">Address</span><span class="detail-value">' + (doctor.address || 'Not specified') + '</span></div>' +
        '</div>' +
      '</div>' +
      '<div class="doctor-actions">' +
        '<button class="btn-book" onclick="openBookingModal(' + doctorJson + ')">' +
          '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17 12h-5v5h5v-5zM16 1v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-1V1h-2zm3 18H5V8h14v11z"/></svg>' +
          'Book Appointment' +
        '</button>' +
      '</div>' +
    '</div>';
  }).join('');
}

// BOOKING MODAL

function openBookingModal(doctor) {
  selectedDoctor = doctor;
  document.getElementById('bookingDoctorName').textContent = 'Dr. ' + doctor.name;
  document.getElementById('bookingDoctorSpecialty').textContent = doctor.speciality || 'General Physician';
  document.getElementById('bookingDoctorFee').textContent = '₹' + (doctor.consultation_fee || 'N/A');
  const today = new Date().toISOString().split('T')[0];
  const dateInput = document.getElementById('bookingDate');
  dateInput.min = today;
  dateInput.value = '';
  document.getElementById('timeSlotsContainer').innerHTML = '<p class="slots-placeholder">Please select a date to see available slots</p>';
  document.getElementById('selectedTimeSlot').value = '';
  document.getElementById('bookingModal').classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeBookingModal() {
  document.getElementById('bookingModal').classList.remove('active');
  document.body.style.overflow = '';
}

async function onDateChange() {
  const date = document.getElementById('bookingDate').value;
  if (!date || !selectedDoctor) return;
  document.getElementById('timeSlotsContainer').innerHTML =
    '<div class="slots-loading"><div class="spinner-small"></div><span>Loading available slots...</span></div>';
  document.getElementById('selectedTimeSlot').value = '';
  try {
    const response = await fetch(
      'http://localhost:5001/api/patient/booked-slots?doctorId=' + selectedDoctor.user_id + '&date=' + date,
      { credentials: 'include' }
    );
    const data = await response.json();
    renderTimeSlots(data.success ? data.bookedSlots : []);
  } catch (err) {
    renderTimeSlots([]);
  }
}

function renderTimeSlots(bookedSlots) {
  const allSlots = generateAllSlots();
  const container = document.getElementById('timeSlotsContainer');
  const morningSlots = allSlots.filter(function(s) { const h = parseInt(s.split(':')[0]); return h >= 10 && h < 14; });
  const eveningSlots = allSlots.filter(function(s) { const h = parseInt(s.split(':')[0]); return h >= 18; });

  function renderGroup(slots) {
    return slots.map(function(slot) {
      const booked = bookedSlots.includes(slot);
      if (booked) {
        return '<button class="time-slot slot-booked" disabled>' + formatDisplayTime(slot) + '<span class="booked-badge">Booked</span></button>';
      }
      return '<button class="time-slot slot-available" onclick="selectSlot(\'' + slot + '\', this)">' + formatDisplayTime(slot) + '</button>';
    }).join('');
  }

  container.innerHTML =
    '<div class="slots-group">' +
      '<div class="slots-group-label">&#9728; Morning (10:00 AM &ndash; 2:00 PM)</div>' +
      '<div class="slots-grid">' + renderGroup(morningSlots) + '</div>' +
    '</div>' +
    '<div class="slots-group">' +
      '<div class="slots-group-label">&#9790; Evening (6:00 PM &ndash; 11:00 PM)</div>' +
      '<div class="slots-grid">' + renderGroup(eveningSlots) + '</div>' +
    '</div>';
}

function selectSlot(timeStr, btn) {
  document.querySelectorAll('.time-slot.slot-selected').forEach(function(el) { el.classList.remove('slot-selected'); });
  btn.classList.add('slot-selected');
  document.getElementById('selectedTimeSlot').value = timeStr;
}

// CONFIRM BOOKING

async function confirmBooking() {
  const date = document.getElementById('bookingDate').value;
  const time = document.getElementById('selectedTimeSlot').value;
  if (!date) { showAlert('warning', 'Select Date', 'Please select an appointment date.'); return; }
  if (!time) { showAlert('warning', 'Select Time', 'Please select a time slot.'); return; }

  // Hide booking modal BEFORE opening payment modal (fixes z-index overlap bug)
  document.getElementById('bookingModal').classList.remove('active');

  openPaymentModal(date, time);
}

// PAYMENT STATE

let _pendingDate = null;
let _pendingTime = null;
let _currentAppointmentId = null;

function openPaymentModal(date, time) {
  _pendingDate = date;
  _pendingTime = time;
  _currentAppointmentId = null;

  const fee = selectedDoctor.consultation_fee || 0;
  document.getElementById('payFee').textContent = '₹' + fee;
  document.getElementById('payDoctorName').textContent = 'Dr. ' + selectedDoctor.name;
  document.getElementById('payDate').textContent = formatDate(date);
  document.getElementById('payTime').textContent = formatDisplayTime(time);

  document.getElementById('paymentModal').classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closePaymentModal() {
  document.getElementById('paymentModal').classList.remove('active');
  document.body.style.overflow = '';
}

function clearPendingBooking() {
  _pendingDate = null;
  _pendingTime = null;
  _currentAppointmentId = null;
}

// BOOK APPOINTMENT — used by CASH only

async function bookAppointmentStep() {
  if (_currentAppointmentId) return _currentAppointmentId;

  const bookRes = await fetch('http://localhost:5001/api/patient/book-appointment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      doctorId: selectedDoctor.user_id,
      appointmentDate: _pendingDate,
      appointmentTime: _pendingTime
    })
  });
  const bookData = await bookRes.json();

  if (!bookData.success) {
    if (bookRes.status === 409) {
      showAlert('warning', 'Slot Unavailable', 'This slot was just booked. Please choose another.');
      closePaymentModal();
      // Re-open booking modal so user can pick another slot
      document.getElementById('bookingModal').classList.add('active');
      onDateChange();
      return null;
    }
    showAlert('warning', 'Booking Failed', bookData.message || 'Booking failed. Please try again.');
    return null;
  }

  _currentAppointmentId = bookData.appointmentId;
  return _currentAppointmentId;
}

// CASH PAYMENT

async function choosePayment(method) {
  if (method === 'cash') {
    await handleCashPayment();
  } else {
    await handleOnlinePayment();
  }
}

async function handleCashPayment() {
  const btns = document.querySelectorAll('.btn-pay-cash, .btn-pay-online');
  btns.forEach(b => b.disabled = true);

  const snapshotDate = _pendingDate;
  const snapshotTime = _pendingTime;
  const doctorName = selectedDoctor ? selectedDoctor.name : '';
  const doctorId = selectedDoctor ? selectedDoctor.user_id : '';
  const fee = selectedDoctor ? (selectedDoctor.consultation_fee || 0) : 0;

  try {
    // Cash flow: book appointment immediately, then record pending payment
    const appointmentId = await bookAppointmentStep();
    if (!appointmentId) { btns.forEach(b => b.disabled = false); return; }

    await fetch('http://localhost:5001/api/payment/record-pending-cash', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ appointmentId, doctorId, amount: fee })
    });

    closePaymentModal();
    selectedDoctor = null;
    clearPendingBooking();

    showAlert('success', 'Appointment Booked!',
      'Appointment with Dr. ' + doctorName + ' on ' + formatDate(snapshotDate) +
      ' at ' + formatDisplayTime(snapshotTime) +
      ' confirmed. Please pay ₹' + fee + ' in cash at the clinic.'
    );
  } catch (err) {
    showAlert('warning', 'Error', err.message || 'Something went wrong. Please try again.');
  } finally {
    btns.forEach(b => b.disabled = false);
  }
}

// ONLINE PAYMENT

async function handleOnlinePayment() {
  const btns = document.querySelectorAll('.btn-pay-cash, .btn-pay-online');
  btns.forEach(b => b.disabled = true);

  // Show loading state on the online button
  const onlineBtn = document.querySelector('.btn-pay-online');
  const originalHTML = onlineBtn ? onlineBtn.innerHTML : '';
  if (onlineBtn) {
    onlineBtn.innerHTML =
      '<div class="pay-icon"><span class="stripe-btn-spinner" style="width:24px;height:24px;border-width:3px;display:inline-block;vertical-align:middle;"></span></div>' +
      '<div class="pay-details"><strong>Redirecting to Stripe...</strong><span>Please wait</span></div>';
  }

  try {
    const fee        = selectedDoctor.consultation_fee || 0;
    const doctorName = selectedDoctor.name;
    const doctorId   = selectedDoctor.user_id;

    // Send date/time/doctor info to backend — appointment will be created AFTER payment
    const response = await fetch('http://localhost:5001/api/payment/create-checkout-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        doctorId,
        amount:          fee,
        doctorName,
        appointmentDate: _pendingDate,
        appointmentTime: _pendingTime,
      })
    });

    const data = await response.json();

    if (!data.url) {
      showAlert('warning', 'Error', 'Could not initiate payment. Please try again.');
      btns.forEach(b => b.disabled = false);
      if (onlineBtn) onlineBtn.innerHTML = originalHTML;
      return;
    }

    // Redirect to Stripe-hosted checkout page
    window.location.href = data.url;

  } catch (err) {
    showAlert('warning', 'Error', 'Payment initiation failed. Please try again.');
    btns.forEach(b => b.disabled = false);
    if (onlineBtn) onlineBtn.innerHTML = originalHTML;
  }
}

// SEARCH

function handleSearch() {
  const searchInput = document.getElementById('searchInput');
  const clearBtn = document.getElementById('clearBtn');
  currentSearchTerm = searchInput.value.toLowerCase().trim();
  clearBtn.style.display = currentSearchTerm ? 'flex' : 'none';
  if (currentSearchTerm === '') {
    displayDoctors(allDoctors);
    document.getElementById('resultsTitle').textContent = 'All Doctors';
    return;
  }
  const filtered = allDoctors.filter(function(d) {
    return d.name.toLowerCase().includes(currentSearchTerm) ||
      (d.speciality || '').toLowerCase().includes(currentSearchTerm) ||
      (d.address || '').toLowerCase().includes(currentSearchTerm);
  });
  displayDoctors(filtered);
  document.getElementById('resultsTitle').textContent = 'Search Results';
}

function clearSearch() {
  document.getElementById('searchInput').value = '';
  document.getElementById('clearBtn').style.display = 'none';
  currentSearchTerm = '';
  displayDoctors(allDoctors);
  document.getElementById('resultsTitle').textContent = 'All Doctors';
}

function formatDate(dateStr) {
  if (!dateStr) return 'N/A';
  const parts = dateStr.split('-').map(Number);
  return new Date(parts[0], parts[1] - 1, parts[2]).toLocaleDateString('en-IN', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });
}

// UI UTILS

function toggleSidebar() { document.getElementById('sidebar').classList.toggle('open'); }

document.addEventListener('click', function (event) {
  const sidebar = document.getElementById('sidebar');
  const menuToggle = document.querySelector('.menu-toggle');
  if (window.innerWidth <= 768 && sidebar.classList.contains('open') &&
    !sidebar.contains(event.target) && !menuToggle.contains(event.target)) {
    sidebar.classList.remove('open');
  }
});

function handleModalOverlayClick(event) {
  if (event.target === document.getElementById('bookingModal')) closeBookingModal();
  if (event.target === document.getElementById('paymentModal')) closePaymentModal();
}

function showLogoutConfirm() {
  const overlay = document.getElementById('customAlert');
  document.getElementById('alertIcon').className = 'custom-alert-icon warning';
  document.getElementById('alertIcon').textContent = '⚠';
  document.getElementById('alertTitle').textContent = 'Confirm Logout';
  document.getElementById('alertMessage').textContent = 'Are you sure you want to logout?';
  document.getElementById('alertButtons').innerHTML =
    '<button class="custom-alert-button secondary" onclick="closeCustomAlert()">Cancel</button>' +
    '<button class="custom-alert-button primary" onclick="confirmLogout()">Logout</button>';
  overlay.style.display = 'block';
}

function showAlert(type, title, message) {
  const overlay = document.getElementById('customAlert');
  const icon = document.getElementById('alertIcon');
  icon.className = 'custom-alert-icon ' + type;
  icon.textContent = type === 'success' ? '✓' : '⚠';
  document.getElementById('alertTitle').textContent = title;
  document.getElementById('alertMessage').textContent = message;
  document.getElementById('alertButtons').innerHTML = '<button class="custom-alert-button primary" onclick="closeCustomAlert()">OK</button>';
  overlay.style.display = 'block';
}

function closeCustomAlert() { document.getElementById('customAlert').style.display = 'none'; }

async function confirmLogout() {
  try {
    const response = await fetch('http://localhost:5001/logout', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include'
    });
    const data = await response.json();
    if (data.success) {
      closeCustomAlert();
      setTimeout(function() { window.location.replace('/login.html'); }, 100);
    }
  } catch (error) { console.error('Logout error:', error); }
}

document.getElementById('customAlert').addEventListener('click', function (e) {
  if (e.target === this) closeCustomAlert();
});

document.getElementById('paymentModal').addEventListener('click', function (e) {
  if (e.target === this) closePaymentModal();
});