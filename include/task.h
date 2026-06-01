#ifndef TASK_H
#define TASK_H

#include "common.h"
#include <time.h>
#include <stddef.h>

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
