
// API Response Types

export interface RealtimeArrival {
  subwayId: string; // Line ID (e.g., "1002")
  trainNo: string; // Train Number (e.g., "2210")
  updnLine: string; // "상행" or "하행"
  trainLineNm: string; // Destination Info (e.g., "Seongsu - Sindorim")
  statnNm: string; // Current Station Name
  arvlMsg2: string; // Status Message (e.g., "Oido arrived", "2 min")
  arvlMsg3: string; // Current location detail (e.g., "Seoul Stn")
  arvlCd: string; // Arrival Code (0:Entry, 1:Arrival, 2:Dep, 99:Running)
  recptnDt: string; // Data Time
  barvlDt: string; // Time in seconds to arrival
}

export interface RealtimePosition {
  subwayId: string;
  subwayNm: string;
  statnId: string;
  statnNm: string; // Current Station Name
  trainNo: string;
  trainSttus: string; // 0:Entry, 1:Arrival, 2:Departure
  statnTnm: string; // Terminal Station
}

export interface ApiResponse<T> {
  errorMessage: {
    status: number;
    code: string;
    message: string;
    link: string;
    developerMessage: string;
    total: number;
  };
  realtimeArrivalList?: T[];
  realtimePositionList?: T[];
}

export interface TrackedTrain {
  id: string; // Train No
  lineId: string; // Subway ID
  destination: string; // Display destination
  direction: string; // Up/Down
  departureStation: string;
}

export enum AppPhase {
  SELECT_LINE = 'SELECT_LINE',         // Step 1: Select 1~9 Line
  SELECT_STATION = 'SELECT_STATION',   // Step 2: Select Station from list
  SELECT_TRAIN = 'SELECT_TRAIN',       // Step 3: Select specific train
  SET_DESTINATION = 'SET_DESTINATION', // Step 4: Set destination
  TRACKING = 'TRACKING',               // Step 5: Tracking
  COMPLETED = 'COMPLETED',             // Step 6: Done
}
