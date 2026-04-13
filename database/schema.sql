CREATE DATABASE IF NOT EXISTS theatre_booking CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE theatre_booking;

CREATE TABLE users (
  user_id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE theatres (
  theatre_id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(200) NOT NULL,
  location VARCHAR(300) NOT NULL,
  description TEXT
);

CREATE TABLE shows (
  show_id INT PRIMARY KEY AUTO_INCREMENT,
  theatre_id INT NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  duration INT NOT NULL COMMENT 'duration in minutes',
  age_rating VARCHAR(10),
  genre VARCHAR(50),
  FOREIGN KEY (theatre_id) REFERENCES theatres(theatre_id)
);

CREATE TABLE showtimes (
  showtime_id INT PRIMARY KEY AUTO_INCREMENT,
  show_id INT NOT NULL,
  date DATE NOT NULL,
  time TIME NOT NULL,
  hall VARCHAR(100) NOT NULL,
  total_seats INT NOT NULL,
  available_seats INT NOT NULL,
  FOREIGN KEY (show_id) REFERENCES shows(show_id)
);

CREATE TABLE seat_categories (
  category_id INT PRIMARY KEY AUTO_INCREMENT,
  showtime_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  total_seats INT NOT NULL,
  available_seats INT NOT NULL,
  FOREIGN KEY (showtime_id) REFERENCES showtimes(showtime_id)
);

CREATE TABLE reservations (
  reservation_id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  showtime_id INT NOT NULL,
  status ENUM('confirmed', 'cancelled') DEFAULT 'confirmed',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id),
  FOREIGN KEY (showtime_id) REFERENCES showtimes(showtime_id)
);

CREATE TABLE seats (
  seat_id INT PRIMARY KEY AUTO_INCREMENT,
  showtime_id INT NOT NULL,
  row VARCHAR(2) NOT NULL,
  col INT NOT NULL,
  category_id INT NOT NULL,
  status ENUM('available', 'reserved') DEFAULT 'available',
  reservation_id INT NULL,
  FOREIGN KEY (showtime_id) REFERENCES showtimes(showtime_id),
  FOREIGN KEY (category_id) REFERENCES seat_categories(category_id),
  UNIQUE KEY unique_seat (showtime_id, row, col)
);

CREATE TABLE reservation_items (
  item_id INT PRIMARY KEY AUTO_INCREMENT,
  reservation_id INT NOT NULL,
  category_id INT NOT NULL,
  quantity INT NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  FOREIGN KEY (reservation_id) REFERENCES reservations(reservation_id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES seat_categories(category_id)
);
