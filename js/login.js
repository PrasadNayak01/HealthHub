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

// Toggle password visibility
document.querySelector('.toggle-eye').addEventListener('click', function() {
    const passwordInput = document.getElementById('password');
    const eyeIcon = document.getElementById('eyeIcon');
    
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        eyeIcon.src = '../assets/eye-show.png';
    } else {
        passwordInput.type = 'password';
        eyeIcon.src = '../assets/eye-hide.png';
    }
});

// Handle form submission
document.querySelector('form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    try {
        const response = await fetch('http://localhost:5001/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({
                email,
                password
            })
        });

        const data = await response.json();

        if (data.success) {
            showCustomAlert(data.message, 'success');
            setTimeout(() => {
                window.location.href = data.redirect;
            }, 1500);
        } else {
            showCustomAlert(data.message, 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showCustomAlert('Login failed. Please try again.', 'error');
    }
});