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
