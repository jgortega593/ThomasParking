import React from 'react';
import PropTypes from 'prop-types';

const DetalleConsulta = ({ detalle }) => (
  <div className="detalle-container">
    {detalle ? (
      <>
        <h3>Detalles del Parqueo</h3>
        <p><strong>ID:</strong> {detalle.id}</p>
        <p><strong>Nombre:</strong> {detalle.nombre}</p>
        <p><strong>Estado:</strong> {detalle.estado}</p>
        {/* Puedes agregar más campos si lo necesitas */}
      </>
    ) : (
      <p>Seleccione un parqueo para ver detalles</p>
    )}
  </div>
);

DetalleConsulta.propTypes = {
  detalle: PropTypes.object,
};

export default DetalleConsulta;
