CREATE TABLE IF NOT EXISTS users (
 id SERIAL PRIMARY KEY, user_id VARCHAR(50) UNIQUE NOT NULL, password VARCHAR(255) NOT NULL,
 role VARCHAR(20) NOT NULL CHECK(role IN ('admin','principal','teacher')),
 name VARCHAR(150), email VARCHAR(150), phone VARCHAR(30), status VARCHAR(20) NOT NULL DEFAULT 'active',
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS school_settings (
 id SERIAL PRIMARY KEY, school_name VARCHAR(200) NOT NULL, board VARCHAR(100) DEFAULT 'CBSE',
 affiliation_no VARCHAR(100), school_code VARCHAR(100), address TEXT, city VARCHAR(100), state VARCHAR(100),
 pin_code VARCHAR(20), phone VARCHAR(50), email VARCHAR(150), website VARCHAR(200), logo_url TEXT,
 academic_session VARCHAR(30) DEFAULT '2026-27', current_term VARCHAR(100), exam_session VARCHAR(100),
 principal_name VARCHAR(150), vice_principal_name VARCHAR(150), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS classes (id SERIAL PRIMARY KEY,class_name VARCHAR(50) UNIQUE NOT NULL,display_order INTEGER DEFAULT 0);
CREATE TABLE IF NOT EXISTS sections (id SERIAL PRIMARY KEY,class_id INTEGER REFERENCES classes(id) ON DELETE CASCADE,section_name VARCHAR(20) NOT NULL,UNIQUE(class_id,section_name));
CREATE TABLE IF NOT EXISTS subjects (id SERIAL PRIMARY KEY,name VARCHAR(100) NOT NULL,code VARCHAR(50),max_marks INTEGER DEFAULT 100,UNIQUE(name,code));
CREATE TABLE IF NOT EXISTS teacher_assignments (id SERIAL PRIMARY KEY,teacher_id INTEGER REFERENCES users(id) ON DELETE CASCADE,class_id INTEGER REFERENCES classes(id) ON DELETE CASCADE,section_id INTEGER REFERENCES sections(id) ON DELETE CASCADE,subject_id INTEGER REFERENCES subjects(id) ON DELETE CASCADE,is_class_teacher BOOLEAN DEFAULT FALSE,created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,UNIQUE(teacher_id,class_id,section_id,subject_id));
CREATE TABLE IF NOT EXISTS students (
 id SERIAL PRIMARY KEY, admission_number VARCHAR(30) UNIQUE NOT NULL, student_name VARCHAR(150) NOT NULL,
 father_name VARCHAR(150) NOT NULL, mother_name VARCHAR(150) NOT NULL, dob DATE NOT NULL, gender VARCHAR(20) NOT NULL,
 photo_url TEXT,address TEXT NOT NULL,mobile VARCHAR(30),email VARCHAR(150),academic_session VARCHAR(30) NOT NULL,
 class_id INTEGER REFERENCES classes(id),section_id INTEGER REFERENCES sections(id),class_name VARCHAR(50),section_name VARCHAR(20),
 roll_number VARCHAR(50),admission_date DATE DEFAULT CURRENT_DATE,status VARCHAR(20) DEFAULT 'active',
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_students_admission ON students(admission_number);
CREATE INDEX IF NOT EXISTS idx_students_roll ON students(roll_number);
CREATE INDEX IF NOT EXISTS idx_students_name ON students(student_name);
CREATE TABLE IF NOT EXISTS exams (id SERIAL PRIMARY KEY,name VARCHAR(150) NOT NULL,academic_session VARCHAR(30) NOT NULL,start_date DATE,end_date DATE,published BOOLEAN DEFAULT FALSE,created_by INTEGER REFERENCES users(id),created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS exam_subjects (id SERIAL PRIMARY KEY,exam_id INTEGER REFERENCES exams(id) ON DELETE CASCADE,subject_id INTEGER REFERENCES subjects(id) ON DELETE CASCADE,class_id INTEGER REFERENCES classes(id) ON DELETE CASCADE,max_marks INTEGER DEFAULT 100,exam_date DATE,exam_time VARCHAR(50),UNIQUE(exam_id,subject_id,class_id));
CREATE TABLE IF NOT EXISTS marks (id SERIAL PRIMARY KEY,student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,exam_id INTEGER REFERENCES exams(id) ON DELETE CASCADE,subject_id INTEGER REFERENCES subjects(id) ON DELETE CASCADE,teacher_id INTEGER REFERENCES users(id),obtained_marks NUMERIC(6,2) DEFAULT 0,max_marks NUMERIC(6,2) DEFAULT 100,remarks TEXT,created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,UNIQUE(student_id,exam_id,subject_id));
CREATE TABLE IF NOT EXISTS attendance (id SERIAL PRIMARY KEY,student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,class_id INTEGER REFERENCES classes(id),section_id INTEGER REFERENCES sections(id),subject_id INTEGER REFERENCES subjects(id),teacher_id INTEGER REFERENCES users(id),attendance_date DATE NOT NULL,status VARCHAR(20) CHECK(status IN ('Present','Absent')),created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,UNIQUE(student_id,subject_id,attendance_date));
CREATE TABLE IF NOT EXISTS fee_structures (id SERIAL PRIMARY KEY,academic_session VARCHAR(30) NOT NULL,class_id INTEGER REFERENCES classes(id),tuition_fee NUMERIC(12,2) DEFAULT 0,admission_fee NUMERIC(12,2) DEFAULT 0,examination_fee NUMERIC(12,2) DEFAULT 0,transport_fee NUMERIC(12,2) DEFAULT 0,computer_fee NUMERIC(12,2) DEFAULT 0,library_fee NUMERIC(12,2) DEFAULT 0,activity_fee NUMERIC(12,2) DEFAULT 0,other_fee NUMERIC(12,2) DEFAULT 0,due_date DATE,late_fee NUMERIC(12,2) DEFAULT 0,created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS fee_payments (id SERIAL PRIMARY KEY,receipt_number VARCHAR(40) UNIQUE NOT NULL,student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,academic_session VARCHAR(30),payment_period VARCHAR(50),amount NUMERIC(12,2) NOT NULL,payment_mode VARCHAR(30) DEFAULT 'Cash',transaction_reference VARCHAR(150),remarks TEXT,payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,collected_by INTEGER REFERENCES users(id),created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS notices (id SERIAL PRIMARY KEY,title VARCHAR(255) NOT NULL,description TEXT,attachment_url TEXT,published BOOLEAN DEFAULT FALSE,published_at TIMESTAMP,created_by INTEGER REFERENCES users(id),created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS admit_cards (id SERIAL PRIMARY KEY,student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,exam_id INTEGER REFERENCES exams(id) ON DELETE CASCADE,exam_centre VARCHAR(255),generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,UNIQUE(student_id,exam_id));
CREATE TABLE IF NOT EXISTS fee_reminders (id SERIAL PRIMARY KEY,student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,message TEXT NOT NULL,reminder_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,status VARCHAR(20) DEFAULT 'sent',created_by INTEGER REFERENCES users(id));
CREATE TABLE IF NOT EXISTS fee_adjustments (id SERIAL PRIMARY KEY,student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,payment_id INTEGER REFERENCES fee_payments(id),adjustment_type VARCHAR(30) NOT NULL,amount NUMERIC(12,2) NOT NULL,reason TEXT,created_by INTEGER REFERENCES users(id),created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
INSERT INTO school_settings(school_name,board,school_code,academic_session) SELECT 'ABC Public School','CBSE','XXXXX','2026-27' WHERE NOT EXISTS(SELECT 1 FROM school_settings);
INSERT INTO classes(class_name,display_order) VALUES ('Nursery',1),('LKG',2),('UKG',3),('I',4),('II',5),('III',6),('IV',7),('V',8),('VI',9),('VII',10),('VIII',11),('IX',12),('X',13),('XI',14),('XII',15) ON CONFLICT(class_name) DO NOTHING;
INSERT INTO subjects(name,code,max_marks) VALUES ('English','ENG',100),('Hindi','HIN',100),('Mathematics','MATH',100),('Science','SCI',100),('Social Science','SST',100),('Computer','COM',100) ON CONFLICT(name,code) DO NOTHING;
