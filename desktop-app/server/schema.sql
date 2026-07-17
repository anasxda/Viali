PRAGMA foreign_keys = ON;

DROP TABLE IF EXISTS tblAuditLog;
DROP TABLE IF EXISTS tblAlertLog;
DROP TABLE IF EXISTS tblStockMovement;
DROP TABLE IF EXISTS tblStockBatch;
DROP TABLE IF EXISTS tblItemMaster;
DROP TABLE IF EXISTS tblSupplier;
DROP TABLE IF EXISTS tblMovementType;
DROP TABLE IF EXISTS tblManufacturer;
DROP TABLE IF EXISTS tblHazardClass;
DROP TABLE IF EXISTS tblLocation;
DROP TABLE IF EXISTS tblUnit;
DROP TABLE IF EXISTS tblCategory;
DROP TABLE IF EXISTS tblUser;
DROP TABLE IF EXISTS tblRole;

CREATE TABLE tblRole (
    RoleID INTEGER PRIMARY KEY,
    RoleName TEXT NOT NULL UNIQUE
);

CREATE TABLE tblUser (
    UserID INTEGER PRIMARY KEY,
    WindowsUsername TEXT,
    FullName TEXT NOT NULL,
    RoleID INTEGER REFERENCES tblRole(RoleID),
    Email TEXT,
    IsActive INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE tblCategory (
    CategoryID INTEGER PRIMARY KEY,
    CategoryName TEXT NOT NULL
);

CREATE TABLE tblUnit (
    UnitID INTEGER PRIMARY KEY,
    UnitName TEXT NOT NULL
);

CREATE TABLE tblLocation (
    LocationID INTEGER PRIMARY KEY,
    LocationCode TEXT NOT NULL
);

CREATE TABLE tblHazardClass (
    HazardID INTEGER PRIMARY KEY,
    HazardName TEXT NOT NULL,
    HazardDescription TEXT
);

CREATE TABLE tblManufacturer (
    ManufacturerID INTEGER PRIMARY KEY,
    ManufacturerName TEXT NOT NULL
);

CREATE TABLE tblMovementType (
    MovementTypeID INTEGER PRIMARY KEY,
    MovementTypeName TEXT NOT NULL UNIQUE,
    StockEffect INTEGER NOT NULL
);

CREATE TABLE tblSupplier (
    SupplierID INTEGER PRIMARY KEY,
    SupplierName TEXT NOT NULL,
    ContactPerson TEXT,
    Email TEXT,
    Phone TEXT,
    Address TEXT,
    IsActive INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE tblItemMaster (
    ItemID INTEGER PRIMARY KEY,
    LegacyItemCode TEXT,
    ItemDescription TEXT NOT NULL,
    CategoryID INTEGER REFERENCES tblCategory(CategoryID),
    UnitID INTEGER REFERENCES tblUnit(UnitID),
    LocationID INTEGER REFERENCES tblLocation(LocationID),
    HazardID INTEGER REFERENCES tblHazardClass(HazardID),
    PhysicalState TEXT,
    MinStockLevel REAL,
    ReorderPoint REAL,
    MaxStockLevel REAL,
    UnitCost REAL,
    CASNumber TEXT,
    IsActive INTEGER NOT NULL DEFAULT 1,
    DateCreated TEXT,
    CreatedByUserID INTEGER REFERENCES tblUser(UserID),
    DateModified TEXT,
    ModifiedByUserID INTEGER REFERENCES tblUser(UserID),
    BarcodeValue TEXT,
    ManufacturerID INTEGER REFERENCES tblManufacturer(ManufacturerID)
);

CREATE TABLE tblStockBatch (
    BatchID INTEGER PRIMARY KEY,
    ItemID INTEGER NOT NULL REFERENCES tblItemMaster(ItemID),
    BatchNumber TEXT,
    CertificateNumber TEXT,
    ExpiryDate TEXT,
    QuantityReceived REAL NOT NULL,
    QuantityRemaining REAL NOT NULL,
    ReceivedDate TEXT,
    SupplierID INTEGER REFERENCES tblSupplier(SupplierID),
    ReceivedByUserID INTEGER REFERENCES tblUser(UserID),
    Remarks TEXT,
    IsActive INTEGER NOT NULL DEFAULT 1,
    LocationID INTEGER REFERENCES tblLocation(LocationID)
);

CREATE TABLE tblStockMovement (
    MovementID INTEGER PRIMARY KEY,
    BatchID INTEGER NOT NULL REFERENCES tblStockBatch(BatchID),
    MovementTypeID INTEGER NOT NULL REFERENCES tblMovementType(MovementTypeID),
    Quantity REAL NOT NULL,
    MovementDate TEXT NOT NULL,
    PerformedByUserID INTEGER REFERENCES tblUser(UserID),
    Purpose TEXT,
    Remarks TEXT,
    RelatedMovementID INTEGER
);

CREATE TABLE tblAlertLog (
    AlertID INTEGER PRIMARY KEY,
    AlertType TEXT NOT NULL,
    ItemID INTEGER REFERENCES tblItemMaster(ItemID),
    BatchID INTEGER REFERENCES tblStockBatch(BatchID),
    AlertDate TEXT NOT NULL,
    IsResolved INTEGER NOT NULL DEFAULT 0,
    Remarks TEXT
);

CREATE TABLE tblAuditLog (
    AuditID INTEGER PRIMARY KEY,
    TableName TEXT NOT NULL,
    RecordID INTEGER,
    ActionType TEXT NOT NULL,
    FieldName TEXT,
    OldValue TEXT,
    NewValue TEXT,
    ChangedByUserID INTEGER REFERENCES tblUser(UserID),
    ChangedDate TEXT NOT NULL
);

-- Small generic key/value store for single-value app settings (e.g. the
-- supervisor notification email, the last monthly inventory check date) -
-- avoids a dedicated table per setting.
CREATE TABLE tblAppSettings (
    SettingKey TEXT PRIMARY KEY,
    SettingValue TEXT
);

CREATE INDEX idx_batch_item ON tblStockBatch(ItemID);
CREATE INDEX idx_movement_batch ON tblStockMovement(BatchID);
CREATE INDEX idx_alert_type_resolved ON tblAlertLog(AlertType, IsResolved);
CREATE INDEX idx_audit_table_record ON tblAuditLog(TableName, RecordID);
CREATE INDEX idx_item_active ON tblItemMaster(IsActive);
