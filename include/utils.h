#ifndef UTILS_H
#define UTILS_H

#include <time.h>

double timespec_to_ms(struct timespec start, struct timespec end);
void trim_newline(char *str);
void update_global_task_time(double ms);

#endif
