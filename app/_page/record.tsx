"use client";

import React, { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { Icon } from "../components/dashboard/icons";
import { LoadingSpinner } from "../components/dashboard/loading-spinner";
import { Sidebar } from "../components/dashboard/sidebar";
import { RecordFormModal, RecordModalMode } from "../components/record/record-form-modal";
import { RecordIcon } from "../components/record/record-icons";
import { RecordTable } from "../components/record/record-table";
import {
  PO_COLUMN_GROUPS,
  PO_RECORD_COLUMNS,
  POColumnGroup,
  POColumnKey,
  PORecordFields,
  PORecordItem,
  buildWorkbookFromRecords,
  mapPoCheckResponseToRecords,
  parseWorkbookToRecords,
} from "../lib/po-record-schema";

type NoticeState = {
  type: "success" | "error" | "info";
  text: string;
};

type ColumnFilterMode = "populated" | "all" | POColumnGroup;

export default function RecordView() {
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [records, setRecords] = useState<PORecordItem[]>([]);
  const [dataSource, setDataSource] = useState<"api" | "imported">("api");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<NoticeState | null>(null);

  // API Sync dates (matching Dashboard /api/PoCheck)
  const [syncFrom, setSyncFrom] = useState(today);
  const [syncTo, setSyncTo] = useState(today);
  const [appliedSync, setAppliedSync] = useState({ dateFrom: today, dateTo: today });

  // Client filters
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [plantFilter, setPlantFilter] = useState("");
  const [poTypeFilter, setPoTypeFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [rescheduleFilter, setRescheduleFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [filterEpoch, setFilterEpoch] = useState(0);

  // Column visibility: default to showing only populated columns (no blank columns!)
  const [activeGroup, setActiveGroup] = useState<ColumnFilterMode>("populated");
  const [hiddenCols, setHiddenCols] = useState<Set<POColumnKey>>(() => new Set());
  const [showColumnMenu, setShowColumnMenu] = useState(false);

  // Modal state
  const [modalState, setModalState] = useState<{
    mode: RecordModalMode;
    record: PORecordItem | null;
  } | null>(null);

  // Pending Excel import preview
  const [pendingImport, setPendingImport] = useState<{
    fileName: string;
    records: PORecordItem[];
    skippedEmptyRows: number;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const resetScrollAndPage = () => {
    setPage(1);
    setFilterEpoch((e) => e + 1);
  };

  useEffect(() => {
    let active = true;
    const fetchFromPoCheck = async () => {
      try {
        const params = new URLSearchParams();
        if (appliedSync.dateFrom) params.append("startDate", appliedSync.dateFrom);
        if (appliedSync.dateTo) params.append("endDate", appliedSync.dateTo);
        const res = await fetch(`/api/PoCheck?${params.toString()}`, {
          cache: "no-store",
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data?.error || "ไม่สามารถดึงข้อมูลจาก /api/PoCheck ได้");
        }
        if (!active) return;
        setRecords(mapPoCheckResponseToRecords(data));
        setDataSource("api");
      } catch (err) {
        if (!active) return;
        setRecords([]);
        setNotice({
          type: "error",
          text:
            err instanceof Error
              ? err.message
              : "เกิดข้อผิดพลาดในการเชื่อมต่อ /api/PoCheck",
        });
      } finally {
        if (active) setLoading(false);
      }
    };
    void fetchFromPoCheck();
    return () => {
      active = false;
    };
  }, [appliedSync]);

  const handleSync = () => {
    setLoading(true);
    resetScrollAndPage();
    setAppliedSync({ dateFrom: syncFrom, dateTo: syncTo });
  };

  // Distinct dropdown options
  const plantOptions = useMemo(
    () =>
      Array.from(new Set(records.map((r) => r.plant).filter(Boolean))).sort(),
    [records]
  );
  const poTypeOptions = useMemo(
    () =>
      Array.from(new Set(records.map((r) => r.poType).filter(Boolean))).sort(),
    [records]
  );
  const categoryOptions = useMemo(
    () =>
      Array.from(new Set(records.map((r) => r.category).filter(Boolean))).sort(),
    [records]
  );
  const statusOptions = useMemo(
    () =>
      Array.from(new Set(records.map((r) => r.status).filter(Boolean))).sort(),
    [records]
  );
  const rescheduleOptions = useMemo(
    () =>
      Array.from(
        new Set(records.map((r) => r.reschedulingDate).filter(Boolean))
      ).sort(),
    [records]
  );

  // Filtered rows
  const filteredRecords = useMemo(() => {
    const q = deferredSearch.trim().toLowerCase();
    return records.filter((r) => {
      if (plantFilter && r.plant !== plantFilter) return false;
      if (poTypeFilter && r.poType !== poTypeFilter) return false;
      if (categoryFilter && r.category !== categoryFilter) return false;
      if (statusFilter && r.status !== statusFilter) return false;
      if (rescheduleFilter && r.reschedulingDate !== rescheduleFilter) return false;
      if (dateFrom && (!r.createDate || r.createDate < dateFrom)) return false;
      if (dateTo && (!r.createDate || r.createDate > dateTo)) return false;

      if (!q) return true;
      return (
        PO_RECORD_COLUMNS.some((col) =>
          (r[col.key] ?? "").toLowerCase().includes(q)
        ) ||
        (r.apiIndex ?? "").toLowerCase().includes(q) ||
        (r.statusReceivingCode ?? "").toLowerCase().includes(q)
      );
    });
  }, [
    records,
    deferredSearch,
    plantFilter,
    poTypeFilter,
    categoryFilter,
    statusFilter,
    rescheduleFilter,
    dateFrom,
    dateTo,
  ]);

  // Columns that actually have non-empty values in current dataset
  const populatedColumnKeys = useMemo(() => {
    const set = new Set<POColumnKey>();
    for (const col of PO_RECORD_COLUMNS) {
      if (records.some((r) => Boolean((r[col.key] ?? "").trim()))) {
        set.add(col.key);
      }
    }
    return set;
  }, [records]);

  // Visible columns based on selected mode & manual checkboxes
  const visibleColumns = useMemo(() => {
    return PO_RECORD_COLUMNS.filter((col) => {
      if (hiddenCols.has(col.key)) return false;
      if (activeGroup === "populated") {
        // Fallback to core columns if records is empty before load
        if (populatedColumnKeys.size === 0) {
          return (
            col.key === "plant" ||
            col.key === "po" ||
            col.key === "item" ||
            col.key === "category" ||
            col.key === "material" ||
            col.key === "createDate" ||
            col.key === "poType" ||
            col.key === "status" ||
            col.key === "reschedulingDate"
          );
        }
        return populatedColumnKeys.has(col.key);
      }
      if (activeGroup !== "all" && col.group !== activeGroup) return false;
      return true;
    });
  }, [activeGroup, hiddenCols, populatedColumnKeys]);

  // KPI summary
  const summary = useMemo(() => {
    const uniquePOs = new Set(filteredRecords.map((r) => r.po).filter(Boolean)).size;
    const uniqueMaterials = new Set(
      filteredRecords.map((r) => r.material).filter(Boolean)
    ).size;
    const uniquePlants = new Set(
      filteredRecords.map((r) => r.plant).filter(Boolean)
    ).size;
    return { uniquePOs, uniqueMaterials, uniquePlants };
  }, [filteredRecords]);

  const handleSaveRecord = async (
    fields: PORecordFields,
    existingId?: string
  ) => {
    setSaving(true);
    try {
      const now = new Date().toISOString();
      if (existingId) {
        setRecords((prev) =>
          prev.map((item) =>
            item.id === existingId
              ? { ...item, ...fields, updatedAt: now }
              : item
          )
        );
        setNotice({
          type: "success",
          text: `อัปเดตรายการ PO ${fields.po || "-"} เรียบร้อยแล้ว`,
        });
      } else {
        const created: PORecordItem = {
          id: `manual-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          ...fields,
          createdAt: now,
          updatedAt: now,
        };
        setRecords((prev) => [created, ...prev]);
        resetScrollAndPage();
        setNotice({
          type: "success",
          text: `เพิ่มรายการ PO ${fields.po || "-"} เรียบร้อยแล้ว`,
        });
      }
      setModalState(null);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRecord = (row: PORecordItem) => {
    const confirmed = window.confirm(
      `ต้องการลบรายการ PO ${row.po || "-"} (Item ${row.item || "-"}) ใช่หรือไม่?`
    );
    if (!confirmed) return;

    setRecords((prev) => prev.filter((item) => item.id !== row.id));
    setNotice({
      type: "success",
      text: `ลบรายการ PO ${row.po || "-"} เรียบร้อยแล้ว`,
    });
  };

  const handleSelectExcelFile = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const parsed = parseWorkbookToRecords(wb, "import");
      if (parsed.records.length === 0) {
        setNotice({
          type: "error",
          text: `ไม่พบแถวข้อมูล PO ที่ใช้งานได้ในไฟล์ "${file.name}"`,
        });
        return;
      }
      setPendingImport({
        fileName: file.name,
        records: parsed.records,
        skippedEmptyRows: parsed.skippedEmptyRows,
      });
    } catch {
      setNotice({
        type: "error",
        text: `ไม่สามารถอ่านไฟล์ "${file.name}" ได้ กรุณาตรวจสอบว่าเป็นไฟล์ .xlsx หรือ .xls ที่ถูกต้อง`,
      });
    }
  };

  const handleConfirmImport = (mode: "append" | "replace") => {
    if (!pendingImport) return;
    const imported = pendingImport.records.map((r, idx) => ({
      ...r,
      id: `import-${Date.now()}-${idx}-${r.po || "row"}`,
    }));

    setRecords((prev) =>
      mode === "replace" ? imported : [...imported, ...prev]
    );
    setDataSource("imported");
    resetScrollAndPage();
    setNotice({
      type: "success",
      text: `นำเข้า ${imported.length} รายการจากไฟล์ "${pendingImport.fileName}" เรียบร้อยแล้ว`,
    });
    setPendingImport(null);
  };

  const handleExportExcel = () => {
    const wb = buildWorkbookFromRecords(filteredRecords, "Sheet1");
    XLSX.writeFile(
      wb,
      `PO-Record-${new Date().toISOString().slice(0, 10)}.xlsx`
    );
  };

  const handleDuplicate = (row: PORecordItem) => {
    setModalState({
      mode: "create",
      record: {
        ...row,
        id: "",
      },
    });
  };

  const toggleColumn = (key: POColumnKey) => {
    setHiddenCols((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const hasFilters = Boolean(
    search ||
      plantFilter ||
      poTypeFilter ||
      categoryFilter ||
      statusFilter ||
      rescheduleFilter ||
      dateFrom ||
      dateTo
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700&display=swap');
        *,*::before,*::after{font-family:'Sarabun',sans-serif;box-sizing:border-box;}
        html,body{height:100%;margin:0;padding:0;}
        @keyframes spin{to{transform:rotate(360deg)}}
        ::-webkit-scrollbar{width:6px;height:6px}
        ::-webkit-scrollbar-thumb{background:#cbd5e1;border-radius:10px}
        ::-webkit-scrollbar-track{background:transparent}
        input[type=date]::-webkit-calendar-picker-indicator{opacity:.45;cursor:pointer}
        button:hover{filter:brightness(.97)}
        .po-record-row:hover td{background:#f1f6fb !important;}
      `}</style>

      <div
        style={{
          display: "flex",
          height: "100vh",
          width: "100%",
          overflow: "hidden",
          background: "#f0f3f8",
        }}
      >
        <Sidebar open={sidebarOpen} />

        <div
          style={{
            flex: 1,
            minWidth: 0,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {/* Top Bar */}
          <header
            style={{
              minHeight: 60,
              width: "100%",
              background: "white",
              borderBottom: "1px solid #e8ecf2",
              display: "flex",
              alignItems: "center",
              flexWrap: "wrap",
              padding: "10px 24px",
              gap: 12,
              flexShrink: 0,
            }}
          >
            <button
              type="button"
              onClick={() => setSidebarOpen((o) => !o)}
              style={{
                width: 36,
                height: 36,
                borderRadius: 9,
                border: "none",
                background: "transparent",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#64748b",
              }}
            >
              <Icon.menu />
            </button>

            <div style={{ flex: 1, minWidth: 220 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <p
                  style={{
                    margin: 0,
                    fontSize: 15,
                    fontWeight: 700,
                    color: "#1e293b",
                  }}
                >
                  บันทึกข้อมูล PO (Record)
                </p>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    padding: "2px 9px",
                    borderRadius: 20,
                    background: dataSource === "api" ? "#eef5fb" : "#f0faf4",
                    color: dataSource === "api" ? "#3d5a73" : "#2d7a5a",
                  }}
                >
                  {dataSource === "api"
                    ? "API: /api/PoCheck"
                    : "นำเข้าจากไฟล์ Excel"}
                </span>
              </div>
              <p style={{ margin: 0, fontSize: 11, color: "#94a3b8" }}>
                แสดงข้อมูลทั้งหมดจาก /api/PoCheck ({records.length.toLocaleString("en-US")} รายการ) · แสดงเฉพาะคอลัมน์ที่มีข้อมูลและกดดูรายละเอียดเพิ่มเติมได้
              </p>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                flexWrap: "wrap",
                maxWidth: "100%",
                minWidth: 0,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <label style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600 }}>
                  วันที่เริ่มต้น
                </label>
                <input
                  type="date"
                  value={syncFrom}
                  onChange={(e) => setSyncFrom(e.target.value)}
                  style={{
                    padding: "6px 10px",
                    borderRadius: 9,
                    border: "1px solid #dde3ea",
                    fontSize: 12.5,
                    color: "#334155",
                    background: "#f8fafc",
                    outline: "none",
                  }}
                />
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <label style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600 }}>
                  วันที่สิ้นสุด
                </label>
                <input
                  type="date"
                  value={syncTo}
                  onChange={(e) => setSyncTo(e.target.value)}
                  style={{
                    padding: "6px 10px",
                    borderRadius: 9,
                    border: "1px solid #dde3ea",
                    fontSize: 12.5,
                    color: "#334155",
                    background: "#f8fafc",
                    outline: "none",
                  }}
                />
              </div>

              <button
                type="button"
                onClick={handleSync}
                disabled={loading}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "7px 14px",
                  background: "#1db124",
                  color: "white",
                  border: "none",
                  borderRadius: 9,
                  fontSize: 12.5,
                  fontWeight: 600,
                  cursor: loading ? "not-allowed" : "pointer",
                  opacity: loading ? 0.75 : 1,
                }}
              >
                {loading ? <LoadingSpinner size={12} color="white" /> : <RecordIcon.refresh />}
                {loading ? "กำลังโหลด..." : "Sync Data"}
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleSelectExcelFile}
                style={{ display: "none" }}
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={saving}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "7px 12px",
                  borderRadius: 9,
                  border: "1px solid #dde3ea",
                  background: "white",
                  color: "#334155",
                  fontSize: 12.5,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                <RecordIcon.upload /> นำเข้า Excel
              </button>

              <button
                type="button"
                onClick={handleExportExcel}
                disabled={filteredRecords.length === 0}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "7px 12px",
                  borderRadius: 9,
                  border: "1px solid #dde3ea",
                  background: "white",
                  color: "#334155",
                  fontSize: 12.5,
                  fontWeight: 600,
                  cursor: filteredRecords.length === 0 ? "not-allowed" : "pointer",
                  opacity: filteredRecords.length === 0 ? 0.5 : 1,
                }}
              >
                <Icon.download /> ส่งออก Excel
              </button>

              <button
                type="button"
                onClick={() => setModalState({ mode: "create", record: null })}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "7px 14px",
                  borderRadius: 9,
                  border: "none",
                  background: "#3d5a73",
                  color: "white",
                  fontSize: 12.5,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                <RecordIcon.plus /> เพิ่ม Record
              </button>
            </div>
          </header>

          {/* Main Content */}
          <main
            style={{
              flex: 1,
              minWidth: 0,
              overflow: "auto",
              overflowX: "hidden",
              padding: 22,
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            {/* Status Notice */}
            {notice && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 16px",
                  borderRadius: 12,
                  fontSize: 13,
                  fontWeight: 600,
                  background:
                    notice.type === "error"
                      ? "#fff1f2"
                      : notice.type === "success"
                      ? "#f0faf4"
                      : "#eef5fb",
                  color:
                    notice.type === "error"
                      ? "#be123c"
                      : notice.type === "success"
                      ? "#2d7a5a"
                      : "#2a4a62",
                  border: `1px solid ${
                    notice.type === "error"
                      ? "#fecdd3"
                      : notice.type === "success"
                      ? "#bbf7d0"
                      : "#cde1f2"
                  }`,
                }}
              >
                <span>{notice.text}</span>
                <button
                  type="button"
                  onClick={() => setNotice(null)}
                  style={{
                    border: "none",
                    background: "transparent",
                    cursor: "pointer",
                    color: "inherit",
                    display: "flex",
                  }}
                >
                  <Icon.close />
                </button>
              </div>
            )}

            {/* KPI Cards */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: 14,
              }}
            >
              {[
                {
                  label: "รายการ Record ที่แสดง",
                  val: filteredRecords.length.toLocaleString("en-US"),
                  sub: `จากทั้งหมด ${records.length.toLocaleString("en-US")} รายการ`,
                  bar: "#5491b5",
                },
                {
                  label: "จำนวนเลขที่ PO",
                  val: summary.uniquePOs.toLocaleString("en-US"),
                  sub: "PO ที่ไม่ซ้ำกัน",
                  bar: "#72b49a",
                },
                {
                  label: "จำนวน Material",
                  val: summary.uniqueMaterials.toLocaleString("en-US"),
                  sub: "รหัสสินค้าที่พบ",
                  bar: "#7bafd4",
                },
                {
                  label: "จำนวน Plant",
                  val: summary.uniquePlants.toLocaleString("en-US"),
                  sub: "Plant ในข้อมูลปัจจุบัน",
                  bar: "#8b5cf6",
                },
              ].map((card) => (
                <div
                  key={card.label}
                  style={{
                    background: "white",
                    borderRadius: 16,
                    border: "1px solid #e8ecf2",
                    boxShadow: "0 1px 4px rgba(0,0,0,.04)",
                    padding: "18px 20px",
                  }}
                >
                  <p
                    style={{
                      fontSize: 11,
                      color: "#94a3b8",
                      margin: "0 0 8px",
                      fontWeight: 600,
                      letterSpacing: "0.04em",
                    }}
                  >
                    {card.label}
                  </p>
                  <p
                    style={{
                      fontSize: 28,
                      fontWeight: 800,
                      color: "#1e293b",
                      margin: "0 0 4px",
                      lineHeight: 1.05,
                    }}
                  >
                    {card.val}
                  </p>
                  <p style={{ fontSize: 11.5, color: "#94a3b8", margin: "0 0 12px" }}>
                    {card.sub}
                  </p>
                  <div
                    style={{
                      height: 4,
                      background: "#eef2f7",
                      borderRadius: 99,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: "100%",
                        background: card.bar,
                        borderRadius: 99,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Search & Filters Card */}
            <div
              style={{
                background: "white",
                borderRadius: 16,
                border: "1px solid #e8ecf2",
                boxShadow: "0 1px 4px rgba(0,0,0,.04)",
                padding: "16px 20px",
                display: "flex",
                flexDirection: "column",
                gap: 12,
                width: "100%",
                minWidth: 0,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-end",
                  gap: 10,
                  flexWrap: "wrap",
                }}
              >
                <div style={{ flex: "1 1 220px" }}>
                  <label
                    style={{
                      display: "block",
                      fontSize: 11,
                      color: "#94a3b8",
                      marginBottom: 5,
                      fontWeight: 600,
                    }}
                  >
                    ค้นหา (ทุกคอลัมน์)
                  </label>
                  <div style={{ position: "relative" }}>
                    <span
                      style={{
                        position: "absolute",
                        left: 10,
                        top: "50%",
                        transform: "translateY(-50%)",
                        color: "#94a3b8",
                        pointerEvents: "none",
                      }}
                    >
                      <Icon.search />
                    </span>
                    <input
                      value={search}
                      onChange={(e) => {
                        setSearch(e.target.value);
                        resetScrollAndPage();
                      }}
                      placeholder="PO, Material, Plant, Category, Status..."
                      style={{
                        width: "100%",
                        paddingLeft: 30,
                        paddingRight: 12,
                        paddingTop: 8,
                        paddingBottom: 8,
                        borderRadius: 9,
                        border: "1px solid #dde3ea",
                        fontSize: 13,
                        color: "#334155",
                        background: "#f8fafc",
                        outline: "none",
                      }}
                    />
                  </div>
                </div>

                {[
                  {
                    label: "Plant",
                    val: plantFilter,
                    set: (v: string) => {
                      setPlantFilter(v);
                      resetScrollAndPage();
                    },
                    opts: plantOptions,
                  },
                  {
                    label: "PO Type",
                    val: poTypeFilter,
                    set: (v: string) => {
                      setPoTypeFilter(v);
                      resetScrollAndPage();
                    },
                    opts: poTypeOptions,
                  },
                  {
                    label: "Category",
                    val: categoryFilter,
                    set: (v: string) => {
                      setCategoryFilter(v);
                      resetScrollAndPage();
                    },
                    opts: categoryOptions,
                  },
                  {
                    label: "Status",
                    val: statusFilter,
                    set: (v: string) => {
                      setStatusFilter(v);
                      resetScrollAndPage();
                    },
                    opts: statusOptions,
                  },
                  {
                    label: "Rescheduling Date",
                    val: rescheduleFilter,
                    set: (v: string) => {
                      setRescheduleFilter(v);
                      resetScrollAndPage();
                    },
                    opts: rescheduleOptions,
                  },
                ].map((f) => (
                  <div key={f.label} style={{ minWidth: 125 }}>
                    <label
                      style={{
                        display: "block",
                        fontSize: 11,
                        color: "#94a3b8",
                        marginBottom: 5,
                        fontWeight: 600,
                      }}
                    >
                      {f.label}
                    </label>
                    <select
                      value={f.val}
                      onChange={(e) => f.set(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "8px 10px",
                        borderRadius: 9,
                        border: "1px solid #dde3ea",
                        fontSize: 13,
                        color: "#334155",
                        background: "#f8fafc",
                        outline: "none",
                      }}
                    >
                      <option value="">ทั้งหมด</option>
                      {f.opts.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}

                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: 11,
                      color: "#94a3b8",
                      marginBottom: 5,
                      fontWeight: 600,
                    }}
                  >
                    Create Date ตั้งแต่
                  </label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => {
                      setDateFrom(e.target.value);
                      resetScrollAndPage();
                    }}
                    style={{
                      padding: "7px 10px",
                      borderRadius: 9,
                      border: "1px solid #dde3ea",
                      fontSize: 13,
                      color: "#334155",
                      background: "#f8fafc",
                      outline: "none",
                    }}
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: 11,
                      color: "#94a3b8",
                      marginBottom: 5,
                      fontWeight: 600,
                    }}
                  >
                    ถึงวันที่
                  </label>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => {
                      setDateTo(e.target.value);
                      resetScrollAndPage();
                    }}
                    style={{
                      padding: "7px 10px",
                      borderRadius: 9,
                      border: "1px solid #dde3ea",
                      fontSize: 13,
                      color: "#334155",
                      background: "#f8fafc",
                      outline: "none",
                    }}
                  />
                </div>

                {hasFilters && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearch("");
                      setPlantFilter("");
                      setPoTypeFilter("");
                      setCategoryFilter("");
                      setStatusFilter("");
                      setRescheduleFilter("");
                      setDateFrom("");
                      setDateTo("");
                      resetScrollAndPage();
                    }}
                    style={{
                      padding: "8px 14px",
                      border: "1px solid #dde3ea",
                      borderRadius: 9,
                      background: "white",
                      color: "#64748b",
                      fontSize: 13,
                      cursor: "pointer",
                    }}
                  >
                    ล้างตัวกรอง
                  </button>
                )}
              </div>

              {/* Column Mode Pills + Individual Column Picker */}
              <div
                style={{
                  paddingTop: 10,
                  borderTop: "1px solid #f0f3f8",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "flex-start",
                  flexWrap: "wrap",
                  gap: 8,
                  position: "relative",
                }}
              >
                <span style={{ fontSize: 11.5, color: "#94a3b8", fontWeight: 600 }}>
                  คอลัมน์ที่แสดง:
                </span>

                <button
                  type="button"
                  onClick={() => setActiveGroup("populated")}
                  style={{
                    padding: "4px 12px",
                    borderRadius: 20,
                    border: "1px solid",
                    borderColor: activeGroup === "populated" ? "#3d5a73" : "#e2e8f0",
                    background: activeGroup === "populated" ? "#3d5a73" : "white",
                    color: activeGroup === "populated" ? "white" : "#64748b",
                    fontSize: 11.5,
                    fontWeight: 600,
                    cursor: "pointer",
                    flexShrink: 0,
                  }}
                >
                  เฉพาะที่มีข้อมูล ({populatedColumnKeys.size || 9})
                </button>

                <button
                  type="button"
                  onClick={() => setActiveGroup("all")}
                  style={{
                    padding: "4px 12px",
                    borderRadius: 20,
                    border: "1px solid",
                    borderColor: activeGroup === "all" ? "#3d5a73" : "#e2e8f0",
                    background: activeGroup === "all" ? "#3d5a73" : "white",
                    color: activeGroup === "all" ? "white" : "#64748b",
                    fontSize: 11.5,
                    fontWeight: 600,
                    cursor: "pointer",
                    flexShrink: 0,
                  }}
                >
                  ทั้งหมด (32)
                </button>

                <div style={{ position: "relative", flexShrink: 0 }}>
                  <button
                    type="button"
                    onClick={() => setShowColumnMenu((s) => !s)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "5px 12px",
                      borderRadius: 8,
                      border: "1px solid #cbd5e1",
                      background: showColumnMenu ? "#eef3f8" : "white",
                      color: "#334155",
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                    }}
                  >
                    <RecordIcon.columns /> เลือกคอลัมน์ ({visibleColumns.length}/32)
                  </button>

                  {showColumnMenu && (
                    <>
                      <div
                        style={{ position: "fixed", inset: 0, zIndex: 25 }}
                        onClick={() => setShowColumnMenu(false)}
                      />
                      <div
                        style={{
                          position: "absolute",
                          left: 0,
                          top: "calc(100% + 6px)",
                          width: 310,
                          maxWidth: "calc(100vw - 48px)",
                          maxHeight: 360,
                          overflowY: "auto",
                          background: "white",
                          border: "1px solid #e2e8f0",
                          borderRadius: 12,
                          boxShadow: "0 14px 36px rgba(15,23,42,.14)",
                          padding: 12,
                          zIndex: 30,
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            marginBottom: 8,
                            paddingBottom: 6,
                            borderBottom: "1px solid #f1f5f9",
                          }}
                        >
                          <span style={{ fontSize: 12, fontWeight: 700, color: "#334155" }}>
                            คอลัมน์จาก Excel (32)
                          </span>
                          <div style={{ display: "flex", gap: 8 }}>
                            <button
                              type="button"
                              onClick={() => {
                                setHiddenCols(new Set());
                                setActiveGroup("all");
                              }}
                              style={{
                                border: "none",
                                background: "transparent",
                                color: "#3d5a73",
                                fontSize: 11.5,
                                fontWeight: 600,
                                cursor: "pointer",
                              }}
                            >
                              แสดงทั้งหมด
                            </button>
                            <button
                              type="button"
                              onClick={() => setShowColumnMenu(false)}
                              style={{
                                border: "none",
                                background: "transparent",
                                color: "#94a3b8",
                                fontSize: 11.5,
                                cursor: "pointer",
                              }}
                            >
                              ปิด
                            </button>
                          </div>
                        </div>

                        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                          {PO_RECORD_COLUMNS.map((col) => {
                            const hasData = populatedColumnKeys.has(col.key);
                            const isVisible =
                              !hiddenCols.has(col.key) &&
                              (activeGroup === "all" ||
                                (activeGroup === "populated"
                                  ? hasData
                                  : col.group === activeGroup));
                            return (
                              <label
                                key={col.key}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 8,
                                  padding: "4px 6px",
                                  borderRadius: 6,
                                  cursor: "pointer",
                                  fontSize: 12,
                                  color: hasData ? "#1e293b" : "#94a3b8",
                                }}
                              >
                                <input
                                  type="checkbox"
                                  checked={isVisible}
                                  onChange={() => {
                                    if (activeGroup !== "all") {
                                      setActiveGroup("all");
                                      const toHide = new Set<POColumnKey>();
                                      for (const c of PO_RECORD_COLUMNS) {
                                        const prevVisible =
                                          !hiddenCols.has(c.key) &&
                                          (activeGroup === "populated"
                                            ? populatedColumnKeys.has(c.key)
                                            : c.group === activeGroup);
                                        if (!prevVisible) toHide.add(c.key);
                                      }
                                      if (isVisible) toHide.add(col.key);
                                      else toHide.delete(col.key);
                                      setHiddenCols(toHide);
                                      return;
                                    }
                                    toggleColumn(col.key);
                                  }}
                                />
                                <span style={{ color: "#94a3b8", minWidth: 22 }}>
                                  #{col.index + 1}
                                </span>
                                <span style={{ flex: 1 }}>{col.formLabel}</span>
                                {hasData && (
                                  <span
                                    style={{
                                      fontSize: 10,
                                      background: "#f0faf4",
                                      color: "#2d7a5a",
                                      padding: "0 6px",
                                      borderRadius: 10,
                                      fontWeight: 600,
                                    }}
                                  >
                                    มีข้อมูล
                                  </span>
                                )}
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {PO_COLUMN_GROUPS.map((g) => {
                  const count = PO_RECORD_COLUMNS.filter((c) => c.group === g.key).length;
                  const active = activeGroup === g.key;
                  return (
                    <button
                      key={g.key}
                      type="button"
                      onClick={() => setActiveGroup(g.key)}
                      style={{
                        padding: "4px 12px",
                        borderRadius: 20,
                        border: "1px solid",
                        borderColor: active ? "#3d5a73" : "#e2e8f0",
                        background: active ? "#eef3f8" : "white",
                        color: active ? "#2a4a62" : "#64748b",
                        fontSize: 11.5,
                        fontWeight: 600,
                        cursor: "pointer",
                        flexShrink: 0,
                      }}
                    >
                      {g.label} ({count})
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Record Table */}
            <RecordTable
              records={filteredRecords}
              columns={visibleColumns}
              loading={loading}
              page={page}
              filterEpoch={filterEpoch}
              onPageChange={setPage}
              onView={(row) => setModalState({ mode: "view", record: row })}
              onEdit={(row) => setModalState({ mode: "edit", record: row })}
              onDuplicate={handleDuplicate}
              onDelete={handleDeleteRecord}
            />
          </main>
        </div>
      </div>

      {/* Add / Edit / View Modal */}
      {modalState && (
        <RecordFormModal
          mode={modalState.mode}
          initialRecord={modalState.record}
          saving={saving}
          onClose={() => setModalState(null)}
          onSave={handleSaveRecord}
          onSwitchToEdit={() =>
            setModalState((prev) =>
              prev ? { ...prev, mode: "edit" } : null
            )
          }
        />
      )}

      {/* Excel Import Confirmation Modal */}
      {pendingImport && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 55,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(30,41,59,.28)",
              backdropFilter: "blur(3px)",
            }}
            onClick={() => !saving && setPendingImport(null)}
          />
          <div
            style={{
              position: "relative",
              background: "white",
              borderRadius: 16,
              padding: 22,
              width: "100%",
              maxWidth: 460,
              boxShadow: "0 20px 60px rgba(0,0,0,.16)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <span
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 9,
                  background: "#eef5fb",
                  color: "#3d5a73",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <RecordIcon.fileSheet />
              </span>
              <div>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#1e293b" }}>
                  นำเข้าข้อมูลจากไฟล์ Excel
                </h3>
                <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>
                  {pendingImport.fileName}
                </p>
              </div>
            </div>

            <p style={{ fontSize: 13, color: "#475569", margin: "10px 0 18px", lineHeight: 1.5 }}>
              พบข้อมูล PO ที่สมบูรณ์ทั้งหมด{" "}
              <strong>{pendingImport.records.length}</strong> รายการ
              {pendingImport.skippedEmptyRows > 0
                ? ` (ข้ามแถวที่ไม่มีข้อมูลหลัก ${pendingImport.skippedEmptyRows} แถว)`
                : ""}{" "}
              ต้องการนำเข้าแบบใด?
            </p>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, flexWrap: "wrap" }}>
              <button
                type="button"
                disabled={saving}
                onClick={() => setPendingImport(null)}
                style={{
                  padding: "8px 14px",
                  borderRadius: 9,
                  border: "1px solid #dde3ea",
                  background: "white",
                  color: "#64748b",
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => handleConfirmImport("append")}
                style={{
                  padding: "8px 16px",
                  borderRadius: 9,
                  border: "1px solid #3d5a73",
                  background: "#eef3f8",
                  color: "#2a4a62",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                เพิ่มต่อจากรายการเดิม
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => handleConfirmImport("replace")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "8px 16px",
                  borderRadius: 9,
                  border: "none",
                  background: "#3d5a73",
                  color: "white",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {saving && <LoadingSpinner size={12} color="white" />}
                แทนที่ข้อมูลทั้งหมด
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
