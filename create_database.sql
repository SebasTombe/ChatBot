-- Crear la base de datos
CREATE DATABASE IF NOT EXISTS voice_task_manager;
USE voice_task_manager;

-- Tabla de usuarios
CREATE TABLE IF NOT EXISTS User (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Tabla de tareas
CREATE TABLE IF NOT EXISTS Task (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    completed BOOLEAN NOT NULL DEFAULT false,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    dueDate DATETIME,
    description TEXT,
    userId INT NOT NULL,
    FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE,
    INDEX idx_user_completed (userId, completed),
    INDEX idx_due_date (dueDate)
);

-- Tabla de comandos de voz (opcional)
CREATE TABLE IF NOT EXISTS VoiceCommand (
    id INT AUTO_INCREMENT PRIMARY KEY,
    command TEXT NOT NULL,
    result TEXT,
    timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    userId INT NOT NULL,
    FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE,
    INDEX idx_timestamp (timestamp)
);

-- Tabla de preferencias de usuario (opcional)
CREATE TABLE IF NOT EXISTS UserPreference (
    id INT AUTO_INCREMENT PRIMARY KEY,
    voiceId VARCHAR(50) NOT NULL DEFAULT 'Conchita',
    language VARCHAR(10) NOT NULL DEFAULT 'es-ES',
    notificationsEnabled BOOLEAN NOT NULL DEFAULT true,
    userId INT NOT NULL UNIQUE,
    FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE
);