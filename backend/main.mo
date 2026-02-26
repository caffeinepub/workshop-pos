import Map "mo:core/Map";
import Array "mo:core/Array";
import Runtime "mo:core/Runtime";
import Iter "mo:core/Iter";
import Text "mo:core/Text";
import Nat "mo:core/Nat";
import Principal "mo:core/Principal";
import Migration "migration";

import MixinAuthorization "authorization/MixinAuthorization";
import AccessControl "authorization/access-control";

// Apply migration.
(with migration = Migration.run)
actor {
  // Access control state
  let accessControlState = AccessControl.initState();

  // Include the authorization mixin!
  include MixinAuthorization(accessControlState);

  // User Profile
  public type UserProfile = { name : Text; email : ?Text };

  let userProfiles = Map.empty<Principal, UserProfile>();

  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can get profiles");
    };
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    userProfiles.add(caller, profile);
  };

  // Inventory Data Model
  public type InventoryType = { #barang; #jasa };

  public type InventoryItem = {
    itemCode : Text;
    itemName : Text;
    quantity : ?Nat; // Optional for jasa
    type_ : InventoryType;
    sellPrice : Nat;
    buyPrice : Nat;
    stock : ?Nat;
    minStock : Nat;
    maxStock : Nat;
  };

  // Service Record Data Model
  public type ServiceRecord = {
    id : Nat;
    customerName : Text;
    vehicleBrand : Text;
    vehicleModel : Text;
    plateNumber : ?Text;
    problemDescription : Text;
    technicianName : Text;
    status : Status;
    repairAction : ?Text;
  };

  public type Status = {
    #masuk;
    #selesai;
  };

  // Customer Data Model
  public type CustomerRecord = {
    name : Text;
    phone : Text;
    transactionCount : Nat;
    discountAmount : Nat;
    discountPercentage : Nat;
    discountType : DiscountType;
    vehicleHistory : [VehicleHistory];
  };

  public type DiscountType = {
    #goods;
    #services;
  };

  public type VehicleHistory = {
    brand : Text;
    model : Text;
    plate : Text;
  };

  // Transaction Data Model
  public type Transaction = {
    id : Nat;
    customerName : Text;
    customerPhone : Text;
    items : [TransactionItem];
    totalAmount : Nat;
    buyPrices : [(Text, Nat)];
  };

  public type TransactionItem = {
    itemCode : Text;
    quantity : Nat;
    sellPrice : Nat;
    buyPrice : Nat;
  };

  let inventory = Map.empty<Text, InventoryItem>();
  let services = Map.empty<Nat, ServiceRecord>();
  let customers = Map.empty<Text, CustomerRecord>();
  let transactions = Map.empty<Nat, Transaction>();

  var nextServiceId = 0;
  var nextTransactionId = 0;

  // Inventory Management
  // Adding inventory items requires admin-level access
  public shared ({ caller }) func addInventoryItem(item : InventoryItem) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can add inventory items");
    };
    switch (inventory.get(item.itemCode)) {
      case (null) { inventory.add(item.itemCode, item) };
      case (?_) { Runtime.trap("Item code already exists. Use updateInventoryItem instead! ") };
    };
  };

  // Updating inventory items requires at least user-level access
  public shared ({ caller }) func updateInventoryItem(item : InventoryItem) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can update inventory items");
    };
    switch (inventory.get(item.itemCode)) {
      case (?_) { inventory.add(item.itemCode, item) };
      case (null) { Runtime.trap("Item code does not exist yet. Use addInventoryItem instead!") };
    };
  };

  // Deleting inventory items is an admin-only operation
  public shared ({ caller }) func deleteInventoryItem(itemCode : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can delete inventory items");
    };
    inventory.remove(itemCode);
  };

  // Reading inventory requires at least user-level access
  public query ({ caller }) func getAllInventoryItems() : async [InventoryItem] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view inventory items");
    };
    inventory.values().toArray();
  };

  public query ({ caller }) func getInventoryItem(itemCode : Text) : async ?InventoryItem {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view inventory items");
    };
    inventory.get(itemCode);
  };

  // Service Management
  // Adding service records requires at least user-level access
  public shared ({ caller }) func addServiceRecord(record : ServiceRecord) : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can add service records");
    };
    let id = nextServiceId;
    let newRecord = { record with id };
    services.add(id, newRecord);
    nextServiceId += 1;
    id;
  };

  // Updating service status requires at least user-level access
  public shared ({ caller }) func updateServiceStatus(id : Nat, status : Status, repairAction : ?Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can update service records");
    };
    switch (services.get(id)) {
      case (null) { Runtime.trap("Service record not found") };
      case (?record) {
        let updatedRecord = { record with status; repairAction };
        services.add(id, updatedRecord);
      };
    };
  };

  // Deleting service records is an admin-only operation
  public shared ({ caller }) func deleteServiceRecord(id : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can delete service records");
    };
    services.remove(id);
  };

  // Reading service records requires at least user-level access
  public query ({ caller }) func getAllServiceRecords() : async [ServiceRecord] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view service records");
    };
    services.values().toArray();
  };

  public query ({ caller }) func getServiceQueue() : async [ServiceRecord] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view the service queue");
    };
    services.values().toArray().filter(func(r) { r.status == #masuk });
  };

  public query ({ caller }) func getServiceRecord(id : Nat) : async ?ServiceRecord {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view service records");
    };
    services.get(id);
  };

  // Customer Management
  // Upserting customer records requires at least user-level access
  public shared ({ caller }) func upsertCustomerRecord(record : CustomerRecord) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can add or update customer records");
    };
    customers.add(record.phone, record);
  };

  // Deleting customer records is an admin-only operation
  public shared ({ caller }) func deleteCustomerRecord(phone : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can delete customer records");
    };
    customers.remove(phone);
  };

  // Reading customer records requires at least user-level access
  public query ({ caller }) func getAllCustomers() : async [CustomerRecord] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view customer records");
    };
    customers.values().toArray();
  };

  public query ({ caller }) func findCustomersByName(searchTerm : Text) : async [CustomerRecord] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can search customer records");
    };
    customers.values().toArray().filter(func(c) { c.name.toLower().contains(#text(searchTerm.toLower())) });
  };

  public query ({ caller }) func getCustomerRecord(phone : Text) : async ?CustomerRecord {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view customer records");
    };
    customers.get(phone);
  };

  // Transaction Management
  // Adding transactions requires at least user-level access
  public shared ({ caller }) func addTransaction(transaction : Transaction) : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can add transactions");
    };
    let id = nextTransactionId;
    let newTransaction = { transaction with id };
    transactions.add(id, newTransaction);
    nextTransactionId += 1;

    // Only reduce stock for barang (goods) items
    for (item in transaction.items.values()) {
      switch (inventory.get(item.itemCode)) {
        case (null) { Runtime.trap("Item not found in inventory: " # item.itemCode) };
        case (?invItem) {
          switch (invItem.type_) {
            case (#barang) {
              // Only reduce stock if qty is provided and non-zero
              switch (invItem.quantity) {
                case (null) { Runtime.trap("Item quantity must be specified for goods: " # item.itemCode) };
                case (?qty) {
                  if (qty == 0) { Runtime.trap("Cannot sell zero quantity of goods: " # item.itemCode) };
                  let newStock = switch (invItem.stock) {
                    case (null) { Runtime.trap("Stock count must be specified for goods: " # item.itemCode) };
                    case (?stock) {
                      if (stock < item.quantity) { Runtime.trap("Not enough stock for item: " # item.itemCode) } else {
                        stock - item.quantity;
                      };
                    };
                  };
                  inventory.add(item.itemCode, { invItem with stock = ?newStock });
                };
              };
            };
            case (#jasa) {};
          };
        };
      };
    };
    id;
  };

  // Deleting transactions is an admin-only operation
  public shared ({ caller }) func deleteTransaction(id : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can delete transactions");
    };
    transactions.remove(id);
  };

  // Reading transactions requires at least user-level access
  public query ({ caller }) func getAllTransactions() : async [Transaction] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view transactions");
    };
    transactions.values().toArray();
  };

  public query ({ caller }) func getTransaction(id : Nat) : async ?Transaction {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view transactions");
    };
    transactions.get(id);
  };

  // Reports - requires at least user-level access
  public query ({ caller }) func getProfitLossReport(startDate : Nat, endDate : Nat) : async {
    totalRevenue : Nat;
    totalCostOfGoodsSold : Nat;
    grossProfit : Nat;
    itemizedSales : [(Text, Nat)];
  } {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view reports");
    };
    let filteredTransactions = transactions.values().toArray();

    let totalRevenue = filteredTransactions.foldLeft(
      0,
      func(acc, t) { acc + t.totalAmount }
    );

    let totalCostOfGoodsSold = filteredTransactions.foldLeft(
      0,
      func(acc, t) {
        acc + t.items.foldLeft(
          0,
          func(itemAcc, item) { itemAcc + (item.quantity * item.buyPrice) },
        );
      },
    );

    let itemizedSales = inventory.toArray().map(
      func((itemCode, _)) {
        let totalSold = filteredTransactions.foldLeft(
          0,
          func(acc, t) {
            acc + t.items.foldLeft(
              0,
              func(itemAcc, item) {
                itemAcc + (if (item.itemCode == itemCode) { item.quantity } else { 0 });
              },
            );
          },
        );
        (itemCode, totalSold);
      }
    );

    {
      totalRevenue;
      totalCostOfGoodsSold;
      grossProfit = totalRevenue - totalCostOfGoodsSold;
      itemizedSales;
    };
  };
};
