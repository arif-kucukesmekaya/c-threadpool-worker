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
