let userEmail = '';
let otpTimerInterval;

// Custom Alert Functions
function showCustomAlert(message, type = 'success') {
    const overlay = document.getElementById('customAlert');
    const icon = document.getElementById('alertIcon');
    const title = document.getElementById('alertTitle');
    const messageEl = document.getElementById('alertMessage');

    if (type === 'success') {
        icon.className = 'custom-alert-icon success';
        icon.textContent = '✓';
        title.textContent = 'Success';
    } else {
        icon.className = 'custom-alert-icon error';
        icon.textContent = '✕';
        title.textContent = 'Error';
    }

    messageEl.textContent = message;
    overlay.style.display = 'block';
}

function closeCustomAlert() {
    document.getElementById('customAlert').style.display = 'none';
}

document.getElementById('customAlert').addEventListener('click', function(e) {
    if (e.target === this) {
        closeCustomAlert();
    }
});

// Toggle Password Visibility
function togglePassword(inputId, iconId) {
    const passwordInput = document.getElementById(inputId);
    const eyeIcon = document.getElementById(iconId);
    
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        eyeIcon.src = '../assets/eye-show.png';
    } else {
        passwordInput.type = 'password';
        eyeIcon.src = '../assets/eye-hide.png';
    }
}

// Show specific form and corresponding image
function showForm(formId) {
    // Hide all forms
    document.querySelectorAll('.form-container').forEach(form => {
        form.classList.remove('active');
    });
    
    // Hide all images
    document.querySelectorAll('.right-content img').forEach(img => {
        img.classList.remove('active');
    });
    
    // Show the selected form
    document.getElementById(formId).classList.add('active');
    
    // Show corresponding image
    switch(formId) {
        case 'emailForm':
            document.getElementById('emailImage').classList.add('active');
            break;
        case 'otpForm':
            document.getElementById('otpImage').classList.add('active');
            break;
        case 'resetForm':
            document.getElementById('resetImage').classList.add('active');
            break;
        case 'successMessage':
            document.getElementById('successImage').classList.add('active');
            break;
    }
}

// Step 1: Send OTP
document.getElementById('emailSubmitForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const submitBtn = e.target.querySelector('.submit-btn');
    const originalText = submitBtn.textContent;
    
    userEmail = email;

    // Show loading state
    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending OTP...';
    submitBtn.style.opacity = '0.7';

    try {
        const response = await fetch('http://localhost:5001/api/forgot-password/send-otp', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email })
        });

        const data = await response.json();

        // Reset button state
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
        submitBtn.style.opacity = '1';

        if (data.success) {
            showCustomAlert('OTP sent successfully to your email!', 'success');
            document.getElementById('displayEmail').textContent = email;
            setTimeout(() => {
                closeCustomAlert();
                showForm('otpForm');
                startOTPTimer();
            }, 1500);
        } else {
            showCustomAlert(data.message || 'Failed to send OTP', 'error');
        }
    } catch (error) {
        // Reset button state on error
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
        submitBtn.style.opacity = '1';
        
        console.error('Error:', error);
        showCustomAlert('Failed to send OTP. Please try again.', 'error');
    }
});

// OTP Input Auto-focus
const otpInputs = document.querySelectorAll('.otp-input');
otpInputs.forEach((input, index) => {
    input.addEventListener('input', (e) => {
        if (e.target.value.length === 1) {
            if (index < otpInputs.length - 1) {
                otpInputs[index + 1].focus();
            }
        }
    });

    input.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace' && e.target.value === '') {
            if (index > 0) {
                otpInputs[index - 1].focus();
            }
        }
    });

    input.addEventListener('paste', (e) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData('text').slice(0, 6);
        pastedData.split('').forEach((char, i) => {
            if (i < otpInputs.length) {
                otpInputs[i].value = char;
            }
        });
        if (pastedData.length < otpInputs.length) {
            otpInputs[pastedData.length].focus();
        }
    });
});

// Step 2: Verify OTP
document.getElementById('otpSubmitForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const otp = Array.from(otpInputs).map(input => input.value).join('');
    const submitBtn = e.target.querySelector('.submit-btn');
    const originalText = submitBtn.textContent;

    if (otp.length !== 6) {
        showCustomAlert('Please enter all 6 digits', 'error');
        return;
    }

    // Show loading state
    submitBtn.disabled = true;
    submitBtn.textContent = 'Verifying...';
    submitBtn.style.opacity = '0.7';

    try {
        const response = await fetch('http://localhost:5001/api/forgot-password/verify-otp', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email: userEmail, otp })
        });

        const data = await response.json();

        // Reset button state
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
        submitBtn.style.opacity = '1';

        if (data.success) {
            showCustomAlert('OTP verified successfully!', 'success');
            clearInterval(otpTimerInterval);
            setTimeout(() => {
                closeCustomAlert();
                showForm('resetForm');
            }, 1500);
        } else {
            showCustomAlert(data.message || 'Invalid OTP', 'error');
        }
    } catch (error) {
        // Reset button state on error
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
        submitBtn.style.opacity = '1';
        
        console.error('Error:', error);
        showCustomAlert('Failed to verify OTP. Please try again.', 'error');
    }
});

// Step 3: Reset Password
document.getElementById('passwordResetForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const submitBtn = e.target.querySelector('.submit-btn');
    const originalText = submitBtn.textContent;

    if (newPassword !== confirmPassword) {
        showCustomAlert('Passwords do not match', 'error');
        return;
    }

    if (newPassword.length < 6) {
        showCustomAlert('Password must be at least 6 characters', 'error');
        return;
    }

    // Show loading state
    submitBtn.disabled = true;
    submitBtn.textContent = 'Resetting...';
    submitBtn.style.opacity = '0.7';

    try {
        const response = await fetch('http://localhost:5001/api/forgot-password/reset-password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                email: userEmail, 
                newPassword 
            })
        });

        const data = await response.json();

        // Reset button state
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
        submitBtn.style.opacity = '1';

        if (data.success) {
            showForm('successMessage');
        } else {
            showCustomAlert(data.message || 'Failed to reset password', 'error');
        }
    } catch (error) {
        // Reset button state on error
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
        submitBtn.style.opacity = '1';
        
        console.error('Error:', error);
        showCustomAlert('Failed to reset password. Please try again.', 'error');
    }
});

// OTP Timer
function startOTPTimer() {
    let timeLeft = 60;
    const timerEl = document.getElementById('timer');
    const resendBtn = document.getElementById('resendBtn');
    
    resendBtn.disabled = true;
    
    otpTimerInterval = setInterval(() => {
        timeLeft--;
        timerEl.textContent = timeLeft;
        
        if (timeLeft <= 0) {
            clearInterval(otpTimerInterval);
            resendBtn.disabled = false;
            resendBtn.innerHTML = 'Resend OTP';
        }
    }, 1000);
}

// Resend OTP
document.getElementById('resendBtn').addEventListener('click', async () => {
    const resendBtn = document.getElementById('resendBtn');
    const originalText = resendBtn.innerHTML;
    
    // Show loading state
    resendBtn.disabled = true;
    resendBtn.innerHTML = 'Sending...';
    
    try {
        const response = await fetch('http://localhost:5001/api/forgot-password/send-otp', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email: userEmail })
        });

        const data = await response.json();

        if (data.success) {
            showCustomAlert('OTP resent successfully!', 'success');
            otpInputs.forEach(input => input.value = '');
            otpInputs[0].focus();
            startOTPTimer();
        } else {
            // Reset button if failed
            resendBtn.disabled = false;
            resendBtn.innerHTML = originalText;
            showCustomAlert(data.message || 'Failed to resend OTP', 'error');
        }
    } catch (error) {
        // Reset button if failed
        resendBtn.disabled = false;
        resendBtn.innerHTML = originalText;
        
        console.error('Error:', error);
        showCustomAlert('Failed to resend OTP. Please try again.', 'error');
    }
});

// Back to Email
function backToEmail() {
    clearInterval(otpTimerInterval);
    otpInputs.forEach(input => input.value = '');
    showForm('emailForm');
}