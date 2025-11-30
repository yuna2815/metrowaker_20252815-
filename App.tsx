
import React, { useState, useEffect, useRef } from 'react';
import { Search, Train, MapPin, Navigation, AlertTriangle, RefreshCw, ChevronRight, ChevronLeft } from 'lucide-react';
import { AppPhase, RealtimeArrival, TrackedTrain } from './types';
import { getRealtimeArrival, getRealtimePosition, getLineName, cleanStationName } from './services/subwayService';
import { STATION_DATA, LineInfo } from './services/stationData';
import AlarmManager from './components/AlarmManager';

const REFRESH_INTERVAL = 15000; // 15 seconds

export default function App() {
  // State Machine
  const [phase, setPhase] = useState<AppPhase>(AppPhase.SELECT_LINE);
  
  // Selections
  const [selectedLine, setSelectedLine] = useState<LineInfo | null>(null);
  const [departStation, setDepartStation] = useState('');
  const [destStation, setDestStation] = useState('');
  
  // Data
  const [arrivalList, setArrivalList] = useState<RealtimeArrival[]>([]);
  const [selectedTrain, setSelectedTrain] = useState<TrackedTrain | null>(null);
  
  // Tracking State
  const [currentTrainLocation, setCurrentTrainLocation] = useState<string>('위치 찾는 중...');
  const [destStatus, setDestStatus] = useState<string>('');
  const [isAlarmActive, setIsAlarmActive] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Refs for Polling
  const pollingRef = useRef<number | null>(null);
  const mainRef = useRef<HTMLElement>(null);

  // Scroll to top on phase change
  useEffect(() => {
    if (mainRef.current) {
      mainRef.current.scrollTop = 0;
    }
  }, [phase]);

  // --- Handlers ---

  const handleSelectLine = (line: LineInfo) => {
    setSelectedLine(line);
    setPhase(AppPhase.SELECT_STATION);
  };

  const handleSelectStation = async (station: string) => {
    setDepartStation(station);
    setIsLoading(true);
    setError(null);
    try {
      const data = await getRealtimeArrival(station);
      
      // Filter trains by the selected line ID to avoid confusion (e.g., Sindorim has Line 1 and 2)
      const filteredData = selectedLine 
        ? data.filter(item => item.subwayId === selectedLine.id)
        : data;

      setArrivalList(filteredData);
      
      if (filteredData.length === 0) {
        // Fallback: Sometimes API returns empty if strictly filtered, or maybe timing is off. 
        // Show alert but allow user to go back or retry.
        setError(`${station}역 ${selectedLine?.name} 열차 정보가 없습니다.`);
      } else {
        setPhase(AppPhase.SELECT_TRAIN);
      }
    } catch (e) {
      setError('데이터를 불러오는데 실패했습니다. (CORS 문제일 수 있습니다)');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectTrain = (train: RealtimeArrival) => {
    setSelectedTrain({
      id: train.trainNo,
      lineId: train.subwayId,
      destination: train.trainLineNm,
      direction: train.updnLine,
      departureStation: cleanStationName(departStation)
    });
    setPhase(AppPhase.SET_DESTINATION);
  };

  const handleSelectDestination = (station: string) => {
    setDestStation(station);
    setPhase(AppPhase.TRACKING);
  };

  const handleStopAlarm = () => {
    setIsAlarmActive(false);
    setPhase(AppPhase.COMPLETED);
    // Cleanup polling
    if (pollingRef.current) clearInterval(pollingRef.current);
  };

  const resetApp = () => {
    setPhase(AppPhase.SELECT_LINE);
    setSelectedLine(null);
    setDepartStation('');
    setDestStation('');
    setSelectedTrain(null);
    setArrivalList([]);
    setError(null);
    setIsAlarmActive(false);
    if (pollingRef.current) clearInterval(pollingRef.current);
  };

  const goBack = () => {
    if (phase === AppPhase.SELECT_STATION) setPhase(AppPhase.SELECT_LINE);
    if (phase === AppPhase.SELECT_TRAIN) setPhase(AppPhase.SELECT_STATION);
    if (phase === AppPhase.SET_DESTINATION) setPhase(AppPhase.SELECT_TRAIN);
    setError(null);
  };

  // --- Tracking Logic ---

  const checkTrainStatus = async () => {
    if (!selectedTrain || !destStation) return;
    
    setIsLoading(true);
    setLastUpdated(new Date());

    try {
      // 1. Check Global Position (Where is the train NOW?)
      const positions = await getRealtimePosition(selectedTrain.lineId);
      const myTrainPosition = positions.find(p => p.trainNo === selectedTrain.id);

      if (myTrainPosition) {
        setCurrentTrainLocation(`${myTrainPosition.statnNm} ${myTrainPosition.trainSttus === '1' ? '도착' : (myTrainPosition.trainSttus === '0' ? '진입' : '출발')}`);
      } else {
        // If we can't find it in position list, it might be in a blind spot or data issue
      }

      // 2. Check Destination Arrival (Is it close to destination?)
      const destArrivals = await getRealtimeArrival(destStation);
      const myTrainAtDest = destArrivals.find(t => t.trainNo === selectedTrain.id);

      if (myTrainAtDest) {
        const msg = myTrainAtDest.arvlMsg2; // e.g. "전역 도착", "2분", "신도림 진입"
        setDestStatus(msg);

        // ALARM CONDITIONS
        // "전역" (Previous Station)
        // "진입" (Approaching)
        // "도착" (Arrived)
        if (msg.includes('전역') || msg.includes('진입') || msg.includes('도착')) {
           setIsAlarmActive(true);
        }
      } else {
        setDestStatus('목적지 도착 정보 대기 중...');
      }

    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (phase === AppPhase.TRACKING) {
      // Initial check
      checkTrainStatus();
      // Poll
      pollingRef.current = window.setInterval(checkTrainStatus, REFRESH_INTERVAL);
    }
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // --- Renders ---

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col relative overflow-hidden">
      <AlarmManager trigger={isAlarmActive} onStop={handleStopAlarm} />

      {/* Header */}
      <header className="p-4 bg-gray-800 border-b border-gray-700 flex items-center justify-between sticky top-0 z-10 shadow-md">
        <div className="flex items-center gap-2">
          {phase !== AppPhase.SELECT_LINE && phase !== AppPhase.TRACKING && phase !== AppPhase.COMPLETED && (
            <button onClick={goBack} className="mr-1 text-gray-400 hover:text-white">
              <ChevronLeft size={24} />
            </button>
          )}
          <Train className="text-yellow-400" />
          <h1 className="text-xl font-bold tracking-tight">Subway Waker</h1>
        </div>
        {(phase === AppPhase.TRACKING || phase === AppPhase.COMPLETED) && (
           <button onClick={resetApp} className="text-xs text-gray-400 border border-gray-600 px-2 py-1 rounded hover:bg-gray-700">
             처음으로
           </button>
        )}
      </header>

      {/* Main Content */}
      <main ref={mainRef} className="flex-1 p-4 pb-24 overflow-y-auto scroll-smooth">
        
        {/* Step 1: Line Selection */}
        {phase === AppPhase.SELECT_LINE && (
          <div className="flex flex-col gap-6 animate-fade-in mt-6">
            <div className="text-center space-y-2 mb-4">
              <h2 className="text-2xl font-bold text-white">몇 호선을 타시나요?</h2>
              <p className="text-gray-400 text-sm">탑승하실 노선을 선택해주세요.</p>
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              {STATION_DATA.map((line) => (
                <button
                  key={line.id}
                  onClick={() => handleSelectLine(line)}
                  className="aspect-square rounded-2xl flex flex-col items-center justify-center gap-2 transition-transform hover:scale-105 active:scale-95 shadow-lg border-b-4 border-black/20"
                  style={{ backgroundColor: line.color }}
                >
                  <span className="text-3xl font-black text-white drop-shadow-md">{line.name.replace('호선', '')}</span>
                  <span className="text-xs text-white/90 font-medium">{line.name}</span>
                </button>
              ))}
            </div>

            <div className="mt-8 p-4 bg-gray-800/50 rounded-xl text-xs text-gray-500 leading-relaxed text-center">
              <p>현재 1호선 ~ 9호선만 지원합니다.</p>
            </div>
          </div>
        )}

        {/* Step 2: Station Selection */}
        {phase === AppPhase.SELECT_STATION && selectedLine && (
          <div className="flex flex-col gap-4 animate-fade-in h-full">
            <div className="sticky top-0 bg-gray-900 pb-2 z-10">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <span className="w-3 h-8 rounded-full" style={{ backgroundColor: selectedLine.color }}></span>
                {selectedLine.name} 탑승역 선택
              </h2>
              <p className="text-gray-400 text-sm mt-1">출발하실 역을 선택해주세요.</p>
            </div>

            {error && (
              <div className="bg-red-900/50 border border-red-500/50 p-4 rounded-xl flex gap-3 text-red-200 text-sm">
                <AlertTriangle className="shrink-0" />
                <p>{error}</p>
              </div>
            )}

            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 pb-8">
              {selectedLine.stations.map((station) => (
                <button
                  key={station}
                  onClick={() => handleSelectStation(station)}
                  disabled={isLoading}
                  className="bg-gray-800 hover:bg-gray-700 text-gray-200 text-sm font-medium py-3 px-2 rounded-lg border border-gray-700 transition-colors truncate"
                >
                  {station}
                </button>
              ))}
            </div>
            
            {isLoading && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <RefreshCw className="animate-spin text-yellow-400 w-12 h-12" />
              </div>
            )}
          </div>
        )}

        {/* Step 3: Train Selection */}
        {phase === AppPhase.SELECT_TRAIN && (
          <div className="flex flex-col gap-4 animate-fade-in">
             <div className="flex items-center justify-between mb-2">
                <h2 className="text-xl font-bold text-white">{departStation}역 열차</h2>
                <span className="text-xs px-2 py-1 rounded bg-gray-800 text-gray-400 border border-gray-700">{selectedLine?.name}</span>
             </div>
            
            {arrivalList.length === 0 ? (
               <div className="text-center py-20 text-gray-500">
                 <p>도착 예정인 열차가 없습니다.</p>
                 <button onClick={goBack} className="mt-4 text-yellow-400 underline">다시 선택하기</button>
               </div>
            ) : (
              arrivalList.map((train, idx) => (
                <button
                  key={`${train.trainNo}-${idx}`}
                  onClick={() => handleSelectTrain(train)}
                  className="w-full bg-gray-800 border border-gray-700 hover:border-yellow-500 hover:bg-gray-750 p-4 rounded-xl text-left transition-all group relative overflow-hidden"
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className={`text-xs font-bold px-2 py-1 rounded ${train.updnLine === '상행' || train.updnLine === '내선' ? 'bg-green-900 text-green-300' : 'bg-blue-900 text-blue-300'}`}>
                      {train.updnLine}
                    </span>
                    <span className="text-xs text-gray-500 font-mono">#{train.trainNo}</span>
                  </div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-lg font-bold text-white">{train.trainLineNm}</h3>
                  </div>
                  <div className="flex justify-between items-end">
                    <p className="text-yellow-400 font-medium">{train.arvlMsg2}</p>
                  </div>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ChevronRight className="text-yellow-500" />
                  </div>
                </button>
              ))
            )}
          </div>
        )}

        {/* Step 4: Destination Selection (Grid) */}
        {phase === AppPhase.SET_DESTINATION && selectedLine && selectedTrain && (
          <div className="flex flex-col gap-4 animate-fade-in h-full">
            <div className="bg-gray-800 p-4 rounded-xl border border-gray-700 mb-2">
               <div className="flex justify-between items-center mb-1">
                 <span className="text-xs text-gray-400">현재 선택된 열차</span>
                 <span className="text-xs font-mono text-yellow-500">#{selectedTrain.id}</span>
               </div>
               <div className="text-xl font-bold text-white">{selectedTrain.destination}</div>
            </div>

            <div className="sticky top-0 bg-gray-900 pb-2 z-10">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <span className="w-3 h-8 rounded-full" style={{ backgroundColor: selectedLine.color }}></span>
                하차역 선택
              </h2>
              <p className="text-gray-400 text-sm mt-1">목적지를 선택해주세요.</p>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 pb-8">
              {selectedLine.stations.map((station) => (
                <button
                  key={station}
                  onClick={() => handleSelectDestination(station)}
                  className="bg-gray-800 hover:bg-gray-700 text-gray-200 text-sm font-medium py-3 px-2 rounded-lg border border-gray-700 transition-colors truncate"
                >
                  {station}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 5: Tracking */}
        {phase === AppPhase.TRACKING && selectedTrain && (
          <div className="flex flex-col gap-6 animate-fade-in h-full">
            <div className="text-center mt-4">
              <div className="inline-block px-3 py-1 bg-yellow-500/20 text-yellow-300 text-xs font-bold rounded-full mb-2 animate-pulse">
                실시간 추적 중
              </div>
              <h2 className="text-3xl font-black text-white">{cleanStationName(destStation)}행</h2>
              <p className="text-gray-400 mt-1">열차번호 <span className="font-mono text-gray-200">{selectedTrain.id}</span></p>
            </div>

            {/* Current Status Card */}
            <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-yellow-500 to-transparent opacity-50"></div>
              
              <div className="space-y-6">
                <div>
                  <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">현재 열차 위치</p>
                  <div className="flex items-center gap-3">
                    <Navigation className="text-blue-400" size={28} />
                    <p className="text-2xl font-bold text-white">{currentTrainLocation}</p>
                  </div>
                </div>

                <div className="h-px bg-gray-700"></div>

                <div>
                  <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">도착지 현황 ({cleanStationName(destStation)})</p>
                  <div className="flex items-center gap-3">
                    <MapPin className="text-red-400" size={28} />
                    <p className={`text-xl font-bold ${destStatus.includes('전역') ? 'text-red-400 animate-pulse' : 'text-gray-200'}`}>
                      {destStatus || "아직 도착 정보 없음"}
                    </p>
                  </div>
                  {!destStatus && (
                    <p className="text-xs text-gray-500 mt-2">
                      * 열차가 목적지에 가까워지면(약 2~3정거장 전) 정보가 표시됩니다.
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex-1"></div>
            
            <p className="text-center text-xs text-gray-600">
              마지막 업데이트: {lastUpdated.toLocaleTimeString()}
            </p>

             <button
              onClick={handleStopAlarm}
              className="w-full bg-gray-700 hover:bg-gray-600 text-white font-bold py-4 rounded-xl transition-all"
            >
              추적 종료
            </button>
          </div>
        )}

        {/* Step 6: Completed */}
        {phase === AppPhase.COMPLETED && (
          <div className="flex flex-col items-center justify-center h-full mt-20 gap-6 animate-fade-in">
             <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mb-4">
               <Train className="text-white w-10 h-10" />
             </div>
             <h2 className="text-2xl font-bold text-white">이용해주셔서 감사합니다!</h2>
             <button
              onClick={resetApp}
              className="px-8 py-3 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-xl transition-all"
            >
              새로운 알람 맞추기
            </button>
          </div>
        )}

      </main>
    </div>
  );
}
