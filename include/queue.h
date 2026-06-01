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
