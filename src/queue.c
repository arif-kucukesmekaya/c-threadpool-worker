#include "queue.h"
#include <stdlib.h>

int queue_init(TaskQueue *queue, int capacity) {
    queue->tasks = (Task *)malloc(sizeof(Task) * capacity);
    if (!queue->tasks) {
        return STATUS_ERROR;
    }
    queue->capacity = capacity;
    queue->front = 0;
    queue->rear = 0;
    queue->count = 0;
    queue->shutdown = 0;

    pthread_mutex_init(&queue->mutex, NULL);
    pthread_cond_init(&queue->not_empty, NULL);
    pthread_cond_init(&queue->not_full, NULL);

    return STATUS_SUCCESS;
}

int queue_destroy(TaskQueue *queue) {
    free(queue->tasks);
    pthread_mutex_destroy(&queue->mutex);
    pthread_cond_destroy(&queue->not_empty);
    pthread_cond_destroy(&queue->not_full);
    return STATUS_SUCCESS;
}

int queue_push(TaskQueue *queue, Task task) {
    pthread_mutex_lock(&queue->mutex);

    while (queue->count == queue->capacity && !queue->shutdown) {
        pthread_cond_wait(&queue->not_full, &queue->mutex);
    }

    if (queue->shutdown) {
        pthread_mutex_unlock(&queue->mutex);
        return STATUS_ERROR;
    }

    queue->tasks[queue->rear] = task;
    queue->rear = (queue->rear + 1) % queue->capacity;
    queue->count++;

    // İstatistik için en yüksek doluluğu burada main kontrol edecek veya threadler kendi bilecek
    
    pthread_cond_signal(&queue->not_empty);
    pthread_mutex_unlock(&queue->mutex);

    return STATUS_SUCCESS;
}

int queue_pop(TaskQueue *queue, Task *task) {
    pthread_mutex_lock(&queue->mutex);

    while (queue->count == 0 && !queue->shutdown) {
        pthread_cond_wait(&queue->not_empty, &queue->mutex);
    }

    if (queue->count == 0 && queue->shutdown) {
        pthread_mutex_unlock(&queue->mutex);
        return STATUS_QUEUE_EMPTY;
    }

    *task = queue->tasks[queue->front];
    queue->front = (queue->front + 1) % queue->capacity;
    queue->count--;

    pthread_cond_signal(&queue->not_full);
    pthread_mutex_unlock(&queue->mutex);

    return STATUS_SUCCESS;
}

void queue_signal_shutdown(TaskQueue *queue) {
    pthread_mutex_lock(&queue->mutex);
    queue->shutdown = 1;
    pthread_cond_broadcast(&queue->not_empty);
    pthread_cond_broadcast(&queue->not_full);
    pthread_mutex_unlock(&queue->mutex);
}

int queue_is_empty(TaskQueue *queue) {
    pthread_mutex_lock(&queue->mutex);
    int empty = (queue->count == 0);
    pthread_mutex_unlock(&queue->mutex);
    return empty;
}

int queue_is_full(TaskQueue *queue) {
    pthread_mutex_lock(&queue->mutex);
    int full = (queue->count == queue->capacity);
    pthread_mutex_unlock(&queue->mutex);
    return full;
}
