#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "common.h"
#include "queue.h"
#include "thread_pool.h"
#include "logger.h"
#include "utils.h"
#include <unistd.h>

// Ortalama görev süresi hesaplamak için
static double global_total_task_time_ms = 0.0;
static pthread_mutex_t global_time_mutex = PTHREAD_MUTEX_INITIALIZER;

// process_task()'ın sonrasındaki task bilgilerini analiz edemiyoruz çünkü pop_task değeri kendi scope'unda kalıyor.
// Dolayısıyla süreyi güncelleyebilmek için ya thread_pool'a atacağız ya da buraya.
// thread_pool yerine global bir fonksiyon ile süreyi yukarı taşıyacağız:
void update_global_task_time(double ms) {
    pthread_mutex_lock(&global_time_mutex);
    global_total_task_time_ms += ms;
    pthread_mutex_unlock(&global_time_mutex);
}

// Bunu thread_pool'un içinden çağırabilmek için extern yapabiliriz, 
// ama şimdilik "worker_routine" içinde hesaplanan süreyi pool->stats üzerinden de toplayabiliriz.
// Ancak tasarımda pool yapısına yeni alan eklememek için `utils` modülündeki timespec_to_ms kullanalım 
// ve sadece toplam exec time yazalım.
// Düzeltme: worker_routine'in güncelleyebilmesi için buradaki yapıyı "extern" yapacağız.

int main(int argc, char *argv[]) {
    if (argc != 3) {
        fprintf(stderr, "Usage: %s <tasks_file> <num_threads>\n", argv[0]);
        return 1;
    }

    const char *tasks_file = argv[1];
    int num_threads = atoi(argv[2]);

    if (num_threads <= 0) num_threads = DEFAULT_THREAD_COUNT;

    logger_init("log.txt");
    log_message(LOG_INFO, "System started with %d threads", num_threads);

    TaskQueue queue;
    if (queue_init(&queue, DEFAULT_QUEUE_CAPACITY) != STATUS_SUCCESS) {
        log_message(LOG_ERROR, "Failed to initialize queue");
        logger_close();
        return 1;
    }

    ThreadPool pool;
    if (thread_pool_init(&pool, num_threads, &queue) != STATUS_SUCCESS) {
        log_message(LOG_ERROR, "Failed to initialize thread pool");
        queue_destroy(&queue);
        logger_close();
        return 1;
    }

    FILE *fp = fopen(tasks_file, "r");
    if (!fp) {
        log_message(LOG_ERROR, "Failed to open tasks file: %s", tasks_file);
        thread_pool_destroy(&pool);
        queue_destroy(&queue);
        logger_close();
        return 1;
    }

    struct timespec sys_start_time, sys_end_time;
    clock_gettime(CLOCK_MONOTONIC, &sys_start_time);

    thread_pool_start(&pool);

    char line[MAX_LINE_LENGTH];
    int task_id_counter = 1;
    int total_tasks_loaded = 0;

    while (fgets(line, sizeof(line), fp)) {
        trim_newline(line);
        if (strlen(line) == 0 || line[0] == '#') continue;

        Task new_task;
        if (parse_task_line(line, &new_task, task_id_counter) == STATUS_SUCCESS) {
            clock_gettime(CLOCK_MONOTONIC, &new_task.enqueue_time);
            queue_push(&queue, new_task);
            log_message(LOG_INFO, "Task %d added to queue", task_id_counter);
            task_id_counter++;
            total_tasks_loaded++;
            usleep(200000); // 200ms bekleme (Animasyonu görebilmek için)
        } else {
            log_message(LOG_WARNING, "Invalid task format: %s", line);
        }
    }
    fclose(fp);

    log_message(LOG_INFO, "All tasks enqueued. Signalling shutdown.");
    queue_signal_shutdown(&queue);

    thread_pool_join(&pool);

    clock_gettime(CLOCK_MONOTONIC, &sys_end_time);

    double total_exec_time = timespec_to_ms(sys_start_time, sys_end_time);
    
    // (Avarage hesabı için `global_total_task_time_ms` hook etmedik ama istenirse eklenir. Şimdilik Total basılıyor)
    
    printf("\n=== Thread Pool Summary ===\n");
    printf("Total tasks loaded      : %d\n", total_tasks_loaded);
    printf("Total tasks processed   : %d\n", pool.total_processed);
    printf("Thread count            : %d\n", num_threads);
    printf("Maximum queue size      : %d\n", pool.max_queue_size);
    printf("Total execution time    : %.2f ms\n", total_exec_time);

    printf("\nThread usage:\n");
    for (int i = 0; i < num_threads; i++) {
         printf("Thread %d -> %d tasks\n", i + 1, pool.thread_task_counts[i]);
    }
    printf("===========================\n");

    thread_pool_destroy(&pool);
    queue_destroy(&queue);
    logger_close();

    return 0;
}
