# Sistem Programlama - Thread Pool Projesi Sunum Planı

Bu sunum planı projeyi geliştiren 3 kişi için eşit şekilde dağıtılmıştır. Sunum içeriği, **proje isterlerindeki mandatory (zorunlu) maddeleri** hocaya net şekilde vurgulayacak biçimde tasarlanmıştır. (Senkronizasyon mekanizmaları, üretici-tüketici yapısı, 3 farklı görev türü ve thread kullanım metrikleri öne çıkartılmıştır.)

---

## 🗣️ Konuşmacı 1: Projenin Amacı ve Sistem Tasarımı (Producer-Consumer)

**Giriş & Motivasyon:**
- **Neden Thread Pool (İş Parçacığı Havuzu) Kullanıyoruz?** 
  - Gelen her görev için baştan bir thread yaratıp (`pthread_create`) iş bitince onu yok etmenin OS (işletim sistemi) üzerindeki maliyeti yüksektir.
  - Proje gereksinimlerinde istendiği üzere baştan parametrik olarak **belirli sayıda worker thread** (`num_threads`) başlatıyoruz ve onları ortak bir iş kuyruğunun başında hazır bekletiyoruz.

**Mimarinin Temeli: Producer-Consumer (Üretici-Tüketici)**
- Sistemin merkezinde bu tasarım deseni (pattern) yatıyor.
  - **Producer (Ana Thread/Main):** `tasks.txt` dosyasını okuyup veya dışarıdan gelen görevleri anlık olarak ortak **iş kuyruğuna (TaskQueue)** ekler.
  - **Consumer (Worker Threads):** Havuzdaki iş parçacıklarıdır. Bekleme/uyandırma mantığıyla aynı anda kuyruğa yüklenip sıradaki işi sökerek işlerler.

**Hedeflenen 3 Görev Tipi:**
- Ortak kuyruktan alınan görevler 3 tipe ayrılmıştır (Proje İsteri):
  1. `PRIME İşlemi`: Rastgele büyük sayılarda asallık kontrolü (CPU-Bound task analizi için).
  2. `LINECOUNT`: Dosyalardaki satır sayısını bulma (I/O-Bound task).
  3. `CHARCOUNT`: Text tabanlı dosyalardaki toplam harf yükünü sayma.

---

## 🗣️ Konuşmacı 2: Veri Yapısı ve Senkronizasyon (Mutex & Condition Variables)

**Ortak Kuyruk (Queue) Yapısı ve Yönetimi:**
- Görevler (Tasks), dinamik hafıza yöntemiyle bağlanan bir kuyrukta tutulur. 
- *Proje zorunluluğu gereği bu noktada çok dikkatli bir senkronizasyon uyguladık.*

**Senkronizasyon: Mutex ile Race Condition'ı Engelleme:**
- Kuyruk yapısı **Kritik Bölgedir (Critical Section)**. Havuzdaki birden çok thread aynı anda kuyruktan eleman almaya çalışırsa *Veri Yarışı (Race Condition)* oluşur.
- Çözüm: `pthread_mutex_t` kullandık. Bir thread kuyruğa eleman eklerken veya eleman çıkarırken yapıyı kilitler (`mutex_lock`), işlemi bitirince kilidi açar (`mutex_unlock`).
- Aynı zamanda `logger` yapımıza da mutex ekledik ki loglar terminalde harf harf birbirine girmesin.

**Bekleme ve Uyandırma Mekanizması (Condition Variables):**
- Projede zorunlu tutulan **Busy-Waiting'i önleme** işlevini `pthread_cond_t` (Condition Variables) ile başardık.
- Kuyruk boş olduğunda threadler `while(bos_mu)` diye dönüp CPU'yu %100 kullanmak yerine, `pthread_cond_wait` ile sleep moduna (uykuya) geçer.
- Main thread görev eklediğinde ise `pthread_cond_signal` atarak uyuyan bir thread'i uyandırır.

---

## 🗣️ Konuşmacı 3: Sistemin Graceful Kapanışı ve Performans/Performans Raporu

**Sistemin Kapatılması (Graceful Shutdown):**
- En önemli problemlerden biri projenin aniden çökmeden kapanabilmesiydi.
- Kapatma sinyali (shutdown flag) verildiğinde, `pthread_cond_broadcast` ile uyuyan **tüm zombi threadler aynı anda uyandırılır**.
- Threadler önce kuyrukta en ufak bir görev bile kaldıysa eritir, sonrasında bayrağı kapalı görüp `pthread_exit` ile RAM'i iade edip yok olurlar.

**Loglama, Hata Yönetimi ve Temizlik:**
- Proje genelinde `log_message` adında sadece hata(`error`) ve normal(`info`) durumlara tepki veren özel bir formatlandırıcı yazdık. Dosya okunamaması duruma özel mesajlarla yakalandı. `memory leak` oluşmaması için sistem sonunda kuyruk ve thread yapıları `free()` ile yok edildi.

**Performans Değerlendirmesi ve Çıktılar:**
- Sistem kapanmadan hemen önce Proje zorunluluğu olan `Thread Summary` raporu basılıyor. Bu raporda:
  1. Toplam gelen ve işlenen görev sayısı
  2. İşlemlerin toplam saniye (Execution Time) bazında maliyeti.
  3. **Kuyruk Doluluğu** (Max queue size hit).
  4. Hangi thread'in toplamda kaç adet iş alarak yükü nasıl taşıdığının dağılımı (Thread usage).
-(Burada slayt / canlı demo üzerinde tek thread ile 4 thread arasındaki milisaniye farkı sınıf ile paylaşılır).
