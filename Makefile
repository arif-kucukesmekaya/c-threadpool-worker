CC = gcc
CFLAGS = -Wall -Wextra -pthread -Iinclude -g -O2
SRC = src/main.c src/queue.c src/thread_pool.c src/task.c src/logger.c src/utils.c
OUT = thread_pool

all:
	$(CC) $(CFLAGS) $(SRC) -o $(OUT)

clean:
	rm -f $(OUT) log.txt
