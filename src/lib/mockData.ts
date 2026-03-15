// Mock data for tracer study dashboard

// Sumber Biaya Kuliah options
export const SUMBER_BIAYA_OPTIONS = [
  "Biaya Sendiri/Keluarga",
  "Beasiswa BIDIKMISI", 
  "Beasiswa PPA",
  "Beasiswa ADIK",
  "Beasiswa Perusahaan",
  "Beasiswa AFIRMASI",
  "Lainnya"
];

// Cara Mendapat Pekerjaan options (multiple response)
export const CARA_MENDAPAT_KERJA_OPTIONS = [
  { key: "f401", label: "Iklan koran/majalah/brosur" },
  { key: "f402", label: "Melamar tanpa lowongan" },
  { key: "f403", label: "Bursa/pameran kerja" },
  { key: "f404", label: "Internet/iklan online" },
  { key: "f405", label: "Dihubungi perusahaan" },
  { key: "f406", label: "Kemenakertrans" },
  { key: "f407", label: "Agen tenaga kerja swasta" },
  { key: "f408", label: "Pusat karir universitas" },
  { key: "f409", label: "Kantor kemahasiswaan/alumni" },
  { key: "f410", label: "Jejaring sejak kuliah" },
  { key: "f411", label: "Relasi (dosen/keluarga/teman)" },
  { key: "f412", label: "Membangun bisnis sendiri" },
  { key: "f413", label: "Penempatan kerja/magang" },
  { key: "f414", label: "Tempat kerja saat kuliah" },
  { key: "f415", label: "Lainnya" },
];

// Jenis Instansi options
export const JENIS_INSTANSI_OPTIONS = [
  "Instansi Pemerintah",
  "Organisasi Non-profit/LSM",
  "Perusahaan Swasta",
  "Wiraswasta/Perusahaan Sendiri",
  "BUMN/BUMD",
  "Institusi/Organisasi Multilateral",
  "Lainnya"
];

export interface Student {
  id: string;
  nama: string;
  nim: string;
  prodi: string;
  jenjang: "D3" | "D4" | "S2";
  tahunLulus: number;
  gender: "Pria" | "Wanita";
  status: string;
  kesesuaianBidang: string;
  waktuTunggu: number; // in months
  gaji: number;
  kategoriPerusahaan: string;
  ipk: number;
  // New fields
  sumberBiayaKuliah: string;
  caraMendapatKerja: string[]; // Multiple response
  jenisInstansi: string;
  // Clustering-specific indicators
  // Cluster 1 - Wait Time
  mulaiCariKerja: "Sebelum Lulus" | "Setelah Lulus" | "Tidak Mencari";
  aktifCariKerja: boolean;
  // Cluster 2 - Career Profile  
  jenisPerusahaan: string;
  levelJabatan: string;
  lokasi: string;
  // Cluster 3 - Field Relevance
  tingkatPendidikanSesuai: string;
  gapKompetensi: number;
  // Cluster 4 - Job Search
  metodeCariKerja: string[];
  jumlahLamaran: number;
  jumlahInterview: number;
  // Cluster 5 - Entrepreneurship
  jenisUsaha?: string;
  bulanMulaiUsaha?: number;
  // Cluster 6 - Funding
  sumberPembiayaan: string;
  // Cluster 7 - Competency
  skorPengetahuan: number;
  skorTI: number;
  skorBahasaInggris: number;
  skorKomunikasi: number;
  skorKerjaTim: number;
  skorProblemSolving: number;
  // Cluster 8 - Learning
  metodePerkuliahan: number;
  metodeMagang: number;
  metodeProyek: number;
  metodePraktikum: number;
  // User satisfaction (for employer survey)
  kepuasanEtika?: string;
  kepuasanKeahlian?: string;
  kepuasanBahasa?: string;
  kepuasanTI?: string;
  kepuasanKomunikasi?: string;
  kepuasanKerjasama?: string;
  kepuasanPengembangan?: string;
}

export interface Prodi {
  id: string;
  name: string;
  jenjang: "D3" | "D4" | "S2";
  lam: string;
  threshold: number;
}

export const LAM_THRESHOLDS: Record<string, { threshold: number; prodi: string[] }> = {
  "LAM Teknik": { threshold: 70, prodi: ["Teknik Informatika", "Teknik Elektronika", "Teknik Mesin", "Teknik Listrik", "Teknik Telekomunikasi", "Teknik Sipil"] },
  "LAM EMBA": { threshold: 60, prodi: ["Teknik Kimia", "Teknik Konversi Energi", "Teknik Pendingin"] },
  "LAM Ekonomi": { threshold: 65, prodi: ["Akuntansi Manajemen", "Keuangan Perbankan", "Keuangan Syariah", "Magister Manajemen"] },
};

export const PRODI_LIST: Prodi[] = [
  { id: "d3-ti", name: "Teknik Informatika", jenjang: "D3", lam: "LAM Teknik", threshold: 70 },
  { id: "d3-tk", name: "Teknik Kimia", jenjang: "D3", lam: "LAM EMBA", threshold: 60 },
  { id: "d3-tke", name: "Teknik Konversi Energi", jenjang: "D3", lam: "LAM EMBA", threshold: 60 },
  { id: "d3-te", name: "Teknik Elektronika", jenjang: "D3", lam: "LAM Teknik", threshold: 70 },
  { id: "d3-tm", name: "Teknik Mesin", jenjang: "D3", lam: "LAM Teknik", threshold: 70 },
  { id: "d3-tl", name: "Teknik Listrik", jenjang: "D3", lam: "LAM Teknik", threshold: 70 },
  { id: "d3-tt", name: "Teknik Telekomunikasi", jenjang: "D3", lam: "LAM Teknik", threshold: 70 },
  { id: "d3-tp", name: "Teknik Pendingin", jenjang: "D3", lam: "LAM EMBA", threshold: 60 },
  { id: "d4-ti", name: "Teknik Informatika", jenjang: "D4", lam: "LAM Teknik", threshold: 70 },
  { id: "d4-akm", name: "Akuntansi Manajemen", jenjang: "D4", lam: "LAM Ekonomi", threshold: 65 },
  { id: "d4-kp", name: "Keuangan Perbankan", jenjang: "D4", lam: "LAM Ekonomi", threshold: 65 },
  { id: "d4-ks", name: "Keuangan Syariah", jenjang: "D4", lam: "LAM Ekonomi", threshold: 65 },
  { id: "s2-mm", name: "Magister Manajemen", jenjang: "S2", lam: "LAM Ekonomi", threshold: 65 },
];

export const TAHUN_LULUS = [2020, 2021, 2022, 2023, 2024];

// Clustering domain configurations with unique indicators
export const CLUSTER_DOMAINS = {
  "wait-time": {
    name: "Pola Masa Tunggu Kerja",
    indicators: ["waktuTunggu", "mulaiCariKerja", "aktifCariKerja", "status"],
    columns: [
      { key: "waktuTunggu", label: "Waktu Tunggu (Bulan)" },
      { key: "mulaiCariKerja", label: "Mulai Cari Kerja" },
      { key: "aktifCariKerja", label: "Aktif Mencari", render: (v: boolean) => v ? "Ya" : "Tidak" },
      { key: "status", label: "Status" },
    ]
  },
  "career-profile": {
    name: "Profil Karier Lulusan", 
    indicators: ["jenisPerusahaan", "levelJabatan", "gaji", "lokasi"],
    columns: [
      { key: "jenisPerusahaan", label: "Jenis Perusahaan" },
      { key: "levelJabatan", label: "Level Jabatan" },
      { key: "gaji", label: "Gaji" },
      { key: "lokasi", label: "Lokasi" },
    ]
  },
  "field-relevance": {
    name: "Kesesuaian Bidang Studi",
    indicators: ["kesesuaianBidang", "tingkatPendidikanSesuai", "gapKompetensi"],
    columns: [
      { key: "kesesuaianBidang", label: "Kesesuaian Bidang" },
      { key: "tingkatPendidikanSesuai", label: "Tingkat Pendidikan" },
      { key: "gapKompetensi", label: "Gap Kompetensi (%)" },
    ]
  },
  "job-search": {
    name: "Strategi Mencari Kerja",
    indicators: ["metodeCariKerja", "jumlahLamaran", "jumlahInterview", "waktuTunggu"],
    columns: [
      { key: "metodeCariKerja", label: "Metode", render: (v: string[]) => v?.join(", ") || "-" },
      { key: "jumlahLamaran", label: "Jumlah Lamaran" },
      { key: "jumlahInterview", label: "Interview" },
      { key: "waktuTunggu", label: "Waktu Tunggu" },
    ]
  },
  "entrepreneurship": {
    name: "Outcome Wirausaha",
    indicators: ["jenisUsaha", "bulanMulaiUsaha", "gaji"],
    columns: [
      { key: "jenisUsaha", label: "Jenis Usaha" },
      { key: "bulanMulaiUsaha", label: "Bulan Mulai Usaha" },
      { key: "gaji", label: "Pendapatan" },
    ]
  },
  "funding": {
    name: "Pola Pembiayaan Kuliah",
    indicators: ["sumberPembiayaan", "waktuTunggu", "gaji", "status"],
    columns: [
      { key: "sumberPembiayaan", label: "Sumber Pembiayaan" },
      { key: "waktuTunggu", label: "Waktu Tunggu" },
      { key: "gaji", label: "Gaji" },
      { key: "status", label: "Status" },
    ]
  },
  "competency": {
    name: "Profil Kompetensi",
    indicators: ["skorPengetahuan", "skorTI", "skorBahasaInggris", "skorKomunikasi", "skorKerjaTim", "skorProblemSolving"],
    columns: [
      { key: "skorPengetahuan", label: "Pengetahuan" },
      { key: "skorTI", label: "TI" },
      { key: "skorBahasaInggris", label: "B. Inggris" },
      { key: "skorKomunikasi", label: "Komunikasi" },
      { key: "skorKerjaTim", label: "Kerja Tim" },
      { key: "skorProblemSolving", label: "Problem Solving" },
    ]
  },
  "learning": {
    name: "Efektivitas Pembelajaran",
    indicators: ["metodePerkuliahan", "metodeMagang", "metodeProyek", "metodePraktikum", "waktuTunggu"],
    columns: [
      { key: "metodePerkuliahan", label: "Perkuliahan" },
      { key: "metodeMagang", label: "Magang" },
      { key: "metodeProyek", label: "Proyek" },
      { key: "metodePraktikum", label: "Praktikum" },
      { key: "waktuTunggu", label: "Waktu Tunggu" },
    ]
  },
};

// Generate mock students
const names = [
  "Ahmad Fauzi", "Siti Nurhaliza", "Budi Santoso", "Dewi Lestari", "Eko Prasetyo",
  "Fitri Handayani", "Gilang Ramadhan", "Hana Safitri", "Irfan Hakim", "Jihan Aulia",
  "Kurniawan Putra", "Lisa Permata", "Muhammad Rizky", "Nina Kartika", "Oka Mahendra",
  "Putri Ayu", "Qori Hidayat", "Rani Susanti", "Surya Atmaja", "Tina Marlina",
  "Umar Fathoni", "Vina Damayanti", "Wahyu Setiawan", "Xena Oktavia", "Yusuf Habibi", "Zahra Rahmawati"
];

const generateNIM = (jenjang: string, year: number, index: number) => {
  const prefix = jenjang === "D3" ? "3" : jenjang === "D4" ? "4" : "2";
  return `${prefix}${year.toString().slice(-2)}${String(index).padStart(4, "0")}`;
};

// Weighted random selection for sumberBiayaKuliah
const weightedSumberBiaya = () => {
  const weights = [55, 20, 10, 5, 5, 3, 2]; // Biaya Sendiri highest
  const total = weights.reduce((a, b) => a + b, 0);
  let random = Math.random() * total;
  for (let i = 0; i < weights.length; i++) {
    if (random < weights[i]) return SUMBER_BIAYA_OPTIONS[i];
    random -= weights[i];
  }
  return SUMBER_BIAYA_OPTIONS[0];
};

// Random selection of cara mendapat kerja (multiple response)
const randomCaraMendapatKerja = () => {
  const selected: string[] = [];
  CARA_MENDAPAT_KERJA_OPTIONS.forEach(option => {
    if (Math.random() < 0.25) { // 25% chance for each method
      selected.push(option.key);
    }
  });
  // Ensure at least one method
  if (selected.length === 0) {
    selected.push(CARA_MENDAPAT_KERJA_OPTIONS[Math.floor(Math.random() * CARA_MENDAPAT_KERJA_OPTIONS.length)].key);
  }
  return selected;
};

// Weighted random selection for jenisInstansi
const weightedJenisInstansi = () => {
  const weights = [15, 5, 40, 15, 18, 2, 5]; // Swasta highest
  const total = weights.reduce((a, b) => a + b, 0);
  let random = Math.random() * total;
  for (let i = 0; i < weights.length; i++) {
    if (random < weights[i]) return JENIS_INSTANSI_OPTIONS[i];
    random -= weights[i];
  }
  return JENIS_INSTANSI_OPTIONS[2];
};

const KEPUASAN_LEVELS = ["Sangat Baik", "Baik", "Cukup", "Kurang"];

export const generateMockStudents = (count: number = 200): Student[] => {
  const students: Student[] = [];
  const statuses = ["Bekerja", "Mencari Kerja", "Studi Lanjut", "Wiraswasta", "Studi & Bekerja", "Belum Bekerja"];
  const kesesuaian = ["Sangat Erat", "Erat", "Cukup Erat", "Kurang Erat", "Tidak Sesuai"];
  const perusahaan = ["Nasional/BBH", "Multinasional", "Lokal/Tidak BBH"];
  const jenisPerusahaan = ["Pemerintahan", "BUMN/BUMD", "Swasta", "LSM", "Startup", "Multinasional"];
  const levelJabatan = ["Entry Level", "Junior", "Middle", "Senior", "Supervisor", "Manager"];
  const lokasi = ["Bandung", "Jakarta", "Surabaya", "Medan", "Yogyakarta", "Semarang", "Makassar"];
  const tingkatPendidikan = ["Sangat Sesuai", "Sesuai", "Kurang Sesuai", "Tidak Sesuai"];
  const metodeCari = ["Relasi/Jejaring", "Job Portal", "Media Sosial", "Career Center", "Walk-in", "Headhunter"];
  const sumberPembiayaan = ["Beasiswa Prestasi", "Beasiswa Afirmasi", "Mandiri", "Bantuan Perusahaan", "Campuran"];
  const jenisUsaha = ["Jasa IT", "Kuliner", "Fashion", "Trading", "Konsultan", "Pertanian"];

  for (let i = 0; i < count; i++) {
    const prodi = PRODI_LIST[Math.floor(Math.random() * PRODI_LIST.length)];
    const tahun = TAHUN_LULUS[Math.floor(Math.random() * TAHUN_LULUS.length)];
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const isWirausaha = status === "Wiraswasta";
    const isBekerja = status === "Bekerja" || status === "Wiraswasta" || status === "Studi & Bekerja";
    
    students.push({
      id: `student-${i}`,
      nama: names[Math.floor(Math.random() * names.length)],
      nim: generateNIM(prodi.jenjang, tahun, i),
      prodi: prodi.name,
      jenjang: prodi.jenjang,
      tahunLulus: tahun,
      gender: Math.random() > 0.45 ? "Wanita" : "Pria",
      status,
      kesesuaianBidang: kesesuaian[Math.floor(Math.random() * kesesuaian.length)],
      waktuTunggu: Math.floor(Math.random() * 12) + 1,
      gaji: status === "Mencari Kerja" || status === "Belum Bekerja" ? 0 : Math.floor(Math.random() * 8000000) + 3000000,
      kategoriPerusahaan: perusahaan[Math.floor(Math.random() * perusahaan.length)],
      ipk: parseFloat((Math.random() * 1 + 2.5).toFixed(2)),
      // New fields
      sumberBiayaKuliah: weightedSumberBiaya(),
      caraMendapatKerja: isBekerja ? randomCaraMendapatKerja() : [],
      jenisInstansi: isBekerja ? weightedJenisInstansi() : "",
      // Clustering indicators
      mulaiCariKerja: ["Sebelum Lulus", "Setelah Lulus", "Tidak Mencari"][Math.floor(Math.random() * 3)] as any,
      aktifCariKerja: Math.random() > 0.3,
      jenisPerusahaan: jenisPerusahaan[Math.floor(Math.random() * jenisPerusahaan.length)],
      levelJabatan: levelJabatan[Math.floor(Math.random() * levelJabatan.length)],
      lokasi: lokasi[Math.floor(Math.random() * lokasi.length)],
      tingkatPendidikanSesuai: tingkatPendidikan[Math.floor(Math.random() * tingkatPendidikan.length)],
      gapKompetensi: Math.floor(Math.random() * 30) - 5,
      metodeCariKerja: metodeCari.filter(() => Math.random() > 0.6).slice(0, 3),
      jumlahLamaran: Math.floor(Math.random() * 50) + 1,
      jumlahInterview: Math.floor(Math.random() * 10) + 1,
      jenisUsaha: isWirausaha ? jenisUsaha[Math.floor(Math.random() * jenisUsaha.length)] : undefined,
      bulanMulaiUsaha: isWirausaha ? Math.floor(Math.random() * 12) + 1 : undefined,
      sumberPembiayaan: sumberPembiayaan[Math.floor(Math.random() * sumberPembiayaan.length)],
      skorPengetahuan: Math.floor(Math.random() * 30) + 60,
      skorTI: Math.floor(Math.random() * 40) + 50,
      skorBahasaInggris: Math.floor(Math.random() * 40) + 40,
      skorKomunikasi: Math.floor(Math.random() * 30) + 60,
      skorKerjaTim: Math.floor(Math.random() * 25) + 65,
      skorProblemSolving: Math.floor(Math.random() * 35) + 55,
      metodePerkuliahan: Math.floor(Math.random() * 3) + 3,
      metodeMagang: Math.floor(Math.random() * 3) + 2,
      metodeProyek: Math.floor(Math.random() * 3) + 2,
      metodePraktikum: Math.floor(Math.random() * 3) + 3,
      // Kepuasan fields
      kepuasanEtika: KEPUASAN_LEVELS[Math.floor(Math.random() * KEPUASAN_LEVELS.length)],
      kepuasanKeahlian: KEPUASAN_LEVELS[Math.floor(Math.random() * KEPUASAN_LEVELS.length)],
      kepuasanBahasa: KEPUASAN_LEVELS[Math.floor(Math.random() * KEPUASAN_LEVELS.length)],
      kepuasanTI: KEPUASAN_LEVELS[Math.floor(Math.random() * KEPUASAN_LEVELS.length)],
      kepuasanKomunikasi: KEPUASAN_LEVELS[Math.floor(Math.random() * KEPUASAN_LEVELS.length)],
      kepuasanKerjasama: KEPUASAN_LEVELS[Math.floor(Math.random() * KEPUASAN_LEVELS.length)],
      kepuasanPengembangan: KEPUASAN_LEVELS[Math.floor(Math.random() * KEPUASAN_LEVELS.length)],
    });
  }

  return students;
};

export const MOCK_STUDENTS = generateMockStudents(500);

// Clustering data for each domain with prodi breakdown
export const generateClusteringData = (domain: string, prodiFilter?: string[]) => {
  const prodis = prodiFilter?.length ? prodiFilter : PRODI_LIST.map(p => p.name);
  const uniqueProdis = [...new Set(prodis)];
  
  const colors = [
    "#f97316", "#0ea5e9", "#10b981", "#8b5cf6", "#ec4899", 
    "#f59e0b", "#6366f1", "#14b8a6", "#f43f5e", "#84cc16"
  ];
  
  return uniqueProdis.map((prodi, idx) => {
    const prodiStudents = MOCK_STUDENTS.filter(s => s.prodi === prodi);
    const prodiInfo = PRODI_LIST.find(p => p.name === prodi);
    
    switch (domain) {
      case "wait-time":
        const avgWait = prodiStudents.reduce((a, s) => a + s.waktuTunggu, 0) / prodiStudents.length || 0;
        const employed = prodiStudents.filter(s => s.status === "Bekerja" || s.status === "Wiraswasta").length;
        return {
          prodi,
          lam: prodiInfo?.lam,
          threshold: prodiInfo?.threshold,
          waktuTungguRata: avgWait.toFixed(1),
          tingkatKerja: ((employed / prodiStudents.length) * 100).toFixed(1),
          jumlahAlumni: prodiStudents.length,
          color: colors[idx % colors.length],
          cluster: avgWait < 3 ? "Cepat" : avgWait < 6 ? "Sedang" : "Lama",
        };
      case "career-profile":
        const avgGaji = prodiStudents.filter(s => s.gaji > 0).reduce((a, s) => a + s.gaji, 0) / prodiStudents.filter(s => s.gaji > 0).length || 0;
        const corporate = prodiStudents.filter(s => s.jenisPerusahaan === "Multinasional" || s.jenisPerusahaan === "BUMN/BUMD").length;
        return {
          prodi,
          lam: prodiInfo?.lam,
          threshold: prodiInfo?.threshold,
          gajiRata: avgGaji,
          persenCorporate: ((corporate / prodiStudents.length) * 100).toFixed(1),
          jumlahAlumni: prodiStudents.length,
          color: colors[idx % colors.length],
        };
      case "field-relevance":
        const relevant = prodiStudents.filter(s => s.kesesuaianBidang === "Sangat Erat" || s.kesesuaianBidang === "Erat").length;
        const avgGap = prodiStudents.reduce((a, s) => a + s.gapKompetensi, 0) / prodiStudents.length || 0;
        return {
          prodi,
          lam: prodiInfo?.lam,
          threshold: prodiInfo?.threshold,
          relevansi: ((relevant / prodiStudents.length) * 100).toFixed(1),
          gapRata: avgGap.toFixed(1),
          jumlahAlumni: prodiStudents.length,
          color: colors[idx % colors.length],
        };
      case "competency":
        return {
          prodi,
          lam: prodiInfo?.lam,
          threshold: prodiInfo?.threshold,
          pengetahuan: (prodiStudents.reduce((a, s) => a + s.skorPengetahuan, 0) / prodiStudents.length || 0).toFixed(0),
          ti: (prodiStudents.reduce((a, s) => a + s.skorTI, 0) / prodiStudents.length || 0).toFixed(0),
          bahasaInggris: (prodiStudents.reduce((a, s) => a + s.skorBahasaInggris, 0) / prodiStudents.length || 0).toFixed(0),
          komunikasi: (prodiStudents.reduce((a, s) => a + s.skorKomunikasi, 0) / prodiStudents.length || 0).toFixed(0),
          kerjaTim: (prodiStudents.reduce((a, s) => a + s.skorKerjaTim, 0) / prodiStudents.length || 0).toFixed(0),
          problemSolving: (prodiStudents.reduce((a, s) => a + s.skorProblemSolving, 0) / prodiStudents.length || 0).toFixed(0),
          jumlahAlumni: prodiStudents.length,
          color: colors[idx % colors.length],
        };
      default:
        return {
          prodi,
          lam: prodiInfo?.lam,
          threshold: prodiInfo?.threshold,
          value: Math.floor(Math.random() * 40) + 50,
          jumlahAlumni: prodiStudents.length,
          color: colors[idx % colors.length],
        };
    }
  });
};

// Helper to get students by filter
export const getFilteredStudents = (
  students: Student[],
  filters: {
    prodi?: string[];
    jenjang?: string[];
    tahunLulus?: number[];
    gender?: string;
    status?: string;
    kesesuaianBidang?: string;
    kategoriPerusahaan?: string;
    waktuTungguRange?: [number, number];
    cluster?: string;
    sumberBiayaKuliah?: string;
    caraMendapatKerja?: string;
    jenisInstansi?: string;
  }
) => {
  return students.filter(s => {
    if (filters.prodi?.length && !filters.prodi.includes(s.prodi)) return false;
    if (filters.jenjang?.length && !filters.jenjang.includes(s.jenjang)) return false;
    if (filters.tahunLulus?.length && !filters.tahunLulus.includes(s.tahunLulus)) return false;
    if (filters.gender && s.gender !== filters.gender) return false;
    if (filters.status && s.status !== filters.status) return false;
    if (filters.kesesuaianBidang && s.kesesuaianBidang !== filters.kesesuaianBidang) return false;
    if (filters.kategoriPerusahaan && s.kategoriPerusahaan !== filters.kategoriPerusahaan) return false;
    if (filters.waktuTungguRange) {
      const [min, max] = filters.waktuTungguRange;
      if (s.waktuTunggu < min || s.waktuTunggu > max) return false;
    }
    if (filters.cluster) {
      const avgWait = s.waktuTunggu;
      const cluster = avgWait < 3 ? "Cepat" : avgWait < 6 ? "Sedang" : "Lama";
      if (cluster !== filters.cluster) return false;
    }
    if (filters.sumberBiayaKuliah && s.sumberBiayaKuliah !== filters.sumberBiayaKuliah) return false;
    if (filters.caraMendapatKerja && !s.caraMendapatKerja.includes(filters.caraMendapatKerja)) return false;
    if (filters.jenisInstansi && s.jenisInstansi !== filters.jenisInstansi) return false;
    return true;
  });
};
