import React from 'react';
import PropTypes from 'prop-types';

const Filtros = ({ filtros, onChange }) => (
  <div className="filtros-section">
    <input
      type="text"
      value={filtros.texto}
      onChange={e => onChange({ ...filtros, texto: e.target.value })}
      placeholder="Buscar parqueo..."
    />
    {/* Aquí puedes añadir más filtros si lo necesitas */}
  </div>
);

Filtros.propTypes = {
  filtros: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired,
};

export default Filtros;
