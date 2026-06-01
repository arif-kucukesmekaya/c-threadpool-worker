# Thread Pool Project Enhancements & Bug Fixes Design

This design document outlines the solutions for missing performance metrics in the C program and visual bugs in the Next.js visualizer UI.

## 1. C Program Changes

### Average Task Time Calculation
Currently, task execution times are measured within `worker_routine` (in `src/thread_pool.c`) using `clock_gettime(CLOCK_MONOTONIC, &task.start_time)` and `clock_gettime(CLOCK_MONOTONIC, &task.end_time)`, but they are never aggregated.

#### Changes:
1. **[utils.h](file:///home/arif/system-programming/project/include/utils.h)**:
   Add a prototype for `update_global_task_time`:
   ```c
   void update_global_task_time(double ms);
   ```

2. **[main.c](file:///home/arif/system-programming/project/src/main.c)**:
   * Remove the `static` keyword from `global_total_task_time_ms` and `update_global_task_time` to export them.
   * In the printed summary block, calculate the average task time:
     ```c
     double avg_task_time = pool.total_processed > 0 ? (global_total_task_time_ms / pool.total_processed) : 0.0;
     printf("Average task time       : %.2f ms\n", avg_task_time);
     ```

3. **[thread_pool.c](file:///home/arif/system-programming/project/src/thread_pool.c)**:
   * In `worker_routine`, after updating task times, calculate task duration using `timespec_to_ms(task.start_time, task.end_time)` and invoke `update_global_task_time`.

### Type mismatch in `is_prime` / `fgetc`
In `src/task.c` line 69, `ch` is declared as `char` instead of `int`. `fgetc` returns `int` (to return `EOF` as `-1`). Using `char` is unsafe.

#### Changes:
1. **[task.c](file:///home/arif/system-programming/project/src/task.c)**:
   * Change `char ch;` to `int ch;` in the file reading loop inside `process_task`.

---

## 2. Next.js UI Changes

### Log Console `[undefined]` Rendering Bug
In `ui/src/app/page.tsx`, the log viewer tries to read `log.thread` and `log.time`, which are not initialized when logs are appended.

#### Changes:
1. **[page.tsx](file:///home/arif/system-programming/project/ui/src/app/page.tsx)**:
   * Update the `Task` / `Thread` and log state definitions:
     ```typescript
     type LogEntry = {
       id: number;
       action: string;
       type: string;
       thread: string;
       time: string;
     };
     ```
   * Ensure `eng.logs.push` calls always populate `thread` and `time` properties.
   * Strip time-formatting logic from the `action` property string so that logs look clean in the visual terminal.
