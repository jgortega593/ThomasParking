// src/components/ExportarPDF.jsx
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import PropTypes from 'prop-types';
import dayjs from 'dayjs';

const ExportarPDF = ({ datos, columnas, titulo, orientacion = 'landscape' }) => {
  const generarPDF = () => {
    if (!datos || !Array.isArray(datos) || datos.length === 0) {
      console.error('No hay datos para exportar');
      return;
    }

    if (!columnas || !Array.isArray(columnas)) {
      console.error('Configuración de columnas inválida');
      return;
    }

    const doc = new jsPDF({
      orientation: orientacion,
      unit: 'pt',
      format: 'a4',
    });

    // Encabezados
    const headers = columnas.map(col => col.header);
    
    // Filas
    const rows = datos.map(item => 
      columnas.map(col => {
        const valor = item[col.key];
        return col.formatter ? col.formatter(valor, item) : valor;
      })
    );

    // Estilos
    doc.setFontSize(16);
    doc.text(titulo, 40, 40);
    doc.setFontSize(10);
    doc.text(`Generado: ${dayjs().format('DD/MM/YYYY HH:mm')}`, 40, 60);

    autoTable(doc, {
      head: [headers],
      body: rows,
      startY: 80,
      styles: { fontSize: 9 },
      headStyles: { 
        fillColor: [41, 128, 185],
        textColor: 255,
        fontStyle: 'bold'
      },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      margin: { left: 40, right: 40 },
      didDrawPage: (data) => {
        const pageCount = doc.internal.getNumberOfPages();
        doc.setFontSize(8);
        doc.text(
          `Página ${data.pageNumber} de ${pageCount}`,
          data.settings.margin.left,
          doc.internal.pageSize.getHeight() - 10
        );
      }
    });

    doc.save(`${titulo.toLowerCase().replace(/\s/g, '-')}-${dayjs().format('YYYYMMDD-HHmm')}.pdf`);
  };

  return (
    <button
      onClick={generarPDF}
      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors flex items-center gap-2"
    >
      <span role="img" aria-label="PDF">📄</span>
      Exportar a PDF
    </button>
  );
};

ExportarPDF.propTypes = {
  datos: PropTypes.array.isRequired,
  columnas: PropTypes.arrayOf(
    PropTypes.shape({
      key: PropTypes.string.isRequired,
      header: PropTypes.string.isRequired,
      formatter: PropTypes.func
    })
  ).isRequired,
  titulo: PropTypes.string.isRequired,
  orientacion: PropTypes.oneOf(['landscape', 'portrait'])
};

export default ExportarPDF;
