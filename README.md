# Thread Pool Tabanlı Paralel Görev İşleyici

## Amaç
Bu projenin amacı, C dili ve POSIX/Linux API kullanılarak multithreading mantığıyla çalışan bir paralel görev işleyici (thread pool) geliştirmektir. Projede `producer-consumer` (üretici-tüketici) modeli kullanılarak, ortak bir iş kuyruğuna birden fazla görevin güvenli bir şekilde eklenmesi ve oluşturulan worker (işçi) thread'ler aracılığıyla bu kuyruktan paralel olarak çekilip işlenmesi amaçlanmaktadır.

## Tasarım
Sistem, görevlerin ana thread (`main`) tarafından dosyadan okunup (producer) bir kuyruğa eklendiği, ve n adet worker thread'in (consumer) aynı anda bu kuyruktan iş çekip görevleri yürüttüğü asenkron bir senaryoya dayanır.

### Dosya ve Modül Yapısı
* **`src/main.c`**: Ana modüldür. Logger'ı, thread pool'u ve kuyruğu başlatır. `tasks.txt` dosyasını satır satır okur, görevlere dönüştürüp `queue_push` ile kuyruğa ekler. İş bitince havuzu kontrollü kapattırır (graceful shutdown) ve performans istatistiklerini ekrana basar.
* **`src/queue.c` & `include/queue.h`**: Dairesel dizi (Circular array) mantığı kullanan kuyruk yapısıdır. Thread-safe olması adına kendi içinde **mutex** ve **condition variables** (`not_empty`, `not_full`) barındırır.
* **`src/thread_pool.c` & `include/thread_pool.h`**: Havuzu ve thread'leri yönetir. Her bir thread `worker_routine` fonksiyonuna bağlanır. Kuyruktan iş alır (`queue_pop`), task tipine göre koşturur (`process_task`) ve istatistikleri(`stats_mutex` kullanarak) günceller.
* **`src/task.c` & `include/task.h`**: Görev formatlarını yöneten dosyadır. `Task` struct'ı hafıza optimizasyonu için veri tiplerini `union` ile tutar. 3 fonksiyonel görev tipi (PRIME kontrolü, Dosya Satır Sayma, ve Karakter sayma) burada icra edilir.
* **`src/logger.c` & `include/logger.h`**: Projedeki tüm olayların komut istemine ve `log.txt` içerisine thread güvenli (mutex korumalı) biçimde formatlı olarak basılmasını sağlar. Format zaman, uyarı seviyesi ve mesajı kapsar.
* **`src/utils.c` & `include/utils.h`**: Proje geneline hizmet veren zaman hesaplama (`timespec_to_ms`) ve string kırpma fonksiyonları gibi ufak yardımcı elementleri barındırır.
* **`Makefile`**: Projenin gcc (`-Wall -Wextra -pthread -g -O2`) kullanılarak zahmetsizce derlenmesini ve temizlenmesini (`make clean`) yönetir.

## Kullanılan Sistem Programlama Kavramları
* **POSIX Threads:** `pthread_create`, `pthread_join` (Çoklu İş Parçacıklı Programlama)
* **Mutex (Karşılıklı Dışlama):** `pthread_mutex_t` ile Race Condition'ları (yarış durumları) önlemek (Örn: kuyruk erişimi, log yazma erişimleri).
* **Condition Variables:** `pthread_cond_t` `not_empty` ve `not_full` sinyalleri ile CPU'yu boğmadan (busy-waiting olmadan) worker ve main thread'leri verimli şekilde uyutmak / uyandırmak.
* **Producer-Consumer Mimarisi:** Main thread iş bulucu (Producer), Thread Pool çalışanları ise iş yürütücü (Consumer).
* **Graceful Shutdown:** Kuyruğa shutdown sinyali çekilip (`pthread_cond_broadcast`), görev kalmadığında tüm threadlerin temizce kapatılması.

## Çalıştırma Adımları
1. **Derleme:** Kök dizinde terminali açıp `make` komutu girilmelidir.
   ```bash
   make
   ```
2. **Çalıştırma:** Derleme sonrası oluşan `thread_pool` dosyası şu formatta başlatılır:
   ```bash
   ./thread_pool <görev_dosyası> <thread_sayısı>
   ```
   **Örnek:**
   ```bash
   ./thread_pool tasks.txt 4
   ```
3. **Log İzleme:** İşlemin bitmesinin ardından çıktıları standart ekranda görebileceğiniz gibi `log.txt` dosyası okunarak detaylara erişilebilir.

## Testler
* **Farklı Thread Sayıları:** 1 thread ile 4 thread arasındaki performans farkı / işlem süresi kazanımı test edilip kaydedilmiştir.
* **Boş/Bozuk Formatlar ve Dosya Hataları:** Olmayan bir dosya için işlem ve tanımsız görev tipleri parse işleminden sokulup `STATUS_FILE_ERROR` vb. statü kodlarıyla loglarda raporlanıp program çökertilmeden pass edilmesi test edilmiştir.
* **Condition Variable Testleri:** Kuyruk kapasitesi aşıldığında (daha iş yüklenmeden işlenmesi için) main thread'in (producer) beklemesi ve kuyruk bomboşken var olan işçi threadlerin beklemesi denenmiş cpu-cycle tüketmedikleri gözlemlenmiştir.

## Karşılaşılan Problemler
* **Race Condition (Yarış Durumu):** Hem main hem de thread'ler kuyruğa (veya loglanan sisteme) birer değişken iterken değer hataları ve segmentation fault oluşuyordu, ilgili bölgelere `pthread_mutex_lock` konularak her iki sisteme ait değişkenler tam güvenli kılındı.
* **Kuyruk Boşken Bekleme & Zombi Threadler:** İlk etapta `worker`'lar boş kuyruk görünce sonsuz loop içerisinde kitlenip kalıyordu. Bunu engellemek için dairesel kuyruğun (queue) içine bir `shutdown` flag eklendi. Ana thread işini bitirip bu bayrağı tetiklediğinde bekleyenlere yayın (`broadcast`) yaparak kontrollü bir kapanış sağlandı.
* **Log Karışması:** Terminal ekranına farklı thread'lerin aynı saniye içinde output (stdout) vermesi yazıların birbirine girmesine yol açtı. `logger_close`, stdout ve dosya fprintf satırları, bir kilit bloğuna alındı ve temiz, kronolojik bir log elde edildi.