"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { LoadingSpinner } from "../dashboard/loading-spinner";
import { RecordIcon } from "./record-icons";
import { POColumnDef, POColumnKey, PORecordItem } from "@/app/lib/po-record-schema";

const ROW_HEIGHT = 41;
const OVERSCAN = 12;
const VIEWPORT_FALLBACK_HEIGHT = 560;

type PageSizeOption = "all" | 50 | 100 | 500;
type SortDir = "asc" | "desc";

interface RecordTableProps {
  records: PORecordItem[];
  columns: POColumnDef[];
  loading: boolean;
  page: number;
  filterEpoch?: number;
  onPageChange: (page: number) => void;
  onView: (row: PORecordItem) => void;
  onEdit: (row: PORecordItem) => void;
  onDuplicate: (row: PORecordItem) => void;
  onDelete: (row: PORecordItem) => void;
}

export function RecordTable({
  records,
  columns,
  loading,
  page,
  filterEpoch = 0,
  onPageChange,
  onView,
  onEdit,
  onDuplicate,
  onDelete,
}: RecordTableProps) {
  const [pageSize, setPageSize] = useState<PageSizeOption>("all");
  const [sortState, setSortState] = useState<{
    key: POColumnKey;
    dir: SortDir;
  } | null>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(VIEWPORT_FALLBACK_HEIGHT);

  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
  }, [filterEpoch]);

  const sortedRecords = useMemo(() => {
    if (!sortState) return records;
    const { key, dir } = sortState;
    const factor = dir === "asc" ? 1 : -1;
    const colDef = columns.find((c) => c.key === key);
    const isNumeric = colDef?.inputType === "number";

    return [...records].sort((a, b) => {
      const av = (a[key] ?? "").trim();
      const bv = (b[key] ?? "").trim();
      if (!av && !bv) return 0;
      if (!av) return 1;
      if (!bv) return -1;

      if (isNumeric) {
        const an = Number(av.replace(/,/g, ""));
        const bn = Number(bv.replace(/,/g, ""));
        if (Number.isFinite(an) && Number.isFinite(bn)) {
          return (an - bn) * factor;
        }
      }

      return av.localeCompare(bv, undefined, { numeric: true }) * factor;
    });
  }, [records, sortState, columns]);

  const isAllMode = pageSize === "all";
  const numericPageSize = isAllMode ? Math.max(1, sortedRecords.length) : pageSize;
  const totalPages = isAllMode
    ? 1
    : Math.max(1, Math.ceil(sortedRecords.length / numericPageSize));
  const safePage = isAllMode ? 1 : Math.min(page, totalPages);
  const pageStartIndex = isAllMode ? 0 : (safePage - 1) * numericPageSize;

  const pagedRecords = useMemo(() => {
    if (isAllMode) return sortedRecords;
    return sortedRecords.slice(pageStartIndex, pageStartIndex + numericPageSize);
  }, [isAllMode, sortedRecords, pageStartIndex, numericPageSize]);

  const useVirtual = isAllMode && pagedRecords.length > 150;
  const totalHeight = pagedRecords.length * ROW_HEIGHT;
  const effectiveScrollTop =
    totalHeight <= viewportHeight
      ? 0
      : Math.min(scrollTop, Math.max(0, totalHeight - viewportHeight));

  const virtualStart = useVirtual
    ? Math.max(0, Math.floor(effectiveScrollTop / ROW_HEIGHT) - OVERSCAN)
    : 0;
  const virtualCount = useVirtual
    ? Math.ceil(viewportHeight / ROW_HEIGHT) + OVERSCAN * 2
    : pagedRecords.length;
  const virtualEnd = useVirtual
    ? Math.min(pagedRecords.length, virtualStart + virtualCount)
    : pagedRecords.length;

  const visibleRows = useVirtual
    ? pagedRecords.slice(virtualStart, virtualEnd)
    : pagedRecords;
  const topSpacerHeight = useVirtual ? virtualStart * ROW_HEIGHT : 0;
  const bottomSpacerHeight = useVirtual
    ? Math.max(0, (pagedRecords.length - virtualEnd) * ROW_HEIGHT)
    : 0;

  const handleToggleSort = (key: POColumnKey) => {
    setSortState((prev) => {
      if (!prev || prev.key !== key) return { key, dir: "asc" };
      if (prev.dir === "asc") return { key, dir: "desc" };
      return null;
    });
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    setScrollTop(target.scrollTop);
    if (target.clientHeight > 0 && target.clientHeight !== viewportHeight) {
      setViewportHeight(target.clientHeight);
    }
  };

  const renderCellContent = (row: PORecordItem, col: POColumnDef) => {
    const val = row[col.key];
    if (!val) {
      return null;
    }

    if (col.key === "plant") {
      return (
        <span
          style={{
            background: "#eef2f7",
            color: "#4a6070",
            padding: "2px 8px",
            borderRadius: 6,
            fontSize: 11,
            fontWeight: 600,
          }}
        >
          {val}
        </span>
      );
    }

    if (col.key === "poType") {
      return (
        <span
          style={{
            background: "#eef5fb",
            color: "#3d5a73",
            border: "1px solid #dbe7f3",
            padding: "2px 8px",
            borderRadius: 20,
            fontSize: 11,
            fontWeight: 600,
          }}
        >
          {val}
        </span>
      );
    }

    if (col.key === "status") {
      const completed = val.toLowerCase().includes("completed");
      return (
        <span
          style={{
            background: completed ? "#eef5fb" : "#f0faf4",
            color: completed ? "#2a4a62" : "#2d7a5a",
            padding: "2px 9px",
            borderRadius: 20,
            fontSize: 11,
            fontWeight: 600,
          }}
        >
          {val}
        </span>
      );
    }

    if (col.key === "deleteFlag" || col.key === "refuse" || col.key === "cancelProcess") {
      return (
        <span
          style={{
            background: "#fff1f2",
            color: "#e11d48",
            padding: "2px 9px",
            borderRadius: 20,
            fontSize: 11,
            fontWeight: 600,
          }}
        >
          {val}
        </span>
      );
    }

    return (
      <span
        style={{
          fontFamily: col.mono ? "monospace" : "inherit",
          color: col.key === "po" ? "#1e293b" : "#475569",
          fontWeight: col.key === "po" ? 600 : 400,
        }}
      >
        {val}
      </span>
    );
  };

  return (
    <div
      style={{
        background: "white",
        borderRadius: 16,
        border: "1px solid #e8ecf2",
        boxShadow: "0 1px 4px rgba(0,0,0,.04)",
        position: "relative",
        overflow: "hidden",
        width: "100%",
        minWidth: 0,
      }}
    >
      {/* Table Top Info */}
      <div
        style={{
          padding: "14px 20px",
          borderBottom: "1px solid #f0f3f8",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 10,
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: "#334155", margin: 0 }}>
              ตารางข้อมูล PO Record
            </p>
            <span
              style={{
                background: "#eef3f8",
                color: "#3d5a73",
                border: "1px solid #dbe4ee",
                padding: "1px 9px",
                borderRadius: 20,
                fontSize: 11,
                fontWeight: 600,
              }}
            >
              {sortedRecords.length.toLocaleString("en-US")} รายการ
            </span>
            <span
              style={{
                background: "#f8fafc",
                color: "#64748b",
                border: "1px solid #e2e8f0",
                padding: "1px 9px",
                borderRadius: 20,
                fontSize: 11,
                fontWeight: 600,
              }}
            >
              แสดง {columns.length} / 32 คอลัมน์
            </span>
            {sortState && (
              <button
                type="button"
                onClick={() => setSortState(null)}
                style={{
                  background: "#eef5fb",
                  color: "#2a4a62",
                  border: "1px solid #cde1f2",
                  padding: "1px 9px",
                  borderRadius: 20,
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                เรียงตาม:{" "}
                {columns.find((c) => c.key === sortState.key)?.excelHeader ?? sortState.key}{" "}
                ({sortState.dir === "asc" ? "น้อย→มาก" : "มาก→น้อย"}) ✕
              </button>
            )}
          </div>
          <p style={{ fontSize: 11.5, color: "#94a3b8", margin: "2px 0 0" }}>
            แสดงเฉพาะคอลัมน์ที่มีข้อมูลและจำเป็น · คลิกแถวเพื่อดูรายละเอียดเพิ่มเติม · คลิกหัวคอลัมน์เพื่อเรียงลำดับ
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <label style={{ fontSize: 12, color: "#64748b" }}>โหมดแสดงผล</label>
          <select
            value={String(pageSize)}
            onChange={(e) => {
              const val = e.target.value;
              setPageSize(val === "all" ? "all" : (Number(val) as PageSizeOption));
              onPageChange(1);
              setScrollTop(0);
              if (containerRef.current) containerRef.current.scrollTop = 0;
            }}
            style={{
              padding: "5px 10px",
              borderRadius: 8,
              border: "1px solid #dde3ea",
              background: "#f8fafc",
              fontSize: 12,
              color: "#334155",
              outline: "none",
            }}
          >
            <option value="all">ทั้งหมด ({sortedRecords.length.toLocaleString("en-US")} แถว)</option>
            <option value="50">ทีละ 50 แถว</option>
            <option value="100">ทีละ 100 แถว</option>
            <option value="500">ทีละ 500 แถว</option>
          </select>
        </div>
      </div>

      {/* Scrollable Table */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        style={{
          overflowX: "auto",
          overflowY: "auto",
          height: "62vh",
          minHeight: 340,
        }}
      >
        {pagedRecords.length === 0 ? (
          loading ? (
            <div style={{ minHeight: 240 }} />
          ) : (
            <div style={{ textAlign: "center", padding: "52px 20px", color: "#94a3b8", fontSize: 13 }}>
              ไม่พบข้อมูล PO Record ที่ตรงตามเงื่อนไข
            </div>
          )
        ) : (
          <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0 }}>
            <thead style={{ position: "sticky", top: 0, zIndex: 3 }}>
              <tr style={{ background: "#f8fafc" }}>
                <th
                  style={{
                    position: "sticky",
                    left: 0,
                    zIndex: 4,
                    background: "#f8fafc",
                    padding: "10px 12px",
                    textAlign: "center",
                    fontSize: 11,
                    fontWeight: 700,
                    color: "#94a3b8",
                    borderBottom: "1px solid #e8ecf2",
                    borderRight: "1px solid #e8ecf2",
                    minWidth: 56,
                  }}
                >
                  #
                </th>
                {columns.map((col) => {
                  const isSorted = sortState?.key === col.key;
                  return (
                    <th
                      key={col.key}
                      onClick={() => handleToggleSort(col.key)}
                      title={`${col.formLabel} (คอลัมน์ #${col.index + 1}) — คลิกเพื่อเรียงลำดับ`}
                      style={{
                        padding: "10px 14px",
                        textAlign: col.align ?? "left",
                        fontSize: 11,
                        fontWeight: 700,
                        color: isSorted ? "#2a4a62" : "#64748b",
                        letterSpacing: "0.03em",
                        whiteSpace: "nowrap",
                        minWidth: col.minWidth,
                        borderBottom: "1px solid #e8ecf2",
                        background: isSorted ? "#eef3f8" : "#f8fafc",
                        cursor: "pointer",
                        userSelect: "none",
                      }}
                    >
                      <div
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 5,
                        }}
                      >
                        <span>{col.excelHeader}</span>
                        {(col.key === "unit" ||
                          col.key === "unit2" ||
                          col.key === "deliveryCompleted" ||
                          col.key === "deliveryCompleted2") && (
                          <span
                            style={{
                              fontSize: 9.5,
                              color: "#94a3b8",
                              background: "#eef2f7",
                              padding: "0 5px",
                              borderRadius: 6,
                            }}
                          >
                            #{col.index + 1}
                          </span>
                        )}
                        {isSorted && (
                          <span style={{ fontSize: 10 }}>
                            {sortState.dir === "asc" ? "▲" : "▼"}
                          </span>
                        )}
                      </div>
                    </th>
                  );
                })}
                <th
                  style={{
                    position: "sticky",
                    right: 0,
                    zIndex: 4,
                    background: "#f8fafc",
                    padding: "10px 14px",
                    textAlign: "center",
                    fontSize: 11,
                    fontWeight: 700,
                    color: "#64748b",
                    whiteSpace: "nowrap",
                    borderBottom: "1px solid #e8ecf2",
                    borderLeft: "1px solid #e8ecf2",
                    minWidth: 118,
                  }}
                >
                  จัดการ
                </th>
              </tr>
            </thead>

            <tbody>
              {topSpacerHeight > 0 && (
                <tr aria-hidden="true">
                  <td
                    colSpan={columns.length + 2}
                    style={{ height: topSpacerHeight, padding: 0, border: "none" }}
                  />
                </tr>
              )}

              {visibleRows.map((row, ri) => {
                const absoluteIdx = pageStartIndex + virtualStart + ri;
                const rowBg = absoluteIdx % 2 === 1 ? "#fafbfd" : "white";
                const rowNumber = absoluteIdx + 1;

                return (
                  <tr
                    key={row.id}
                    className="po-record-row"
                    onClick={() => onView(row)}
                    style={{
                      background: rowBg,
                      cursor: "pointer",
                      height: ROW_HEIGHT,
                    }}
                  >
                    <td
                      style={{
                        position: "sticky",
                        left: 0,
                        zIndex: 2,
                        background: rowBg,
                        padding: "0 12px",
                        height: ROW_HEIGHT,
                        fontSize: 12,
                        color: "#94a3b8",
                        textAlign: "center",
                        borderBottom: "1px solid #f0f3f8",
                        borderRight: "1px solid #f0f3f8",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {rowNumber}
                    </td>

                    {columns.map((col) => {
                      const rawText = row[col.key] ?? "";
                      return (
                        <td
                          key={col.key}
                          title={col.key === "shortText" && rawText ? rawText : undefined}
                          style={{
                            padding: "0 14px",
                            height: ROW_HEIGHT,
                            fontSize: 12,
                            textAlign: col.align ?? "left",
                            whiteSpace: "nowrap",
                            overflow: col.key === "shortText" ? "hidden" : undefined,
                            textOverflow: col.key === "shortText" ? "ellipsis" : undefined,
                            minWidth: col.minWidth,
                            maxWidth: col.key === "shortText" ? 280 : undefined,
                            borderBottom: "1px solid #f0f3f8",
                          }}
                        >
                          {renderCellContent(row, col)}
                        </td>
                      );
                    })}

                    <td
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        position: "sticky",
                        right: 0,
                        zIndex: 2,
                        background: rowBg,
                        padding: "0 10px",
                        height: ROW_HEIGHT,
                        borderBottom: "1px solid #f0f3f8",
                        borderLeft: "1px solid #f0f3f8",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 4,
                        }}
                      >
                        <button
                          type="button"
                          title="แก้ไข"
                          onClick={() => onEdit(row)}
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: 7,
                            border: "1px solid #e2e8f0",
                            background: "white",
                            color: "#3d5a73",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <RecordIcon.edit />
                        </button>
                        <button
                          type="button"
                          title="คัดลอกเป็นรายการใหม่"
                          onClick={() => onDuplicate(row)}
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: 7,
                            border: "1px solid #e2e8f0",
                            background: "white",
                            color: "#475569",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <RecordIcon.copy />
                        </button>
                        <button
                          type="button"
                          title="ลบ"
                          onClick={() => onDelete(row)}
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: 7,
                            border: "1px solid #fecdd3",
                            background: "#fff1f2",
                            color: "#e11d48",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <RecordIcon.trash />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {bottomSpacerHeight > 0 && (
                <tr aria-hidden="true">
                  <td
                    colSpan={columns.length + 2}
                    style={{ height: bottomSpacerHeight, padding: 0, border: "none" }}
                  />
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Footer */}
      {sortedRecords.length > 0 && (
        <div
          style={{
            padding: "11px 20px",
            borderTop: "1px solid #f0f3f8",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 10,
            background: "#fafbfc",
          }}
        >
          <span style={{ fontSize: 12, color: "#64748b" }}>
            {isAllMode
              ? `แสดงข้อมูลทั้งหมด ${sortedRecords.length.toLocaleString("en-US")} รายการ (เลื่อนดูได้ทุกแถว)`
              : `แสดงรายการที่ ${(pageStartIndex + 1).toLocaleString("en-US")} - ${Math.min(
                  pageStartIndex + numericPageSize,
                  sortedRecords.length
                ).toLocaleString("en-US")} จากทั้งหมด ${sortedRecords.length.toLocaleString("en-US")} รายการ`}
          </span>

          {!isAllMode && (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <button
                type="button"
                disabled={safePage <= 1}
                onClick={() => onPageChange(Math.max(1, safePage - 1))}
                style={{
                  padding: "5px 12px",
                  borderRadius: 8,
                  border: "1px solid #dde3ea",
                  background: "white",
                  color: "#475569",
                  fontSize: 12,
                  cursor: safePage <= 1 ? "not-allowed" : "pointer",
                  opacity: safePage <= 1 ? 0.5 : 1,
                }}
              >
                ก่อนหน้า
              </button>
              <span style={{ fontSize: 12, color: "#475569", padding: "0 6px" }}>
                หน้า {safePage} / {totalPages}
              </span>
              <button
                type="button"
                disabled={safePage >= totalPages}
                onClick={() => onPageChange(Math.min(totalPages, safePage + 1))}
                style={{
                  padding: "5px 12px",
                  borderRadius: 8,
                  border: "1px solid #dde3ea",
                  background: "white",
                  color: "#475569",
                  fontSize: 12,
                  cursor: safePage >= totalPages ? "not-allowed" : "pointer",
                  opacity: safePage >= totalPages ? 0.5 : 1,
                }}
              >
                ถัดไป
              </button>
            </div>
          )}
        </div>
      )}

      {loading && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(255,255,255,.72)",
            zIndex: 10,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            color: "#3d5a73",
            fontWeight: 600,
            fontSize: 13,
          }}
        >
          <LoadingSpinner size={18} />
          กำลังโหลดข้อมูลจาก /api/PoCheck...
        </div>
      )}
    </div>
  );
}
