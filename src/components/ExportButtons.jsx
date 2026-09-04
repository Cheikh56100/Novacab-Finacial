import React from "react";
import { FileSpreadsheet, FileText } from "lucide-react";
import { exportCompanyExcel, exportPortfolioExcel, printCompanyPdf, printPortfolioPdf } from "../services/exportService";

export default function ExportButtons({ company, companies = [], mode = "company" }) {
  const isPortfolio = mode === "portfolio";
  return <div className="exportButtons">
    <button className="secondaryAction" onClick={() => isPortfolio ? exportPortfolioExcel(companies) : exportCompanyExcel(company)} title="Exporter au format Excel">
      <FileSpreadsheet size={14} /> Excel
    </button>
    <button className="secondaryAction" onClick={() => isPortfolio ? printPortfolioPdf(companies) : printCompanyPdf(company)} title="Préparer un PDF">
      <FileText size={14} /> PDF
    </button>
  </div>;
}
