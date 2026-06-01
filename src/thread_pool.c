#include "thread_pool.h"
#include "logger.h"
#include <stdlib.h>
#include <unistd.h>

// WorkerArg dizisini tutmak için init içinde allocate edip destroy'da siliyoruz.
static WorkerArg *worker_args = NULL;

int thread_pool_init(ThreadPool *pool, int num_threads, TaskQueue *queue) {
    pool->num_threads = num_threads;
    pool->queue = queue;
    pool->total_processed = 0;
    pool->max_queue_size = 0;

    pool->threads = (pthread_t *)malloc(sizeof(pthread_t) * num_threads);
    pool->thread_task_counts = (int *)calloc(num_threads, sizeof(int));
    worker_args = (WorkerArg *)malloc(sizeof(WorkerArg) * num_threads);

    if (!pool->threads || !pool->thread_task_counts || !worker_args) {
        return STATUS_ERROR;
    }

    pthread_mutex_init(&pool->stats_mutex, NULL);
    return STATUS_SUCCESS;
}

int thread_pool_start(ThreadPool *pool) {
    for (int i = 0; i < pool->num_threads; i++) {
        worker_args[i].pool = pool;
        worker_args[i].thread_id = i;
        if (pthread_create(&pool->threads[i], NULL, worker_routine, &worker_args[i]) != 0) {
            log_message(LOG_ERROR, "Failed to create thread %d", i);
            return STATUS_THREAD_ERROR;
        }
    }
    return STATUS_SUCCESS;
}

int thread_pool_join(ThreadPool *pool) {
    for (int i = 0; i < pool->num_threads; i++) {
        pthread_join(pool->threads[i], NULL);
    }
    return STATUS_SUCCESS;
}

int thread_pool_destroy(ThreadPool *pool) {
    free(pool->threads);
    free(pool->thread_task_counts);
    if (worker_args) {
        free(worker_args);
    }
    pthread_mutex_destroy(&pool->stats_mutex);
    return STATUS_SUCCESS;
}

void *worker_routine(void *arg) {
    WorkerArg *worker_arg = (WorkerArg *)arg;
    ThreadPool *pool = worker_arg->pool;
    int thread_id = worker_arg->thread_id;
    int local_id = thread_id + 1; // Ekrana yazarken 1-based index için

    while (1) {
        Task task;
        int status = queue_pop(pool->queue, &task);
        if (status == STATUS_QUEUE_EMPTY) {
            break; // Shutdown aktif ve kuyruk boş
        }

        // İstastistik için o anki kuyruk uzunluğuna bakabiliriz
        pthread_mutex_lock(&pool->stats_mutex);
        pthread_mutex_lock(&pool->queue->mutex);
        if (pool->queue->count > pool->max_queue_size) {
            pool->max_queue_size = pool->queue->count;
        }
        pthread_mutex_unlock(&pool->queue->mutex);
        pthread_mutex_unlock(&pool->stats_mutex);

        log_message(LOG_INFO, "Thread %d processing Task %d (%s)", local_id, task.task_id, task_type_to_string(task.type));

        clock_gettime(CLOCK_MONOTONIC, &task.start_time);
        
        usleep(800000); // 800ms bekleme, "İşleniyor" durumunu arayüzde görebilmek için
        char result_buffer[MAX_LINE_LENGTH];
        int process_status = process_task(&task, result_buffer, sizeof(result_buffer));
        
        clock_gettime(CLOCK_MONOTONIC, &task.end_time);

        if (process_status == STATUS_SUCCESS) {
            log_message(LOG_INFO, "Thread %d completed Task %d: %s", local_id, task.task_id, result_buffer);
        } else {
            log_message(LOG_ERROR, "Thread %d failed Task %d: %s", local_id, task.task_id, result_buffer);
        }

        // İstatistikleri güncelle
        pthread_mutex_lock(&pool->stats_mutex);
        pool->total_processed++;
        pool->thread_task_counts[thread_id]++;
        
        // Aslında görev performansını da hesaplamamız lazım (Total Task Time vs)
        // Ama task objesini main tarafına geri göndermenin maliyeti var, 
        // global değişkende task sürelerinin toplamını tutmak daha temiz.
        // O yüzden main dosyasında global süre ölçeceğiz.
        
        pthread_mutex_unlock(&pool->stats_mutex);
    }

    return NULL;
}
