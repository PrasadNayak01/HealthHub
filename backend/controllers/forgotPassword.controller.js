const connection = require("../config/database");
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");

// Store OTPs in memory (for production, use Redis)
const otpStore = new Map();

// Configure email transporter
const transporter = nodemailer.createTransport({
    service: 'gmail', // or your email service
    auth: {
        user: process.env.EMAIL_USER, // your email
        pass: process.env.EMAIL_PASSWORD // your app password
    }
});

// Generate 6-digit OTP
function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// Send OTP Email
exports.sendOTP = async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({
            success: false,
            message: "Email is required"
        });
    }

    try {
        // Check if user exists
        connection.query(
            "SELECT * FROM users WHERE email = ?",
            [email],
            async (err, results) => {
                if (err) {
                    console.error("Database error:", err);
                    return res.status(500).json({
                        success: false,
                        message: "Database error occurred"
                    });
                }

                if (results.length === 0) {
                    return res.status(404).json({
                        success: false,
                        message: "No account found with this email"
                    });
                }

                // Generate OTP
                const otp = generateOTP();
                const expiryTime = Date.now() + 5 * 60 * 1000; // 5 minutes

                // Store OTP
                otpStore.set(email, {
                    otp,
                    expiryTime,
                    attempts: 0
                });

                // Send email
                const mailOptions = {
                    from: process.env.EMAIL_USER,
                    to: email,
                    subject: 'Password Reset OTP - Health Hub',
                    html: `
                        <div style="font-family: 'Poppins', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f3f3f3;">
                            <div style="background: white; border-radius: 10px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                                <h1 style="color: #3869EB; margin-bottom: 20px;">Health Hub</h1>
                                <h2 style="color: #1C1B1F; margin-bottom: 15px;">Password Reset Request</h2>
                                <p style="color: #79747E; font-size: 16px; line-height: 1.6;">
                                    We received a request to reset your password. Use the OTP below to proceed:
                                </p>
                                <div style="background: #f8f9fa; border: 2px dashed #3869EB; border-radius: 8px; padding: 20px; text-align: center; margin: 25px 0;">
                                    <h1 style="color: #3869EB; font-size: 36px; letter-spacing: 8px; margin: 0;">${otp}</h1>
                                </div>
                                <p style="color: #79747E; font-size: 14px;">
                                    This OTP is valid for <strong>5 minutes</strong>. If you didn't request this, please ignore this email.
                                </p>
                                <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 25px 0;">
                                <p style="color: #999; font-size: 12px; text-align: center;">
                                    © ${new Date().getFullYear()} Health Hub. All rights reserved.
                                </p>
                            </div>
                        </div>
                    `
                };

                try {
                    await transporter.sendMail(mailOptions);
                    console.log(`OTP sent to ${email}: ${otp}`); // For development only

                    res.json({
                        success: true,
                        message: "OTP sent successfully to your email"
                    });
                } catch (emailError) {
                    console.error("Email send error:", emailError);
                    res.status(500).json({
                        success: false,
                        message: "Failed to send OTP email"
                    });
                }
            }
        );
    } catch (error) {
        console.error("Error in sendOTP:", error);
        res.status(500).json({
            success: false,
            message: "An error occurred"
        });
    }
};

// Verify OTP
exports.verifyOTP = (req, res) => {
    const { email, otp } = req.body;

    if (!email || !otp) {
        return res.status(400).json({
            success: false,
            message: "Email and OTP are required"
        });
    }

    const otpData = otpStore.get(email);

    if (!otpData) {
        return res.status(400).json({
            success: false,
            message: "OTP not found or expired. Please request a new one."
        });
    }

    // Check if OTP expired
    if (Date.now() > otpData.expiryTime) {
        otpStore.delete(email);
        return res.status(400).json({
            success: false,
            message: "OTP has expired. Please request a new one."
        });
    }

    // Check attempts
    if (otpData.attempts >= 3) {
        otpStore.delete(email);
        return res.status(400).json({
            success: false,
            message: "Too many failed attempts. Please request a new OTP."
        });
    }

    // Verify OTP
    if (otpData.otp !== otp) {
        otpData.attempts++;
        return res.status(400).json({
            success: false,
            message: `Invalid OTP. ${3 - otpData.attempts} attempts remaining.`
        });
    }

    // OTP verified - mark as verified
    otpStore.set(email, {
        ...otpData,
        verified: true
    });

    res.json({
        success: true,
        message: "OTP verified successfully"
    });
};

// Reset Password
exports.resetPassword = async (req, res) => {
    const { email, newPassword } = req.body;

    if (!email || !newPassword) {
        return res.status(400).json({
            success: false,
            message: "Email and new password are required"
        });
    }

    const otpData = otpStore.get(email);

    // Check if OTP was verified
    if (!otpData || !otpData.verified) {
        return res.status(400).json({
            success: false,
            message: "Please verify OTP first"
        });
    }

    try {
        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update password in database
        connection.query(
            "UPDATE users SET password = ?, confirm_password = ? WHERE email = ?",
            [hashedPassword, hashedPassword, email],
            (err, result) => {
                if (err) {
                    console.error("Database error:", err);
                    return res.status(500).json({
                        success: false,
                        message: "Failed to reset password"
                    });
                }

                if (result.affectedRows === 0) {
                    return res.status(404).json({
                        success: false,
                        message: "User not found"
                    });
                }

                // Clear OTP from store
                otpStore.delete(email);

                res.json({
                    success: true,
                    message: "Password reset successfully"
                });
            }
        );
    } catch (error) {
        console.error("Error in resetPassword:", error);
        res.status(500).json({
            success: false,
            message: "An error occurred"
        });
    }
};

// Clean up expired OTPs (run periodically)
setInterval(() => {
    const now = Date.now();
    for (const [email, data] of otpStore.entries()) {
        if (now > data.expiryTime) {
            otpStore.delete(email);
        }
    }
}, 60000); // Run every minute