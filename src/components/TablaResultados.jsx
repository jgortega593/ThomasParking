import React from 'react';
import PropTypes from 'prop-types';

const TablaResultados = ({ resultados, onSeleccion }) => (
  <table className="tabla-resultados">
    <thead>
      <tr>
        <th>ID</th>
        <th>Nombre</th>
        <th>Estado</th>
      </tr>
    </thead>
    <tbody>
      {resultados.length === 0 ? (
        <tr>
          <td colSpan={3} style={{ textAlign: 'center' }}>No hay resultados</td>
        </tr>
      ) : (
        resultados.map(item => (
          <tr
            key={item.id}
            onClick={() => onSeleccion(item)}
            className="fila-seleccionable"
            style={{ cursor: 'pointer' }}
          >
            <td>{item.id}</td>
            <td>{item.nombre}</td>
            <td>{item.estado}</td>
          </tr>
        ))
      )}
    </tbody>
  </table>
);

TablaResultados.propTypes = {
  resultados: PropTypes.array.isRequired,
  onSeleccion: PropTypes.func.isRequired,
};

export default TablaResultados;
