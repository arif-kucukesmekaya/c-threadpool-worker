#!/bin/bash

# Renk tanımlamaları (Brutal tarzı)
YELLOW='\033[1;33m'
BLUE='\033[1;34m'
GREEN='\033[1;32m'
RED='\033[1;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}=================================================${NC}"
echo -e "${YELLOW} THREAD POOL & UI SISTEMI BASLATILIYOR...        ${NC}"
echo -e "${YELLOW}=================================================${NC}"

# C Programını Derle
echo -e "\n${BLUE}[1/3] C Projesi derleniyor (Make)...${NC}"
make clean
make

if [ $? -ne 0 ]; then
    echo -e "${RED}HATA: C kodu derlenemedi. Islemler durduruluyor.${NC}"
    exit 1
fi

echo -e "${GREEN}C kodu basariyla derlendi!${NC}"

# Frontend'i (Next.js) Arka Planda Başlat
echo -e "\n${BLUE}[2/3] Frontend (Next.js UI) baslatiliyor...${NC}"
cd ui || exit
npm install
# Next.js'i arka planda başlatıyoruz
npm run dev > /dev/null 2>&1 &
NEXT_PID=$!
cd ..

echo -e "${GREEN}Frontend baslatiliyor... (Erisim: http://localhost:3000)${NC}"
echo "Baglanti hazir olana kadar birkac saniye bekleyin..."
sleep 4 # Sunucunun ayağa kalkması için kısa bir süre bekle

# C Programını Çalıştır
echo -e "\n${BLUE}[3/3] Thread Pool C Programi Calistiriliyor...${NC}"
echo -e "Komut: ./thread_pool tasks.txt 4\n"
./thread_pool tasks.txt 4

echo -e "\n${YELLOW}=================================================${NC}"
echo -e "${GREEN}C Programi islemlerini tamamladi ve log.txt olusturuldu.${NC}"
echo -e "${GREEN}Arayuz http://localhost:3000 adresinden calismaya devam ediyor.${NC}"
echo -e "${YELLOW}Sistemi tamamen kapatmak (Frontend'i durdurmak) icin CTRL+C basin.${NC}"
echo -e "${YELLOW}=================================================${NC}"

# Script'in hemen kapanmaması ve UI'ı açık tutması için arkaplandaki Next.js'i bekle
wait $NEXT_PID
