// Auto-migration: runs on every server start, safe to re-run (IF NOT EXISTS / ADD COLUMN IF NOT EXISTS)
const db = require('./db');

module.exports = async function runMigrations() {
  try {
    // ── 1. trip_stops ─────────────────────────────────────────────────────────
    await db.query(`
      CREATE TABLE IF NOT EXISTS trip_stops (
        id         INT AUTO_INCREMENT PRIMARY KEY,
        trip_id    INT NOT NULL,
        type       ENUM('pickup','dropoff') NOT NULL,
        label      VARCHAR(150),
        lat        DECIMAL(10,7) NOT NULL,
        lng        DECIMAL(10,7) NOT NULL,
        stop_order INT NOT NULL DEFAULT 0,
        arrived    TINYINT(1) NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE
      )
    `);
    try { await db.query('ALTER TABLE trip_stops ADD COLUMN IF NOT EXISTS arrived TINYINT(1) NOT NULL DEFAULT 0'); } catch (_) {}

    // ── 2. trips lat/lng columns ──────────────────────────────────────────────
    for (const col of ['pickup_lat','pickup_lng','dropoff_lat','dropoff_lng']) {
      try { await db.query(`ALTER TABLE trips ADD COLUMN IF NOT EXISTS ${col} DECIMAL(10,8) NULL`); } catch (_) {}
    }

    // ── 3. Smart Pool tables ──────────────────────────────────────────────────
    await db.query(`CREATE TABLE IF NOT EXISTS pool_requests(id INT AUTO_INCREMENT PRIMARY KEY,passenger_id INT NOT NULL,origin_lat DECIMAL(10,8) NOT NULL,origin_lng DECIMAL(11,8) NOT NULL,origin_label VARCHAR(200) DEFAULT '',dest_lat DECIMAL(10,8) NOT NULL,dest_lng DECIMAL(11,8) NOT NULL,dest_label VARCHAR(200) DEFAULT '',desired_time VARCHAR(10) NOT NULL,desired_date DATE NOT NULL,seats INT NOT NULL DEFAULT 1,pool_group_id INT DEFAULT NULL,status ENUM('pending','confirmed','cancelled') NOT NULL DEFAULT 'pending',created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,FOREIGN KEY(passenger_id)REFERENCES users(id)ON DELETE CASCADE)`);
    await db.query(`CREATE TABLE IF NOT EXISTS pool_groups(id INT AUTO_INCREMENT PRIMARY KEY,desired_date DATE NOT NULL,desired_time VARCHAR(10) NOT NULL,dest_lat DECIMAL(10,8) NOT NULL,dest_lng DECIMAL(11,8) NOT NULL,dest_label VARCHAR(200) DEFAULT '',driver_id INT DEFAULT NULL,trip_id INT DEFAULT NULL,status ENUM('pending','confirmed','cancelled') NOT NULL DEFAULT 'pending',created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,FOREIGN KEY(driver_id)REFERENCES users(id)ON DELETE SET NULL,FOREIGN KEY(trip_id)REFERENCES trips(id)ON DELETE SET NULL)`);
    await db.query(`CREATE TABLE IF NOT EXISTS pool_invitations(id INT AUTO_INCREMENT PRIMARY KEY,group_id INT NOT NULL,driver_id INT NOT NULL,response ENUM('pending','accepted','declined') NOT NULL DEFAULT 'pending',expires_at DATETIME DEFAULT NULL,created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,FOREIGN KEY(group_id)REFERENCES pool_groups(id)ON DELETE CASCADE,FOREIGN KEY(driver_id)REFERENCES users(id)ON DELETE CASCADE)`);
    await db.query(`CREATE TABLE IF NOT EXISTS pool_chats(id INT AUTO_INCREMENT PRIMARY KEY,trip_id INT NOT NULL UNIQUE,group_id INT NOT NULL,created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,FOREIGN KEY(trip_id)REFERENCES trips(id)ON DELETE CASCADE,FOREIGN KEY(group_id)REFERENCES pool_groups(id)ON DELETE CASCADE)`);
    await db.query(`CREATE TABLE IF NOT EXISTS pool_chat_messages(id INT AUTO_INCREMENT PRIMARY KEY,trip_id INT NOT NULL,user_id INT NOT NULL,message TEXT NOT NULL,created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,FOREIGN KEY(trip_id)REFERENCES trips(id)ON DELETE CASCADE,FOREIGN KEY(user_id)REFERENCES users(id)ON DELETE CASCADE)`);
    for (const [tbl,col,def] of [['trip_stops','passenger_id','INT DEFAULT NULL'],['trip_stops','pool_request_id','INT DEFAULT NULL'],['trips','is_pool','TINYINT(1) DEFAULT 0'],['bookings','pool_price','DECIMAL(10,2) DEFAULT NULL']]) {
      try { await db.query(`ALTER TABLE ${tbl} ADD COLUMN IF NOT EXISTS ${col} ${def}`); } catch(_) {}
    }

    // ── 4. Driver documents ───────────────────────────────────────────────────
    await db.query(`
      CREATE TABLE IF NOT EXISTS driver_documents (
        id                    INT AUTO_INCREMENT PRIMARY KEY,
        user_id               INT NOT NULL UNIQUE,
        car_license_photo     TEXT NOT NULL,
        driver_license_photo  TEXT NOT NULL,
        criminal_record_photo TEXT NOT NULL,
        submitted_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        reviewed_at           DATETIME  DEFAULT NULL,
        reviewed_by           INT       DEFAULT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    try { await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS account_status VARCHAR(30) NOT NULL DEFAULT 'active'`); } catch(_) {}
    try { await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS rejection_note TEXT DEFAULT NULL`); } catch(_) {}

    // ── 5. Saved points ───────────────────────────────────────────────────────
    await db.query(`
      CREATE TABLE IF NOT EXISTS saved_points (
        id         INT AUTO_INCREMENT PRIMARY KEY,
        name       VARCHAR(150) NOT NULL,
        type       ENUM('pickup','dropoff','both') NOT NULL DEFAULT 'both',
        lat        DECIMAL(10,7) NOT NULL,
        lng        DECIMAL(10,7) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // ── 6. Tender system tables ───────────────────────────────────────────────
    await db.query(`CREATE TABLE IF NOT EXISTS companies (id INT AUTO_INCREMENT PRIMARY KEY,company_name VARCHAR(120) NOT NULL UNIQUE,fleet_number VARCHAR(60) NOT NULL,password_hash VARCHAR(255) NOT NULL,created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
    await db.query(`CREATE TABLE IF NOT EXISTS company_drivers (id INT AUTO_INCREMENT PRIMARY KEY,company_id INT NOT NULL,name VARCHAR(100) NOT NULL,phone VARCHAR(30),license_number VARCHAR(60),created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE)`);
    await db.query(`CREATE TABLE IF NOT EXISTS company_cars (id INT AUTO_INCREMENT PRIMARY KEY,company_id INT NOT NULL,plate VARCHAR(30) NOT NULL,model VARCHAR(80),capacity INT,created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE)`);
    await db.query(`CREATE TABLE IF NOT EXISTS tenders (id INT AUTO_INCREMENT PRIMARY KEY,trip_id INT NOT NULL,description TEXT,status ENUM('open','awarded','cancelled') DEFAULT 'open',ends_at DATETIME NOT NULL,winner_company_id INT,awarded_amount DECIMAL(10,2),awarded_at DATETIME,assigned_driver_id INT,assigned_car_id INT,created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE,FOREIGN KEY (winner_company_id) REFERENCES companies(id) ON DELETE SET NULL)`);
    await db.query(`CREATE TABLE IF NOT EXISTS bids (id INT AUTO_INCREMENT PRIMARY KEY,tender_id INT NOT NULL,company_id INT NOT NULL,amount DECIMAL(10,2) NOT NULL,created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,UNIQUE KEY uq_tender_company (tender_id, company_id),FOREIGN KEY (tender_id) REFERENCES tenders(id) ON DELETE CASCADE,FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE)`);
    try { await db.query(`ALTER TABLE trips MODIFY COLUMN status ENUM('upcoming','active','completed','cancelled','tendered','awarded','assigned') DEFAULT 'upcoming'`); } catch(_) {}
    await db.query(`CREATE TABLE IF NOT EXISTS trip_week_assignments (id INT AUTO_INCREMENT PRIMARY KEY,tender_id INT NOT NULL,trip_id INT NOT NULL,company_id INT NOT NULL,week_start DATE NOT NULL,week_end DATE NOT NULL,created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,FOREIGN KEY (tender_id) REFERENCES tenders(id) ON DELETE CASCADE,FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE,FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE)`);
    await db.query(`CREATE TABLE IF NOT EXISTS trip_daily_assignments (id INT AUTO_INCREMENT PRIMARY KEY,week_assignment_id INT NOT NULL,trip_id INT NOT NULL,company_id INT NOT NULL,assignment_date DATE NOT NULL,driver_id INT,car_id INT,updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,UNIQUE KEY uq_trip_date (trip_id, assignment_date),FOREIGN KEY (week_assignment_id) REFERENCES trip_week_assignments(id) ON DELETE CASCADE,FOREIGN KEY (driver_id) REFERENCES company_drivers(id) ON DELETE SET NULL,FOREIGN KEY (car_id) REFERENCES company_cars(id) ON DELETE SET NULL)`);

    for (const col of ['phone','week_assignment_id']) {
      try {
        const [cols] = await db.query(`SELECT COUNT(*) AS cnt FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='companies' AND COLUMN_NAME='${col}'`);
        if (!cols[0].cnt) { await db.query(`ALTER TABLE companies ADD COLUMN ${col} VARCHAR(30) DEFAULT NULL`); }
      } catch(_) {}
    }

    // ── 7. Driver locations ───────────────────────────────────────────────────
    await db.query(`CREATE TABLE IF NOT EXISTS driver_locations (id INT AUTO_INCREMENT PRIMARY KEY,driver_id INT NOT NULL,trip_id INT NOT NULL,lat DECIMAL(10,8) NOT NULL,lng DECIMAL(10,8) NOT NULL,updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,UNIQUE KEY uq_driver_trip (driver_id, trip_id),FOREIGN KEY (driver_id) REFERENCES users(id) ON DELETE CASCADE,FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE)`);

    // ── 8. Booking settings ───────────────────────────────────────────────────
    await db.query(`CREATE TABLE IF NOT EXISTS booking_settings (id INT PRIMARY KEY DEFAULT 1,booking_round_start_day TINYINT NOT NULL DEFAULT 5,surge_percent DECIMAL(5,2) NOT NULL DEFAULT 10.00,surge_after_friday TINYINT(1) NOT NULL DEFAULT 1,updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP)`);
    await db.query(`INSERT IGNORE INTO booking_settings (id, booking_round_start_day, surge_percent, surge_after_friday) VALUES (1, 5, 10.00, 1)`);

    for (const col of ['travel_date','effective_price','is_surge']) {
      try {
        const [cols] = await db.query(`SELECT COUNT(*) AS cnt FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='bookings' AND COLUMN_NAME='${col}'`);
        if (!cols[0].cnt) {
          if (col === 'travel_date') { await db.query(`ALTER TABLE bookings ADD COLUMN travel_date DATE NULL`); await db.query(`UPDATE bookings b JOIN trips t ON t.id=b.trip_id SET b.travel_date=t.date WHERE b.travel_date IS NULL`); }
          else if (col === 'effective_price') { await db.query(`ALTER TABLE bookings ADD COLUMN effective_price DECIMAL(10,2) NULL`); }
          else { await db.query(`ALTER TABLE bookings ADD COLUMN is_surge TINYINT(1) NOT NULL DEFAULT 0`); }
        }
      } catch(_) {}
    }

    // ── 9. Dispatch batch tables ──────────────────────────────────────────────
    try {
      await db.query(`CREATE TABLE IF NOT EXISTS dispatch_batches (id INT AUTO_INCREMENT PRIMARY KEY,trip_id INT NOT NULL,travel_date DATE NOT NULL,vehicle_type ENUM('coaster','hiace','other') NOT NULL DEFAULT 'coaster',capacity INT NOT NULL DEFAULT 24,dispatch_type ENUM('tender','own','company') DEFAULT NULL,status ENUM('pending','tendered','assigned','completed') NOT NULL DEFAULT 'pending',own_driver_id INT DEFAULT NULL,assigned_company_id INT DEFAULT NULL,driver_name VARCHAR(100) DEFAULT NULL,driver_phone VARCHAR(30) DEFAULT NULL,car_plate VARCHAR(30) DEFAULT NULL,car_model VARCHAR(100) DEFAULT NULL,tender_id INT DEFAULT NULL,notes TEXT DEFAULT NULL,created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,INDEX idx_trip_date (trip_id, travel_date))`);
      await db.query(`CREATE TABLE IF NOT EXISTS dispatch_batch_bookings (batch_id INT NOT NULL,booking_id INT NOT NULL,PRIMARY KEY (batch_id, booking_id),INDEX idx_booking (booking_id))`);
      const [batchCol] = await db.query(`SELECT COUNT(*) AS cnt FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='tenders' AND COLUMN_NAME='batch_id'`);
      if (!batchCol[0].cnt) { await db.query(`ALTER TABLE tenders ADD COLUMN batch_id INT DEFAULT NULL`); }
    } catch(e) { console.warn('dispatch_batches:', e.message); }

    // ═══════════════════════════════════════════════════════
    // NEW SHUTTLE ADMIN TABLES
    // ═══════════════════════════════════════════════════════

    // ── 10. Operational cities ────────────────────────────────────────────────
    await db.query(`
      CREATE TABLE IF NOT EXISTS operational_cities (
        id              INT AUTO_INCREMENT PRIMARY KEY,
        name            VARCHAR(100) NOT NULL,
        country         VARCHAR(100),
        lat             DECIMAL(10,7),
        lng             DECIMAL(10,7),
        geofence_radius INT,
        geofence_coords TEXT,
        status          ENUM('active','inactive') NOT NULL DEFAULT 'active',
        created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await db.query(`INSERT IGNORE INTO operational_cities (id, name, country, status) VALUES (1, 'Cairo', 'Egypt', 'active')`);

    // ── 11. Shuttle stops ─────────────────────────────────────────────────────
    await db.query(`
      CREATE TABLE IF NOT EXISTS shuttle_stops (
        id         INT AUTO_INCREMENT PRIMARY KEY,
        city_id    INT,
        name       VARCHAR(150) NOT NULL,
        address    VARCHAR(300),
        lat        DECIMAL(10,7) NOT NULL,
        lng        DECIMAL(10,7) NOT NULL,
        radius     INT NOT NULL DEFAULT 100,
        status     ENUM('active','inactive') NOT NULL DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (city_id) REFERENCES operational_cities(id) ON DELETE SET NULL
      )
    `);

    // ── 12. Shuttle routes ────────────────────────────────────────────────────
    await db.query(`
      CREATE TABLE IF NOT EXISTS shuttle_routes (
        id            INT AUTO_INCREMENT PRIMARY KEY,
        city_id       INT,
        name          VARCHAR(150) NOT NULL,
        customer_fare DECIMAL(10,2) NOT NULL DEFAULT 0,
        driver_fare   DECIMAL(10,2) NOT NULL DEFAULT 0,
        status        ENUM('active','inactive') NOT NULL DEFAULT 'active',
        created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (city_id) REFERENCES operational_cities(id) ON DELETE SET NULL
      )
    `);

    // ── 13. Route stops junction ──────────────────────────────────────────────
    await db.query(`
      CREATE TABLE IF NOT EXISTS shuttle_route_stops (
        id         INT AUTO_INCREMENT PRIMARY KEY,
        route_id   INT NOT NULL,
        stop_id    INT NOT NULL,
        stop_order INT NOT NULL DEFAULT 0,
        UNIQUE KEY uq_route_stop (route_id, stop_id),
        FOREIGN KEY (route_id) REFERENCES shuttle_routes(id) ON DELETE CASCADE,
        FOREIGN KEY (stop_id)  REFERENCES shuttle_stops(id)  ON DELETE CASCADE
      )
    `);

    // ── 14. Shuttle vehicle types ─────────────────────────────────────────────
    await db.query(`
      CREATE TABLE IF NOT EXISTS shuttle_vehicle_types (
        id           INT AUTO_INCREMENT PRIMARY KEY,
        city_id      INT,
        name         VARCHAR(100) NOT NULL,
        ride_type    VARCHAR(60),
        vehicle_type VARCHAR(60),
        seats        INT,
        image_url    TEXT,
        status       ENUM('active','inactive') NOT NULL DEFAULT 'active',
        created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (city_id) REFERENCES operational_cities(id) ON DELETE SET NULL
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS vehicle_type_documents (
        id              INT AUTO_INCREMENT PRIMARY KEY,
        vehicle_type_id INT NOT NULL,
        doc_name        VARCHAR(150) NOT NULL,
        FOREIGN KEY (vehicle_type_id) REFERENCES shuttle_vehicle_types(id) ON DELETE CASCADE
      )
    `);

    // ── 15. Shuttle vehicles ──────────────────────────────────────────────────
    await db.query(`
      CREATE TABLE IF NOT EXISTS shuttle_vehicles (
        id              INT AUTO_INCREMENT PRIMARY KEY,
        city_id         INT,
        vehicle_type_id INT,
        brand           VARCHAR(80),
        model_name      VARCHAR(100) NOT NULL,
        vehicle_number  VARCHAR(60)  NOT NULL,
        seats           INT,
        doors           INT,
        total_rows      INT,
        total_columns   INT,
        image_url       TEXT,
        status          ENUM('active','inactive') NOT NULL DEFAULT 'active',
        created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (city_id)         REFERENCES operational_cities(id)    ON DELETE SET NULL,
        FOREIGN KEY (vehicle_type_id) REFERENCES shuttle_vehicle_types(id) ON DELETE SET NULL
      )
    `);

    // ── 16. Shuttle fares ─────────────────────────────────────────────────────
    await db.query(`
      CREATE TABLE IF NOT EXISTS shuttle_fares (
        id            INT AUTO_INCREMENT PRIMARY KEY,
        city_id       INT,
        fare_type     ENUM('fare_per_stop','fare_per_km','flat') NOT NULL DEFAULT 'fare_per_km',
        base_fare     DECIMAL(10,3) NOT NULL DEFAULT 0,
        fare_per_stop DECIMAL(10,3) NOT NULL DEFAULT 0,
        fare_per_km   DECIMAL(10,3) NOT NULL DEFAULT 0,
        status        ENUM('active','inactive') NOT NULL DEFAULT 'active',
        created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (city_id) REFERENCES operational_cities(id) ON DELETE SET NULL
      )
    `);

    // ── 17. Cancellation policies ─────────────────────────────────────────────
    await db.query(`
      CREATE TABLE IF NOT EXISTS cancellation_policies (
        id                  INT AUTO_INCREMENT PRIMARY KEY,
        name                VARCHAR(150) NOT NULL,
        status              ENUM('active','inactive') NOT NULL DEFAULT 'active',
        applicable_for_pass TINYINT(1) NOT NULL DEFAULT 0,
        created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS cancellation_thresholds (
        id             INT AUTO_INCREMENT PRIMARY KEY,
        policy_id      INT NOT NULL,
        minutes_before INT NOT NULL,
        charge_percent DECIMAL(5,2) NOT NULL DEFAULT 0,
        FOREIGN KEY (policy_id) REFERENCES cancellation_policies(id) ON DELETE CASCADE
      )
    `);

    // ── 18. Cancellation reasons ──────────────────────────────────────────────
    await db.query(`
      CREATE TABLE IF NOT EXISTS cancellation_reasons (
        id         INT AUTO_INCREMENT PRIMARY KEY,
        name       VARCHAR(150) NOT NULL,
        status     ENUM('active','inactive') NOT NULL DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // ── 19. Promotions ────────────────────────────────────────────────────────
    await db.query(`
      CREATE TABLE IF NOT EXISTS promotions (
        id                  INT AUTO_INCREMENT PRIMARY KEY,
        city_id             INT,
        title               VARCHAR(150) NOT NULL,
        promo_type          ENUM('flat','percentage') NOT NULL DEFAULT 'flat',
        promo_code          VARCHAR(50) NOT NULL UNIQUE,
        discount_value      DECIMAL(10,2) NOT NULL DEFAULT 0,
        discount_percentage DECIMAL(5,2)  NOT NULL DEFAULT 0,
        max_discount        DECIMAL(10,2),
        start_date          DATE,
        end_date            DATE,
        max_per_user        INT,
        total_limit         INT,
        status              ENUM('active','inactive') NOT NULL DEFAULT 'active',
        created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (city_id) REFERENCES operational_cities(id) ON DELETE SET NULL
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS promo_usages (
        id         INT AUTO_INCREMENT PRIMARY KEY,
        promo_id   INT NOT NULL,
        user_id    INT NOT NULL,
        used_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (promo_id) REFERENCES promotions(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id)  REFERENCES users(id)      ON DELETE CASCADE
      )
    `);

    // ── 20. Holidays ──────────────────────────────────────────────────────────
    await db.query(`
      CREATE TABLE IF NOT EXISTS holidays (
        id           INT AUTO_INCREMENT PRIMARY KEY,
        city_id      INT,
        holiday_date DATE NOT NULL,
        name         VARCHAR(150),
        created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (city_id) REFERENCES operational_cities(id) ON DELETE SET NULL
      )
    `);

    // ── 21. Shuttle passes ────────────────────────────────────────────────────
    await db.query(`
      CREATE TABLE IF NOT EXISTS shuttle_passes (
        id                          INT AUTO_INCREMENT PRIMARY KEY,
        name                        VARCHAR(150) NOT NULL,
        pass_type                   VARCHAR(80),
        morning_evening_fare        DECIMAL(10,2),
        fare_discount               DECIMAL(5,2) NOT NULL DEFAULT 0,
        validity_days               INT NOT NULL DEFAULT 30,
        per_user_cancellation_limit INT,
        total_pass_limit            INT,
        per_user_pass_limit         INT NOT NULL DEFAULT 1,
        benefits                    TEXT,
        status                      ENUM('active','inactive') NOT NULL DEFAULT 'active',
        recommended                 TINYINT(1) NOT NULL DEFAULT 0,
        created_at                  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // ── 22. Shuttle trips (new route-based trips) ─────────────────────────────
    await db.query(`
      CREATE TABLE IF NOT EXISTS shuttle_trips (
        id                          INT AUTO_INCREMENT PRIMARY KEY,
        city_id                     INT,
        route_id                    INT,
        start_time                  VARCHAR(8) NOT NULL,
        vehicle_id                  INT,
        driver_id                   INT,
        week_days                   VARCHAR(50),
        cancellation_policy_id      INT,
        pass_cancellation_policy_id INT,
        promotion_id                INT,
        terms_link                  TEXT,
        terms_pointers              TEXT,
        pass_terms_link             TEXT,
        pass_terms_pointers         TEXT,
        status                      ENUM('active','inactive') NOT NULL DEFAULT 'active',
        created_at                  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (city_id)    REFERENCES operational_cities(id)   ON DELETE SET NULL,
        FOREIGN KEY (route_id)   REFERENCES shuttle_routes(id)       ON DELETE SET NULL,
        FOREIGN KEY (vehicle_id) REFERENCES shuttle_vehicles(id)     ON DELETE SET NULL,
        FOREIGN KEY (driver_id)  REFERENCES users(id)                ON DELETE SET NULL
      )
    `);

    // ── 23. Shuttle trip bookings (new booking model) ─────────────────────────
    await db.query(`
      CREATE TABLE IF NOT EXISTS shuttle_trip_bookings (
        id              INT AUTO_INCREMENT PRIMARY KEY,
        trip_id         INT NOT NULL,
        passenger_id    INT NOT NULL,
        pickup_stop_id  INT,
        dropoff_stop_id INT,
        travel_date     DATE NOT NULL,
        seats           INT NOT NULL DEFAULT 1,
        status          ENUM('confirmed','cancelled','completed') NOT NULL DEFAULT 'confirmed',
        effective_price DECIMAL(10,2),
        pass_id         INT,
        promo_id        INT,
        created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (trip_id)        REFERENCES shuttle_trips(id) ON DELETE CASCADE,
        FOREIGN KEY (passenger_id)   REFERENCES users(id)         ON DELETE CASCADE,
        FOREIGN KEY (pickup_stop_id) REFERENCES shuttle_stops(id) ON DELETE SET NULL,
        FOREIGN KEY (dropoff_stop_id) REFERENCES shuttle_stops(id) ON DELETE SET NULL
      )
    `);

    // ── 24. Push notifications ────────────────────────────────────────────────
    await db.query(`
      CREATE TABLE IF NOT EXISTS push_notifications (
        id            INT AUTO_INCREMENT PRIMARY KEY,
        city_id       INT,
        title         VARCHAR(200) NOT NULL,
        message       TEXT NOT NULL,
        image_url     TEXT,
        user_type     ENUM('all','customer','driver') NOT NULL DEFAULT 'all',
        country_codes VARCHAR(500),
        sent_by       INT,
        status        ENUM('sent','failed','draft') NOT NULL DEFAULT 'draft',
        created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (sent_by) REFERENCES users(id) ON DELETE SET NULL
      )
    `);

    // ── 25. General settings ──────────────────────────────────────────────────
    await db.query(`
      CREATE TABLE IF NOT EXISTS general_settings (
        id                   INT PRIMARY KEY DEFAULT 1,
        client_name          VARCHAR(100),
        support_email        VARCHAR(150),
        brand_logo_url       TEXT,
        favicon_url          TEXT,
        nearby_stops_count   INT NOT NULL DEFAULT 3,
        max_nearby_distance  INT NOT NULL DEFAULT 500,
        updated_at           TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    await db.query(`INSERT IGNORE INTO general_settings (id) VALUES (1)`);

    // ── 26. City settings ─────────────────────────────────────────────────────
    await db.query(`
      CREATE TABLE IF NOT EXISTS city_settings (
        id                      INT AUTO_INCREMENT PRIMARY KEY,
        city_id                 INT NOT NULL UNIQUE,
        customer_support_number VARCHAR(30),
        driver_support_number   VARCHAR(30),
        emergency_number        VARCHAR(30),
        service_type            ENUM('on_demand','scheduled','both') NOT NULL DEFAULT 'both',
        updated_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (city_id) REFERENCES operational_cities(id) ON DELETE CASCADE
      )
    `);

    // ── 27. Homescreen items ──────────────────────────────────────────────────
    await db.query(`
      CREATE TABLE IF NOT EXISTS homescreen_items (
        id            INT AUTO_INCREMENT PRIMARY KEY,
        city_id       INT NOT NULL,
        category      VARCHAR(100) NOT NULL,
        display_order INT NOT NULL DEFAULT 1,
        active        TINYINT(1) NOT NULL DEFAULT 1,
        user_type     ENUM('customer','driver','both') NOT NULL DEFAULT 'customer',
        geofence_name VARCHAR(150),
        created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (city_id) REFERENCES operational_cities(id) ON DELETE CASCADE
      )
    `);

    // ── 28. Admin managers ────────────────────────────────────────────────────
    await db.query(`
      CREATE TABLE IF NOT EXISTS admin_managers (
        id            INT AUTO_INCREMENT PRIMARY KEY,
        name          VARCHAR(100) NOT NULL,
        email         VARCHAR(150) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        role_id       INT,
        status        ENUM('active','inactive') NOT NULL DEFAULT 'active',
        created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // ── 29. Roles & permissions ───────────────────────────────────────────────
    await db.query(`
      CREATE TABLE IF NOT EXISTS roles (
        id         INT AUTO_INCREMENT PRIMARY KEY,
        name       VARCHAR(100) NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS role_permissions (
        id       INT AUTO_INCREMENT PRIMARY KEY,
        role_id  INT NOT NULL,
        tab      VARCHAR(100) NOT NULL,
        FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
      )
    `);

    // Insert default Super Admin role
    await db.query(`INSERT IGNORE INTO roles (id, name) VALUES (1, 'Super Admin')`);

    // ── 30. Driver document types ─────────────────────────────────────────────
    await db.query(`
      CREATE TABLE IF NOT EXISTS driver_doc_types (
        id                  INT AUTO_INCREMENT PRIMARY KEY,
        city_id             INT,
        doc_name            VARCHAR(150) NOT NULL,
        doc_type            VARCHAR(60) NOT NULL DEFAULT 'image',
        num_images          INT NOT NULL DEFAULT 1,
        gallery_restricted  TINYINT(1) NOT NULL DEFAULT 0,
        doc_required        TINYINT(1) NOT NULL DEFAULT 1,
        doc_number_required TINYINT(1) NOT NULL DEFAULT 0,
        expiry_required     TINYINT(1) NOT NULL DEFAULT 0,
        expired_action      VARCHAR(60) NOT NULL DEFAULT 'none',
        status              ENUM('active','inactive') NOT NULL DEFAULT 'active',
        created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (city_id) REFERENCES operational_cities(id) ON DELETE SET NULL
      )
    `);

    // ── 31. Suggested routes ──────────────────────────────────────────────────
    await db.query(`
      CREATE TABLE IF NOT EXISTS suggested_routes (
        id               INT AUTO_INCREMENT PRIMARY KEY,
        user_id          INT NOT NULL,
        city_id          INT,
        pickup_address   VARCHAR(300) NOT NULL,
        dropoff_address  VARCHAR(300) NOT NULL,
        shift_description VARCHAR(200),
        created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id)  REFERENCES users(id)              ON DELETE CASCADE,
        FOREIGN KEY (city_id)  REFERENCES operational_cities(id) ON DELETE SET NULL
      )
    `);

    // ── 32. Delete account requests ───────────────────────────────────────────
    await db.query(`
      CREATE TABLE IF NOT EXISTS delete_account_requests (
        id           INT AUTO_INCREMENT PRIMARY KEY,
        user_id      INT NOT NULL,
        reason       TEXT,
        feedback     TEXT,
        status       ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
        processed_at DATETIME,
        created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    console.log('✅  All migrations done');
  } catch (err) {
    console.error('⚠️  Migration warning:', err.message);
  }
};
