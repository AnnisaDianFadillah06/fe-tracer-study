**Konsep Arsitektur Sistem Tracer Study**  
**Before vs After Brainstorming dengan Grok**  

- Dari MVC klasik → Layered Architecture + Cube.js  
- Penjelasan lengkap alur, keunggulan, dan perbedaan implementasi  
- Disusun untuk pembimbing / sidang / laporan TA  

---

### **Arsitektur SEBELUM Brainstorming (MVC Klasik)**
**Pendekatan Lama (Sederhana)**  

- Laravel MVC  
  - Controller → langsung query PostgreSQL  
  - Model → tabel fact & dimension (Star Schema)  
- Repository → panggil **View / Materialized View** di PostgreSQL  
- Tidak ada Service / DTO yang jelas  
- OLAP “mini” → pakai SQL + Materialized View  

**Kelemahan:**  
- Fat Controller  
- Query logic bercampur di banyak tempat  
- Sulit ganti data source nanti  

---

### **Arsitektur SESUDAH Brainstorming (Layered + Cube.js)**
**Pendekatan Baru (Best Practice)**  

✅ **Repository** → hanya panggil Cube.js API  
✅ **Service** → business logic & orkestrasi  
✅ **DTO** → transform response jadi clean untuk Frontend  
✅ Controller tetap **tipis**  

**Alur Request:**  
Frontend (React) → Laravel Controller → Service → Repository → **Cube.js** → PostgreSQL  

---

### **Perbedaan View/Materialized View vs Cube.js**
| Aspek                  | Materialized View (PostgreSQL) | Cube.js (Analytic Layer)          |
|------------------------|--------------------------------|-----------------------------------|
| Tempat logic KPI       | SQL manual                     | JS Schema (measure + dimension)  |
| Pre-aggregation        | Manual (refresh manual)        | Otomatis (rollup)                 |
| Drill-down / filter    | Query ulang setiap kali        | Instan dari cache/pre-agg         |
| Performa dashboard     | Sedang                         | Sangat cepat                      |
| Keamanan & akses role  | Harus di Laravel               | Laravel tetap kontrol (auth)      |

**Kesimpulan**  
❌ OLAP Cube ≠ sekadar View di PostgreSQL  
✅ Tapi bisa “ditiru” pakai Materialized View (level implementasi sederhana)  

---

### **Layer Penyimpanan & Analitik (Keunggulan Cube.js)**
**Arsitektur 4 Layer yang Jelas**

- **PostgreSQL** → Data Warehouse (Star Schema tetap)  
- **Cube.js** → Analytic Layer (pre-aggregate, roll-up, multidimensional)  
- **Laravel** → Backend + Security (Auth, Role Kaprodi/P2MPP, DTO)  
- **React** → Visualisasi Dashboard  

**Keunggulan Cube.js**  
- Pre-aggregation otomatis  
- Query pakai JSON (bukan SQL raw)  
- Cache & roll-up multidimensional  
- Scalable kalau data bertambah besar  


### **Cara Kerja Cube.js (Praktis)**
**Cube.js hanya definisi (bukan pindah data!)**  

- Data **tetap di PostgreSQL**  
- Cube.js = **schema JS** (1 file per domain, contoh: `schema/Tracer.js`)  
- Isi schema:  
  - `sql:` → JOIN semua fact & dimension  
  - `measures:` → KPI (keterserapan, rata_masa_tunggu, dll.)  
  - `dimensions:` → tahun, prodi, angkatan, dll.  
  - `preAggregations:` → roll-up otomatis  

**Repository Laravel hanya HTTP POST ke Cube.js API** (bukan DB::select lagi).

---

### **Slide 8: Contoh Kode Repository (Cube.js Call)**
```php
// DashboardRepository.php
public function getKeterserapan($tahun)
{
    return Http::post('http://cubejs:4000/cubejs-api/v1/load', [
        "query" => [
            "measures" => ["Tracer.keterserapan"],
            "dimensions" => ["Tracer.prodi"],
            "filters" => [["dimension" => "Tracer.tahun", "operator" => "equals", "values" => [$tahun]]]
        ]
    ])->json();
}
```

**DTO** → transform response Cube.js jadi clean JSON untuk React.

---

### **Mengapa Tetap Pakai Laravel? (Bukan Langsung React → Cube.js)**
**Alasan Penting (Security & Best Practice)**

- Cube.js API langsung dari React = **risk security** (token bocor, query bisa dimanipulasi)  
- Laravel tetap jadi **API Gateway**  
- Handle: Auth, Role-based access (Kaprodi hanya lihat prodi sendiri), Business logic, DTO formatting  
- Scalable & maintainable  

---

### **Kesimpulan**
**Ringkasan Before → After**

- **Before:** MVC + Materialized View (cukup untuk skala kecil)  
- **After:** Layered Architecture + Cube.js (professional, scalable, cepat)  
- PostgreSQL tetap jadi Data Warehouse  
- Cube.js jadi Analytic Layer (pre-agg otomatis)  
- Laravel = Security & Orchestration  
- React = Visualization  

**Manfaat utama:** Lebih cepat, lebih aman, lebih mudah maintenance.

---

### **Paradigma Pemrograman Laravel**

**Apakah Laravel OOP atau Structured/Procedural?**

**Laravel adalah framework berbasis Object-Oriented Programming (OOP)** yang dibangun di atas PHP modern.

- Laravel **bukan** structured/procedural seperti PHP lama (PHP 4 atau script biasa).  
- Laravel **sangat mengadopsi OOP** secara mendalam + konsep modern (MVC, Dependency Injection, Facades, Eloquent ORM, dll).
---

### **Laravel Menggunakan OOP (Contoh Kode)**

**1. Class & Object (OOP Dasar)**

```php
// app/Models/Alumni.php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Alumni extends Model  // Inheritance (OOP)
{
    protected $table = 'dim_alumni';  // Encapsulation
    protected $fillable = ['nama', 'angkatan']; 

    public function prodi()  // Method
    {
        return $this->belongsTo(Prodi::class);  // Relationship
    }
}
```

**2. Controller (OOP)**

```php
// app/Http/Controllers/DashboardController.php
namespace App\Http\Controllers;

use App\Services\DashboardService;  // Dependency Injection
use Illuminate\Http\Request;

class DashboardController extends Controller  // Inheritance
{
    protected $dashboardService;

    public function __construct(DashboardService $dashboardService)  // Constructor Injection
    {
        $this->dashboardService = $dashboardService;
    }

    public function getKeterserapan(Request $request)
    {
        return $this->dashboardService->getKeterserapan($request->tahun);
    }
}
```

**3. Service Layer (Clean Architecture Style)**

```php
// app/Services/DashboardService.php
namespace App\Services;

use App\Repositories\DashboardRepository;
use App\DTOs\KeterserapanDTO;

class DashboardService
{
    protected $repository;

    public function __construct(DashboardRepository $repository)
    {
        $this->repository = $repository;
    }

    public function getKeterserapan($tahun)
    {
        $data = $this->repository->getKeterserapan($tahun);
        return KeterserapanDTO::fromCube($data);  // Menggunakan DTO
    }
}
```

**4. Repository + DTO (Layered Architecture)**

```php
// app/Repositories/DashboardRepository.php
namespace App\Repositories;

use Illuminate\Support\Facades\Http;

class DashboardRepository
{
    public function getKeterserapan($tahun)
    {
        // HTTP call ke Cube.js
        return Http::post(...)->json();
    }
}
```

---

### **Perbandingan Paradigma**

| Paradigma       | Structured/Procedural | Object-Oriented (Laravel)          | Status di Proyek Kamu |
|-----------------|-----------------------|------------------------------------|-----------------------|
| Cara Penulisan  | Function global       | Class, Object, Inheritance         | OOP                   |
| Organisasi Kode | Script panjang        | Folder: Models, Services, Repositories, DTOs | Layered OOP     |
| Maintainability | Sulit (spaghetti)     | Tinggi (modular & testable)        | OOP + Layered         |
| Contoh          | `function hitungKPI()`| `class DashboardService { ... }`   | Digunakan             |

**Kesimpulan**  
“Pada sistem ini, framework Laravel digunakan dengan pendekatan **Object-Oriented Programming (OOP)** yang dikombinasikan dengan Layered Architecture (Repository, Service, DTO) untuk meningkatkan keterbacaan, reusability, dan maintainability kode.”

---

> **3.2 Paradigma Pemrograman**  
> Sistem backend dikembangkan menggunakan Laravel 10/11 yang berbasis **Object-Oriented Programming (OOP)**. Pendekatan ini diimplementasikan melalui pembuatan class-class pada layer Controller, Service, Repository, Model (Eloquent), dan DTO. Penggunaan OOP memungkinkan penerapan prinsip SOLID, Dependency Injection, dan pemisahan tanggung jawab (Separation of Concerns) yang jelas.

---


## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)
