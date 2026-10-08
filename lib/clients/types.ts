import { EntityType } from '../rjsc/types';

export interface Client {
  id: string;
  name: string;
  type: EntityType;
  regNo: string;
  incorporationDate: string;
  status: string;

  formerName: string;
  tin: string;
  bin: string;
  registeredOffice: string;
  contactPerson: string;
  mobile: string;
  email: string;
  assigned: string;
  notes: string;

  openWorks: number;
  totalBill: number;
  due: number;
}
