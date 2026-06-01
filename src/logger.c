#include "logger.h"
#include <stdarg.h>
#include <time.h>
#include <string.h>

static FILE *log_fp = NULL;
static pthread_mutex_t log_mutex = PTHREAD_MUTEX_INITIALIZER;

int logger_init(const char *filename) {
    log_fp = fopen(filename, "w");
    if (!log_fp) {
        return -1;
    }
    return 0;
}

void logger_close(void) {
    pthread_mutex_lock(&log_mutex);
    if (log_fp) {
        fclose(log_fp);
        log_fp = NULL;
    }
    pthread_mutex_unlock(&log_mutex);
    pthread_mutex_destroy(&log_mutex);
}

void log_message(LogLevel level, const char *format, ...) {
    time_t t = time(NULL);
    struct tm *tm_info = localtime(&t);
    char time_buf[26];
    strftime(time_buf, sizeof(time_buf), "%Y-%m-%d %H:%M:%S", tm_info);

    const char *level_str = "INFO";
    if (level == LOG_WARNING) level_str = "WARNING";
    else if (level == LOG_ERROR) level_str = "ERROR";

    pthread_mutex_lock(&log_mutex);
    
    // Print to stdout
    printf("[%s] [%s] ", time_buf, level_str);
    va_list args1;
    va_start(args1, format);
    vprintf(format, args1);
    va_end(args1);
    printf("\n");

    // Print to file
    if (log_fp) {
        fprintf(log_fp, "[%s] [%s] ", time_buf, level_str);
        va_list args2;
        va_start(args2, format);
        vfprintf(log_fp, format, args2);
        va_end(args2);
        fprintf(log_fp, "\n");
        fflush(log_fp);
    }
    
    pthread_mutex_unlock(&log_mutex);
}
