#include "task.h"
#include <stdio.h>
#include <string.h>
#include <stdlib.h>

const char *task_type_to_string(TaskType type) {
    switch (type) {
        case TASK_PRIME: return "PRIME";
        case TASK_LINE_COUNT: return "LINECOUNT";
        case TASK_CHAR_COUNT: return "CHARCOUNT";
        default: return "UNKNOWN";
    }
}

int parse_task_line(const char *line, Task *task, int task_id) {
    char type_str[32];
    char arg_str[MAX_FILENAME_LENGTH];

    if (sscanf(line, "%31s %255[^\n]", type_str, arg_str) != 2) {
        return STATUS_INVALID_TASK;
    }

    task->task_id = task_id;

    if (strcmp(type_str, "PRIME") == 0) {
        task->type = TASK_PRIME;
        task->data.number = atoi(arg_str);
    } else if (strcmp(type_str, "LINECOUNT") == 0) {
        task->type = TASK_LINE_COUNT;
        strncpy(task->data.filename, arg_str, MAX_FILENAME_LENGTH - 1);
        task->data.filename[MAX_FILENAME_LENGTH - 1] = '\0';
    } else if (strcmp(type_str, "CHARCOUNT") == 0) {
        task->type = TASK_CHAR_COUNT;
        strncpy(task->data.filename, arg_str, MAX_FILENAME_LENGTH - 1);
        task->data.filename[MAX_FILENAME_LENGTH - 1] = '\0';
    } else {
        return STATUS_INVALID_TASK;
    }

    return STATUS_SUCCESS;
}

static int is_prime(int n) {
    if (n <= 1) return 0;
    if (n <= 3) return 1;
    if (n % 2 == 0 || n % 3 == 0) return 0;
    for (int i = 5; i * i <= n; i = i + 6) {
        if (n % i == 0 || n % (i + 2) == 0)
            return 0;
    }
    return 1;
}

int process_task(Task *task, char *result_buffer, size_t buffer_size) {
    if (task->type == TASK_PRIME) {
        int prime = is_prime(task->data.number);
        snprintf(result_buffer, buffer_size, "%d is %s", task->data.number, prime ? "prime" : "not prime");
        return STATUS_SUCCESS;
    } 
    else if (task->type == TASK_LINE_COUNT || task->type == TASK_CHAR_COUNT) {
        FILE *fp = fopen(task->data.filename, "r");
        if (!fp) {
            snprintf(result_buffer, buffer_size, "Failed to open file: %s", task->data.filename);
            return STATUS_FILE_ERROR;
        }

        if (task->type == TASK_LINE_COUNT) {
            int lines = 0;
            char ch;
            while ((ch = fgetc(fp)) != EOF) {
                if (ch == '\n') lines++;
            }
            snprintf(result_buffer, buffer_size, "File %s has %d lines", task->data.filename, lines);
        } else {
            fseek(fp, 0, SEEK_END);
            long chars = ftell(fp);
            snprintf(result_buffer, buffer_size, "File %s has %ld chars", task->data.filename, chars);
        }
        
        fclose(fp);
        return STATUS_SUCCESS;
    }
    
    return STATUS_INVALID_TASK;
}
