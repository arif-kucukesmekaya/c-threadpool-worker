Proje için ortak kararlar
1. Projenin genel çalışma mantığı
Program görevleri tasks.txt dosyasından okuyacak.
Görevler ortak iş kuyruğuna eklenecek.
Belirli sayıda worker thread bu kuyruktan görev alıp işleyecek.
Kuyruk erişimi mutex ile korunacak.
İş yoksa worker thread’ler condition variable ile bekleyecek.
Tüm görevler bitince sistem kontrollü şekilde kapanacak.
Sonunda özet performans bilgileri ekrana ve log dosyasına yazılacak.
2. Kullanılacak modüller

Projeyi şu dosyalara bölelim:

project/
├── src/
│   ├── main.c
│   ├── queue.c
│   ├── thread_pool.c
│   ├── task.c
│   ├── logger.c
│   └── utils.c
│
├── include/
│   ├── common.h
│   ├── queue.h
│   ├── thread_pool.h
│   ├── task.h
│   ├── logger.h
│   └── utils.h
│
├── test_files/
│   ├── file1.txt
│   ├── file2.txt
│   └── file3.txt
│
├── tasks.txt
├── Makefile
├── README.md
└── log.txt
3. Ortak sabitler

Bunları common.h içinde tanımlayın:

#ifndef COMMON_H
#define COMMON_H

#define MAX_FILENAME_LENGTH 256
#define MAX_LINE_LENGTH 512
#define DEFAULT_QUEUE_CAPACITY 100
#define DEFAULT_THREAD_COUNT 4

typedef enum {
    TASK_PRIME = 1,
    TASK_LINE_COUNT,
    TASK_CHAR_COUNT
} TaskType;

typedef enum {
    STATUS_SUCCESS = 0,
    STATUS_ERROR = -1,
    STATUS_QUEUE_FULL = -2,
    STATUS_QUEUE_EMPTY = -3,
    STATUS_INVALID_TASK = -4,
    STATUS_FILE_ERROR = -5,
    STATUS_THREAD_ERROR = -6
} StatusCode;

#endif

Böylece herkes aynı enum ve hata kodlarını kullanır.

4. Ortak Task yapısı

Bunu herkes aynı şekilde kullanmalı. task.h içine koyun:

#ifndef TASK_H
#define TASK_H

#include "common.h"
#include <time.h>

typedef struct {
    int task_id;
    TaskType type;
    union {
        int number;
        char filename[MAX_FILENAME_LENGTH];
    } data;
    struct timespec enqueue_time;
    struct timespec start_time;
    struct timespec end_time;
} Task;

const char *task_type_to_string(TaskType type);
int parse_task_line(const char *line, Task *task, int task_id);
int process_task(Task *task, char *result_buffer, size_t buffer_size);

#endif
Açıklama
task_id: her görev için benzersiz numara
type: görev tipi
number: prime görevi için kullanılacak
filename: dosya işlemleri için kullanılacak
zaman alanları: performans ölçümü için
5. Desteklenecek 3 görev tipi

Bunu kesinleştirelim:

1) PRIME

Bir sayının asal olup olmadığını kontrol eder.

Örnek:

PRIME 97
2) LINECOUNT

Bir dosyadaki satır sayısını bulur.

Örnek:

LINECOUNT test_files/file1.txt
3) CHARCOUNT

Bir dosyadaki toplam karakter sayısını bulur.

Örnek:

CHARCOUNT test_files/file2.txt

Bu üç görev tipi kesin olsun. Sonradan ekleme yapılırsa ayrı olur.

6. Görev dosyası formatı

tasks.txt için ortak format:

Her satır bir görev olacak
Boş satırlar yok sayılacak
# ile başlayan satırlar yorum kabul edilecek

Örnek:

# görev listesi
PRIME 97
PRIME 221
LINECOUNT test_files/file1.txt
CHARCOUNT test_files/file2.txt
PRIME 7919
LINECOUNT test_files/file3.txt
Kural
PRIME için ikinci alan sayı olacak
LINECOUNT ve CHARCOUNT için ikinci alan dosya yolu olacak
7. Kuyruk yapısı

queue.h içinde ortak yapı şu olsun:

#ifndef QUEUE_H
#define QUEUE_H

#include "task.h"
#include <pthread.h>

typedef struct {
    Task *tasks;
    int front;
    int rear;
    int count;
    int capacity;
    int shutdown;

    pthread_mutex_t mutex;
    pthread_cond_t not_empty;
    pthread_cond_t not_full;
} TaskQueue;

int queue_init(TaskQueue *queue, int capacity);
int queue_destroy(TaskQueue *queue);
int queue_push(TaskQueue *queue, Task task);
int queue_pop(TaskQueue *queue, Task *task);
void queue_signal_shutdown(TaskQueue *queue);
int queue_is_empty(TaskQueue *queue);
int queue_is_full(TaskQueue *queue);

#endif
Ortak kararlar
Kuyruk tipi: circular array
tasks dinamik ayrılacak
shutdown bayrağı kuyruğun içinde tutulacak
queue_push doluysa bekleyecek
queue_pop boşsa bekleyecek
shutdown aktif ve kuyruk boşsa worker çıkabilecek
8. Thread pool yapısı

thread_pool.h için ortak yapı:

#ifndef THREAD_POOL_H
#define THREAD_POOL_H

#include "queue.h"
#include <pthread.h>

typedef struct {
    pthread_t *threads;
    int *thread_task_counts;
    int num_threads;
    TaskQueue *queue;

    int total_processed;
    int max_queue_size;

    pthread_mutex_t stats_mutex;
} ThreadPool;

typedef struct {
    ThreadPool *pool;
    int thread_id;
} WorkerArg;

int thread_pool_init(ThreadPool *pool, int num_threads, TaskQueue *queue);
int thread_pool_start(ThreadPool *pool);
int thread_pool_destroy(ThreadPool *pool);
int thread_pool_join(ThreadPool *pool);
void *worker_routine(void *arg);

#endif
Ortak kararlar
Her worker aynı worker_routine fonksiyonunu çalıştıracak
Her thread’in kaç görev işlediği tutulacak
total_processed ve max_queue_size istatistik amaçlı tutulacak
İstatistik güncellemesi için ayrı stats_mutex olacak
9. Logger yapısı

logger.h şu şekilde olsun:

#ifndef LOGGER_H
#define LOGGER_H

#include <pthread.h>
#include <stdio.h>

typedef enum {
    LOG_INFO,
    LOG_WARNING,
    LOG_ERROR
} LogLevel;

int logger_init(const char *filename);
void logger_close(void);
void log_message(LogLevel level, const char *format, ...);

#endif
Ortak kararlar
Tek log dosyası: log.txt
Logger thread-safe olacak
logger.c içinde static FILE *log_fp ve static pthread_mutex_t log_mutex kullanılacak
Hem log_message yazarken hem de logger_close yaparken mutex ile kilitlenecek!
Log formatı

Şu formatı herkes kullansın:

[2026-04-27 19:30:12] [INFO] Task 3 added to queue
[2026-04-27 19:30:13] [INFO] Thread 1 processing Task 3
[2026-04-27 19:30:13] [ERROR] File could not be opened: test_files/file9.txt
10. main.c’nin görevi ne olacak

main.c sadece sistemi başlatan ve yöneten dosya olsun.

Yapacakları:

komut satırı argümanlarını almak
logger başlatmak
queue oluşturmak
thread pool başlatmak
tasks.txt dosyasını okuyup görevleri kuyruğa eklemek
tüm işler eklenince shutdown sinyali vermek
thread’lerin bitmesini beklemek
özet performans çıktısını yazmak
kaynakları temizlemek
Çalıştırma formatı

Şu şekilde sabitleyin:

./thread_pool tasks.txt 4

Burada:

tasks.txt: görev dosyası
4: thread sayısı
11. Ortak fonksiyon isimleri

Birleştirirken sorun çıkmaması için isimleri aynen böyle kullanın.

queue.c
int queue_init(TaskQueue *queue, int capacity);
int queue_destroy(TaskQueue *queue);
int queue_push(TaskQueue *queue, Task task);
int queue_pop(TaskQueue *queue, Task *task);
void queue_signal_shutdown(TaskQueue *queue);
int queue_is_empty(TaskQueue *queue);
int queue_is_full(TaskQueue *queue);
thread_pool.c
int thread_pool_init(ThreadPool *pool, int num_threads, TaskQueue *queue);
int thread_pool_start(ThreadPool *pool);
int thread_pool_join(ThreadPool *pool);
int thread_pool_destroy(ThreadPool *pool);
void *worker_routine(void *arg);
task.c
const char *task_type_to_string(TaskType type);
int parse_task_line(const char *line, Task *task, int task_id);
int process_task(Task *task, char *result_buffer, size_t buffer_size);
logger.c
int logger_init(const char *filename);
void logger_close(void);
void log_message(LogLevel level, const char *format, ...);
utils.c
double timespec_to_ms(struct timespec start, struct timespec end);
void trim_newline(char *str);
12. Kapanış mantığı

Bunu baştan netleştirelim.

Karar
Tüm görevler kuyruğa eklendikten sonra queue_signal_shutdown() çağrılacak
Bu fonksiyon:
shutdown = 1 yapacak
pthread_cond_broadcast(&not_empty) çağıracak
Worker çıkış kuralı

Worker şu durumda döngüden çıkacak:

kuyruk boş ve
shutdown == 1

Bu en temiz kapanış yöntemi.

13. Hata yönetimi kuralları

Herkes aynı mantıkla hata döndürsün.

Kararlar
Fonksiyonlar başarılıysa STATUS_SUCCESS
Hata varsa uygun negatif kod
Sistem seviyesinde hata varsa perror() kullanılabilir
Kullanıcıya açıklayıcı mesaj verilecek
Log dosyasına hata ayrıca yazılacak
Örnek
dosya açılamadıysa: STATUS_FILE_ERROR
bilinmeyen görev tipi geldiyse: STATUS_INVALID_TASK
thread oluşturulamadıysa: STATUS_THREAD_ERROR
14. Performans ölçümü için ortak kararlar

Raporlanacak metrikler:

toplam görev sayısı
tamamlanan görev sayısı
toplam çalışma süresi
ortalama görev süresi
maksimum kuyruk doluluğu
thread başına işlenen görev sayısı
Zaman ölçümü

clock_gettime(CLOCK_MONOTONIC, ...) kullanılacak.
Wall-clock time (gerçek geçen süre) main içinde thread pool start ile son join arasında ayrı ölçülecek.
Her görevin süresi (end_time - start_time) toplanarak "toplam görev işlem süresi" bulunacak.

Formül

Ortalama görev süresi:

toplam görev işlem süresi / tamamlanan görev sayısı
Thread kullanım oranı için basit yorum

Tam gerçek CPU usage şart değil. Şunu raporlamanız yeterli:

Thread 1: 4 görev
Thread 2: 3 görev
Thread 3: 5 görev
Thread 4: 2 görev

Bunu “thread kullanım dağılımı” olarak yazabilirsiniz.

15. Ekran çıktısı formatı

Program sonunda şöyle düzenli bir çıktı olsun:

=== Thread Pool Summary ===
Total tasks loaded      : 12
Total tasks processed   : 12
Thread count            : 4
Maximum queue size      : 6
Total execution time    : 125.42 ms
Average task time       : 18.31 ms

Thread usage:
Thread 1 -> 3 tasks
Thread 2 -> 4 tasks
Thread 3 -> 2 tasks
Thread 4 -> 3 tasks

Bu çıktı hem düzenli görünür hem README’ye koyması kolay olur.

16. Makefile için ortak karar

Derleme komutu:

CC = gcc
CFLAGS = -Wall -Wextra -pthread -Iinclude -g -O2
SRC = src/main.c src/queue.c src/thread_pool.c src/task.c src/logger.c src/utils.c
OUT = thread_pool

all:
	$(CC) $(CFLAGS) $(SRC) -o $(OUT)

clean:
	rm -f $(OUT) log.txt
Kural
Herkes kodunu bu Makefile ile uyumlu yazsın
-pthread kesin olsun
17. README için ortak içerik kararı

README’de şu başlıklar kesin olacak:

Amaç

Thread pool tabanlı paralel görev işleyici geliştirmek

Tasarım
task yapısı
queue yapısı
thread pool yapısı
producer-consumer mantığı
Kullanılan Sistem Programlama Kavramları
POSIX threads
mutex
condition variable
shared memory
synchronization
logging
graceful shutdown
Çalıştırma Adımları
make
./thread_pool tasks.txt 4
Testler
farklı sayıda task
geçersiz görev
olmayan dosya
1 thread / 4 thread karşılaştırması
Karşılaşılan Problemler
race condition
kuyruk boşken bekleme
düzgün kapanış
log karışması
18. 3 kişilik net görev paylaşımı buna göre
1. kişi
queue.h, queue.c
circular queue
mutex + condition variable
shutdown altyapısı
2. kişi
thread_pool.h, thread_pool.c
worker thread oluşturma
worker routine
join, destroy
thread istatistikleri
3. kişi
task.h, task.c
logger.h, logger.c
utils.h, utils.c
görev dosyası parsing
3 görev tipi
loglama
performans hesaplama desteği
Ortak
main.c
Makefile
README.md

Ama isterseniz main.c ve README’yi en son tek kişi toparlayabilir.

19. Örnek başlangıç verisi

tasks.txt için şunu direkt kullanabilirsiniz:

PRIME 97
PRIME 100
PRIME 7919
LINECOUNT test_files/file1.txt
CHARCOUNT test_files/file2.txt
LINECOUNT test_files/file3.txt
CHARCOUNT test_files/file1.txt
PRIME 9973
20. En kritik ortak karar özeti

En kısa haliyle hepinizin aynı şeyi kabul etmesi gerekenler bunlar:

görev tipleri: PRIME, LINECOUNT, CHARCOUNT
queue tipi: circular array
senkronizasyon: mutex + condition variable
kapanış: shutdown flag + broadcast
log dosyası: log.txt
giriş dosyası: tasks.txt
derleme: gcc -Wall -Wextra -pthread
hata kodları: ortak enum
fonksiyon isimleri: yukarıdaki isimler
özet metrikler: toplam süre, ortalama süre, max kuyruk, thread başına görev sayısı