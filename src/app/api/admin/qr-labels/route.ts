import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";
import PDFDocument from "pdfkit";
import { createSupabaseServerClient, createSupabaseAdminClient, isAdmin } from "@/lib/supabase-server";
import { logAndCreateError, createError } from "@/lib/errors";

const A4_WIDTH_PT = 595.28;
const A4_HEIGHT_PT = 841.89;
const LABEL_CM = 1.5;
const LABEL_PT = (LABEL_CM / 2.54) * 72;
const COLS = Math.floor(A4_WIDTH_PT / LABEL_PT);
const ROWS = Math.floor(A4_HEIGHT_PT / LABEL_PT);
const LABELS_PER_PAGE = COLS * ROWS;
const QR_SIZE_PT = Math.floor(LABEL_PT * 0.7);
const PADDING_PT = 2;
const FONT_CODE = 7;
const FONT_SCAN = 5;

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(createError("E1001"), { status: 401 });
    }
    if (!isAdmin(user)) {
      return NextResponse.json(createError("E1002"), { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const filter = searchParams.get("filter") ?? "unprinted";
    const countParam = searchParams.get("count");

    const admin = createSupabaseAdminClient();
    let query = admin.from("qr_codes").select("id, short_code, qr_code_data").order("created_at", { ascending: false });

    if (filter === "unprinted") {
      query = query.is("printed_at", null).is("pet_id", null);
    }
    const limit = countParam
      ? Math.min(Math.max(parseInt(countParam, 10) || 50, 1), 2000)
      : filter === "unprinted"
        ? 500
        : 200;
    query = query.limit(limit);

    const { data: rows, error } = await query;
    if (error) {
      return NextResponse.json(logAndCreateError("E5001", "qr-labels query", error), { status: 500 });
    }
    if (!rows?.length) {
      return NextResponse.json(createError("E3001"), { status: 400 });
    }

    const doc = new PDFDocument({ size: "A4", margin: 0, autoFirstPage: true });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    const finished = new Promise<void>((resolve, reject) => {
      doc.on("end", () => resolve());
      doc.on("error", reject);
    });

    let index = 0;
    for (const row of rows as { short_code: string; qr_code_data: string }[]) {
      const pageIndex = Math.floor(index / LABELS_PER_PAGE);
      const posInPage = index % LABELS_PER_PAGE;
      const col = posInPage % COLS;
      const rowNum = Math.floor(posInPage / COLS);

      if (index > 0 && posInPage === 0) {
        doc.addPage({ size: "A4", margin: 0 });
      }

      const x = col * LABEL_PT + PADDING_PT;
      const y = rowNum * LABEL_PT + PADDING_PT;
      const cellW = LABEL_PT - 2 * PADDING_PT;
      const cellH = LABEL_PT - 2 * PADDING_PT;

      doc.fontSize(FONT_CODE).text(row.short_code.toUpperCase(), x, y, { width: cellW, align: "center" });
      const qrY = y + FONT_CODE + 2;
      const qrBuffer = await QRCode.toBuffer(row.qr_code_data, {
        width: 100,
        margin: 0,
      });
      const qrDrawSize = Math.min(QR_SIZE_PT, cellW, cellH - FONT_CODE - FONT_SCAN - 4);
      doc.image(qrBuffer, x + (cellW - qrDrawSize) / 2, qrY, { width: qrDrawSize, height: qrDrawSize });
      doc.fontSize(FONT_SCAN).text("Scan", x, qrY + qrDrawSize + 1, { width: cellW, align: "center" });

      index++;
    }

    doc.end();
    await finished;

    const pdfBuffer = Buffer.concat(chunks);
    const body = new Uint8Array(pdfBuffer);
    return new NextResponse(body, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="petpaw-qr-labels.pdf"`,
        "Content-Length": String(body.length),
      },
    });
  } catch (e) {
    return NextResponse.json(logAndCreateError("E9001", "qr-labels", e), { status: 500 });
  }
}
