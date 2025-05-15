// src/components/Emoji.jsx
import React from 'react';
export default function Emoji({ symbol, label }) {
  return (
    <span role="img" aria-label={label} aria-hidden={label ? "false" : "true"}>
      {symbol}
    </span>
  )
}
