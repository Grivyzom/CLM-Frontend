import React from 'react';
import { useParams } from 'react-router-dom';

export default function ContractDetail() {
  const { id } = useParams();
  
  return (
    <div className="page-container">
      <h1 className="page-title">Contract Details</h1>
      <p className="page-description">Viewing details for contract #{id}.</p>
    </div>
  );
}
