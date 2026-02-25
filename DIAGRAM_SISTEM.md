# Dokumentasi Visual Absensi-App

Dokumen ini berisi diagram arsitektur sistem dan ERD database yang lengkap untuk proyek Absensi-App.

## 1. Master Diagram (Arsitektur & Alur Program)

Diagram ini menunjukkan bagaimana Client (Web & Mobile) berinteraksi dengan Server dan Database.

```mermaid
flowchart TB
    %% Client Side
    subgraph Client_Layer ["1. Client Side (User Interface)"]
        direction LR
        Web["💻 Admin Panel (React.js/MUI)\n- Kelola Pegawai\n- Monitor Absensi\n- Pengaturan Sistem"]
        
        Mobile["📱 Aplikasi Mobile (Flutter)\n- Scan Wajah\n- Validasi GPS\n- Riwayat Absen"]
    end

    %% Server Side
    subgraph Server_Layer ["2. Server Side (Node.js API)"]
        direction TB
        API["🚀 Express API\n(Routes & Logic)"]
        
        Auth["🔐 JWT Middleware\n(Keamanan)"]
        
        FaceEngine["🧠 Face-api.js\n(Biometric Engine)"]
    end

    %% Database & Storage
    subgraph Database_Layer ["3. Database & Storage (MySQL)"]
        direction TB
        
        subgraph ERD ["Skema Database (ERD)"]
            T1[("👤 admin_users\n(Login Admin)")]
            T2[("👥 employees\n(Data Pegawai)")]
            T3[("👁️ employee_faces\n(Data Wajah)")]
            T4[("📝 attendance\n(Log Absensi)")]
            T5[("⚙️ system_settings\n(Config Jam/Akurasi)")]
            T6[("📅 holidays\n(Hari Libur)")]
            
            %% Relationships
            T2 -- 1:N --- T3
            T2 -- 1:N --- T4
        end
        
        Files[("📂 File Storage\n(/uploads/attendance\n/uploads/profiles)")]
    end

    %% Interaction Flows
    Web <--> Auth
    Mobile <--> API
    API <--> Auth
    API <--> FaceEngine
    API <--> T1
    API <--> T2
    API <--> T5
    API <--> T6
    FaceEngine <--> T3
    API -- "Simpan Log" --> T4
    API -- "Simpan Foto" --> Files
```

---

## 2. Entity Relationship Diagram (ERD) Detail

Struktur tabel lengkap beserta tipe data dan relasinya.

```mermaid
erDiagram
    admin_users {
        int id PK
        varchar username UK
        varchar email UK
        varchar password_hash
        varchar full_name
        varchar role
        boolean is_active
    }

    employees {
        int id PK
        varchar employee_id UK
        varchar full_name
        varchar email
        varchar phone
        varchar position
        varchar department
        enum gender
        date hire_date
        boolean is_active
    }

    employee_faces {
        int id PK
        int employee_id FK
        longtext face_descriptor
        varchar face_image_path
        boolean is_primary
    }

    attendance {
        int id PK
        int employee_id FK
        datetime check_in
        datetime check_out
        varchar check_in_image
        varchar status
        text notes
    }

    holidays {
        int id PK
        date date UK
        varchar name
        enum type
    }

    system_settings {
        int id PK
        varchar setting_key UK
        text setting_value
        varchar category
    }

    %% Relationships
    employees ||--o{ employee_faces : "has_biometric"
    employees ||--o{ attendance : "logs_attendance"
```

---

## 3. Alur Deteksi Wajah (Sequence Diagram)

```mermaid
sequenceDiagram
    participant Mobile as Flutter App
    participant API as Node.js API
    participant Face as Face-api.js
    participant DB as MySQL

    Mobile->>API: POST /check-in (Bawa Foto)
    API->>Face: extractFaceDescriptor(image)
    Face-->>API: Return 128-float numbers
    API->>DB: SELECT * FROM employee_faces
    DB-->>API: Return all registered faces
    API->>Face: compareFaces(input, database)
    
    alt Wajah Cocok
        Face-->>API: Match Found (Employee ID)
        API->>DB: INSERT INTO attendance
        API-->>Mobile: 200 OK (Berhasil Absen)
    else Wajah Tidak Cocok
        Face-->>API: No Match
        API-->>Mobile: 401 Unauthorized
    end
```
