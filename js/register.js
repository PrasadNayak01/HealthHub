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

// Close alert when clicking outside
document.getElementById('customAlert').addEventListener('click', function(e) {
    if (e.target === this) {
        closeCustomAlert();
    }
});

// Clear any old localStorage data on page load
window.addEventListener('load', () => {
    localStorage.clear();
    sessionStorage.clear();
});

// Toggle password visibility
document.querySelectorAll('.toggle-eye').forEach(toggle => {
    toggle.addEventListener('click', function() {
        const input = this.previousElementSibling.previousElementSibling;
        const icon = this.querySelector('.eyeIcon');
        
        if (input.type === 'password') {
            input.type = 'text';
            icon.src = '../assets/eye-show.png';
        } else {
            input.type = 'password';
            icon.src = '../assets/eye-hide.png';
        }
    });
});

// Handle form submission
document.querySelector('form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const userType = document.getElementById('user-type').value;
    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const phone = document.getElementById('phone-number').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    const terms = document.getElementById('terms').checked;

    // Validation
    if (!terms) {
        showCustomAlert('Please accept the Terms and Privacy Policies', 'error');
        return;
    }

    if (password !== confirmPassword) {
        showCustomAlert('Passwords do not match', 'error');
        return;
    }

    if (password.length < 6) {
        showCustomAlert('Password must be at least 6 characters', 'error');
        return;
    }

    try {
        const response = await fetch('http://localhost:5001/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({
                userType,
                name,
                email,
                phone,
                password,
                confirmPassword
            })
        });

        const data = await response.json();

        if (data.success) {
            showCustomAlert(data.message, 'success');
            setTimeout(() => {
                window.location.replace('./login.html');
            }, 1500);
        } else {
            showCustomAlert(data.message, 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showCustomAlert('Registration failed. Please check your connection.', 'error');
    }
});