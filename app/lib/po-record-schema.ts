import * as XLSX from "xlsx";

export type POColumnGroup =
  | "document"
  | "material"
  | "quantity"
  | "dates"
  | "org"
  | "status";

export interface PORecordFields {
  plant: string;
  po: string;
  item: string;
  category: string;
  material: string;
  shortText: string;
  createDate: string;
  quantity: string;
  unit: string;
  unit2: string;
  taxCode: string;
  netPrice: string;
  currency: string;
  poPriceUnit: string;
  priceUnit: string;
  deliveryDate: string;
  deliveryQuantity: string;
  deliveryCompleted: string;
  purchaseGroup: string;
  purchaseOrg: string;
  poType: string;
  supplyingIssuing: string;
  vendor: string;
  createPerson: string;
  deleteFlag: string;
  refuse: string;
  purchaseRequisition: string;
  location: string;
  deliveryCompleted2: string;
  status: string;
  reschedulingDate: string;
  cancelProcess: string;
}

export interface PORecordItem extends PORecordFields {
  id: string;
  apiIndex?: string;
  isStatus?: string;
  statusReceivingName?: string;
  statusReceivingCode?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type POColumnKey = keyof PORecordFields;

export interface POColumnDef {
  index: number;
  key: POColumnKey;
  excelHeader: string;
  formLabel: string;
  group: POColumnGroup;
  inputType: "text" | "number" | "date";
  align?: "left" | "right";
  mono?: boolean;
  minWidth: number;
  placeholder?: string;
}

export const PO_COLUMN_GROUPS: Array<{
  key: POColumnGroup;
  label: string;
}> = [
  { key: "document", label: "เอกสารและข้อมูลหลัก" },
  { key: "material", label: "รหัสสินค้าและรายละเอียด" },
  { key: "quantity", label: "จำนวน ราคา และหน่วย" },
  { key: "dates", label: "วันที่" },
  { key: "org", label: "จัดซื้อและผู้ขาย" },
  { key: "status", label: "สถานะและเงื่อนไข" },
];

/**
 * Exact 32 columns in exact order from `app/data/PO Create 20250605.XLSX`.
 */
export const PO_RECORD_COLUMNS: POColumnDef[] = [
  {
    index: 0,
    key: "plant",
    excelHeader: "Plant",
    formLabel: "Plant",
    group: "document",
    inputType: "text",
    minWidth: 82,
    placeholder: "เช่น 9771",
  },
  {
    index: 1,
    key: "po",
    excelHeader: "PO",
    formLabel: "PO",
    group: "document",
    inputType: "text",
    mono: true,
    minWidth: 122,
    placeholder: "เช่น 4501354648",
  },
  {
    index: 2,
    key: "item",
    excelHeader: "Item",
    formLabel: "Item",
    group: "document",
    inputType: "text",
    minWidth: 74,
    placeholder: "เช่น 10",
  },
  {
    index: 3,
    key: "category",
    excelHeader: "Category",
    formLabel: "Category",
    group: "document",
    inputType: "text",
    minWidth: 120,
    placeholder: "เช่น Standard",
  },
  {
    index: 4,
    key: "material",
    excelHeader: "Material",
    formLabel: "Material",
    group: "material",
    inputType: "text",
    mono: true,
    minWidth: 142,
    placeholder: "เช่น 1816601011N",
  },
  {
    index: 5,
    key: "shortText",
    excelHeader: "Short text",
    formLabel: "Short text",
    group: "material",
    inputType: "text",
    minWidth: 240,
    placeholder: "รายละเอียดสินค้า",
  },
  {
    index: 6,
    key: "createDate",
    excelHeader: "Create Date",
    formLabel: "Create Date",
    group: "dates",
    inputType: "date",
    minWidth: 120,
  },
  {
    index: 7,
    key: "quantity",
    excelHeader: "Quantity",
    formLabel: "Quantity",
    group: "quantity",
    inputType: "number",
    align: "right",
    minWidth: 102,
    placeholder: "เช่น 2.142",
  },
  {
    index: 8,
    key: "unit",
    excelHeader: "Unit",
    formLabel: "Unit (คอลัมน์ 9)",
    group: "quantity",
    inputType: "text",
    minWidth: 78,
    placeholder: "เช่น KG",
  },
  {
    index: 9,
    key: "unit2",
    excelHeader: "Unit",
    formLabel: "Unit (คอลัมน์ 10)",
    group: "quantity",
    inputType: "text",
    minWidth: 78,
    placeholder: "เช่น KG",
  },
  {
    index: 10,
    key: "taxCode",
    excelHeader: "Tax code",
    formLabel: "Tax code",
    group: "quantity",
    inputType: "text",
    minWidth: 94,
    placeholder: "เช่น V7",
  },
  {
    index: 11,
    key: "netPrice",
    excelHeader: "Net price",
    formLabel: "Net price",
    group: "quantity",
    inputType: "number",
    align: "right",
    minWidth: 104,
    placeholder: "เช่น 66.00",
  },
  {
    index: 12,
    key: "currency",
    excelHeader: "Currency",
    formLabel: "Currency",
    group: "quantity",
    inputType: "text",
    minWidth: 94,
    placeholder: "เช่น THB",
  },
  {
    index: 13,
    key: "poPriceUnit",
    excelHeader: "Po price unit",
    formLabel: "Po price unit",
    group: "quantity",
    inputType: "number",
    align: "right",
    minWidth: 116,
    placeholder: "เช่น 1",
  },
  {
    index: 14,
    key: "priceUnit",
    excelHeader: "Price unit",
    formLabel: "Price unit",
    group: "quantity",
    inputType: "text",
    minWidth: 96,
    placeholder: "เช่น KG",
  },
  {
    index: 15,
    key: "deliveryDate",
    excelHeader: "Delivery Date",
    formLabel: "Delivery Date",
    group: "dates",
    inputType: "date",
    minWidth: 126,
  },
  {
    index: 16,
    key: "deliveryQuantity",
    excelHeader: "Delivery Quantity",
    formLabel: "Delivery Quantity",
    group: "quantity",
    inputType: "number",
    align: "right",
    minWidth: 142,
    placeholder: "เช่น 0.000",
  },
  {
    index: 17,
    key: "deliveryCompleted",
    excelHeader: "Delivery Completed",
    formLabel: "Delivery Completed (คอลัมน์ 18)",
    group: "status",
    inputType: "text",
    minWidth: 158,
    placeholder: "เช่น X",
  },
  {
    index: 18,
    key: "purchaseGroup",
    excelHeader: "Purchase Group",
    formLabel: "Purchase Group",
    group: "org",
    inputType: "text",
    minWidth: 130,
    placeholder: "เช่น 557",
  },
  {
    index: 19,
    key: "purchaseOrg",
    excelHeader: "Purchase Org.",
    formLabel: "Purchase Org.",
    group: "org",
    inputType: "text",
    minWidth: 124,
    placeholder: "เช่น 9770",
  },
  {
    index: 20,
    key: "poType",
    excelHeader: "PO Type",
    formLabel: "PO Type",
    group: "document",
    inputType: "text",
    minWidth: 94,
    placeholder: "เช่น ZT02",
  },
  {
    index: 21,
    key: "supplyingIssuing",
    excelHeader: "Supplying (Issuing)",
    formLabel: "Supplying (Issuing)",
    group: "org",
    inputType: "text",
    minWidth: 156,
  },
  {
    index: 22,
    key: "vendor",
    excelHeader: "Vendor",
    formLabel: "Vendor",
    group: "org",
    inputType: "text",
    mono: true,
    minWidth: 124,
    placeholder: "เช่น B000061588",
  },
  {
    index: 23,
    key: "createPerson",
    excelHeader: "Create Person",
    formLabel: "Create Person",
    group: "document",
    inputType: "text",
    minWidth: 132,
    placeholder: "เช่น BGD9770JOB",
  },
  {
    index: 24,
    key: "deleteFlag",
    excelHeader: "Delete Flag",
    formLabel: "Delete Flag",
    group: "status",
    inputType: "text",
    minWidth: 106,
  },
  {
    index: 25,
    key: "refuse",
    excelHeader: "Refuse",
    formLabel: "Refuse",
    group: "status",
    inputType: "text",
    minWidth: 88,
  },
  {
    index: 26,
    key: "purchaseRequisition",
    excelHeader: "Purchase Requisition",
    formLabel: "Purchase Requisition",
    group: "document",
    inputType: "text",
    mono: true,
    minWidth: 162,
    placeholder: "เช่น 0104353291",
  },
  {
    index: 27,
    key: "location",
    excelHeader: "Location",
    formLabel: "Location",
    group: "org",
    inputType: "text",
    minWidth: 98,
  },
  {
    index: 28,
    key: "deliveryCompleted2",
    excelHeader: "Delivery Completed",
    formLabel: "Delivery Completed (คอลัมน์ 29)",
    group: "status",
    inputType: "text",
    minWidth: 158,
  },
  {
    index: 29,
    key: "status",
    excelHeader: "Status",
    formLabel: "Status",
    group: "status",
    inputType: "text",
    minWidth: 130,
    placeholder: "เช่น B",
  },
  {
    index: 30,
    key: "reschedulingDate",
    excelHeader: "Rescheduling Date",
    formLabel: "Rescheduling Date",
    group: "dates",
    inputType: "date",
    minWidth: 148,
  },
  {
    index: 31,
    key: "cancelProcess",
    excelHeader: "Cancel Process",
    formLabel: "Cancel Process",
    group: "status",
    inputType: "text",
    minWidth: 128,
  },
];

export function createEmptyPORecordFields(defaultCreateDate = ""): PORecordFields {
  return {
    plant: "",
    po: "",
    item: "",
    category: "",
    material: "",
    shortText: "",
    createDate: defaultCreateDate,
    quantity: "",
    unit: "",
    unit2: "",
    taxCode: "",
    netPrice: "",
    currency: "",
    poPriceUnit: "",
    priceUnit: "",
    deliveryDate: "",
    deliveryQuantity: "",
    deliveryCompleted: "",
    purchaseGroup: "",
    purchaseOrg: "",
    poType: "",
    supplyingIssuing: "",
    vendor: "",
    createPerson: "",
    deleteFlag: "",
    refuse: "",
    purchaseRequisition: "",
    location: "",
    deliveryCompleted2: "",
    status: "",
    reschedulingDate: "",
    cancelProcess: "",
  };
}

export const SAMPLE_EXCEL_RECORD: PORecordFields = {
  plant: "9771",
  po: "4501354648",
  item: "10",
  category: "Standard",
  material: "1816601011N",
  shortText: "PACKING BAGS/7.5X10X0.07_PPA_10DD",
  createDate: "2025-06-05",
  quantity: "2.142",
  unit: "KG",
  unit2: "KG",
  taxCode: "V7",
  netPrice: "66.00",
  currency: "",
  poPriceUnit: "1",
  priceUnit: "KG",
  deliveryDate: "2025-06-12",
  deliveryQuantity: "0.000",
  deliveryCompleted: "",
  purchaseGroup: "557",
  purchaseOrg: "9770",
  poType: "ZT02",
  supplyingIssuing: "",
  vendor: "B000061588",
  createPerson: "BGD9770JOB",
  deleteFlag: "",
  refuse: "",
  purchaseRequisition: "0104353291",
  location: "",
  deliveryCompleted2: "",
  status: "B",
  reschedulingDate: "",
  cancelProcess: "",
};

const pad2 = (n: number) => String(n).padStart(2, "0");

export function normalizeExcelDate(value: unknown): string {
  if (value === null || value === undefined || value === "") return "";

  if (typeof value === "number" && Number.isFinite(value)) {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed && parsed.y && parsed.m && parsed.d) {
      return `${parsed.y}-${pad2(parsed.m)}-${pad2(parsed.d)}`;
    }
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return `${value.getUTCFullYear()}-${pad2(value.getUTCMonth() + 1)}-${pad2(value.getUTCDate())}`;
  }

  const raw = String(value).trim();
  if (!raw) return "";

  const isoMatch = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) {
    return `${isoMatch[1]}-${pad2(Number(isoMatch[2]))}-${pad2(Number(isoMatch[3]))}`;
  }

  const slashMatch = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (slashMatch) {
    const month = Number(slashMatch[1]);
    const day = Number(slashMatch[2]);
    let year = Number(slashMatch[3]);
    if (year < 100) year += 2000;
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${year}-${pad2(month)}-${pad2(day)}`;
    }
  }

  return raw;
}

function readCellText(cell: XLSX.CellObject | undefined, col: POColumnDef): string {
  if (!cell || cell.t === "z") return "";

  if (col.inputType === "date") {
    if (cell.t === "n" || cell.t === "d") {
      return normalizeExcelDate(cell.v);
    }
    return normalizeExcelDate(cell.w ?? cell.v);
  }

  if (cell.w !== undefined && cell.w !== null && String(cell.w).trim() !== "") {
    return String(cell.w).trim();
  }

  if (cell.v === undefined || cell.v === null) return "";
  return String(cell.v).trim();
}

export function isSubstantivePORow(fields: PORecordFields): boolean {
  return Boolean(
    fields.plant ||
      fields.po ||
      fields.item ||
      fields.material ||
      fields.shortText ||
      fields.vendor ||
      fields.purchaseRequisition
  );
}

export function resolveColumnMapping(headerRow: string[]): Array<POColumnDef | null> {
  const usedKeys = new Set<POColumnKey>();

  return headerRow.map((rawHeader, colIdx) => {
    const normalized = String(rawHeader ?? "").trim().toLowerCase();
    if (!normalized) return null;

    const direct = PO_RECORD_COLUMNS[colIdx];
    if (
      direct &&
      direct.excelHeader.toLowerCase() === normalized &&
      !usedKeys.has(direct.key)
    ) {
      usedKeys.add(direct.key);
      return direct;
    }

    const match = PO_RECORD_COLUMNS.find(
      (col) =>
        col.excelHeader.toLowerCase() === normalized && !usedKeys.has(col.key)
    );
    if (match) {
      usedKeys.add(match.key);
      return match;
    }

    return null;
  });
}

export interface ParsedWorkbookResult {
  records: PORecordItem[];
  skippedEmptyRows: number;
  detectedHeaders: string[];
}

export function parseWorkbookToRecords(
  wb: XLSX.WorkBook,
  idPrefix = "excel"
): ParsedWorkbookResult {
  const sheetName = wb.SheetNames[0];
  if (!sheetName) {
    return { records: [], skippedEmptyRows: 0, detectedHeaders: [] };
  }

  const ws = wb.Sheets[sheetName];
  const ref = ws["!ref"];
  if (!ref) {
    return { records: [], skippedEmptyRows: 0, detectedHeaders: [] };
  }

  const range = XLSX.utils.decode_range(ref);
  const headerRow: string[] = [];
  for (let c = range.s.c; c <= range.e.c; c++) {
    const cell = ws[XLSX.utils.encode_cell({ r: range.s.r, c })] as
      | XLSX.CellObject
      | undefined;
    headerRow.push(cell?.v !== undefined ? String(cell.v).trim() : "");
  }

  const mappedCols = resolveColumnMapping(headerRow);
  const records: PORecordItem[] = [];
  let skippedEmptyRows = 0;

  for (let r = range.s.r + 1; r <= range.e.r; r++) {
    const fields = createEmptyPORecordFields();
    let hasAnyValue = false;

    for (let c = range.s.c; c <= range.e.c; c++) {
      const colDef = mappedCols[c - range.s.c];
      if (!colDef) continue;
      const cell = ws[XLSX.utils.encode_cell({ r, c })] as
        | XLSX.CellObject
        | undefined;
      const text = readCellText(cell, colDef);
      if (text !== "") {
        hasAnyValue = true;
        fields[colDef.key] = text;
      }
    }

    if (!hasAnyValue) {
      continue;
    }

    if (!isSubstantivePORow(fields)) {
      skippedEmptyRows += 1;
      continue;
    }

    records.push({
      id: `${idPrefix}-${r}-${fields.po || "row"}-${fields.item || "0"}`,
      ...fields,
    });
  }

  return {
    records,
    skippedEmptyRows,
    detectedHeaders: headerRow.filter(Boolean),
  };
}

export function buildWorkbookFromRecords(
  records: PORecordFields[],
  sheetName = "PO Record"
): XLSX.WorkBook {
  const headers = PO_RECORD_COLUMNS.map((col) => col.excelHeader);

  const rows = records.map((rec) =>
    PO_RECORD_COLUMNS.map((col) => {
      const raw = rec[col.key] ?? "";
      if (col.inputType === "number" && raw !== "") {
        const num = Number(raw.replace(/,/g, ""));
        if (Number.isFinite(num)) return num;
      }
      return raw;
    })
  );

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  ws["!cols"] = PO_RECORD_COLUMNS.map((col) => ({
    wch: Math.max(col.excelHeader.length + 3, Math.round(col.minWidth / 8)),
  }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  return wb;
}

function pickFieldValue(
  raw: Record<string, unknown>,
  candidates: string[]
): string {
  for (const key of candidates) {
    const val = raw[key];
    if (val !== undefined && val !== null && String(val).trim() !== "") {
      return String(val).trim();
    }
  }
  return "";
}

const API_FIELD_CANDIDATES: Record<POColumnKey, string[]> = {
  plant: ["plant", "Plant"],
  po: ["po", "PO", "poNo"],
  item: ["item", "Item"],
  category: ["category", "Category"],
  material: ["material", "Material"],
  shortText: ["shortText", "short_text", "Short text", "shorttext"],
  createDate: ["createDate", "create_date", "Create Date"],
  quantity: ["quantity", "qty", "Quantity"],
  unit: ["unit", "Unit", "orderUnit"],
  unit2: ["unit2", "baseUnit", "Unit2"],
  taxCode: ["taxCode", "tax_code", "Tax code"],
  netPrice: ["netPrice", "net_price", "Net price"],
  currency: ["currency", "Currency"],
  poPriceUnit: ["poPriceUnit", "po_price_unit", "Po price unit"],
  priceUnit: ["priceUnit", "price_unit", "Price unit"],
  deliveryDate: ["deliveryDate", "delivery_date", "Delivery Date"],
  deliveryQuantity: [
    "deliveryQuantity",
    "delivery_quantity",
    "Delivery Quantity",
  ],
  deliveryCompleted: ["deliveryCompleted", "delivery_completed", "Delivery Completed"],
  purchaseGroup: ["purchaseGroup", "purchase_group", "Purchase Group"],
  purchaseOrg: ["purchaseOrg", "purchase_org", "Purchase Org."],
  poType: ["poType", "po_type", "PO Type"],
  supplyingIssuing: [
    "supplyingIssuing",
    "supplying_issuing",
    "Supplying (Issuing)",
  ],
  vendor: ["vendor", "Vendor"],
  createPerson: ["createPerson", "create_person", "Create Person"],
  deleteFlag: ["deleteFlag", "delete_flag", "Delete Flag"],
  refuse: ["refuse", "Refuse"],
  purchaseRequisition: [
    "purchaseRequisition",
    "purchase_requisition",
    "Purchase Requisition",
  ],
  location: ["location", "Location"],
  deliveryCompleted2: ["deliveryCompleted2", "Delivery Completed 2"],
  status: ["status", "Status", "statusReceivingName", "isStatus"],
  reschedulingDate: [
    "reschedulingDate",
    "rescheduling_date",
    "Rescheduling Date",
  ],
  cancelProcess: ["cancelProcess", "cancel_process", "Cancel Process"],
};

export function mapPoCheckRowToRecord(
  raw: Record<string, unknown>,
  rowIndex: number
): PORecordItem {
  const fields = createEmptyPORecordFields();

  for (const col of PO_RECORD_COLUMNS) {
    const val = pickFieldValue(raw, API_FIELD_CANDIDATES[col.key]);
    fields[col.key] =
      col.inputType === "date" && val ? normalizeExcelDate(val) : val;
  }

  const apiIndex = pickFieldValue(raw, ["index"]);
  const isStatus = pickFieldValue(raw, ["isStatus"]);
  const statusReceivingName = pickFieldValue(raw, ["statusReceivingName"]);
  const statusReceivingCode = pickFieldValue(raw, ["statusReceivingCode"]);

  return {
    id: `pocheck-${rowIndex}-${apiIndex || fields.po || "row"}`,
    ...fields,
    apiIndex: apiIndex || undefined,
    isStatus: isStatus || undefined,
    statusReceivingName: statusReceivingName || undefined,
    statusReceivingCode: statusReceivingCode || undefined,
  };
}

export function mapPoCheckResponseToRecords(data: unknown): PORecordItem[] {
  if (!Array.isArray(data)) return [];
  return data
    .filter(
      (item): item is Record<string, unknown> =>
        typeof item === "object" && item !== null
    )
    .map((item, idx) => mapPoCheckRowToRecord(item, idx));
}
