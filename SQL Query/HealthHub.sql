-- Drop existing tables first (in correct order due to foreign keys)
DROP TABLE IF EXISTS patient_documents;
DROP TABLE IF EXISTS appointment_documents;
DROP TABLE IF EXISTS appointments;
DROP TABLE IF EXISTS patient_records;
DROP TABLE IF EXISTS patient_profiles;
DROP TABLE IF EXISTS doctor_profiles;
DROP TABLE IF EXISTS users;

SET GLOBAL max_allowed_packet=67108864;

-- Create database
CREATE DATABASE IF NOT EXISTS healthhub;

USE healthhub;

-- Users table
CREATE TABLE users (
    user_id VARCHAR(255) NOT NULL UNIQUE PRIMARY KEY,
    role VARCHAR(10) NOT NULL,
    name VARCHAR(30) NOT NULL,
    email VARCHAR(40) NOT NULL UNIQUE,
    phone VARCHAR(20) NOT NULL,
    password VARCHAR(255) NOT NULL,
    confirm_password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Doctor profiles table
CREATE TABLE doctor_profiles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    doctor_id VARCHAR(255) NOT NULL UNIQUE,
    speciality VARCHAR(100),
    degree VARCHAR(200),
    experience INT,
    consultation_fee DECIMAL(10,2),
    address TEXT,
    bio TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT doctor_profiles_fk
        FOREIGN KEY (doctor_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE
);

-- Patient profiles table
CREATE TABLE patient_profiles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    patient_id VARCHAR(255) NOT NULL UNIQUE,
    age INT,
    gender VARCHAR(10),
    weight DECIMAL(5,2),
    height DECIMAL(5,2),
    blood_group VARCHAR(5),
    address TEXT,
    medical_history TEXT,
    allergies TEXT,
    current_medications TEXT,
    emergency_contact_name VARCHAR(100),
    emergency_contact_phone VARCHAR(20),
    medical_report_data LONGBLOB,
    medical_report_name VARCHAR(255),
    medical_report_type VARCHAR(50),
    medical_report_size INT,
    medical_report_upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT patient_profiles_fk
        FOREIGN KEY (patient_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE
);

-- Patient records table (tracks doctor-patient relationships)
CREATE TABLE patient_records (
    record_id INT AUTO_INCREMENT PRIMARY KEY,
    patient_id VARCHAR(255) NOT NULL,
    doctor_id VARCHAR(255) NOT NULL,
    first_visit_date DATE,
    last_visit_date DATE,
    total_visits INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT patient_records_patient_fk
        FOREIGN KEY (patient_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE,
    CONSTRAINT patient_records_doctor_fk
        FOREIGN KEY (doctor_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE,
    UNIQUE KEY unique_doctor_patient (doctor_id, patient_id),
    INDEX idx_doctor (doctor_id),
    INDEX idx_patient (patient_id)
);

-- Appointments table
CREATE TABLE appointments (
    appointment_id VARCHAR(255) NOT NULL UNIQUE PRIMARY KEY,
    patient_id VARCHAR(255) NOT NULL,
    doctor_id VARCHAR(255) NOT NULL,
    appointment_date DATE NOT NULL,
    appointment_time TIME,
    status ENUM('pending', 'completed', 'cancelled', 'done') DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,
    CONSTRAINT appointments_patient_fk
        FOREIGN KEY (patient_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE,
    CONSTRAINT appointments_doctor_fk
        FOREIGN KEY (doctor_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE,
    INDEX idx_appointment_date (appointment_date),
    INDEX idx_status (status),
    INDEX idx_doctor_patient (doctor_id, patient_id)
);

-- Appointment documents table (for prescriptions and reports)
CREATE TABLE appointment_documents (
    document_id INT AUTO_INCREMENT PRIMARY KEY,
    appointment_id VARCHAR(255) NOT NULL,
    document_data LONGBLOB NOT NULL,
    document_name VARCHAR(255) NOT NULL,
    document_type VARCHAR(50) NOT NULL,
    document_size INT NOT NULL,
    file_category ENUM('prescription', 'report', 'other') DEFAULT 'other',
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT appointment_documents_fk
        FOREIGN KEY (appointment_id)
        REFERENCES appointments(appointment_id)
        ON DELETE CASCADE,
    INDEX idx_appointment (appointment_id)
);

-- Patient documents table (general patient documents)
CREATE TABLE patient_documents (
    document_id VARCHAR(255) NOT NULL UNIQUE PRIMARY KEY,
    patient_id VARCHAR(255) NOT NULL,
    uploaded_by_id VARCHAR(255) NOT NULL,
    uploaded_by_name VARCHAR(100),
    uploaded_by_role VARCHAR(20),
    document_data LONGBLOB NOT NULL,
    document_name VARCHAR(255) NOT NULL,
    document_type VARCHAR(50) NOT NULL,
    document_size INT NOT NULL,
    notes TEXT,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT patient_documents_patient_fk
        FOREIGN KEY (patient_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE,
    CONSTRAINT patient_documents_uploader_fk
        FOREIGN KEY (uploaded_by_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE,
    INDEX idx_patient (patient_id),
    INDEX idx_uploader (uploaded_by_id)
);