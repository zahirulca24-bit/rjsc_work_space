import { CorporateEvent } from './history-types';

// Mock initial data based on the single seeded client (RJSC-0001) in mock.ts 
// Actually we only have RJSC-0001, RJSC-0002 from our clientStore.ts initialization

let historyEvents: CorporateEvent[] = [
  {
    id: 'evt-1',
    clientId: 'RJSC-0001',
    type: 'REGISTERED_OFFICE_CHANGE',
    address: "177 Mahtab Center 8th Floor, Shaheed Syed Nazrul Islam Saroni, Bijoy Nagar, Dhaka",
    effectiveFrom: "2015-01-01",
    effectiveTo: null,
    sourceDocument: 'Incorporation Form VI',
  },
  {
    id: 'evt-2',
    clientId: 'RJSC-0001',
    type: 'DIRECTOR_CHANGE',
    fullName: "MD SAKHAWAT HOSSAIN",
    designation: "Managing Director",
    appointmentDate: "2015-01-01",
    cessationDate: null,
    current: true,
  },
  {
    id: 'evt-3',
    clientId: 'RJSC-0001',
    type: 'CAPITAL_CHANGE',
    authorizedCapital: 5000000,
    paidUpCapital: 1000000,
    effectiveDate: "2015-01-01",
    changeType: 'INITIAL'
  }
];

let listeners: (() => void)[] = [];

function emitChange() {
  for (let listener of listeners) {
    listener();
  }
}

export const historyStore = {
  addEvent(event: CorporateEvent) {
    historyEvents = [...historyEvents, event];
    emitChange();
  },
  
  updateEvent(event: CorporateEvent) {
    historyEvents = historyEvents.map(e => e.id === event.id ? event : e);
    emitChange();
  },
  
  getEvents(clientId: string) {
    return historyEvents.filter(e => e.clientId === clientId);
  },

  getAllSnapshot() {
    return historyEvents;
  },
  
  subscribe(listener: () => void) {
    listeners = [...listeners, listener];
    return () => {
      listeners = listeners.filter(l => l !== listener);
    };
  }
};
