export type CsvCellValue = string | number | boolean | null | undefined;

export function exportCsv(
  filename: string,
  headers: string[],
  rows: CsvCellValue[][],
) {
  const csvContent =
    "data:text/csv;charset=utf-8," +
    [
      headers.join(","),
      ...rows.map((e) =>
        e.map((val) => `"${String(val ?? "").replace(/"/g, '""')}"`).join(","),
      ),
    ].join("\n");
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportPdfReport(config: {
  title: string;
  subtitle?: string;
  kpis?: Array<{ label: string; value: string }>;
  sections?: Array<{
    heading: string;
    columns: string[];
    rows: CsvCellValue[][];
  }>;
  filename: string;
}) {
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    alert("Please allow popups to export PDF reports.");
    return;
  }
  printWindow.document.write(`
    <html>
      <head>
        <title>${config.title}</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; color: #333; }
          h1 { margin-bottom: 5px; color: #111; }
          .subtitle { color: #666; margin-bottom: 30px; font-size: 14px; }
          .kpis { display: flex; gap: 20px; margin-bottom: 40px; }
          .kpi { flex: 1; border: 1px solid #eee; padding: 15px; border-radius: 8px; background: #fafafa; }
          .kpi-val { font-size: 24px; font-weight: bold; margin-top: 5px; color: #0ea5e9; }
          .kpi-lbl { font-size: 11px; text-transform: uppercase; color: #888; font-weight: 600; }
          .section { margin-bottom: 45px; page-break-inside: avoid; }
          h2 { border-bottom: 2px solid #333; padding-bottom: 8px; font-size: 18px; margin-bottom: 15px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
          th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
          th { background-color: #f2f2f2; font-weight: bold; }
        </style>
      </head>
      <body>
        <h1>${config.title}</h1>
        ${config.subtitle ? `<div class="subtitle">${config.subtitle}</div>` : ""}
        
        ${
          config.kpis
            ? `
          <div class="kpis">
            ${config.kpis
              .map(
                (k) => `
              <div class="kpi">
                <div class="kpi-lbl">${k.label}</div>
                <div class="kpi-val">${k.value}</div>
              </div>
            `,
              )
              .join("")}
          </div>
        `
            : ""
        }
        
        ${
          config.sections
            ? config.sections
                .map(
                  (sec) => `
          <div class="section">
            <h2>${sec.heading}</h2>
            <table>
              <thead>
                <tr>
                  ${sec.columns.map((c) => `<th>${c}</th>`).join("")}
                </tr>
              </thead>
              <tbody>
                ${sec.rows
                  .map(
                    (r) => `
                  <tr>
                    ${r.map((val) => `<td>${val}</td>`).join("")}
                  </tr>
                `,
                  )
                  .join("")}
              </tbody>
            </table>
          </div>
        `,
                )
                .join("")
            : ""
        }
        <script>
          window.onload = function() {
            window.print();
          }
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
}
