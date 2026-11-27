"use client";

import React, { useMemo, useState } from "react";
import { Icon } from "../dashboard/icons";
import { LoadingSpinner } from "../dashboard/loading-spinner";
import {
  PO_COLUMN_GROUPS,
  PO_RECORD_COLUMNS,
  POColumnKey,
  PORecordFields,
  PORecordItem,
  SAMPLE_EXCEL_RECORD,
  createEmptyPORecordFields,
} from "@/app/lib/po-record-schema";

export type RecordModalMode = "create" | "edit" | "view";

interface RecordFormModalProps {
  mode: RecordModalMode;
  initialRecord?: PORecordItem | null;
  saving: boolean;
  onClose: () => void;
  onSave: (fields: PORecordFields, existingId?: string) => Promise<void>;
  onSwitchToEdit?: () => void;
}

export function RecordFormModal({
  mode,
  initialRecord,
  saving,
  onClose,
  onSave,
  onSwitchToEdit,
}: RecordFormModalProps) {
  const today = new Date().toISOString().slice(0, 10);

  const [fields, setFields] = useState<PORecordFields>(() => {
    if (initialRecord) {
      const next = createEmptyPORecordFields();
      for (const col of PO_RECORD_COLUMNS) {
        next[col.key] = initialRecord[col.key] ?? "";
      }
      return next;
    }
    return createEmptyPORecordFields(today);
  });

  const [showAllInView, setShowAllInView] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const readOnly = mode === "view";

  const filledCount = useMemo(
    () =>
      PO_RECORD_COLUMNS.filter((c) => Boolean((fields[c.key] ?? "").trim()))
        .length,
    [fields]
  );
  const emptyCount = PO_RECORD_COLUMNS.length - filledCount;

  const handleChange = (key: POColumnKey, value: string) => {
    setFields((prev) => ({ ...prev, [key]: value }));
    if (error) setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (readOnly) return;

    if (!fields.po.trim() && !fields.material.trim() && !fields.plant.trim()) {
      setError("กรุณากรอกข้อมูลอย่างน้อย PO, Material หรือ Plant ก่อนบันทึก");
      return;
    }

    await onSave(fields, mode === "edit" ? initialRecord?.id : undefined);
  };

  const title =
    mode === "create"
      ? "เพิ่ม PO Record ใหม่"
      : mode === "edit"
      ? `แก้ไข PO Record${initialRecord?.po ? ` · ${initialRecord.po}` : ""}`
      : `รายละเอียด PO Record${initialRecord?.po ? ` · ${initialRecord.po}` : ""}`;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
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
        onClick={onClose}
      />

      <form
        onSubmit={handleSubmit}
        style={{
          position: "relative",
          background: "white",
          borderRadius: 18,
          boxShadow: "0 20px 60px rgba(0,0,0,.16)",
          width: "100%",
          maxWidth: readOnly && !showAllInView ? 720 : 960,
          maxHeight: "88vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "18px 24px",
            borderBottom: "1px solid #f1f4f8",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            flexShrink: 0,
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: "#1e293b", margin: 0 }}>
                {title}
              </h3>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  background: "#eef3f8",
                  color: "#3d5a73",
                  padding: "2px 9px",
                  borderRadius: 20,
                }}
              >
                {readOnly && !showAllInView
                  ? `มีข้อมูล ${filledCount} ฟิลด์`
                  : "32 คอลัมน์ (PO Create 20250605)"}
              </span>
              {initialRecord?.isStatus && (
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    background:
                      initialRecord.isStatus === "Have" ? "#f0faf4" : "#fff1f2",
                    color:
                      initialRecord.isStatus === "Have" ? "#2d7a5a" : "#e11d48",
                    padding: "2px 9px",
                    borderRadius: 20,
                  }}
                >
                  {initialRecord.isStatus}
                  {initialRecord.statusReceivingCode
                    ? ` · Code ${initialRecord.statusReceivingCode}`
                    : ""}
                </span>
              )}
              {initialRecord?.apiIndex && (
                <span style={{ fontSize: 11, color: "#94a3b8", fontFamily: "monospace" }}>
                  Index: {initialRecord.apiIndex}
                </span>
              )}
            </div>
            <p style={{ fontSize: 11.5, color: "#94a3b8", margin: "3px 0 0" }}>
              {readOnly
                ? showAllInView
                  ? "แสดงข้อมูลครบทุกคอลัมน์ตามโครงสร้างไฟล์ PO Create 20250605.XLSX"
                  : "แสดงเฉพาะฟิลด์ที่มีข้อมูลในรายการนี้ (ซ่อนช่องว่างที่ไม่จำเป็นไว้)"
                : "กรอกหรือปรับปรุงข้อมูล PO ทั้ง 32 คอลัมน์ตามไฟล์ PO Create 20250605.XLSX"}
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            {readOnly && emptyCount > 0 && (
              <button
                type="button"
                onClick={() => setShowAllInView((v) => !v)}
                style={{
                  padding: "6px 12px",
                  borderRadius: 8,
                  border: "1px solid #d5e2ee",
                  background: showAllInView ? "#eef3f8" : "#f8fafc",
                  color: "#3d5a73",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {showAllInView
                  ? "ซ่อนช่องว่าง"
                  : `ดูครบ 32 คอลัมน์ (ซ่อน ${emptyCount})`}
              </button>
            )}

            {mode === "create" && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setFields({ ...SAMPLE_EXCEL_RECORD });
                    setError(null);
                  }}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 8,
                    border: "1px solid #d5e2ee",
                    background: "#f4f8fc",
                    color: "#3d5a73",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  เติมตัวอย่างจาก Excel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFields(createEmptyPORecordFields(today));
                    setError(null);
                  }}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 8,
                    border: "1px solid #e2e8f0",
                    background: "white",
                    color: "#64748b",
                    fontSize: 12,
                    cursor: "pointer",
                  }}
                >
                  ล้างค่า
                </button>
              </>
            )}

            <button
              type="button"
              onClick={onClose}
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                border: "none",
                background: "transparent",
                cursor: "pointer",
                color: "#94a3b8",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Icon.close />
            </button>
          </div>
        </div>

        {/* Body */}
        <div
          style={{
            padding: "20px 24px",
            overflowY: "auto",
            flex: 1,
            display: "flex",
            flexDirection: "column",
            gap: 16,
            background: "#f8fafc",
          }}
        >
          {error && (
            <div
              style={{
                background: "#fff1f2",
                border: "1px solid #fecdd3",
                color: "#be123c",
                padding: "10px 14px",
                borderRadius: 10,
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              {error}
            </div>
          )}

          {readOnly && !showAllInView ? (
            <section
              style={{
                background: "white",
                borderRadius: 14,
                border: "1px solid #e8ecf2",
                padding: "16px 18px",
              }}
            >
              {filledCount === 0 ? (
                <div style={{ textAlign: "center", padding: 24, color: "#94a3b8", fontSize: 13 }}>
                  ยังไม่มีข้อมูลในรายการนี้
                </div>
              ) : (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(195px, 1fr))",
                    gap: 12,
                  }}
                >
                  {PO_RECORD_COLUMNS.filter((col) =>
                    Boolean((fields[col.key] ?? "").trim())
                  ).map((col) => {
                    const value = fields[col.key];
                    const isWide = col.key === "shortText";
                    return (
                      <div
                        key={col.key}
                        style={{
                          gridColumn: isWide ? "1 / -1" : undefined,
                          background: "#f8fafc",
                          borderRadius: 10,
                          border: "1px solid #eef2f7",
                          padding: "10px 12px",
                          display: "flex",
                          flexDirection: "column",
                          gap: 4,
                        }}
                      >
                        <span
                          style={{
                            fontSize: 10.5,
                            fontWeight: 600,
                            color: "#94a3b8",
                            textTransform: "uppercase",
                            letterSpacing: "0.03em",
                          }}
                        >
                          {col.formLabel}
                        </span>
                        <span
                          style={{
                            fontSize: 13.5,
                            fontWeight: 600,
                            color: "#1e293b",
                            fontFamily: col.mono ? "monospace" : "inherit",
                            wordBreak: "break-word",
                          }}
                        >
                          {value}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          ) : (
            PO_COLUMN_GROUPS.map((group) => {
              const groupCols = PO_RECORD_COLUMNS.filter((c) => c.group === group.key);
              return (
                <section
                  key={group.key}
                  style={{
                    background: "white",
                    borderRadius: 14,
                    border: "1px solid #e8ecf2",
                    padding: "16px 18px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: 12,
                    }}
                  >
                    <h4
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: "#334155",
                        margin: 0,
                      }}
                    >
                      {group.label}
                    </h4>
                    <span style={{ fontSize: 11, color: "#94a3b8" }}>
                      {groupCols.length} คอลัมน์
                    </span>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fill, minmax(205px, 1fr))",
                      gap: 12,
                    }}
                  >
                    {groupCols.map((col) => {
                      const value = fields[col.key];
                      const isWide = col.key === "shortText";
                      return (
                        <div
                          key={col.key}
                          style={{
                            gridColumn: isWide ? "1 / -1" : undefined,
                            display: "flex",
                            flexDirection: "column",
                            gap: 5,
                          }}
                        >
                          <label
                            htmlFor={`po-field-${col.key}`}
                            style={{
                              fontSize: 11,
                              fontWeight: 600,
                              color: "#64748b",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                            }}
                          >
                            <span>{col.formLabel}</span>
                            <span style={{ fontSize: 10, color: "#cbd5e1" }}>
                              #{col.index + 1}
                            </span>
                          </label>

                          {readOnly ? (
                            <div
                              style={{
                                padding: "8px 11px",
                                borderRadius: 9,
                                border: "1px solid #e8ecf2",
                                background: "#f8fafc",
                                fontSize: 13,
                                color: value ? "#1e293b" : "#cbd5e1",
                                fontFamily: col.mono ? "monospace" : "inherit",
                                minHeight: 36,
                              }}
                            >
                              {value || ""}
                            </div>
                          ) : (
                            <input
                              id={`po-field-${col.key}`}
                              type={col.inputType === "date" ? "date" : "text"}
                              inputMode={col.inputType === "number" ? "decimal" : undefined}
                              value={value}
                              onChange={(e) => handleChange(col.key, e.target.value)}
                              placeholder={col.placeholder ?? ""}
                              style={{
                                width: "100%",
                                padding: "8px 11px",
                                borderRadius: 9,
                                border: "1px solid #dde3ea",
                                fontSize: 13,
                                color: "#1e293b",
                                background: "white",
                                outline: "none",
                                fontFamily: col.mono ? "monospace" : "inherit",
                              }}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </section>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "14px 24px",
            borderTop: "1px solid #f1f4f8",
            display: "flex",
            justifyContent: "flex-end",
            gap: 10,
            background: "white",
            flexShrink: 0,
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: "8px 18px",
              borderRadius: 9,
              border: "1px solid #dde3ea",
              background: "white",
              color: "#64748b",
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            ปิด
          </button>

          {readOnly ? (
            onSwitchToEdit && (
              <button
                type="button"
                onClick={onSwitchToEdit}
                style={{
                  padding: "8px 20px",
                  borderRadius: 9,
                  border: "none",
                  background: "#3d5a73",
                  color: "white",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                แก้ไขข้อมูล
              </button>
            )
          ) : (
            <button
              type="submit"
              disabled={saving}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 7,
                padding: "8px 20px",
                borderRadius: 9,
                border: "none",
                background: "#3d5a73",
                color: "white",
                fontSize: 13,
                fontWeight: 600,
                cursor: saving ? "not-allowed" : "pointer",
                opacity: saving ? 0.75 : 1,
              }}
            >
              {saving && <LoadingSpinner size={12} color="white" />}
              {saving
                ? "กำลังบันทึก..."
                : mode === "create"
                ? "บันทึก Record"
                : "บันทึกการแก้ไข"}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
