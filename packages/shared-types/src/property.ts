export interface Property {
  id: string;
  name: string;
  address: string;
  unitNumber?: string;
  buildingId: string;
  tenantId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Building {
  id: string;
  name: string;
  address: string;
  ownerId: string;
  fmcId: string;
  createdAt: Date;
  updatedAt: Date;
}