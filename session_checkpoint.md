# 📌 Session Checkpoint: Absensi & Dokumentasi Teknisi

File ini dibuat secara otomatis untuk menyimpan ringkasan sesi pengembangan terakhir agar memudahkan pemanggilan kembali (*callback*) konteks sesi oleh Anda atau asisten AI di masa mendatang.

---

## 📅 Status Proyek & Kontak Sesi
* **Tanggal Sesi Akhir**: 15 Juni 2026
* **Lokasi Workspace**: `D:/absensi-teknisi`
* **Status Dev Server**: Berjalan secara konkuren di:
  * Frontend: [http://localhost:5173/](http://localhost:5173/)
  * Backend: [http://localhost:3001/](http://localhost:3001/)
  * Database: SQLite (`server/absensi.db`)
* **Repositori GitHub**: [https://github.com/Pidzzzz/absensi-teknisi](https://github.com/Pidzzzz/absensi-teknisi)

---

## 🛠️ Fitur yang Telah Diimplementasikan

### 1. Sistem Absensi Tingkat Ganda
* Membedakan **Absensi Harian** (*Check In Masuk* / *Check Out Pulang*) dengan **Absensi Kunjungan Kerja** (*Check In Visit* / *Check Out Visit*).

### 2. Klasifikasi Tipe Pekerjaan & Batas Unggah Foto
* **Corrective Maintenance (CM)**: Wajib mengunggah minimal **5 foto/dokumen** secara bebas (mengabaikan validasi item checklist wajib).
* **Preventive Maintenance (PM)**: Wajib mengunggah seluruh **51 foto/dokumen** dan wajib melengkapi setiap item checklist yang bertanda "Wajib".
* **Sistem Draft**: Teknisi dapat menyimpan draft unggahan kapan saja tanpa dibatasi jumlah minimal foto.

### 3. Zoom Teks Aksesibilitas (Older Technician Friendly)
* Pada modal **Review Dokumentasi** teknisi, ditambahkan menu kontrol font **A-** dan **A+** serta tombol **Reset** untuk memperbesar/memperkecil teks dari **80% hingga 200%** secara real-time demi memudahkan teknisi yang berumur.

### 4. Alur Kerja Pemeriksaan Admin (`waiting_review`)
* Saat teknisi melakukan checkout, status penugasan berubah menjadi **Menunggu Pemeriksaan** (Lencana Oranye) dan notifikasi dikirim otomatis ke semua Admin.
* Pada daftar penugasan Admin, ditambahkan tombol **Setujui** (mengubah status ke *Selesai*) dan **Tolak** (mengembalikan ke status *Dikerjakan* untuk perbaikan dokumentasi).

### 5. Dropdown Perubahan Status Langsung
* Di daftar penugasan Admin, status penugasan diganti dengan **Dropdown Select** berwarna dinamis. Admin bisa merubah status penugasan (*Menunggu, Dikerjakan, Menunggu Pemeriksaan, Selesai, Dibatalkan*) secara instan dari tabel utama.

### 6. Navigasi & Auto-Scroll Notifikasi
* Menghubungkan lonceng notifikasi admin ke menu review. Klik pada notifikasi request pemeriksaan akan otomatis memindahkan menu ke **Lokasi -> Dokumentasi** dan melakukan *smooth scroll* langsung ke bagian **Review Dokumentasi Teknisi** (`#review-section`).

---

## 🗄️ Skema Basis Data & Migrasi
* **Tabel `assignments`**: CHECK constraint dimigrasi sehingga mendukung status: `('pending', 'in_progress', 'waiting_review', 'completed', 'cancelled')`.
* **Tabel `attendance`**: Kolom tambahan `assignment_id` dan `location_id`.

---

## 🔄 Cara Memanggil Kembali Sesi (Callback Session)
Jika Anda memulai obrolan baru dengan AI Assistant, cukup berikan instruksi berikut pada pesan pertama Anda:
> *"Tolong baca file `session_checkpoint.md` yang berada di folder root project `D:/absensi-teknisi` untuk memahami context pengerjaan terakhir."*
