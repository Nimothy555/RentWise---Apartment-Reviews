CREATE DATABASE apartment_reviews;
USE apartment_reviews;
CREATE TABLE users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_verified BOOLEAN DEFAULT FALSE
    
);
CREATE TABLE apartments (
    apartment_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    street_address VARCHAR(150),
    city VARCHAR(100),
    state VARCHAR(50),
    zip_code VARCHAR(10),
    property_type VARCHAR(50),
    year_built INT
);
CREATE TABLE reviews (
    review_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    apartment_id INT NOT NULL,
    rating_overall INT CHECK (rating_overall BETWEEN 1 AND 5),
    rating_safety INT CHECK (rating_safety BETWEEN 1 AND 5),
    rating_cleanliness INT CHECK (rating_cleanliness BETWEEN 1 AND 5),
    rating_management INT CHECK (rating_management BETWEEN 1 AND 5),
    average_rating DECIMAL(2,1),
    title VARCHAR(150),
    review_text TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(user_id)
        ON DELETE CASCADE,

    FOREIGN KEY (apartment_id) REFERENCES apartments(apartment_id)
        ON DELETE CASCADE
);
CREATE TABLE leases (
    lease_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    apartment_id INT NOT NULL,
    lease_start DATE,
    lease_end DATE,
    is_verified BOOLEAN DEFAULT FALSE,

    FOREIGN KEY (user_id) REFERENCES users(user_id)
        ON DELETE CASCADE,

    FOREIGN KEY (apartment_id) REFERENCES apartments(apartment_id)
        ON DELETE CASCADE
);

CREATE TABLE amenities (
    amenity_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) UNIQUE
);
CREATE TABLE apartment_amenities (
    apartment_id INT,
    amenity_id INT,
    PRIMARY KEY (apartment_id, amenity_id),

    FOREIGN KEY (apartment_id) REFERENCES apartments(apartment_id)
        ON DELETE CASCADE,

    FOREIGN KEY (amenity_id) REFERENCES amenities(amenity_id)
        ON DELETE CASCADE
);