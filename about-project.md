Sistem Programlama Dersi Projesi : Thread Pool Tabanlı Paralel Görev İşleyici

Açıklama:

Kuyruktaki işleri paralel biçimde işleyen bir thread pool sistemi geliştirilecektir.

Zorunlu olarak yapılması gerekenler

● Belirli sayıda worker thread başlatılacak.

● Ortak bir iş kuyruğu tasarlanacak.

● İş ekleme ve iş alma işlemleri senkronize olacak.

● condition variable veya semaphore ile bekleme/uyandırma yapılacak.

● En az 3 farklı iş tipi desteklenecek.

Örn: dosya hash hesaplama, metin satır sayma, prime kontrolü.

● Sistem düzgün biçimde kapatılabilecek.

● Kuyruk doluluğu, thread kullanım oranı ve toplam iş süresi raporlanacak.

Temel konular: multithreading, synchronization, producer-consumer, performance

Proje için zorunlu maddeler

● Proje C ve POSIX/Linux API kullanılarak geliştirilecek.

● En az bir yerde process veya thread kullanılacak.

● En az bir yerde senkronizasyon mekanizması kullanılacak.

Örn: mutex, semaphore, condition variable, rwlock.

● Tüm projelerde loglama ve hata yönetimi olacak.

Örn: perror, özel hata mesajları, log dosyası.

● Tüm projelerde kısa bir performans değerlendirmesi yapılacak.

Örn: işlem süresi, thread sayısına göre hız değişimi, I/O gecikmesi.

● README içinde şu başlıklar zorunlu olacak:

Amaç, Tasarım, Kullanılan Sistem Programlama Kavramları, Çalıştırma

Adımları, Testler, Karşılaşılan Problemler