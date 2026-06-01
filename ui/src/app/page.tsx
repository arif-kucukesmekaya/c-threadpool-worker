"use client"

import React, { useState, useEffect, useRef } from 'react';
import { Play, SquareSquare, Terminal, Server, ArrowRight, Database, Cpu, Activity, RefreshCw, Zap, Flame, BoxSelect, Plus } from 'lucide-react';

type Task = { id: string; type: string; payload: string; weight: number };
type Thread = { id: string; name: string; status: 'IDLE' | 'WORKING'; currentTask: Task | null; remaining: number; completed: number };

export default function Home() {
  const [isRunning, setIsRunning] = useState(false);
  const [isShuttingDown, setIsShuttingDown] = useState(false);
  const [tick, setTick] = useState(0); // Force renders for engine state
  
  const logsEndRef = useRef<HTMLDivElement>(null);
  const logsContainerRef = useRef<HTMLDivElement>(null);

  // Simulation Engine State
  const engineRef = useRef({
    queue: [] as Task[],
    threads: [
      { id: '1', name: 'THREAD-0', status: 'IDLE', currentTask: null, remaining: 0, completed: 0 } as Thread,
      { id: '2', name: 'THREAD-1', status: 'IDLE', currentTask: null, remaining: 0, completed: 0 } as Thread,
      { id: '3', name: 'THREAD-2', status: 'IDLE', currentTask: null, remaining: 0, completed: 0 } as Thread,
      { id: '4', name: 'THREAD-3', status: 'IDLE', currentTask: null, remaining: 0, completed: 0 } as Thread,
    ],
    logs: [] as { id: number; thread: string; action: string; time: string; type: string }[],
    stats: { total: 0, processed: 0, maxQueue: 0, capacity: 100 }
  });

  // Game/Simulation Loop
  useEffect(() => {
    if (!isRunning || isShuttingDown) return;
    
    const interval = setInterval(() => {
      let stateMutated = false;
      const eng = engineRef.current;

      for (let t of eng.threads) {
        if (t.status === 'WORKING' && t.currentTask) {
          t.remaining -= 200; // tick every 200ms
          
          if (t.remaining <= 0) {
            // Task finished
            t.status = 'IDLE';
            t.completed++;
            eng.stats.processed++;
            eng.logs.push({
              id: Date.now() + Math.random(),
              thread: t.name,
              action: `BİTTİ: ${t.currentTask.type} [${t.currentTask.payload}]`,
              time: new Date().toLocaleTimeString('tr-TR', { hour12: false }),
              type: 'success'
            });
            t.currentTask = null;
            stateMutated = true;
          } else {
            stateMutated = true; // For progress bar updates
          }
        } 
        else if (t.status === 'IDLE' && eng.queue.length > 0) {
          // Pick up task
          const task = eng.queue.shift()!;
          t.status = 'WORKING';
          t.currentTask = task;
          t.remaining = task.weight;
          eng.logs.push({
            id: Date.now() + Math.random(),
            thread: t.name,
            action: `ALINDI: ${task.type} [${task.payload}]`,
            time: new Date().toLocaleTimeString('tr-TR', { hour12: false }),
            type: 'working'
          });
          stateMutated = true;
        }
      }

      // Max queue tracker
      if (eng.queue.length > eng.stats.maxQueue) {
        eng.stats.maxQueue = eng.queue.length;
        stateMutated = true;
      }
      
      // Auto-truncate logs to keep simulation fast
      if (eng.logs.length > 100) eng.logs = eng.logs.slice(-100);

      if (stateMutated) setTick(t => t + 1);
    }, 200);

    return () => clearInterval(interval);
  }, [isRunning, isShuttingDown]);

  // Keep logs scrolled to bottom
  useEffect(() => {
    if (logsContainerRef.current) {
      logsContainerRef.current.scrollTop = logsContainerRef.current.scrollHeight;
    }
  }, [tick]);

  const pushTask = (type: string, payload: string, weight: number) => {
    if (!isRunning || isShuttingDown) return;
    const eng = engineRef.current;
    
    if (eng.queue.length >= eng.stats.capacity) {
      eng.logs.push({
        id: Date.now(),
        thread: 'MAIN',
        action: `HATA: Kuyruk Dolu! STATUS_QUEUE_FULL`,
        time: new Date().toLocaleTimeString('tr-TR', { hour12: false }),
        type: 'error'
      });
      setTick(t => t + 1);
      return;
    }

    eng.queue.push({ id: Math.random().toString(), type, payload, weight });
    eng.stats.total++;
    
    eng.logs.push({
      id: Date.now() + Math.random(),
      thread: 'MAIN',
      action: `EKLE (PUSH): ${type} -> ${payload}`,
      time: new Date().toLocaleTimeString('tr-TR', { hour12: false }),
      type: 'info'
    });
    setTick(t => t + 1);
  };

  const handleStart = () => {
    if (isRunning) return;
    const eng = engineRef.current;
    eng.logs = [{ id: Date.now(), thread: 'MAIN', action: 'Sistem başlatıldı. Mutex & CV hazır. Kuyruk kapasitesi 100.', time: new Date().toLocaleTimeString('tr-TR', { hour12: false }), type: 'info' }];
    eng.stats = { total: 0, processed: 0, maxQueue: 0, capacity: 100 };
    eng.queue = [];
    eng.threads.forEach(t => { t.status = 'IDLE'; t.completed = 0; t.currentTask = null; });
    
    setIsRunning(true);
    setIsShuttingDown(false);
    setTick(t => t + 1);

    // Initial tasks
    setTimeout(() => pushTask('PRIME', '97', 600), 500);
    setTimeout(() => pushTask('LINECOUNT', 'test/large.txt', 1200), 700);
  };

  const handleShutdown = () => {
    setIsShuttingDown(true);
    engineRef.current.logs.push({ id: Date.now(), thread: 'MAIN', action: 'SHUTDOWN_SIGNAL! Broadcast yapılıyor, tüm IDLE threadler sonlanacak.', time: new Date().toLocaleTimeString('tr-TR', { hour12: false }), type: 'error' });
    setTick(t => t + 1);
    setTimeout(() => setIsRunning(false), 2000);
  };

  const eng = engineRef.current;

  return (
    <div className="min-h-screen p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-[1600px] mx-auto">
      
      {/* HEADER / NAVIGATION */}
      <div className="lg:col-span-12 flex flex-col md:flex-row justify-between items-start md:items-center bg-white brutal-border brutal-shadow p-5 relative overflow-hidden">
        <div className="z-10 relative">
          <h1 className="text-4xl font-heading uppercase tracking-tight">Sistem Programlama: Thread Pool</h1>
          <p className="font-mono text-sm border-l-4 border-brutal-blue pl-2 mt-2 font-semibold">Tüm İşlemler & Thread Tüketimleri Eşzamanlı Simüle Edilmektedir</p>
        </div>
        
        {/* Controls */}
        <div className="flex gap-4 mt-6 md:mt-0 z-10 relative">
          <button 
            onClick={handleStart}
            disabled={isRunning && !isShuttingDown}
            className={`brutal-button px-6 py-3 flex items-center gap-2 cursor-pointer transition-transform
              ${(isRunning && !isShuttingDown) ? 'opacity-50 cursor-not-allowed bg-gray-300' : 'bg-brutal-blue text-white'}`}
          >
            <Play className="w-5 h-5 fill-current" />
            <span className="font-heading uppercase">Sistemi Başlat</span>
          </button>
          
          <button 
            onClick={handleShutdown}
            disabled={!isRunning || isShuttingDown}
            className={`brutal-button px-6 py-3 flex items-center gap-2 cursor-pointer transition-transform
              ${(!isRunning || isShuttingDown) ? 'opacity-50 cursor-not-allowed bg-gray-300' : 'bg-brutal-red text-white'}`}
          >
            <SquareSquare className="w-5 h-5 fill-current" />
            <span className="font-heading uppercase">Shutdown</span>
          </button>
        </div>
        <div className="absolute right-0 top-0 opacity-5 w-64 h-64 bg-brutal-blue rounded-full blur-3xl"></div>
      </div>

      {/* ARCHITECTURE DIAGRAM */}
      <div className="lg:col-span-8 brutal-card p-6 bg-brutal-bg cursor-default h-min">
        <h2 className="text-xl font-heading mb-6 uppercase flex items-center gap-2 border-b-2 border-black pb-2 max-w-max">
          <Activity className="w-6 h-6 text-brutal-blue" /> Mimari & İş Dağıtımı
        </h2>
        
        <div className="flex flex-col xl:flex-row items-center justify-between gap-6 py-4">
          
          {/* QUEUE */}
          <div className="bg-brutal-yellow brutal-border brutal-shadow-lg p-6 w-full xl:w-[280px] text-center relative">
            <div className="absolute -top-4 -right-4 bg-black text-white px-3 py-1 font-mono text-sm font-bold shadow-[-2px_2px_0px_#4263eb]">KUYRUK</div>
            <RefreshCw className={`w-14 h-14 mx-auto mb-3 text-black ${eng.queue.length > 0 ? 'animate-spin' : ''}`} style={{ animationDuration: '2s' }} />
            <div className="font-heading text-3xl mb-2">{eng.queue.length} <span className="text-sm">GÖREV</span></div>
            
            <div className="h-32 bg-white brutal-border overflow-hidden relative flex flex-col-reverse justify-start p-1 gap-1">
               {eng.queue.slice(0, 10).map((q, i) => (
                  <div key={i} className={`h-4 text-[8px] font-mono leading-tight px-1 uppercase text-white truncate ${q.type==='PRIME'? 'bg-brutal-red' : q.type==='LINECOUNT' ? 'bg-brutal-blue' : 'bg-brutal-green'}`}>
                     {q.type} {q.payload}
                  </div>
               ))}
               {eng.queue.length > 10 && <div className="text-xs font-bold text-center">+{eng.queue.length - 10} daha...</div>}
               {eng.queue.length === 0 && <div className="text-xs font-bold text-center mt-auto mb-auto opacity-50">Kuyruk Boş</div>}
            </div>
            
            <div className="flex justify-between items-center bg-white brutal-border p-2 mt-4 font-mono text-xs font-bold">
              <span>Muteks:</span>
              <span className={`px-2 py-0.5 ${isRunning ? 'bg-green-300' : 'bg-gray-300'}`}>{isRunning ? 'AKTIF' : 'IDLE'}</span>
            </div>
          </div>

          <ArrowRight className={`hidden xl:block w-10 h-10 flex-shrink-0 text-brutal-red stroke-[4px] ${eng.queue.length > 0 ? 'animate-pulse' : 'opacity-20'}`} />

          {/* CONSUMERS */}
          <div className="bg-white brutal-border brutal-shadow p-6 w-full flex-1 relative group">
            <div className="absolute -top-4 -left-4 bg-black text-white px-3 py-1 font-mono text-sm font-bold shadow-[2px_2px_0px_#2b8a3e]">WORKER THREADS</div>
            
            <div className="grid grid-cols-2 gap-4">
              {eng.threads.map((t) => (
                <div key={t.id} className={`border-[3px] border-black p-3 flex flex-col gap-2 transition-colors ${t.status === 'WORKING' ? 'bg-white brutal-shadow-sm' : 'bg-gray-100'}`}>
                  
                  <div className="flex justify-between items-center">
                    <span className="font-heading text-lg">{t.name}</span>
                    <span className={`px-2 py-0.5 font-bold font-mono text-[10px] uppercase border border-black ${t.status === 'WORKING' ? 'bg-brutal-yellow text-black' : 'bg-white text-gray-500'}`}>
                      {t.status}
                    </span>
                  </div>

                  <div className="h-[60px] border-2 border-dashed border-gray-400 bg-gray-50 flex items-center justify-center p-2 relative overflow-hidden">
                     {t.status === 'WORKING' && t.currentTask ? (
                       <div className="text-center w-full z-10">
                          <p className="font-mono text-xs font-bold text-brutal-red break-words leading-tight">{t.currentTask.type}</p>
                          <p className="font-mono text-[10px] break-words leading-tight">{t.currentTask.payload}</p>
                          
                          {/* Progress Bar! */}
                          <div className="w-full bg-gray-300 h-1.5 mt-2 border border-black absolute bottom-0 left-0">
                            <div className="bg-brutal-green h-full" style={{ width: `${100 - (t.remaining / t.currentTask.weight * 100)}%` }}></div>
                          </div>
                          <span className="absolute bottom-2 right-1 text-[8px] font-bold opacity-50">{(t.remaining / 1000).toFixed(1)}s</span>
                       </div>
                     ) : (
                       <Cpu className="w-6 h-6 text-gray-300" />
                     )}
                  </div>

                  <div className="w-full flex justify-between items-center text-xs font-mono border-t-2 border-black pt-2 mt-1">
                    <span className="font-bold opacity-60">Görev Skoru:</span>
                    <span className="font-black bg-black text-white px-2">{t.completed}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* TASK GENERATOR & STATS */}
      <div className="lg:col-span-4 flex flex-col gap-6">
        
        {/* MANUAL TASK PUSHER */}
        <div className="brutal-card p-6 bg-white border-[4px] border-brutal-blue">
          <h3 className="font-heading mb-4 text-xl uppercase border-b-4 border-black pb-2 flex items-center justify-between">
            <span>Manuel Görev Ekle</span>
            <BoxSelect className="w-6 h-6" />
          </h3>
          <p className="font-mono text-xs text-gray-600 mb-4">istediğiniz yükte görevi kuyruğa `push` edin ve thread havuzunun nasıl tükettiğini izleyin.</p>
          
          <div className="flex flex-col gap-3">
             <button disabled={!isRunning} onClick={() => pushTask('LINECOUNT', 'test/file1.txt', 500)} className="brutal-button !bg-brutal-green text-white py-2 px-3 flex items-center justify-between disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed">
               <div className="flex items-center gap-2"><Zap className="w-4 h-4 fill-current"/> <span className="font-bold text-sm">Hızlı (satır say)</span></div>
               <span className="font-mono text-xs bg-black text-white px-1">0.5sn</span>
             </button>
             
             <button disabled={!isRunning} onClick={() => pushTask('CHARCOUNT', 'data/logs.csv', 1800)} className="brutal-button !bg-brutal-yellow text-black py-2 px-3 flex items-center justify-between disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed">
               <div className="flex items-center gap-2"><Activity className="w-4 h-4"/> <span className="font-bold text-sm">Normal (harf say)</span></div>
               <span className="font-mono text-xs bg-black text-white px-1">1.8sn</span>
             </button>

             <button disabled={!isRunning} onClick={() => pushTask('PRIME', '104729 (Asal Mı?)', 4500)} className="brutal-button !bg-brutal-red text-white py-2 flex items-center justify-between px-3 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed">
               <div className="flex items-center gap-2"><Flame className="w-5 h-5 fill-current"/> <span className="font-bold text-sm text-[15px]">Ağır Ağır (PRIME)</span></div>
               <span className="font-mono text-xs bg-white text-black px-1 font-bold">4.5sn</span>
             </button>

             <button disabled={!isRunning} onClick={() => {
                for(let i=0; i<5; i++) {
                   setTimeout(() => {
                      const types = [['PRIME','31',600], ['CHARCOUNT','x.txt',1000], ['LINECOUNT','y.md',500], ['PRIME','99991',3000]];
                      const sel = types[Math.floor(Math.random()*types.length)];
                      pushTask(sel[0] as string, sel[1] as string, sel[2] as number);
                   }, i * 100);
                }
             }} className="brutal-button !bg-brutal-blue text-white py-2 flex justify-center items-center gap-2 mt-2 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed">
               <Plus className="w-5 h-5" /> 5x Rastgele Yüklen (Spam)
             </button>
          </div>
        </div>

        <div className="brutal-card p-6 bg-brutal-green text-black">
          <h3 className="font-heading mb-4 text-xl uppercase border-b-4 border-black pb-2">Özet Bilgiler</h3>
          <ul className="font-mono text-sm flex flex-col gap-3">
            <li className="flex justify-between items-center p-2 bg-white brutal-border">
              <span className="font-bold">Toplam Eklenen</span>
              <strong className="text-xl bg-gray-200 px-2">{eng.stats.total}</strong>
            </li>
            <li className="flex justify-between items-center p-2 bg-white brutal-border">
              <span className="font-bold">Tamamlanan</span>
              <strong className="text-xl bg-brutal-blue text-white px-2">{eng.stats.processed}</strong>
            </li>
            <li className="flex justify-between items-center p-2 bg-black text-white brutal-border">
              <span className="font-bold text-gray-300">Max Kuyruk Görülen</span>
              <strong className="text-xl text-brutal-red">{eng.stats.maxQueue}</strong>
            </li>
          </ul>
        </div>
      </div>

      {/* BOTTOM LOG BOARD */}
      <div className="lg:col-span-12 flex flex-col gap-6">
        <div className="brutal-card flex flex-col h-[350px]">
          {/* Terminal Header */}
          <div className="bg-black text-white p-3 flex items-center justify-between border-b-[4px] border-brutal-red cursor-default">
            <div className="flex gap-3 items-center">
              <Terminal className="w-5 h-5 text-brutal-green" />
              <span className="font-mono font-bold tracking-widest text-sm text-brutal-green">
                stdout / log.txt 
              </span>
            </div>
          </div>

          <div className="bg-gray-100 p-2 font-mono text-xs border-b-2 border-black flex gap-6 cursor-default">
            <span className="font-bold text-gray-500 w-[120px]">Thread</span>
            <span className="font-bold text-gray-500 flex-1">Mesaj</span>
            <span className="font-bold text-gray-500 w-[80px]">Zaman</span>
          </div>

          {/* Log Messages Content */}
          <div ref={logsContainerRef} className="p-4 flex-1 overflow-y-auto flex flex-col gap-2 bg-white font-mono text-[13px] selection:bg-brutal-yellow pb-8">
            {eng.logs.length === 0 && (
              <div className="flex items-center opacity-50 font-bold text-sm">
                &gt;_ Sistem hazir. Baslatilmasi bekleniyor...
              </div>
            )}
            {eng.logs.map((log) => (
              <div key={log.id} className="flex flex-col md:flex-row gap-4 border-b border-dashed border-gray-300 pb-1 hover:bg-gray-50 transition-colors">
                <div className="w-[120px] flex-shrink-0 font-bold">
                  <span className={`px-2 py-0.5 brutal-border text-[11px] ${log.thread === 'MAIN' ? 'bg-black text-white' : 'bg-brutal-yellow text-black'}`}>
                    [{log.thread}]
                  </span>
                </div>
                
                <div className={`flex-1 ${log.type === 'error' ? 'text-brutal-red font-bold' : log.type === 'success' ? 'text-green-700 font-bold' : log.type === 'working' ? 'text-brutal-blue font-semibold' : 'text-gray-700'}`}>
                  {log.action}
                </div>

                <div className="w-[80px] flex-shrink-0 opacity-40 text-[10px] mt-1">
                  [{log.time}]
                </div>
              </div>
            ))}
            <div ref={logsEndRef} />
          </div>
          
        </div>
      </div>
    </div>
  );
}
