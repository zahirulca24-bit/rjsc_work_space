import { Client } from './types';
import { EntityType } from '../rjsc/types';

let clients: Client[] = [
  {
    id: "RJSC-0001",
    name: "SILVEE AND SINTHEE TRAVEL AGENCY LTD.",
    regNo: "C-118168",
    type: EntityType.PRIVATE_COMPANY,
    incorporationDate: "",
    status: "Active",
    formerName: "",
    tin: "",
    bin: "",
    registeredOffice: "",
    contactPerson: "",
    mobile: "",
    email: "",
    assigned: "Noyon",
    notes: "",
    openWorks: 1,
    totalBill: 5500,
    due: 2500,
  },
  {
    id: "RJSC-0002",
    name: "Bangladesh Film Club Limited",
    regNo: "",
    type: EntityType.PRIVATE_COMPANY,
    incorporationDate: "",
    status: "Active",
    formerName: "",
    tin: "",
    bin: "",
    registeredOffice: "",
    contactPerson: "",
    mobile: "",
    email: "",
    assigned: "Noyon",
    notes: "",
    openWorks: 0,
    totalBill: 0,
    due: 0,
  }
];

let listeners: (() => void)[] = [];

function emitChange() {
  for (let listener of listeners) {
    listener();
  }
}

export const clientStore = {
  addClient(client: Omit<Client, 'openWorks' | 'totalBill' | 'due'>) {
    const newClient: Client = {
      ...client,
      openWorks: 0,
      totalBill: 0,
      due: 0,
    };
    clients = [...clients, newClient];
    emitChange();
  },
  addClients(newClients: Omit<Client, 'openWorks' | 'totalBill' | 'due'>[]) {
    const mapped = newClients.map(c => ({
      ...c,
      openWorks: 0,
      totalBill: 0,
      due: 0,
    }));
    clients = [...clients, ...mapped];
    emitChange();
  },
  generateNextId() {
    const ids = clients.map(c => c.id).filter(id => id.startsWith('RJSC-'));
    let max = 0;
    for (const id of ids) {
      const num = parseInt(id.replace('RJSC-', ''), 10);
      if (!isNaN(num) && num > max) max = num;
    }
    return `RJSC-${String(max + 1).padStart(4, '0')}`;
  },
  subscribe(listener: () => void) {
    listeners = [...listeners, listener];
    return () => {
      listeners = listeners.filter(l => l !== listener);
    };
  },
  getSnapshot() {
    return clients;
  }
};
