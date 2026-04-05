(async () => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('session_id');

    if (!sessionId) {
    showError('No payment session found. Please try booking again.');
    return;
    }

    try {
    const res = await fetch('http://localhost:5001/api/payment/verify-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ sessionId })
    });
    const data = await res.json();

    if (data.success) {
        showSuccess(data);
    } else {
        showError(data.message || 'Payment verification failed.');
    }
    } catch (err) {
    showError('Network error during verification. Please contact support.');
    }
})();

function showSuccess(data) {
    document.getElementById('stateLoading').style.display = 'none';
    document.getElementById('stateSuccess').style.display = 'block';

    document.getElementById('summaryBox').style.display = 'block';

    document.getElementById('sumDoctor').textContent = data.doctorName ? "Dr. " + data.doctorName : "—";
    document.getElementById('sumAppointment').textContent = data.appointmentId || "—";
    document.getElementById('sumAmount').textContent = "₹" + (data.amount || "0");

    // Format date
    if (data.appointmentDate) {
    const d = new Date(data.appointmentDate);
    document.getElementById('sumDate').textContent = d.toLocaleDateString('en-IN');
    }

    // Format time
    if (data.appointmentTime) {
    let [h, m] = data.appointmentTime.split(":");
    h = parseInt(h);
    const ampm = h >= 12 ? "PM" : "AM";
    const hour12 = h % 12 || 12;
    document.getElementById('sumTime').textContent = `${hour12}:${m} ${ampm}`;
    }

    if (data.paymentId) {
    document.getElementById('paymentIdTag').textContent =
        'Payment ID: ' + data.paymentId;
    }
}

function showError(msg) {
    document.getElementById('stateLoading').style.display = 'none';
    document.getElementById('stateError').style.display = 'block';
    document.getElementById('errorMsg').textContent = msg;
}
