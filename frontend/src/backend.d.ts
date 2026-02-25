import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface InventoryItem {
    maxStock: bigint;
    sellPrice: bigint;
    minStock: bigint;
    stock: bigint;
    itemCode: string;
    buyPrice: bigint;
    itemName: string;
    quantity: bigint;
}
export interface CustomerRecord {
    discountAmount: bigint;
    name: string;
    discountType: DiscountType;
    phone: string;
    discountPercentage: bigint;
    vehicleHistory: Array<VehicleHistory>;
    transactionCount: bigint;
}
export interface VehicleHistory {
    model: string;
    brand: string;
    plate: string;
}
export interface TransactionItem {
    sellPrice: bigint;
    itemCode: string;
    buyPrice: bigint;
    quantity: bigint;
}
export interface ServiceRecord {
    id: bigint;
    customerName: string;
    status: Status;
    vehicleBrand: string;
    technicianName: string;
    repairAction?: string;
    vehicleModel: string;
    plateNumber?: string;
    problemDescription: string;
}
export interface UserProfile {
    name: string;
    email?: string;
}
export interface Transaction {
    id: bigint;
    customerName: string;
    customerPhone: string;
    buyPrices: Array<[string, bigint]>;
    totalAmount: bigint;
    items: Array<TransactionItem>;
}
export enum DiscountType {
    goods = "goods",
    services = "services"
}
export enum Status {
    masuk = "masuk",
    selesai = "selesai"
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    addOrUpdateInventoryItem(item: InventoryItem): Promise<void>;
    addServiceRecord(record: ServiceRecord): Promise<bigint>;
    addTransaction(transaction: Transaction): Promise<bigint>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    deleteCustomerRecord(phone: string): Promise<void>;
    deleteInventoryItem(itemCode: string): Promise<void>;
    deleteServiceRecord(id: bigint): Promise<void>;
    deleteTransaction(id: bigint): Promise<void>;
    findCustomersByName(searchTerm: string): Promise<Array<CustomerRecord>>;
    getAllCustomers(): Promise<Array<CustomerRecord>>;
    getAllInventoryItems(): Promise<Array<InventoryItem>>;
    getAllServiceRecords(): Promise<Array<ServiceRecord>>;
    getAllTransactions(): Promise<Array<Transaction>>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getCustomerRecord(phone: string): Promise<CustomerRecord | null>;
    getInventoryItem(itemCode: string): Promise<InventoryItem | null>;
    getProfitLossReport(startDate: bigint, endDate: bigint): Promise<{
        grossProfit: bigint;
        totalCostOfGoodsSold: bigint;
        itemizedSales: Array<[string, bigint]>;
        totalRevenue: bigint;
    }>;
    getServiceQueue(): Promise<Array<ServiceRecord>>;
    getServiceRecord(id: bigint): Promise<ServiceRecord | null>;
    getTransaction(id: bigint): Promise<Transaction | null>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    isCallerAdmin(): Promise<boolean>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    updateServiceStatus(id: bigint, status: Status, repairAction: string | null): Promise<void>;
    upsertCustomerRecord(record: CustomerRecord): Promise<void>;
}
