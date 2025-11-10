/**
 * Clearance Types
 * Definiert alle Clearance-bezogenen TypeScript Interfaces
 */

import { User } from './user.types';

export interface CustomsOffice {
  id: string;
  code: string;
  name: string;
  countryCode: string;
  city: string | null;
  address: string | null;
  isActive: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
  searchText?: string | null;
}

export interface Company {
  id: string;
  name: string;
  country: string;
  address: string;
  postalCode: string;
  city: string;
  emails: string[];
  phones: string[];
  isActive: boolean;
  tenantId: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface Guarantee {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  tenantId: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface Route {
  id: string;
  name: string;
  countries: string[];
  description: string | null;
  isActive: boolean;
  tenantId: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  transitOffices?: RouteTransitOffice[];
}

export interface RouteTransitOffice {
  id: string;
  routeId: string;
  customsOfficeId: string;
  order: number;
  createdAt: Date | string;
  customsOffice: CustomsOffice;
}

export interface GoodsLocation {
  id: string;
  tenantId: string;
  name: string;
  code: string | null;
  description: string | null;
  isActive: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface Authorization {
  id: string;
  name: string;
  description: string | null;
  code: string;
  isActive: boolean;
  tenantId: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface Clearance {
  id: string;
  lrn: string;
  companyId: string;
  guaranteeId: string;
  licensePlate: string;
  licensePlateCountry: string;
  hasSecondPlate: boolean;
  secondLicensePlate: string | null;
  secondPlateCountry: string | null;
  routeId: string | null;
  simplifiedProcedure: boolean;
  goodsLocationId: string | null;
  authorizationId: string | null;
  departureOfficeId: string | null;
  dispatchOfficeId: string | null;
  destinationOfficeId: string | null;
  registrationDate: Date | string;
  arrivalDate: Date | string;
  status: ClearanceStatus;
  tenantId: string;
  createdById: string;
  updatedById: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  anmNr: string | null;
}

export interface ClearanceWithRelations extends Clearance {
  company: Company;
  guarantee: Guarantee;
  route: Route | null;
  goodsLocation: GoodsLocation | null;
  authorization: Authorization | null;
  departureOffice: CustomsOffice | null;
  dispatchOffice: CustomsOffice | null;
  destinationOffice: CustomsOffice | null;
  createdBy: User;
  updatedBy: User | null;
}

export type ClearanceStatus =
  | 'in_bearbeitung'
  | 'validiert'
  | 'eingereicht'
  | 'genehmigt'
  | 'abgelehnt'
  | 'storniert';

export interface ClearanceFormData {
  lrn: string;
  registrationDate: string;
  arrivalDate: string;
  companyId: string;
  guaranteeId: string;
  licensePlateType: '30' | '40';
  licensePlate: string;
  licensePlateCountry: string;
  secondLicensePlate?: string;
  secondPlateCountry?: string;
  departureOfficeId?: string;
  dispatchOfficeId?: string;
  destinationOfficeId?: string;
  routeId?: string;
  simplifiedProcedure: boolean;
  goodsLocationId?: string;
  authorizationId?: string;
}

export interface ClearanceHistory {
  id: string;
  clearanceId: string;
  action: string;
  description: string;
  userId: string;
  createdAt: Date | string;
  user?: User;
}

export interface ClearanceValidationError {
  field: string;
  message: string;
}

export interface ClearanceValidationResult {
  isValid: boolean;
  errors: ClearanceValidationError[];
}
